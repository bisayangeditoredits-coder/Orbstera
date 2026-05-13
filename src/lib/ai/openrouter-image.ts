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

  const primary =
    args.visualProfile === 'typography' ? IMAGE_MODELS.typography : IMAGE_MODELS.flux;
  const secondary = IMAGE_MODELS.fallback;

  const run = async (model: string) => {
    const response = await fetch(OPENROUTER_IMAGE_URL, {
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
  };

  let result = await run(primary);
  if (!result.ok && secondary !== primary) {
    result = await run(secondary);
  }
  return result;
}
