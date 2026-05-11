import { NextResponse } from 'next/server';
import type { ImageVisualProfile } from '@/lib/ai/agent-models';
import { openRouterImageGeneration } from '@/lib/ai/openrouter-image';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const DEFAULT_IMAGE_MODEL =
  process.env.OPENROUTER_IMAGE_MODEL?.trim() || 'black-forest-labs/flux-1.1-pro';

function clampImageEdge(n: unknown, fallback: number) {
  const v = Math.round(Number(n));
  if (!Number.isFinite(v) || v <= 0) return fallback;
  return Math.max(1, Math.min(1536, v));
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      prompt,
      size: sizeIn,
      width,
      height,
      visualProfile = 'cinematic',
    } = body as {
      prompt?: string;
      size?: string;
      width?: number;
      height?: number;
      visualProfile?: ImageVisualProfile;
    };

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

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
  } catch (error) {
    console.error('Image Generation Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
