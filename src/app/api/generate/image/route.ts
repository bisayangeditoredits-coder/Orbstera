import { NextResponse } from 'next/server';
import { IMAGE_MODELS, type ImageVisualProfile } from '@/lib/ai/agent-models';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';

async function openRouterImage(
  model: string,
  prompt: string,
  size: string
): Promise<{ ok: boolean; url?: string; status: number; body: string }> {
  const response = await fetch('https://openrouter.ai/api/v1/images/generations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      'X-Title': 'Orbstera',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      prompt,
      size,
      response_format: 'url',
    }),
  });
  const body = await response.text();
  if (!response.ok) {
    return { ok: false, status: response.status, body };
  }
  try {
    const data = JSON.parse(body) as { data?: { url?: string }[] };
    const url = data.data?.[0]?.url;
    if (!url) return { ok: false, status: response.status, body };
    return { ok: true, url, status: response.status, body };
  } catch {
    return { ok: false, status: response.status, body };
  }
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

    let size = typeof sizeIn === 'string' && sizeIn.includes('x') ? sizeIn : '1024x1024';
    if (typeof width === 'number' && typeof height === 'number' && width > 0 && height > 0) {
      const w = Math.min(1920, Math.max(256, Math.round(width)));
      const h = Math.min(1920, Math.max(256, Math.round(height)));
      size = `${w}x${h}`;
    }

    const primary =
      visualProfile === 'typography' ? IMAGE_MODELS.ideogram : IMAGE_MODELS.flux;
    const secondary = IMAGE_MODELS.fallback;

    let result = await openRouterImage(primary, String(prompt), size);
    if (!result.ok && secondary !== primary) {
      console.warn('[Image] primary model failed, fallback:', primary, result.status, result.body.slice(0, 200));
      result = await openRouterImage(secondary, String(prompt), String(size));
    }

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
