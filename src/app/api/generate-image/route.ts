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

    // Instantly return the URL to the client. Konva's useImage hook with 'anonymous' 
    // will handle CORS. This prevents blocking the browser while the image renders.
    return NextResponse.json({ url: imageUrl });
  } catch (error) {
    console.error('Image Generation Error:', error);
    return NextResponse.json({ error: 'Failed to generate image' }, { status: 500 });
  }
}
