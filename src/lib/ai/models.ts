/**
 * OpenRouter model IDs for deck generation and auxiliary routes.
 * Override via env without code changes.
 *
 * Updated May 2026 — Claude Opus/Sonnet 4.6 + Gemini 3.x stack.
 */

export const OR_MODELS = {
  /** Primary streaming composer — Claude Opus 4.6 */
  composerPrimary:
    process.env.OPENROUTER_COMPOSER_PRIMARY ?? 'anthropic/claude-opus-4.6',
  /** Elite composer fallback — Claude Opus 4.6 */
  composerElite:
    process.env.OPENROUTER_COMPOSER_ELITE ?? 'anthropic/claude-opus-4.6',
  /** Fallback composer — Claude Sonnet 4.6 */
  composerFallback:
    process.env.OPENROUTER_COMPOSER_FALLBACK ?? 'anthropic/claude-sonnet-4.6',

  /** Polish / refine fallback — Sonnet 4.6 */
  refineFallback:
    process.env.OPENROUTER_REFINE_FB ?? 'anthropic/claude-sonnet-4.6',

  /** Polish / refine — Opus 4.6 */
  refineOpus:
    process.env.OPENROUTER_REFINE_OPUS ?? 'anthropic/claude-opus-4.6',

  /** Free / economy text — Gemini 3 Flash */
  coach: process.env.OPENROUTER_COACH ?? 'google/gemini-3-flash-preview',
} as const;

export function getDeckComposerModels(): { primary: string; fallback: string } {
  return {
    primary: OR_MODELS.composerPrimary,
    fallback: OR_MODELS.composerFallback,
  };
}
