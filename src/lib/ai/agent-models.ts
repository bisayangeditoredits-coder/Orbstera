/**
 * Hidden orchestration stack — OpenRouter only. IDs overridable via env.
 * User-facing UI never exposes these names.
 *
 * Updated May 2026 — all model IDs verified against OpenRouter's live catalog.
 */

export const AGENT_MODELS = {
  /** Intent, merge, final polish, cinematic hierarchy */
  gptOrchestrator: process.env.OPENROUTER_AGENT_GPT5 ?? 'openai/gpt-5.5',
  /** Creator-tier orchestrator fallback */
  gptOrchestratorAlt:
    process.env.OPENROUTER_AGENT_GPT5_ALT ?? 'openai/gpt-5',
  /** Slide spine, educational flow, long-form structure (Student Pro + fallback) */
  claudeStructure: process.env.OPENROUTER_AGENT_CLAUDE ?? 'anthropic/claude-sonnet-latest',
  /** Creator Pro — structure, strategy, elite polish */
  claudeOpus: process.env.OPENROUTER_AGENT_CLAUDE_OPUS ?? 'anthropic/claude-opus-4',
  /** Optional — technical / analytical depth (retained for env overrides / legacy) */
  deepseekReason: process.env.OPENROUTER_AGENT_DEEPSEEK ?? 'deepseek/deepseek-r1',
  /** Long-context compose assist (Creator fallback) */
  geminiPro: process.env.OPENROUTER_AGENT_GEMINI_PRO ?? 'google/gemini-2.5-pro',
} as const;

export const IMAGE_MODELS = {
  /** Studio-grade slide imagery (Student Pro, standard paid decks) */
  flux: process.env.OPENROUTER_IMAGE_FLUX ?? 'black-forest-labs/flux-1.1-pro',
  /** Cinematic / Creator Pro premium slides */
  fluxCinematic:
    process.env.OPENROUTER_IMAGE_FLUX_CINEMATIC ?? 'black-forest-labs/flux-pro',
  /** Ultra fallback when cinematic fails */
  fluxUltra: process.env.OPENROUTER_IMAGE_FLUX_ULTRA ?? 'black-forest-labs/flux-1.1-pro-ultra',
  /** Title / typographic hero art */
  typography: process.env.OPENROUTER_IMAGE_IDEOGRAM ?? 'black-forest-labs/flux-1.1-pro',
  typographyPremium:
    process.env.OPENROUTER_IMAGE_TYPOGRAPHY_PREMIUM ?? 'black-forest-labs/flux-pro',
  fallback: process.env.OPENROUTER_IMAGE_FALLBACK ?? 'black-forest-labs/flux-1.1-pro',

  // ── Generative Fill / Inpaint models (FLUX Kontext family) ──
  /** Free tier gen fill — standard FLUX (limited uses/month) */
  genfillFree:
    process.env.OPENROUTER_IMAGE_GENFILL_FREE ?? 'black-forest-labs/flux-1.1-pro',
  /** Student Pro gen fill — FLUX Kontext Pro (image-aware editing) */
  genfillPro:
    process.env.OPENROUTER_IMAGE_GENFILL_PRO ?? 'black-forest-labs/flux-kontext-pro',
  /** Creator Pro gen fill — FLUX Kontext Max (highest quality edits) */
  genfillCreator:
    process.env.OPENROUTER_IMAGE_GENFILL_CREATOR ?? 'black-forest-labs/flux-kontext-max',
  /** Creator Pro gen fill fallback */
  genfillCreatorFallback:
    process.env.OPENROUTER_IMAGE_GENFILL_CREATOR_FB ?? 'black-forest-labs/flux-kontext-pro',
} as const;

export type ImageVisualProfile = 'cinematic' | 'typography';
