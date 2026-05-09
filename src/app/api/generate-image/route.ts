import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { prompt, width = 1024, height = 1024 } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    console.log('Generating AI Image for prompt:', prompt.substring(0, 80));

    const seed     = Math.floor(Math.random() * 1_000_000);
    const encoded  = encodeURIComponent(prompt);
    const imageUrl = `https://image.pollinations.ai/prompt/${encoded}?width=${width}&height=${height}&seed=${seed}&nologo=true&enhance=true`;

    // ── Proxy the image bytes so the browser can use it in a Canvas without
    // hitting CORS / tainted-canvas errors. ────────────────────────────────
    const imgRes = await fetch(imageUrl, {
      headers: { 'User-Agent': 'PPTMaker/1.0' },
      // 30-second timeout
      signal: AbortSignal.timeout(30_000),
    });

    if (!imgRes.ok) {
      console.error('Pollinations fetch failed:', imgRes.status);
      // Fall back to returning the URL directly (canvas will try crossOrigin)
      return NextResponse.json({ url: imageUrl });
    }

    const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
    const buffer      = await imgRes.arrayBuffer();

    // Return as a base64 data URI so the browser can use it directly
    const base64  = Buffer.from(buffer).toString('base64');
    const dataUrl = `data:${contentType};base64,${base64}`;

    return NextResponse.json({ url: dataUrl });
  } catch (error) {
    console.error('Image Generation Error:', error);
    return NextResponse.json({ error: 'Failed to generate image' }, { status: 500 });
  }
}
