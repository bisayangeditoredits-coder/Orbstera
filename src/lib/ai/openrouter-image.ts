import { IMAGE_MODELS, type ImageVisualProfile } from '@/lib/ai/agent-models';

const OPENROUTER_IMAGE_URL = 'https://openrouter.ai/api/v1/images/generations';

export async function openRouterImageGeneration(args: {
  prompt: string;
  size: string;
  visualProfile?: ImageVisualProfile;
}): Promise<{ ok: boolean; url?: string; status: number; body: string }> {
  const key = process.env.OPENROUTER_API_KEY?.trim();
  if (!key) {
    return { ok: false, status: 503, body: 'OPENROUTER_API_KEY missing' };
  }

  async function fetchWithRetry(url: string, options: RequestInit, retries = 3): Promise<Response> {
    let lastErr: any;
    for (let i = 0; i < retries; i++) {
      try {
        const res = await fetch(url, { ...options, signal: AbortSignal.timeout(90_000) });
        if (!res.ok && (res.status === 429 || res.status >= 500)) {
          throw new Error(`Retryable status: ${res.status}`);
        }
        return res;
      } catch (err: any) {
        lastErr = err;
        if (err.name !== 'TimeoutError' && !err.message.includes('Retryable')) throw err;
        if (i < retries - 1) await new Promise(r => setTimeout(r, Math.pow(2, i) * 1000));
      }
    }
    throw lastErr;
  }

  const primary =
    args.visualProfile === 'typography' ? IMAGE_MODELS.typography : IMAGE_MODELS.flux;
  const secondary = IMAGE_MODELS.fallback;

  const run = async (model: string) => {
    try {
      const response = await fetchWithRetry(OPENROUTER_IMAGE_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
          'X-Title': 'Orbstera',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          prompt: args.prompt,
          size: args.size,
          response_format: 'url',
        }),
      });
      const body = await response.text();
      if (!response.ok) {
        return { ok: false as const, status: response.status, body };
      }
      try {
        const data = JSON.parse(body) as { data?: { url?: string }[] };
        const url = data.data?.[0]?.url;
        if (!url) return { ok: false as const, status: response.status, body };
        return { ok: true as const, url, status: response.status, body };
      } catch {
        return { ok: false as const, status: response.status, body };
      }
    } catch (e: any) {
      return { ok: false as const, status: 500, body: e.message || String(e) };
    }
  };

  let result = await run(primary);
  if (!result.ok && secondary !== primary) {
    result = await run(secondary);
  }
  return result;
}
