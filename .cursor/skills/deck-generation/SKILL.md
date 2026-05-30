---
name: deck-generation
description: Gamma-style AI deck generation — director orchestration, per-slide orders (slideSpine), composer execution, imagePrompt rules. Use when improving deck prompts, orchestration, compose quality, or presentation JSON output.
---

# Deck Generation (Gamma-style)

## Pipeline (do not skip steps)

```
User prompt → Director (intent) → Architect (slideSpine orders) → Composer (JSON executor) → Layout engine → Parallel FLUX images
```

## Core principle

**Director gives orders. Composer executes.** The composer must NOT invent structure when `slideSpine` exists — map `slides[i]` to `slideSpine[i]` 1:1.

## Source of truth

All prompt text lives in:

- `src/lib/ai/deck-generation-skill.ts` — philosophy, playbooks, system prompts
- `src/lib/ai/prompt-chain.ts` — orchestration steps (intent → structure → brief)
- `src/lib/ai/prompts.ts` — thin re-exports for backward compatibility
- `src/lib/ai/orchestration.ts` — composer messages + normalization

## Mandatory per slide

Every slide in JSON **must** include:

- `type` — from playbook (vary types; never all `content`)
- `title` — 3–8 words, specific
- `imagePrompt` — 2–4 sentences, FLUX background, never empty
- `animation.entrance` — type-appropriate motion

## When editing prompts

1. Update `deck-generation-skill.ts` first
2. Wire imports in `prompt-chain.ts` and `prompts.ts`
3. Ensure `normalizePresentationPayload` fills missing `imagePrompt` via `buildFallbackImagePrompt`
4. Test: deck should have distinct slide types + backgrounds on every slide

## Anti-patterns (ban in copy)

revolutionary, game-changing, synergy, leverage, cutting-edge, world-class (without proof), lorem ipsum, generic "Introduction" titles
