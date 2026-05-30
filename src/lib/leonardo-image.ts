/**
 * Server-side image generation, migrated to Fal.ai (FLUX 1.1 Pro)
 * as a drop-in replacement for the previous Leonardo integration.
 */

import { snapDim } from '@/lib/leonardo-dimensions';

export { snapDim } from '@/lib/leonardo-dimensions';

const FAL_API_URL = 'https://fal.run/fal-ai/flux-pro/v1.1';

export type LeonardoQuality = 'economy' | 'standard' | 'premium' | 'genfill';

export function getLeonardoApiKey(): string | null {
  let key = (process.env.FAL_KEY || process.env.LEONARDO_API_KEY || '').trim();
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

export function leonardoQualityForPlan(args: {
  plan: string;
  task: 'deck_slide_image' | 'genfill_image' | 'magic_edit_image' | 'image_generate';
  premiumRequested?: boolean;
}): LeonardoQuality {
  // Always return standard for Fal.ai as it doesn't use these quality tiers
  return 'standard';
}

type GenerationResult = { url: string; imageId: string; estimatedUsd: number };

function getEnhancedPrompt(basePrompt: string, visualProfile?: string): string {
  const modifiers = [
    "masterpiece",
    "highly detailed",
    "8k resolution",
    "cinematic lighting",
    "hyperrealistic"
  ];
  
  if (visualProfile === 'cinematic') {
    modifiers.push("dramatic composition", "color graded", "stunning visuals");
  } else if (visualProfile === 'typography') {
    modifiers.push("clean background", "negative space", "sharp focus");
  }

  return `${basePrompt}, ${modifiers.join(", ")}`;
}

export async function generateLeonardoImageUrl(params: {
  prompt: string;
  width: number;
  height: number;
  quality?: LeonardoQuality;
  visualProfile?: 'cinematic' | 'typography';
  apiKey?: string;
  enhancePrompt?: boolean;
}): Promise<GenerationResult> {
  const token = params.apiKey || getLeonardoApiKey();
  if (!token) {
    throw new Error('FAL_KEY is not configured.');
  }

  const w = snapDim(params.width);
  const h = snapDim(params.height);
  
  const finalPrompt = params.enhancePrompt !== false 
    ? getEnhancedPrompt(params.prompt, params.visualProfile) 
    : params.prompt;

  const reqBody = {
    prompt: finalPrompt,
    image_size: { width: w, height: h },
    num_images: 1,
  };

  const initRes = await fetch(FAL_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Key ${token}`,
    },
    body: JSON.stringify(reqBody),
  });

  if (!initRes.ok) {
    const errText = await initRes.text();
    throw new Error(`Fal API generation failed: ${initRes.status} ${errText}`);
  }

  const data = await initRes.json() as {
    images?: { url?: string; content_type?: string }[];
  };

  const url = data.images?.[0]?.url;
  
  if (!url) {
    throw new Error('Fal API did not return an image URL.');
  }

  // Fal currently charges roughly $0.04 per Flux Pro v1.1 image
  return { url, imageId: url, estimatedUsd: 0.04 };
}

export async function leonardoUrlToDataUrl(remoteUrl: string): Promise<string> {
  const imgRes = await fetch(remoteUrl, { signal: AbortSignal.timeout(35_000) });
  if (!imgRes.ok) throw new Error(`Failed to fetch image: ${imgRes.status}`);
  const contentType = imgRes.headers.get('content-type') || 'image/png';
  const arrayBuffer = await imgRes.arrayBuffer();
  if (arrayBuffer.byteLength < 32) throw new Error('Image response too small');
  const base64 = Buffer.from(arrayBuffer).toString('base64');
  return `data:${contentType};base64,${base64}`;
}
