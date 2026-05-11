/**
 * OpenRouter model IDs for deck generation and auxiliary routes.
 * Override via env without code changes.
 */

export const OR_MODELS = {
  /** Primary streaming composer (GPT‑5 role) */
  composerPrimary:
    process.env.OPENROUTER_COMPOSER_PRIMARY ?? process.env.OPENROUTER_COMPOSER_ELITE ?? 'openai/gpt-5',
  /** Fallback composer if primary is unavailable */
  composerFallback:
    process.env.OPENROUTER_COMPOSER_FALLBACK ??
    process.env.OPENROUTER_COMPOSER_ELITE_FB ??
    'anthropic/claude-3.5-sonnet',

  /** Legacy polish / enhance compatibility */
  refineFallback:
    process.env.OPENROUTER_REFINE_FB ?? process.env.OPENROUTER_COMPOSER_FALLBACK ?? 'anthropic/claude-3.5-sonnet',

  coach: process.env.OPENROUTER_COACH ?? 'google/gemini-2.0-flash-001',
} as const;

export function getDeckComposerModels(): { primary: string; fallback: string } {
  return {
    primary: OR_MODELS.composerPrimary,
    fallback: OR_MODELS.composerFallback,
  };
}
