import { NextResponse } from 'next/server';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const DEFAULT_IMAGE_MODEL =
  process.env.OPENROUTER_IMAGE_MODEL?.trim() || 'black-forest-labs/flux-1.1-pro';

function clampImageEdge(n: unknown, fallback: number) {
  const v = Math.round(Number(n));
  if (!Number.isFinite(v) || v <= 0) return fallback;
  return Math.max(256, Math.min(1536, v));
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      prompt,
      size,
      width,
      height,
      model,
    }: {
      prompt?: string;
      size?: string;
      width?: number;
      height?: number;
      model?: string;
    } = body || {};

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const w = clampImageEdge(width, 1024);
    const h = clampImageEdge(height, 1024);
    const resolvedSize =
      typeof size === 'string' && size.includes('x') ? size : `${w}x${h}`;
    const resolvedModel = (typeof model === 'string' && model.trim()) ? model.trim() : DEFAULT_IMAGE_MODEL;

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
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter Image Error:', response.status, errorText);
      return NextResponse.json(
        { error: `Image AI service error: ${response.status}` },
        { status: 502 }
      );
    }

    const data = await response.json();
    const imageUrl = data.data?.[0]?.url;

    if (!imageUrl) {
      return NextResponse.json({ error: 'No image generated' }, { status: 500 });
    }

    return NextResponse.json({ url: imageUrl });
  } catch (error) {
    console.error('Image Generation Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
