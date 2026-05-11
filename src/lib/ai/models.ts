/**
 * OpenRouter model IDs — single source of truth for multi-model orchestration.
 * Override via env for A/B testing without code changes.
 *
 * Updated May 2026 — all model IDs verified against OpenRouter's live catalog.
 */

export type IntelligenceTier = 'free' | 'fast' | 'elite';

export const OR_MODELS = {
  /** Intent detection, outline, cheap structured JSON */
  outlineFree: process.env.OPENROUTER_OUTLINE_FREE ?? 'deepseek/deepseek-chat',
  outlineFast: process.env.OPENROUTER_OUTLINE_FAST ?? 'google/gemini-2.5-flash',
  outlineElite: process.env.OPENROUTER_OUTLINE_ELITE ?? 'deepseek/deepseek-r1-0528',

  /** Headlines / narrative polish (short passes) */
  narrativeClaude: process.env.OPENROUTER_NARRATIVE ?? 'anthropic/claude-sonnet-latest',
  summaryFlash: process.env.OPENROUTER_SUMMARY ?? 'google/gemini-2.5-flash',

  /** Main deck composer (streaming) */
  composerFree: process.env.OPENROUTER_COMPOSER_FREE ?? 'meta-llama/llama-3.3-70b-instruct',
  composerFreeFallback: process.env.OPENROUTER_COMPOSER_FREE_FB ?? 'deepseek/deepseek-chat',

  composerFast: process.env.OPENROUTER_COMPOSER_FAST ?? 'qwen/qwen2.5-72b-instruct',
  composerFastFallback: process.env.OPENROUTER_COMPOSER_FAST_FB ?? 'deepseek/deepseek-chat',

  composerElite: process.env.OPENROUTER_COMPOSER_ELITE ?? 'openai/gpt-5.5',
  composerEliteFallback: process.env.OPENROUTER_COMPOSER_ELITE_FB ?? 'anthropic/claude-sonnet-latest',

  /** Post-pass refinement (elite polish endpoint) */
  refineElite: process.env.OPENROUTER_REFINE_ELITE ?? 'openai/gpt-5.5',
  refineFallback: process.env.OPENROUTER_REFINE_FB ?? 'anthropic/claude-sonnet-latest',

  coach: process.env.OPENROUTER_COACH ?? 'google/gemini-2.5-flash',
} as const;

export function pickComposerModel(tier: IntelligenceTier): { primary: string; fallback: string } {
  switch (tier) {
    case 'free':
      return { primary: OR_MODELS.composerFree, fallback: OR_MODELS.composerFreeFallback };
    case 'fast':
      return { primary: OR_MODELS.composerFast, fallback: OR_MODELS.composerFastFallback };
    case 'elite':
      return { primary: OR_MODELS.composerElite, fallback: OR_MODELS.composerEliteFallback };
    default:
      return { primary: OR_MODELS.composerFree, fallback: OR_MODELS.composerFreeFallback };
  }
}

export function pickOutlineModel(tier: IntelligenceTier): string {
  switch (tier) {
    case 'free':
      return OR_MODELS.outlineFree;
    case 'fast':
      return OR_MODELS.outlineFast;
    case 'elite':
      return OR_MODELS.outlineElite;
    default:
      return OR_MODELS.outlineFree;
  }
}
