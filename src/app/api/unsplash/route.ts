import { NextResponse } from 'next/server';

export const maxDuration = 10;
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const accessKey = process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY;
    if (!accessKey) {
      return NextResponse.json({ error: 'Unsplash API key not configured' }, { status: 500 });
    }

    // Unsplash search endpoint
    // We request 1 photo matching the prompt
    const unsplashUrl = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(
      prompt,
    )}&per_page=1&orientation=landscape`;

    const response = await fetch(unsplashUrl, {
      headers: {
        Authorization: `Client-ID ${accessKey}`,
      },
    });

    if (!response.ok) {
      console.error('Unsplash API error:', await response.text());
      return NextResponse.json({ error: 'Unsplash API failed' }, { status: response.status });
    }

    const data = await response.json();

    if (data.results && data.results.length > 0) {
      // Return the regular sized image URL
      return NextResponse.json({ url: data.results[0].urls.regular });
    }

    // Fallback if no images found
    return NextResponse.json({ url: null });
  } catch (error) {
    console.error('Error in Unsplash route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
