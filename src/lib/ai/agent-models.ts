/**
 * Hidden orchestration stack — OpenRouter only. IDs overridable via env.
 * User-facing UI never exposes these names.
 *
 * Updated May 2026 — all model IDs verified against OpenRouter's live catalog.
 */

export const AGENT_MODELS = {
  /** Intent, merge, final polish, cinematic hierarchy */
  gptOrchestrator: process.env.OPENROUTER_AGENT_GPT5 ?? 'openai/gpt-5.5',
  /** Slide spine, educational flow, long-form structure */
  claudeStructure: process.env.OPENROUTER_AGENT_CLAUDE ?? 'anthropic/claude-sonnet-latest',
  /** Optional — technical / analytical depth only */
  deepseekReason: process.env.OPENROUTER_AGENT_DEEPSEEK ?? 'deepseek/deepseek-r1',
} as const;

export const IMAGE_MODELS = {
  /** Cinematic slide imagery (Flux on OpenRouter) */
  flux: process.env.OPENROUTER_IMAGE_FLUX ?? 'black-forest-labs/flux-1.1-pro',
  /** Title / typographic hero art — Flux as reliable primary since Ideogram isn't on OpenRouter */
  typography: process.env.OPENROUTER_IMAGE_IDEOGRAM ?? 'black-forest-labs/flux-1.1-pro',
  fallback: process.env.OPENROUTER_IMAGE_FALLBACK ?? 'black-forest-labs/flux-1.1-pro',
} as const;

export type ImageVisualProfile = 'cinematic' | 'typography';
