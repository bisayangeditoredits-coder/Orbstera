import { NextResponse } from 'next/server';
import { requireAiUser } from '@/lib/auth/require-ai-route';
import { PUBLIC_CDN_PROXY } from '@/lib/http/cache-headers';

// Pollinations is free but proxying it unprotected = open abuse vector.
// Gate with auth so only your signed-in users can use it.
export const runtime = 'nodejs';

const MAX_PROMPT_CHARS = 500;

export async function GET(req: Request) {
  // ── Auth + rate limit ─────────────────────────────────────────────────────
  const auth = await requireAiUser(req, 'default');
  if ('response' in auth) return auth.response;

  const { searchParams } = new URL(req.url);
  const prompt = searchParams.get('prompt')?.slice(0, MAX_PROMPT_CHARS);

  if (!prompt) {
    return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
  }

  try {
    const randomSeed = Math.floor(Math.random() * 1_000_000);
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?seed=${randomSeed}`;

    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Pollinations API failed: ${response.status}`);
    }

    const imageBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') ?? 'image/jpeg';

    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        ...PUBLIC_CDN_PROXY,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Proxy error';
    console.error('[pollinations] Proxy error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
