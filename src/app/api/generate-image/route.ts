import { NextResponse } from 'next/server';

const POLISH_SUFFIX =
  ', editorial quality, sharp focus, balanced composition, clean professional look, no text overlays, no watermarks';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { prompt, width = 1024, height = 1024, polish = true } = body;

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    let text = String(prompt).trim();
    if (polish) {
      const lower = text.toLowerCase();
      const already = lower.includes('no text') || lower.includes('no watermark');
      if (!already) text = `${text}${POLISH_SUFFIX}`;
    }

    const w = Math.max(256, Math.min(1536, Math.round(Number(width)) || 1024));
    const h = Math.max(256, Math.min(1536, Math.round(Number(height)) || 1024));

    console.log('Generating AI Image for prompt:', text.substring(0, 80));

    const seed = Math.floor(Math.random() * 1_000_000);
    const encoded = encodeURIComponent(text);
    const imageUrl = `https://image.pollinations.ai/prompt/${encoded}?width=${w}&height=${h}&seed=${seed}&nologo=true&enhance=true`;

    return NextResponse.json({ url: imageUrl, seed });
  } catch (error) {
    console.error('Image Generation Error:', error);
    return NextResponse.json({ error: 'Failed to generate image' }, { status: 500 });
  }
}
