/**
 * Hidden orchestration stack — OpenRouter only. IDs overridable via env.
 *
 * Updated May 2026 — best-in-class models for deck generation.
 */

export const AGENT_MODELS = {
  /** Director intent, merge, final polish — Claude Opus 4.6 */
  gptOrchestrator: process.env.OPENROUTER_AGENT_GPT5 ?? 'anthropic/claude-opus-4.6',
  /** Orchestrator fallback — Claude Sonnet 4.6 */
  gptOrchestratorAlt:
    process.env.OPENROUTER_AGENT_GPT5_ALT ?? 'anthropic/claude-sonnet-4.6',
  /** Slide spine, structure — Claude Sonnet 4.6 */
  claudeStructure: process.env.OPENROUTER_AGENT_CLAUDE ?? 'anthropic/claude-sonnet-4.6',
  /** Elite polish — Claude Opus 4.6 */
  claudeOpus: process.env.OPENROUTER_AGENT_CLAUDE_OPUS ?? 'anthropic/claude-opus-4.6',
  /** Deep analytical reasoning */
  deepseekReason: process.env.OPENROUTER_AGENT_DEEPSEEK ?? 'deepseek/deepseek-r1',
  /** Long-context fallback */
  geminiPro: process.env.OPENROUTER_AGENT_GEMINI_PRO ?? 'google/gemini-2.5-flash',
  /** Gemini 3.1 Pro — structured JSON fallback */
  gemini31Pro:
    process.env.OPENROUTER_AGENT_GEMINI_31 ?? 'google/gemini-3.1-pro-preview',
  /** Economy text */
  geminiFlash: process.env.OPENROUTER_AGENT_GEMINI_FLASH ?? 'google/gemini-3-flash-preview',
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
