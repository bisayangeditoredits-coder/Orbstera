import { IMAGE_MODELS, type ImageVisualProfile } from '@/lib/ai/agent-models';
import { capModelsToTier, planToSubscriptionTier } from '@/lib/ai/tier-models';
import { resolveOpenRouterApiKey } from '@/lib/ai/openrouter-keys';

const OPENROUTER_IMAGE_URL = 'https://openrouter.ai/api/v1/images/generations';
const OPENROUTER_CHAT_URL = 'https://openrouter.ai/api/v1/chat/completions';

const CINEMATIC_SUFFIX =
  ', ultra high resolution, editorial photography, sharp focus, professional color grading, no text, no watermark';

export type OpenRouterImageArgs = {
  prompt: string;
  size: string;
  visualProfile?: ImageVisualProfile;
  model?: string;
  modelCascade?: string[];
  qualityBoost?: boolean;
  /** data: URL or https URL — enables Kontext / multimodal edit */
  sourceImage?: string;
  /** Optional inpaint mask (data URL or https) */
  maskImage?: string;
  plan?: string | null;
  freeTaste?: boolean;
};

function isKontextModel(model: string): boolean {
  return model.toLowerCase().includes('kontext');
}

function headers(plan?: string | null): Record<string, string> | null {
  const key = resolveOpenRouterApiKey(plan);
  if (!key) return null;
  return {
    Authorization: `Bearer ${key}`,
    'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    'X-Title': 'Orbstera',
    'Content-Type': 'application/json',
  };
}

type ImageApiPayload = {
  data?: { url?: string }[];
  choices?: {
    message?: {
      images?: { image_url?: { url?: string } }[];
      content?: string;
    };
  }[];
};

function parseImageUrlFromBody(body: string): string | null {
  try {
    const data = JSON.parse(body) as ImageApiPayload;
    const url = data.data?.[0]?.url;
    if (url) return url;
    const images = data.choices?.[0]?.message?.images;
    if (images?.[0]?.image_url?.url) return images[0].image_url.url;
    const content = data.choices?.[0]?.message?.content;
    if (typeof content === 'string' && content.startsWith('http')) return content.trim();
  } catch {
    /* noop */
  }
  return null;
}

async function runKontextEdit(args: {
  model: string;
  prompt: string;
  sourceImage: string;
  maskImage?: string;
  plan?: string | null;
}): Promise<{ ok: boolean; url?: string; status: number; body: string }> {
  const hdrs = headers(args.plan);
  if (!hdrs) return { ok: false, status: 503, body: 'OPENROUTER_API_KEY missing' };

  const content: Array<{ type: string; text?: string; image_url?: { url: string } }> = [
    { type: 'text', text: args.prompt },
    { type: 'image_url', image_url: { url: args.sourceImage } },
  ];
  if (args.maskImage) {
    content.push({ type: 'image_url', image_url: { url: args.maskImage } });
  }

  const response = await fetch(OPENROUTER_CHAT_URL, {
    method: 'POST',
    headers: hdrs,
    body: JSON.stringify({
      model: args.model,
      messages: [{ role: 'user', content }],
      modalities: ['image', 'text'],
    }),
  });

  const body = await response.text();
  if (!response.ok) {
    return { ok: false, status: response.status, body };
  }
  const url = parseImageUrlFromBody(body);
  if (!url) return { ok: false, status: response.status, body };
  return { ok: true, url, status: response.status, body };
}

async function runGeneration(args: {
  model: string;
  prompt: string;
  size: string;
  plan?: string | null;
}): Promise<{ ok: boolean; url?: string; status: number; body: string }> {
  const hdrs = headers(args.plan);
  if (!hdrs) return { ok: false, status: 503, body: 'OPENROUTER_API_KEY missing' };

  const response = await fetch(OPENROUTER_IMAGE_URL, {
    method: 'POST',
    headers: hdrs,
    body: JSON.stringify({
      model: args.model,
      prompt: args.prompt,
      size: args.size,
      response_format: 'url',
    }),
  });
  const body = await response.text();
  if (!response.ok) {
    return { ok: false, status: response.status, body };
  }
  const url = parseImageUrlFromBody(body);
  if (!url) return { ok: false, status: response.status, body };
  return { ok: true, url, status: response.status, body };
}

export async function openRouterImageGeneration(
  args: OpenRouterImageArgs,
): Promise<{ ok: boolean; url?: string; status: number; body: string; modelUsed?: string }> {
  const hdrs = headers(args.plan);
  if (!hdrs) {
    return { ok: false, status: 503, body: 'OPENROUTER_API_KEY missing' };
  }

  const tier = planToSubscriptionTier(args.plan, { freeTaste: args.freeTaste });
  const defaultPrimary =
    args.visualProfile === 'typography' ? IMAGE_MODELS.typography : IMAGE_MODELS.flux;

  const rawCascade = (args.modelCascade?.length ? args.modelCascade : [args.model || defaultPrimary]).filter(
    Boolean,
  );
  const models = capModelsToTier(
    [...new Set([...rawCascade, IMAGE_MODELS.fallback, IMAGE_MODELS.flux])],
    tier,
  );

  let prompt = String(args.prompt || '').trim();
  if (args.qualityBoost) {
    const lower = prompt.toLowerCase();
    if (!lower.includes('no watermark') && !lower.includes('ultra high')) {
      prompt = `${prompt}${CINEMATIC_SUFFIX}`;
    }
  }

  let lastStatus = 502;
  let lastBody = 'All image models failed';

  for (const model of models) {
    const useEdit = Boolean(args.sourceImage?.trim()) && isKontextModel(model);
    const result = useEdit
      ? await runKontextEdit({
          model,
          prompt,
          sourceImage: args.sourceImage!,
          maskImage: args.maskImage,
          plan: args.plan,
        })
      : await runGeneration({ model, prompt, size: args.size, plan: args.plan });

    if (result.ok && result.url) {
      return {
        ok: true,
        url: result.url,
        status: result.status,
        body: result.body,
        modelUsed: model,
      };
    }
    lastStatus = result.status;
    lastBody = result.body;
    console.warn(`[OpenRouter Image] ${model} failed:`, result.status, result.body.slice(0, 200));
  }

  return { ok: false, status: lastStatus, body: lastBody };
}
