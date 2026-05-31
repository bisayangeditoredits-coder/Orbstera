/**
 * OpenRouter model IDs for deck generation and auxiliary routes.
 * Override via env without code changes.
 *
 * Updated May 2026 — upgraded to latest best-in-class models.
 */

export const OR_MODELS = {
  /** Primary streaming composer — Claude Sonnet 4.6 (best JSON + creative) */
  composerPrimary:
    process.env.OPENROUTER_COMPOSER_PRIMARY ?? 'anthropic/claude-sonnet-4-5',
  /** Elite composer — Claude Opus 4 for top quality */
  composerElite:
    process.env.OPENROUTER_COMPOSER_ELITE ?? 'anthropic/claude-opus-4-5',
  /** Fallback composer */
  composerFallback:
    process.env.OPENROUTER_COMPOSER_FALLBACK ?? 'anthropic/claude-sonnet-4-5',

  /** Polish / refine — Sonnet 4.5 */
  refineFallback:
    process.env.OPENROUTER_REFINE_FB ?? 'anthropic/claude-sonnet-4-5',

  /** Polish / refine — Opus 4 for creator tier */
  refineOpus:
    process.env.OPENROUTER_REFINE_OPUS ?? 'anthropic/claude-opus-4-5',

  /** Free / economy text — Gemini Flash */
  coach: process.env.OPENROUTER_COACH ?? 'google/gemini-2.5-flash',
} as const;

export function getDeckComposerModels(): { primary: string; fallback: string } {
  return {
    primary: OR_MODELS.composerPrimary,
    fallback: OR_MODELS.composerFallback,
  };
}
