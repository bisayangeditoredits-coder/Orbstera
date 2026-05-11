/**
 * OpenRouter model IDs for deck generation and auxiliary routes.
 * Override via env without code changes.
 *
 * Updated May 2026 — all model IDs verified against OpenRouter's live catalog.
 */

export const OR_MODELS = {
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

  coach: process.env.OPENROUTER_COACH ?? 'google/gemini-2.5-flash',
} as const;

export function getDeckComposerModels(): { primary: string; fallback: string } {
  return {
    primary: OR_MODELS.composerPrimary,
    fallback: OR_MODELS.composerFallback,
  };
}
