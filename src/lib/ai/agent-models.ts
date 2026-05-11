/**
 * Hidden orchestration stack — OpenRouter only. IDs overridable via env.
 * User-facing UI never exposes these names.
 */

export const AGENT_MODELS = {
  /** Intent, merge, final polish, cinematic hierarchy */
  gptOrchestrator: process.env.OPENROUTER_AGENT_GPT5 ?? 'openai/gpt-5',
  /** Slide spine, educational flow, long-form structure */
  claudeStructure: process.env.OPENROUTER_AGENT_CLAUDE ?? 'anthropic/claude-3.5-sonnet',
  /** Optional — technical / analytical depth only */
  deepseekReason: process.env.OPENROUTER_AGENT_DEEPSEEK ?? 'deepseek/deepseek-r1',
} as const;

export const IMAGE_MODELS = {
  /** Cinematic slide imagery (Flux on OpenRouter) */
  flux: process.env.OPENROUTER_IMAGE_FLUX ?? 'black-forest-labs/flux-1.1-pro',
  /** Title / typographic hero art */
  ideogram: process.env.OPENROUTER_IMAGE_IDEOGRAM ?? 'ideogram-ai/ideogram-v2',
  fallback: process.env.OPENROUTER_IMAGE_FALLBACK ?? 'sourceful/riverflow-v2-fast',
} as const;

export type ImageVisualProfile = 'cinematic' | 'typography';
