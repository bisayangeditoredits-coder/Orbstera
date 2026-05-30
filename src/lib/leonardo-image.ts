/**
 * Server-side Leonardo AI image generation (deck slides, gen fill, editor images).
 * Cost-aware defaults: Flux Schnell / Phoenix without alchemy for standard tiers;
 * Phoenix + alchemy only for Creator Pro cinematic requests (~$0.03–0.05/image vs 8–12 credits charged).
 */

const LEONARDO_API_URL = 'https://cloud.leonardo.ai/api/rest/v1';

/** Leonardo model UUIDs — https://docs.leonardo.ai/docs/commonly-used-api-values */
export const LEONARDO_MODELS = {
  fluxSchnell: '1dd50843-d653-4516-a8e3-f0238ee453ff',
  phoenix: 'de7d3faf-762f-48e0-b3b7-9d0ac3a3fcf3',
  kino: 'aa77f04e-3eec-4034-9c07-d0f619684628',
  vision: '5c232a9e-9061-4777-980a-ddc8e65647c6',
  fluxKontext: '28aeddf8-bd19-4803-80fc-79602d1a9989',
} as const;

/** Rough USD per image for spend tracking (conservative high-end estimates). */
export const LEONARDO_ESTIMATED_USD = {
  economy: 0.008,
  standard: 0.018,
  premium: 0.042,
  genfill: 0.028,
} as const;

export type LeonardoQuality = 'economy' | 'standard' | 'premium' | 'genfill';

export function getLeonardoApiKey(): string | null {
  let key = (process.env.LEONARDO_API_KEY || '').trim();
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1).trim();
  }
  return key || null;
}

export function isLeonardoConfigured(): boolean {
  return Boolean(getLeonardoApiKey());
}

function snapDim(n: number, min = 512, max = 1536): number {
  const v = Math.max(min, Math.min(max, Math.round(n) || 1024));
  return Math.round(v / 8) * 8;
}

export function selectLeonardoProfile(args: {
  quality: LeonardoQuality;
  visualProfile?: 'cinematic' | 'typography';
}): {
  modelId: string;
  alchemy: boolean;
  ultra?: boolean;
  contrast?: number;
  estimatedUsd: number;
} {
  const cinematic = args.visualProfile !== 'typography';

  if (args.quality === 'genfill') {
    return {
      modelId: LEONARDO_MODELS.fluxKontext,
      alchemy: false,
      contrast: 3.5,
      estimatedUsd: LEONARDO_ESTIMATED_USD.genfill,
    };
  }

  if (args.quality === 'premium' && cinematic) {
    return {
      modelId: LEONARDO_MODELS.phoenix,
      alchemy: true,
      contrast: 3.5,
      estimatedUsd: LEONARDO_ESTIMATED_USD.premium,
    };
  }

  if (args.quality === 'standard') {
    return {
      modelId: LEONARDO_MODELS.phoenix,
      alchemy: false,
      contrast: 3.5,
      estimatedUsd: LEONARDO_ESTIMATED_USD.standard,
    };
  }

  return {
    modelId: LEONARDO_MODELS.fluxSchnell,
    alchemy: false,
    contrast: 3,
    estimatedUsd: LEONARDO_ESTIMATED_USD.economy,
  };
}

export function leonardoQualityForPlan(args: {
  plan: string;
  task: 'deck_slide_image' | 'genfill_image' | 'magic_edit_image' | 'image_generate';
  premiumRequested?: boolean;
}): LeonardoQuality {
  const p = String(args.plan || 'free').toLowerCase();
  const isGenfill = args.task === 'genfill_image' || args.task === 'magic_edit_image';
  if (isGenfill) return 'genfill';
  if (p === 'creator_pro' || p === 'admin') {
    return args.premiumRequested ? 'premium' : 'standard';
  }
  if (p === 'student_pro' || p === 'pro') return 'standard';
  return 'economy';
}

type GenerationResult = { url: string; imageId: string; estimatedUsd: number };

async function pollLeonardoGeneration(
  generationId: string,
  token: string,
  maxAttempts = 24,
  intervalMs = 2500,
): Promise<GenerationResult> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((resolve) => setTimeout(resolve, intervalMs));

    const pollRes = await fetch(`${LEONARDO_API_URL}/generations/${generationId}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!pollRes.ok) continue;

    const pollData = (await pollRes.json()) as {
      generations_by_pk?: {
        status?: string;
        generated_images?: { url?: string; id?: string }[];
      };
    };

    const generation = pollData?.generations_by_pk;
    if (generation?.status === 'COMPLETE') {
      const img = generation.generated_images?.[0];
      if (img?.url && img?.id) {
        return { url: img.url, imageId: img.id, estimatedUsd: 0 };
      }
    } else if (generation?.status === 'FAILED') {
      throw new Error('Leonardo generation failed.');
    }
  }

  throw new Error('Leonardo generation timed out.');
}

export async function generateLeonardoImageUrl(params: {
  prompt: string;
  width: number;
  height: number;
  quality?: LeonardoQuality;
  visualProfile?: 'cinematic' | 'typography';
  apiKey?: string;
}): Promise<GenerationResult> {
  const token = params.apiKey || getLeonardoApiKey();
  if (!token) {
    throw new Error('LEONARDO_API_KEY is not configured.');
  }

  const w = snapDim(params.width);
  const h = snapDim(params.height);
  const profile = selectLeonardoProfile({
    quality: params.quality ?? 'standard',
    visualProfile: params.visualProfile,
  });

  const reqBody: Record<string, unknown> = {
    prompt: params.prompt,
    modelId: profile.modelId,
    width: w,
    height: h,
    num_images: 1,
    alchemy: profile.alchemy,
    enhancePrompt: false,
  };

  if (profile.contrast != null) reqBody.contrast = profile.contrast;
  if (profile.ultra) reqBody.ultra = true;

  const initRes = await fetch(`${LEONARDO_API_URL}/generations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(reqBody),
  });

  if (!initRes.ok) {
    const errText = await initRes.text();
    throw new Error(`Leonardo API generation failed: ${initRes.status} ${errText}`);
  }

  const initData = (await initRes.json()) as {
    sdGenerationJob?: { generationId?: string };
    generationId?: string;
  };

  const generationId =
    initData?.sdGenerationJob?.generationId || initData?.generationId;

  if (!generationId) {
    throw new Error('Leonardo API did not return a generation ID.');
  }

  const result = await pollLeonardoGeneration(generationId, token);
  return { ...result, estimatedUsd: profile.estimatedUsd };
}

/** Fetch remote Leonardo CDN URL and return a canvas-safe data URL. */
export async function leonardoUrlToDataUrl(remoteUrl: string): Promise<string> {
  const imgRes = await fetch(remoteUrl, { signal: AbortSignal.timeout(35_000) });
  if (!imgRes.ok) throw new Error(`Failed to fetch Leonardo image: ${imgRes.status}`);
  const contentType = imgRes.headers.get('content-type') || 'image/png';
  const arrayBuffer = await imgRes.arrayBuffer();
  if (arrayBuffer.byteLength < 32) throw new Error('Leonardo image response too small');
  const base64 = Buffer.from(arrayBuffer).toString('base64');
  return `data:${contentType};base64,${base64}`;
}

export async function generateLeonardoMotionUrl(params: {
  imageId: string;
  apiKey?: string;
}): Promise<string> {
  const token = params.apiKey || getLeonardoApiKey();
  if (!token) throw new Error('LEONARDO_API_KEY is not configured.');

  const initRes = await fetch(`${LEONARDO_API_URL}/generations-motion-svd`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      imageId: params.imageId,
      isPublic: true,
    }),
  });

  if (!initRes.ok) {
    const errText = await initRes.text();
    throw new Error(`Leonardo Motion API failed: ${initRes.status} ${errText}`);
  }

  const initData = (await initRes.json()) as {
    motionSvdGenerationJob?: { generationId?: string };
  };
  const generationId = initData?.motionSvdGenerationJob?.generationId;
  if (!generationId) throw new Error('Leonardo Motion API did not return a generation ID.');

  for (let i = 0; i < 40; i++) {
    await new Promise((resolve) => setTimeout(resolve, 2500));

    const pollRes = await fetch(`${LEONARDO_API_URL}/generations/${generationId}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!pollRes.ok) continue;

    const pollData = (await pollRes.json()) as {
      generations_by_pk?: {
        status?: string;
        generated_images?: { motionMP4URL?: string }[];
      };
    };

    const generation = pollData?.generations_by_pk;
    if (generation?.status === 'COMPLETE') {
      const videoUrl = generation.generated_images?.[0]?.motionMP4URL;
      if (videoUrl) return videoUrl;
    } else if (generation?.status === 'FAILED') {
      throw new Error('Leonardo motion generation failed.');
    }
  }

  throw new Error('Leonardo motion generation timed out.');
}
