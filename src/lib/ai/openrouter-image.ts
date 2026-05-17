import { IMAGE_MODELS, type ImageVisualProfile } from '@/lib/ai/agent-models';

const OPENROUTER_IMAGE_URL = 'https://openrouter.ai/api/v1/images/generations';

const CINEMATIC_SUFFIX =
  ', ultra high resolution, editorial photography, sharp focus, professional color grading, no text, no watermark';

export async function openRouterImageGeneration(args: {
  prompt: string;
  size: string;
  visualProfile?: ImageVisualProfile;
  /** Primary model (from router). */
  model?: string;
  /** Try in order when a model fails. */
  modelCascade?: string[];
  /** Boost prompt for paid cinematic / gen-fill */
  qualityBoost?: boolean;
}): Promise<{ ok: boolean; url?: string; status: number; body: string; modelUsed?: string }> {
  const key = process.env.OPENROUTER_API_KEY?.trim();
  if (!key) {
    return { ok: false, status: 503, body: 'OPENROUTER_API_KEY missing' };
  }

  const defaultPrimary =
    args.visualProfile === 'typography' ? IMAGE_MODELS.typography : IMAGE_MODELS.flux;

  const cascade = (args.modelCascade?.length ? args.modelCascade : [args.model || defaultPrimary]).filter(
    Boolean,
  );
  const models = [...new Set([...cascade, IMAGE_MODELS.fallback, IMAGE_MODELS.flux])];

  let prompt = String(args.prompt || '').trim();
  if (args.qualityBoost) {
    const lower = prompt.toLowerCase();
    if (!lower.includes('no watermark') && !lower.includes('ultra high')) {
      prompt = `${prompt}${CINEMATIC_SUFFIX}`;
    }
  }

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
        prompt,
        size: args.size,
        response_format: 'url',
      }),
    });
    const body = await response.text();
    if (!response.ok) {
      return { ok: false as const, status: response.status, body, model };
    }
    try {
      const data = JSON.parse(body) as { data?: { url?: string }[] };
      const url = data.data?.[0]?.url;
      if (!url) return { ok: false as const, status: response.status, body, model };
      return { ok: true as const, url, status: response.status, body, model };
    } catch {
      return { ok: false as const, status: response.status, body, model };
    }
  };

  let lastStatus = 502;
  let lastBody = 'All image models failed';

  for (const model of models) {
    const result = await run(model);
    if (result.ok && result.url) {
      return {
        ok: true,
        url: result.url,
        status: result.status,
        body: result.body,
        modelUsed: result.model,
      };
    }
    lastStatus = result.status;
    lastBody = result.body;
    console.warn(`[OpenRouter Image] ${model} failed:`, result.status, result.body.slice(0, 200));
  }

  return { ok: false, status: lastStatus, body: lastBody };
}
