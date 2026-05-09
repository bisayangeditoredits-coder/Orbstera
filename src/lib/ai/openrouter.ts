const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export interface OpenRouterOptions {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

function headers(appUrl: string): Record<string, string> {
  const key = process.env.OPENROUTER_API_KEY?.trim();
  if (!key) throw new Error('OPENROUTER_API_KEY is not configured');
  return {
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': appUrl,
    'X-Title': 'Orbstera',
  };
}

/** Non-streaming completion — returns assistant text only */
export async function openRouterComplete(
  appUrl: string,
  opts: OpenRouterOptions
): Promise<string> {
  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: headers(appUrl),
    body: JSON.stringify({
      model: opts.model,
      messages: opts.messages,
      temperature: opts.temperature ?? 0.25,
      max_tokens: opts.max_tokens ?? 8192,
      stream: false,
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`OpenRouter ${opts.model}: ${res.status} ${t}`);
  }

  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = json.choices?.[0]?.message?.content;
  if (!text) throw new Error(`OpenRouter ${opts.model}: empty response`);
  return text;
}

/** Raw streaming response body — caller pipes to client */
export async function openRouterStream(
  appUrl: string,
  opts: OpenRouterOptions
): Promise<Response> {
  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: headers(appUrl),
    body: JSON.stringify({
      model: opts.model,
      messages: opts.messages,
      temperature: opts.temperature ?? 0.28,
      max_tokens: opts.max_tokens ?? 24_000,
      stream: true,
    }),
  });

  return res;
}

/**
 * Extract first top-level `{ ... }` using brace depth (handles nested slides array).
 * Ignores braces inside JSON strings.
 */
export function extractBalancedJsonObject(text: string): string | null {
  const start = text.indexOf('{');
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < text.length; i++) {
    const c = text[i];

    if (inString) {
      if (escape) {
        escape = false;
      } else if (c === '\\') {
        escape = true;
      } else if (c === '"') {
        inString = false;
      }
      continue;
    }

    if (c === '"') {
      inString = true;
      continue;
    }
    if (c === '{') depth++;
    if (c === '}') {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }

  return null;
}

/** Extract first JSON object from model output (handles stray prose / thinking tags). */
export function extractJsonObject(raw: string): Record<string, unknown> | null {
  const stripped = raw
    .replace(/\x3credacted_thinking\x3e[\s\S]*?\x3c\/redacted_thinking\x3e/gi, '')
    .replace(/\x3cthink\x3e[\s\S]*?\x3c\/think\x3e/gi, '')
    .replace(/\x3credacted_reasoning\x3e[\s\S]*?\x3c\/redacted_reasoning\x3e/gi, '')
    .replace(/\x3cthought\x3e[\s\S]*?\x3c\/thought\x3e/gi, '')
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '');

  const balanced = extractBalancedJsonObject(stripped);
  if (!balanced) return null;
  try {
    return JSON.parse(balanced) as Record<string, unknown>;
  } catch {
    return null;
  }
}
