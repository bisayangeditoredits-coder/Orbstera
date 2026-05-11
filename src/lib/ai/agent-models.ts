/**
 * Hidden multi-agent stack — OpenRouter only. All IDs overridable via env.
 * Defaults use widely available OpenRouter slugs; swap to `openai/gpt-5` etc. when your key supports them.
 */

export const AGENT_MODELS = {
  /** 1 — Intent, final polish, cinematic hierarchy (GPT‑5 role) */
  gptOrchestrator: process.env.OPENROUTER_AGENT_GPT5 ?? 'openai/gpt-4o',
  /** 2 — Long-form structure, slide flow, tone */
  claudeStructure: process.env.OPENROUTER_AGENT_CLAUDE ?? 'anthropic/claude-3.5-sonnet',
  /** 3 — Reasoning, strategy, analytical depth */
  deepseekReason: process.env.OPENROUTER_AGENT_DEEPSEEK ?? 'deepseek/deepseek-r1',
  /** 4 — Contextual enhancement, visual intelligence */
  geminiContext: process.env.OPENROUTER_AGENT_GEMINI ?? 'google/gemini-2.5-flash-preview-05-20',
  /** 5 — Fast draft / outline expansion */
  llamaDraft: process.env.OPENROUTER_AGENT_LLAMA ?? 'meta-llama/llama-3.3-70b-instruct',
  /** 6 — Structured merge, JSON-safe phrasing */
  qwenStructure: process.env.OPENROUTER_AGENT_QWEN ?? 'qwen/qwen2.5-72b-instruct',
  /** 7 — Readability, clutter reduction */
  mistralConcise: process.env.OPENROUTER_AGENT_MISTRAL ?? 'mistralai/mistral-large-latest',
  /** 8 — Headlines, energy, modern tone */
  grokCreative: process.env.OPENROUTER_AGENT_GROK ?? 'x-ai/grok-2-1212',
} as const;

export const IMAGE_MODELS = {
  /** Cinematic slide imagery */
  flux: process.env.OPENROUTER_IMAGE_FLUX ?? 'black-forest-labs/flux-1.1-pro',
  /** Title / typographic hero art */
  ideogram: process.env.OPENROUTER_IMAGE_IDEOGRAM ?? 'ideogram-ai/ideogram-v2',
  fallback: process.env.OPENROUTER_IMAGE_FALLBACK ?? 'sourceful/riverflow-v2-fast',
} as const;

export type ImageVisualProfile = 'cinematic' | 'typography';
