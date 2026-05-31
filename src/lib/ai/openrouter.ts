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
  /** Request JSON object output (orchestration steps) */
  jsonMode?: boolean;
  /** HTTP timeout; defaults differ for complete vs stream */
  timeoutMs?: number;
  /** Optional plan tier for per-pool API keys */
  plan?: string | null;
}

function buildRequestBody(opts: OpenRouterOptions, stream: boolean): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model: opts.model,
    messages: opts.messages,
    temperature: opts.temperature ?? (stream ? 0.28 : 0.25),
    max_tokens: opts.max_tokens ?? (stream ? 24_000 : 8192),
    stream,
  };
  if (opts.jsonMode) {
    body.response_format = { type: 'json_object' };
  }
  return body;
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
      body: JSON.stringify(buildRequestBody(opts, false)),
    },
    opts.timeoutMs ?? OPENROUTER_TIMEOUT.complete,
  );

  if (!res.ok) {
    const t = await res.text();
    
    // Automatically fallback to a free model if credits are exhausted
    if (res.status === 402 || (res.status === 403 && t.toLowerCase().includes('credit'))) {
      const fallbackModel = 'meta-llama/llama-3.2-3b-instruct:free';
      if (opts.model !== fallbackModel) {
        console.warn(`[OpenRouter] Credits exhausted for ${opts.model}. Falling back to ${fallbackModel}.`);
        return openRouterComplete(appUrl, { ...opts, model: fallbackModel });
      }
    }
    
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
      body: JSON.stringify(buildRequestBody(opts, true)),
    },
    opts.timeoutMs ?? OPENROUTER_TIMEOUT.stream,
  );

  if (!res.ok) {
    const clonedRes = res.clone();
    const t = await clonedRes.text();
    
    // Automatically fallback to a free model if credits are exhausted
    if (res.status === 402 || (res.status === 403 && t.toLowerCase().includes('credit'))) {
      const fallbackModel = 'meta-llama/llama-3.2-3b-instruct:free';
      if (opts.model !== fallbackModel) {
        console.warn(`[OpenRouter] Credits exhausted for ${opts.model}. Falling back to ${fallbackModel}.`);
        return openRouterStream(appUrl, { ...opts, model: fallbackModel });
      }
    }
  }

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
  let s = raw
    .replace(/\x3credacted_thinking\x3e[\s\S]*?\x3c\/redacted_thinking\x3e/gi, '')
    .replace(/\x3cthink\x3e[\s\S]*?\x3c\/think\x3e/gi, '')
    .replace(/\x3credacted_reasoning\x3e[\s\S]*?\x3c\/redacted_reasoning\x3e/gi, '')
    .replace(/\x3cthought\x3e[\s\S]*?\x3c\/thought\x3e/gi, '');

  // Drop conversational preamble before the first fenced JSON block
  const fenceStart = s.search(/```(?:json|JSON)?\s*\n?\s*\{/);
  if (fenceStart > 0) s = s.slice(fenceStart);

  s = s
    .replace(/```(?:json|JSON|javascript|js)?\s*/gi, '')
    .replace(/```\s*/g, '')
    .replace(/^\s*json\s*[\r\n]+/i, '')
    .trim();

  return s;
}

/** Slice from first `{` through last `}` — fallback when brace-balanced scan fails. */
export function extractJsonByFirstLastBrace(text: string): string | null {
  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first === -1 || last <= first) return null;
  return text.slice(first, last + 1);
}

/** Fix common model JSON mistakes before JSON.parse. */
export function repairJsonForParse(json: string): string {
  let t = json.trim();
  t = t.replace(/[\u201C\u201D\u201E\u2033\u2036]/g, '"');
  t = t.replace(/[\u2018\u2019\u201A\u2032]/g, "'");
  t = t.replace(/,\s*([}\]])/g, '$1');
  t = t.replace(/\r\n/g, '\n');
  // Trailing commas after last property in objects (multiline)
  t = t.replace(/,(\s*\n\s*[}\]])/g, '$1');
  return t;
}

function tryParseJsonString(json: string | null): Record<string, unknown> | null {
  if (!json?.trim()) return null;
  const candidates = [json.trim(), repairJsonForParse(json)];
  const seen = new Set<string>();
  for (const candidate of candidates) {
    if (!candidate || seen.has(candidate)) continue;
    seen.add(candidate);
    try {
      const parsed = JSON.parse(candidate) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      /* try next */
    }
  }
  return null;
}

/** Extract first JSON object from model output (handles stray prose / thinking tags). */
export function extractJsonObject(raw: string): Record<string, unknown> | null {
  const stripped = stripModelFencesAndThinking(raw);

  const attempts = [
    extractBalancedJsonObject(stripped),
    extractJsonByFirstLastBrace(stripped),
  ];
  for (const chunk of attempts) {
    const parsed = tryParseJsonString(chunk);
    if (parsed) return parsed;
  }
  return null;
}

function tryParseJsonObject(balanced: string | null): Record<string, unknown> | null {
  return tryParseJsonString(balanced);
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

  const firstLast = extractJsonByFirstLastBrace(stripped);
  consider(tryParseJsonObject(extractBalancedJsonObject(stripped)));
  consider(tryParseJsonObject(firstLast));

  const maxScan = Math.min(stripped.length, 320_000);
  let brace = stripped.indexOf('{', 0);
  while (brace !== -1 && brace < maxScan) {
    const head = stripped.slice(brace, brace + 16_000);
    if (head.includes('"slides"')) {
      const balanced = extractBalancedJsonObject(stripped.slice(brace));
      if (balanced) consider(tryParseJsonObject(balanced));
      const slice = stripped.slice(brace);
      const lastBrace = slice.lastIndexOf('}');
      if (lastBrace > 0) {
        consider(tryParseJsonObject(slice.slice(0, lastBrace + 1)));
      }
    }
    brace = stripped.indexOf('{', brace + 1);
  }

  if (best) return best;

  const arrRaw = extractBalancedJsonArray(stripped) ?? (() => {
    const a = stripped.indexOf('[');
    const b = stripped.lastIndexOf(']');
    return a !== -1 && b > a ? stripped.slice(a, b + 1) : null;
  })();
  if (arrRaw) {
    try {
      const arr = JSON.parse(repairJsonForParse(arrRaw)) as unknown;
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
