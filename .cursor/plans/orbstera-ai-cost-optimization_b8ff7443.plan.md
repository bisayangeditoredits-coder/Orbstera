---
name: orbstera-ai-cost-optimization
overview: Implement a tier-aware model router, credit-based metering, progressive generation, caching, and spend protection while preserving the existing Orbstera UI/editor workflow and visual identity.
todos:
  - id: router-core
    content: Create `src/lib/ai/router.ts` with tier-aware model/provider selection + complexity scoring + spend-guard degradation.
    status: completed
  - id: credits-ledger
    content: Implement configurable monthly credits + per-action pricing with atomic server enforcement helpers and Supabase schema changes.
    status: completed
  - id: wire-generate
    content: Update `/api/generate` orchestration + composer selection to use the router and charge credits per generation size/quality.
    status: completed
  - id: progressive-gen
    content: Extend SSE phases and leverage existing store counters for background image jobs; make image generation credit-aware.
    status: completed
  - id: caching
    content: Add Redis-backed caching for orchestration outputs/refinements and reuse across requests to reduce cost and latency.
    status: completed
  - id: spend-protection
    content: Add global monthly spend tracking and router degradation rules when thresholds are met.
    status: completed
isProject: false
---

## Constraints (preserved as-is)
- Keep current UI layout, navigation, editor architecture, sidebar/toolbar systems, and existing animations/interactions.
- AI models must output structured JSON only (the renderer stays the source of truth).

## What exists today (baseline)
- **Deck generation**: `[src/app/api/generate/route.ts](src/app/api/generate/route.ts)` runs OpenRouter orchestration (`runOpenRouterOrchestration`) then streams a single composer model (primary + fallback) via SSE.
- **Orchestration**: `[src/lib/ai/prompt-chain.ts](src/lib/ai/prompt-chain.ts)` already conditionally activates DeepSeek based on `needsDeepReasoning`.
- **Model IDs**: `[src/lib/ai/models.ts](src/lib/ai/models.ts)` and `[src/lib/ai/agent-models.ts](src/lib/ai/agent-models.ts)` default to GPT-5.5/Claude Sonnet/DeepSeek R1 and Flux image generation.
- **Current limiting**: `profiles.generations_used` + per-plan max slides in `[src/app/api/generate/route.ts](src/app/api/generate/route.ts)`.
- **Image generation**: `[src/app/api/generate-image/route.ts](src/app/api/generate-image/route.ts)` falls back to legacy providers; `[src/app/api/generate/image/route.ts](src/app/api/generate/image/route.ts)` is OpenRouter-only.
- **Progressive UX hooks**: the editor store already tracks `generationPendingImages`, `generationEpoch`, `deckGenerationLifecycle` and has `trackDeckGenerationImage()` to reflect background image progress in UI (`[src/store/usePresentationStore.ts](src/store/usePresentationStore.ts)`).

## Target architecture

```mermaid
flowchart TD
  editorClient[EditorClient_UI] --> apiGenerate[/api/generate]
  apiGenerate --> creditsGate[CreditsGate]
  creditsGate --> router[ModelRouter]
  router --> intent[IntentStep]
  router --> spine[StructureStep]
  router --> reason[OptionalReasoningStep]
  router --> composer[ComposerStep_Stream]
  composer --> editorClient

  editorClient --> imgQueue[BackgroundImageJobs]
  imgQueue --> apiGenImage[/api/generate-image]
  apiGenImage --> router

  router --> cache[CacheLayer]
  creditsGate --> ledger[CreditsLedger]
  router --> spendGuard[SpendProtection]
```

### 1) Smart model routing (hybrid direct + OpenRouter)
- Add a central router module that selects models by:
  - **task type**: deck-compose vs intent/spine vs polish vs magic-edit vs image
  - **plan tier**: free/student_pro/creator_pro
  - **complexity signals**: slide count, prompt length, `needsDeepReasoning`, detected `presentationType`
  - **spend protection state**: if monthly spend cap nearing/over, degrade to cheaper models
- Keep existing UX text (phases/messages) but avoid exposing raw model IDs.

**Proposed code locations**
- New: `[src/lib/ai/router.ts](src/lib/ai/router.ts)`
  - `selectTextModel({plan,task,complexity,spendState})`
  - `selectImageProvider({plan,visualProfile,quality})`
  - `shouldRunDeepReasoning({plan,needsDeepReasoning,slideCount})`
- Update: `[src/lib/ai/prompt-chain.ts](src/lib/ai/prompt-chain.ts)` to call the router for intent/spine/reason models (instead of hard-wired `AGENT_MODELS.*`).
- Update: `[src/app/api/generate/route.ts](src/app/api/generate/route.ts)` to choose composer model(s) based on router output (free → Gemini Flash; paid → GPT/Claude; DeepSeek only when required).

**Tier mapping (initial defaults)
- Free: Gemini 2.5 Flash for orchestration + composition.
- Student Pro: Gemini Flash by default; allow limited premium polish (router-gated).
- Creator Pro: GPT-5.5 primary + Claude Sonnet structure; DeepSeek only for true deep reasoning; Flux premium visuals as eligible.

### 2) Credits system (replace generations_used)
- Replace `profiles.generations_used` gating with a monthly **credits balance**.
- Every AI action consumes credits: deck generate, enhance, magic edit, rewrite, images (standard vs premium).
- Implement credit pricing as **configurable** (db or env), so you can tune without redeploy.

**Data model (Supabase)**
- New table `credit_configs` (or config row in `app_settings`): per-plan monthly credits, per-action costs.
- New table `credit_ledger`:
  - `user_id`, `delta`, `reason`, `meta`, `created_at`
- Update `profiles`:
  - `plan`
  - `credits_monthly_limit`
  - `credits_used_month`
  - `credits_reset_at`

**Server enforcement**
- New shared helper: `[src/lib/billing/credits.ts](src/lib/billing/credits.ts)`
  - `ensureCredits(userId, cost, action)` (atomic)
  - `resetIfNeeded(userId)` (idempotent)
  - `estimateDeckCost({slides,images,plan,quality})`

### 3) Real-time credit tracking + transparency (no layout redesign)
- Expose a lightweight endpoint to fetch:
  - remaining credits
  - month usage
  - estimated cost for the current action
- Wire it into existing UI surfaces that already show plan/usage (no new navigation).

**Endpoints**
- New: `[src/app/api/credits/summary/route.ts](src/app/api/credits/summary/route.ts)`
- Extend: `[src/app/api/usage/log/route.ts](src/app/api/usage/log/route.ts)` to optionally include `credit_delta` and `model_provider` metadata.

### 4) Cost protection (global spend cap)
- Track monthly spend at the system level (rough estimate at first; later integrate provider usage/cost webhooks).
- When crossing thresholds, router automatically:
  - routes more tasks to Gemini Flash
  - disables premium image quality for lower tiers
  - reduces max tokens / disables optional polish steps

**Storage**
- New table `ai_spend_monthly` with `month_key`, `estimated_usd`, `updated_at`.

### 5) Performance + progressive generation (Gamma-like feel)
- Preserve existing editor behavior but make generation *feel* faster by:
  - streaming lifecycle phases (already supported in `/api/generate`)
  - composing a valid deck JSON ASAP
  - generating images asynchronously using the store’s `trackDeckGenerationImage()` counters
- Consolidate image generation routes (prefer one canonical route) and make image jobs credit-aware.

**Where to hook**
- `[src/store/usePresentationStore.ts](src/store/usePresentationStore.ts)` already supports background image job tracking.
- `[src/app/api/generate/route.ts](src/app/api/generate/route.ts)` will emit additional phases: `structure_complete`, `slides_complete`, `visuals_generating`, `polish_optional`.

### 6) Caching to reduce calls
- Add caching for orchestration outputs and prompt refinements keyed by:
  - normalized prompt hash
  - plan tier
  - slide count + tone + language
- Prefer Redis if available (`[src/lib/redis.ts](src/lib/redis.ts)`) with TTL; fallback to in-memory.

## Rollout strategy
- Ship behind server-side feature flags:
  - `CREDITS_ENABLED`
  - `ROUTER_ENABLED`
  - `SPEND_GUARD_ENABLED`
- Start with read-only “estimate” mode (no enforcement) to validate costs, then turn on enforcement.
