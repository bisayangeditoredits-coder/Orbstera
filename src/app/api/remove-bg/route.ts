import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { requireAiUser } from '@/lib/auth/require-ai-route';
import { consumeCreditsForUser } from '@/lib/billing/credits';

// remove.bg charges per image — cap payload to prevent abuse
const MAX_PAYLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

export async function POST(req: Request) {
  try {
    // ── 1. Auth + rate limit ────────────────────────────────────────────────
    const auth = await requireAiUser(req, 'default');
    if ('response' in auth) return auth.response;
    const { user } = auth;

    // ── 2. Payload size guard (prevent huge base64 abuse) ───────────────────
    const contentLength = Number(req.headers.get('content-length') ?? 0);
    if (contentLength > MAX_PAYLOAD_BYTES) {
      return NextResponse.json(
        { error: 'Image too large. Maximum size is 10 MB.' },
        { status: 413 },
      );
    }

    const body = await req.json();
    const { imageUrl } = body;

    if (!imageUrl || typeof imageUrl !== 'string') {
      return NextResponse.json({ error: 'Image URL is required' }, { status: 400 });
    }

    // Double-check base64 payload size
    if (imageUrl.startsWith('data:image/') && imageUrl.length > MAX_PAYLOAD_BYTES * 1.4) {
      return NextResponse.json(
        { error: 'Image too large. Maximum size is 10 MB.' },
        { status: 413 },
      );
    }

    // ── 3. API key check ───────────────────────────────────────────────────
    const apiKey = process.env.REMOVE_BG_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Background removal is not configured on this server.' },
        { status: 503 },
      );
    }

    // ── 4. Deduct credits (5 credits = ~same cost as one image) ───────────
    const creditResult = await consumeCreditsForUser({
      userId: user.id,
      cost: 5,
      action: 'image_standard',
      meta: { feature: 'remove_bg' },
    });

    if (!creditResult.ok) {
      const msg =
        creditResult.error === 'INSUFFICIENT_CREDITS'
          ? `Not enough credits. You have ${creditResult.summary.remaining} remaining this month.`
          : 'Credit system unavailable. Please try again.';
      return NextResponse.json({ error: msg, code: creditResult.error }, { status: 402 });
    }

    // ── 5. Call remove.bg ──────────────────────────────────────────────────
    const isBase64 = imageUrl.startsWith('data:image/');
    const bodyPayload: Record<string, string> = { size: 'auto', format: 'png' };

    if (isBase64) {
      bodyPayload.image_file_b64 = imageUrl.split(',')[1] ?? '';
    } else {
      bodyPayload.image_url = imageUrl;
    }

    const response = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: {
        'X-Api-Key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(bodyPayload),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[remove-bg] API error:', response.status, errText);
      // Refund credits on API failure
      await consumeCreditsForUser({ userId: user.id, cost: -5, action: 'image_standard', meta: { refund: 'remove_bg_error' } }).catch(() => {});
      return NextResponse.json(
        { error: 'Failed to remove background. Please try again.' },
        { status: response.status === 402 ? 503 : response.status },
      );
    }

    const data = await response.json();
    if (data?.data?.result_b64) {
      return NextResponse.json({
        success: true,
        image: `data:image/png;base64,${data.data.result_b64}`,
        creditsRemaining: creditResult.summary.remaining - 5,
      });
    }

    return NextResponse.json(
      { error: 'Invalid response from background removal service.' },
      { status: 500 },
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal server error';
    console.error('[remove-bg] Exception:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
