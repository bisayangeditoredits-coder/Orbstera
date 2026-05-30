/**
 * OpenRouter model IDs for deck generation and auxiliary routes.
 * Override via env without code changes.
 *
 * Updated May 2026 — model IDs verified against OpenRouter's live catalog.
 */

export const OR_MODELS = {
  /** Primary streaming composer — higher-quality JSON deck output */
  composerPrimary:
    process.env.OPENROUTER_COMPOSER_PRIMARY ?? 'anthropic/claude-opus-4.8',
  /** Creator Pro compose fallback */
  composerElite:
    process.env.OPENROUTER_COMPOSER_ELITE ?? 'anthropic/claude-opus-4.8-fast',
  /** Fallback composer if primary is unavailable */
  composerFallback:
    process.env.OPENROUTER_COMPOSER_FALLBACK ?? 'anthropic/claude-sonnet-4.5',

  /** Polish / refine — Student Pro */
  refineFallback:
    process.env.OPENROUTER_REFINE_FB ?? process.env.OPENROUTER_COMPOSER_FALLBACK ?? 'anthropic/claude-sonnet-4.5',

  /** Polish / refine — Creator Pro */
  refineOpus:
    process.env.OPENROUTER_REFINE_OPUS ?? 'anthropic/claude-opus-4.8',

  /** Free / economy text — Gemini Flash class */
  coach: process.env.OPENROUTER_COACH ?? 'google/gemini-2.5-flash',
} as const;

export function getDeckComposerModels(): { primary: string; fallback: string } {
  return {
    primary: OR_MODELS.composerPrimary,
    fallback: OR_MODELS.composerFallback,
  };
}
