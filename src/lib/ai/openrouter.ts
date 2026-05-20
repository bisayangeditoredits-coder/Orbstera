import { OPENROUTER_TIMEOUT, openRouterFetch } from '@/lib/ai/openrouter-timeouts';
import { resolveOpenRouterApiKey } from '@/lib/ai/openrouter-keys';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export interface OpenRouterOptions {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  /** HTTP timeout; defaults differ for complete vs stream */
  timeoutMs?: number;
  /** Optional plan tier for per-pool API keys */
  plan?: string | null;
}

function headers(appUrl: string, plan?: string | null): Record<string, string> {
  const key = resolveOpenRouterApiKey(plan);
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
  const res = await openRouterFetch(
    OPENROUTER_URL,
    {
      method: 'POST',
      headers: headers(appUrl, opts.plan),
      body: JSON.stringify({
        model: opts.model,
        messages: opts.messages,
        temperature: opts.temperature ?? 0.25,
        max_tokens: opts.max_tokens ?? 8192,
        stream: false,
      }),
    },
    opts.timeoutMs ?? OPENROUTER_TIMEOUT.complete,
  );

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
  const res = await openRouterFetch(
    OPENROUTER_URL,
    {
      method: 'POST',
      headers: headers(appUrl, opts.plan),
      body: JSON.stringify({
        model: opts.model,
        messages: opts.messages,
        temperature: opts.temperature ?? 0.28,
        max_tokens: opts.max_tokens ?? 24_000,
        stream: true,
      }),
    },
    opts.timeoutMs ?? OPENROUTER_TIMEOUT.stream,
  );

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

/** Like extractBalancedJsonObject but for a top-level JSON array. */
export function extractBalancedJsonArray(text: string): string | null {
  const start = text.indexOf('[');
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
    if (c === '[') depth++;
    if (c === ']') {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }

  return null;
}

function stripModelFencesAndThinking(raw: string): string {
  return raw
    .replace(/\x3credacted_thinking\x3e[\s\S]*?\x3c\/redacted_thinking\x3e/gi, '')
    .replace(/\x3cthink\x3e[\s\S]*?\x3c\/think\x3e/gi, '')
    .replace(/\x3credacted_reasoning\x3e[\s\S]*?\x3c\/redacted_reasoning\x3e/gi, '')
    .replace(/\x3cthought\x3e[\s\S]*?\x3c\/thought\x3e/gi, '')
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '');
}

/** Extract first JSON object from model output (handles stray prose / thinking tags). */
export function extractJsonObject(raw: string): Record<string, unknown> | null {
  const stripped = stripModelFencesAndThinking(raw);

  const balanced = extractBalancedJsonObject(stripped);
  if (!balanced) return null;
  try {
    return JSON.parse(balanced) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function tryParseJsonObject(balanced: string | null): Record<string, unknown> | null {
  if (!balanced?.trim()) return null;
  try {
    return JSON.parse(balanced) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function isDeckShape(o: Record<string, unknown>): boolean {
  return Array.isArray(o.slides) && o.slides.length > 0;
}

/**
 * Extract presentation root JSON from a streamed or complete model response.
 * Models often emit analysis JSON first, or preamble — the first `{` is not always the deck.
 * Prefers the largest valid object that has a non-empty `slides` array.
 */
export function extractDeckJsonFromModelOutput(raw: string): Record<string, unknown> | null {
  const stripped = stripModelFencesAndThinking(raw).trim();
  if (!stripped) return null;

  let best: Record<string, unknown> | null = null;
  let bestSlides = 0;

  const consider = (o: Record<string, unknown> | null) => {
    if (!o || !isDeckShape(o)) return;
    const n = (o.slides as unknown[]).length;
    if (n > bestSlides) {
      best = o;
      bestSlides = n;
    }
  };

  consider(tryParseJsonObject(extractBalancedJsonObject(stripped)));

  const maxScan = Math.min(stripped.length, 320_000);
  let brace = stripped.indexOf('{', 0);
  while (brace !== -1 && brace < maxScan) {
    const head = stripped.slice(brace, brace + 16_000);
    if (head.includes('"slides"')) {
      const balanced = extractBalancedJsonObject(stripped.slice(brace));
      if (balanced) consider(tryParseJsonObject(balanced));
    }
    brace = stripped.indexOf('{', brace + 1);
  }

  if (best) return best;

  const arrRaw = extractBalancedJsonArray(stripped);
  if (arrRaw) {
    try {
      const arr = JSON.parse(arrRaw) as unknown;
      if (Array.isArray(arr) && arr.length > 0 && typeof arr[0] === 'object' && arr[0] !== null) {
        const title =
          typeof (arr[0] as { title?: string }).title === 'string'
            ? (arr[0] as { title: string }).title
            : 'Presentation';
        return {
          title,
          theme: 'industrial-minimal',
          slides: arr as Record<string, unknown>[],
        };
      }
    } catch {
      /* noop */
    }
  }

  return null;
}
