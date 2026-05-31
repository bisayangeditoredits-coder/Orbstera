/**
 * Hidden orchestration stack — OpenRouter only. IDs overridable via env.
 *
 * Updated May 2026 — upgraded to best-in-class models.
 */

export const AGENT_MODELS = {
  /** Intent, merge, final polish — Claude Opus 4 */
  gptOrchestrator: process.env.OPENROUTER_AGENT_GPT5 ?? 'anthropic/claude-opus-4-5',
  /** Orchestrator fallback — Claude Sonnet 4.5 */
  gptOrchestratorAlt:
    process.env.OPENROUTER_AGENT_GPT5_ALT ?? 'anthropic/claude-sonnet-4-5',
  /** Slide spine, structure — Claude Sonnet 4.5 */
  claudeStructure: process.env.OPENROUTER_AGENT_CLAUDE ?? 'anthropic/claude-sonnet-4-5',
  /** Elite polish — Claude Opus 4 */
  claudeOpus: process.env.OPENROUTER_AGENT_CLAUDE_OPUS ?? 'anthropic/claude-opus-4-5',
  /** Analytical depth */
  deepseekReason: process.env.OPENROUTER_AGENT_DEEPSEEK ?? 'deepseek/deepseek-r1',
  /** Long-context fallback */
  geminiPro: process.env.OPENROUTER_AGENT_GEMINI_PRO ?? 'google/gemini-2.5-flash',
} as const;

export const IMAGE_MODELS = {
  /** OpenAI image (Creator Pro hero / premium slides) */
  dalle: process.env.OPENROUTER_IMAGE_DALLE ?? 'openai/dall-e-3',
  /** Google Imagen (Creator Pro fallback) */
  imagen: process.env.OPENROUTER_IMAGE_IMAGEN ?? 'google/gemini-2.5-flash-image',
  /** Studio-grade slide imagery */
  flux: process.env.OPENROUTER_IMAGE_FLUX ?? 'black-forest-labs/flux-1.1-pro',
  /** Cinematic / Creator Pro premium slides */
  fluxCinematic:
    process.env.OPENROUTER_IMAGE_FLUX_CINEMATIC ?? 'black-forest-labs/flux-pro',
  /** Ultra fallback */
  fluxUltra: process.env.OPENROUTER_IMAGE_FLUX_ULTRA ?? 'black-forest-labs/flux-1.1-pro-ultra',
  /** Title / typographic hero art */
  typography: process.env.OPENROUTER_IMAGE_IDEOGRAM ?? 'black-forest-labs/flux-1.1-pro',
  typographyPremium:
    process.env.OPENROUTER_IMAGE_TYPOGRAPHY_PREMIUM ?? 'black-forest-labs/flux-pro',
  fallback: process.env.OPENROUTER_IMAGE_FALLBACK ?? 'black-forest-labs/flux-1.1-pro',

  // ── Generative Fill / Inpaint models (FLUX Kontext family) ──
  genfillFree:
    process.env.OPENROUTER_IMAGE_GENFILL_FREE ?? 'black-forest-labs/flux-1.1-pro',
  genfillPro:
    process.env.OPENROUTER_IMAGE_GENFILL_PRO ?? 'black-forest-labs/flux-kontext-pro',
  genfillCreator:
    process.env.OPENROUTER_IMAGE_GENFILL_CREATOR ?? 'black-forest-labs/flux-kontext-max',
  genfillCreatorFallback:
    process.env.OPENROUTER_IMAGE_GENFILL_CREATOR_FB ?? 'black-forest-labs/flux-kontext-pro',
} as const;

export type ImageVisualProfile = 'cinematic' | 'typography';
