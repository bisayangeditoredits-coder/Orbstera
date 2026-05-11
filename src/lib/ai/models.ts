/**
<<<<<<< HEAD
 * OpenRouter model IDs for deck generation and auxiliary routes.
 * Override via env without code changes.
=======
 * OpenRouter model IDs — single source of truth for multi-model orchestration.
 * Override via env for A/B testing without code changes.
>>>>>>> cursor/pollinations-api-voice-protocol
 *
 * Updated May 2026 — all model IDs verified against OpenRouter's live catalog.
 */

export const OR_MODELS = {
<<<<<<< HEAD
  /** Primary streaming composer (GPT‑5.5 — latest frontier) */
  composerPrimary:
    process.env.OPENROUTER_COMPOSER_PRIMARY ?? process.env.OPENROUTER_COMPOSER_ELITE ?? 'openai/gpt-5.5',
  /** Fallback composer if primary is unavailable */
  composerFallback:
    process.env.OPENROUTER_COMPOSER_FALLBACK ??
    process.env.OPENROUTER_COMPOSER_ELITE_FB ??
    'anthropic/claude-sonnet-latest',

  /** Legacy polish / enhance compatibility */
  refineFallback:
    process.env.OPENROUTER_REFINE_FB ?? process.env.OPENROUTER_COMPOSER_FALLBACK ?? 'anthropic/claude-sonnet-latest',

=======
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

>>>>>>> cursor/pollinations-api-voice-protocol
  coach: process.env.OPENROUTER_COACH ?? 'google/gemini-2.5-flash',
} as const;

export function getDeckComposerModels(): { primary: string; fallback: string } {
  return {
    primary: OR_MODELS.composerPrimary,
    fallback: OR_MODELS.composerFallback,
  };
}
