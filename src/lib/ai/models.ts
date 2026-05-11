/**
 * OpenRouter model IDs — single source of truth for multi-model orchestration.
 * Override via env for A/B testing without code changes.
 */

export type IntelligenceTier = 'free' | 'fast' | 'elite';

/**
 * Single automatic deck pipeline: best configured models per stage.
 * User-facing “Standard / Fast / Elite” modes are removed — orchestration picks this tier.
 */
export const PIPELINE_TIER: IntelligenceTier = 'elite';

export const OR_MODELS = {
  /** Intent detection, outline, cheap structured JSON */
  outlineFree: process.env.OPENROUTER_OUTLINE_FREE ?? 'deepseek/deepseek-chat',
  outlineFast: process.env.OPENROUTER_OUTLINE_FAST ?? 'google/gemini-2.0-flash-001',
  outlineElite: process.env.OPENROUTER_OUTLINE_ELITE ?? 'deepseek/deepseek-r1',

  /** Headlines / narrative polish (short passes) */
  narrativeClaude: process.env.OPENROUTER_NARRATIVE ?? 'anthropic/claude-3.5-sonnet',
  summaryFlash: process.env.OPENROUTER_SUMMARY ?? 'google/gemini-2.0-flash-001',

  /** Main deck composer (streaming) */
  composerFree: process.env.OPENROUTER_COMPOSER_FREE ?? 'meta-llama/llama-3.3-70b-instruct',
  composerFreeFallback: process.env.OPENROUTER_COMPOSER_FREE_FB ?? 'deepseek/deepseek-chat',

  composerFast: process.env.OPENROUTER_COMPOSER_FAST ?? 'qwen/qwen2.5-72b-instruct',
  composerFastFallback: process.env.OPENROUTER_COMPOSER_FAST_FB ?? 'deepseek/deepseek-chat',

  composerElite: process.env.OPENROUTER_COMPOSER_ELITE ?? 'openai/gpt-4o',
  composerEliteFallback: process.env.OPENROUTER_COMPOSER_ELITE_FB ?? 'anthropic/claude-3.5-sonnet',

  /** Post-pass refinement (elite polish endpoint) */
  refineElite: process.env.OPENROUTER_REFINE_ELITE ?? 'openai/gpt-4o',
  refineFallback: process.env.OPENROUTER_REFINE_FB ?? 'anthropic/claude-3.5-sonnet',

  coach: process.env.OPENROUTER_COACH ?? 'google/gemini-2.0-flash-001',
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
