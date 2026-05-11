import { NextResponse } from 'next/server';
<<<<<<< HEAD
import type { ImageVisualProfile } from '@/lib/ai/agent-models';
import { openRouterImageGeneration } from '@/lib/ai/openrouter-image';
=======
import { generateClaidImageUrl } from '@/lib/claid-image';
import { generatePollinationsImageUrl } from '@/lib/pollinations-image';
>>>>>>> cursor/pollinations-api-voice-protocol

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const DEFAULT_IMAGE_MODEL =
  process.env.OPENROUTER_IMAGE_MODEL?.trim() || 'black-forest-labs/flux-1.1-pro';

function clampImageEdge(n: unknown, fallback: number) {
  const v = Math.round(Number(n));
  if (!Number.isFinite(v) || v <= 0) return fallback;
  // Preserve requested region dimensions as much as possible.
  return Math.max(1, Math.min(1536, v));
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      prompt,
<<<<<<< HEAD
      size: sizeIn,
      width,
      height,
      visualProfile = 'cinematic',
    } = body as {
=======
      size,
      width,
      height,
      model,
      format,
      polish,
    }: {
>>>>>>> cursor/pollinations-api-voice-protocol
      prompt?: string;
      size?: string;
      width?: number;
      height?: number;
<<<<<<< HEAD
      visualProfile?: ImageVisualProfile;
    };
=======
      model?: string;
      format?: 'png' | 'jpeg' | 'webp';
      polish?: boolean;
    } = body || {};
>>>>>>> cursor/pollinations-api-voice-protocol

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

<<<<<<< HEAD
    if (!OPENROUTER_API_KEY.trim()) {
      return NextResponse.json({ error: 'OPENROUTER_API_KEY is not configured.' }, { status: 503 });
    }

    let size = typeof sizeIn === 'string' && sizeIn.includes('x') ? sizeIn : '1024x1024';
    if (typeof width === 'number' && typeof height === 'number' && width > 0 && height > 0) {
      const w = Math.min(1920, Math.max(256, Math.round(width)));
      const h = Math.min(1920, Math.max(256, Math.round(height)));
      size = `${w}x${h}`;
    }

    const result = await openRouterImageGeneration({
      prompt: String(prompt),
      size,
      visualProfile,
    });

    if (!result.ok || !result.url) {
      console.error('[Image] OpenRouter error:', result.status, result.body?.slice?.(0, 400));
      return NextResponse.json(
        { error: `Image AI service error: ${result.status}` },
        { status: 502 }
      );
    }

    return NextResponse.json({ url: result.url });
=======
    const w = clampImageEdge(width, 1024);
    const h = clampImageEdge(height, 1024);
    const resolvedSize =
      typeof size === 'string' && size.includes('x') ? size : `${w}x${h}`;
    const resolvedModel = (typeof model === 'string' && model.trim()) ? model.trim() : DEFAULT_IMAGE_MODEL;
    const resolvedFormat = (format === 'png' || format === 'jpeg' || format === 'webp') ? format : undefined;
    const usePolish = Boolean(polish);

    const hasClaid = Boolean(process.env.CLAID_API_KEY?.trim());
    const hasPollinations = Boolean(process.env.POLLINATIONS_API_KEY?.trim());
    const hasFallbackProvider = hasClaid || hasPollinations;
    const openRouterEnabled = Boolean(OPENROUTER_API_KEY.trim());

    const tryFallback = async () => {
      if (!hasFallbackProvider) return null;
      const url = hasClaid
        ? await generateClaidImageUrl({ prompt, polish: usePolish, width: w, height: h })
        : await generatePollinationsImageUrl({ prompt, polish: usePolish, width: w, height: h });
      return url;
    };

    if (openRouterEnabled) {
      const response = await fetch('https://openrouter.ai/api/v1/images/generations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
          'X-Title': 'Orbstera',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: resolvedModel,
          prompt,
          size: resolvedSize,
          response_format: 'url',
          ...(resolvedFormat ? { output_format: resolvedFormat, image_format: resolvedFormat } : {}),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const imageUrl = data.data?.[0]?.url;
        if (imageUrl) return NextResponse.json({ url: imageUrl, provider: 'openrouter' });
      } else {
        const errorText = await response.text();
        console.error('OpenRouter Image Error:', response.status, errorText);
      }
    }

    try {
      const fallbackUrl = await tryFallback();
      if (fallbackUrl) {
        return NextResponse.json({
          url: fallbackUrl,
          provider: hasClaid ? 'claid' : 'pollinations',
        });
      }
    } catch (fallbackError) {
      console.error('Fallback Image Provider Error:', fallbackError);
    }

    return NextResponse.json(
      {
        error:
          'Image generation failed on all providers. Check OPENROUTER_API_KEY / OPENROUTER_IMAGE_MODEL or configure CLAID_API_KEY / POLLINATIONS_API_KEY.',
      },
      { status: 502 },
    );
>>>>>>> cursor/pollinations-api-voice-protocol
  } catch (error) {
    console.error('Image Generation Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
