import { isOpenRouterConfigured, resolveOpenRouterApiKey } from '@/lib/ai/openrouter-keys';

export type LlmBackend = 'openrouter' | 'openai';

export function isOpenAiConfigured(): boolean {
  return Boolean(resolveOpenAiApiKey());
}

export function resolveOpenAiApiKey(): string {
  return normalizeApiKey(process.env.OPENAI_API_KEY);
}

/** OpenRouter preferred when configured; otherwise direct OpenAI. */
export function resolveLlmBackend(plan?: string | null): LlmBackend | null {
  if (isOpenRouterConfigured(plan)) return 'openrouter';
  if (isOpenAiConfigured()) return 'openai';
  return null;
}

export function isPlannerLlmConfigured(plan?: string | null): boolean {
  return resolveLlmBackend(plan) !== null;
}

function normalizeApiKey(raw: string | undefined): string {
  let key = (raw || '').trim();
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1).trim();
  }
  return key;
}

export function plannerModelsForBackend(tier: 'free' | 'student' | 'creator', backend: LlmBackend): string[] {
  if (backend === 'openai') {
    const standard = process.env.OPENAI_PLANNER_MODEL?.trim() || 'gpt-4o-mini';
    const premium = process.env.OPENAI_PLANNER_MODEL_PREMIUM?.trim() || 'gpt-4o';
    return tier === 'creator' ? [premium, standard] : [standard];
  }
  return [];
}

export async function streamLlmChat(args: {
  backend: LlmBackend;
  plan?: string | null;
  model: string;
  messages: { role: string; content: string }[];
  systemPrompt: string;
  temperature: number;
  max_tokens: number;
}): Promise<Response> {
  const payload = {
    model: args.model,
    messages: [{ role: 'system', content: args.systemPrompt }, ...args.messages],
    stream: true,
    temperature: args.temperature,
    max_tokens: args.max_tokens,
  };

  if (args.backend === 'openai') {
    const key = resolveOpenAiApiKey();
    if (!key) {
      return new Response(JSON.stringify({ error: { message: 'OPENAI_API_KEY missing' } }), {
        status: 503,
      });
    }
    return fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(payload),
    });
  }

  const key = resolveOpenRouterApiKey(args.plan);
  return fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      'X-Title': 'Orbstera Planner',
    },
    body: JSON.stringify(payload),
  });
}
