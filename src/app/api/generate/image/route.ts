import { NextResponse } from 'next/server';
import type { ImageVisualProfile } from '@/lib/ai/agent-models';
import { openRouterImageGeneration } from '@/lib/ai/openrouter-image';
import { requireAiUser, aiUnauthorized } from '@/lib/auth/require-ai-route';
import { captureApiException, getOrCreateRequestId } from '@/lib/observability';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(req: Request) {
  const requestId = getOrCreateRequestId(req);
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

    const auth = await requireAiUser(req, 'default');
    if ('response' in auth) {
      if (auth.response.status === 401) {
        return aiUnauthorized('Please sign in to generate images.');
      }
      return auth.response;
    }
    const user = auth.user;

    const { createServerClient } = await import('@supabase/ssr');
    const { cookies } = await import('next/headers');
    const { ensureCredits, getCreditConfig } = await import('@/lib/billing/credits');

    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { get(name: string) { return cookieStore.get(name)?.value; } } }
    );

    const { getBillingPlan } = await import('@/lib/billing/resolve-plan');
    const { readFreeTierUsage, incrementFreeTierUsage } = await import('@/lib/billing/free-tier-usage');
    const plan = await getBillingPlan(user.id);
    const isPaid = plan === 'student_pro' || plan === 'pro' || plan === 'creator_pro' || plan === 'admin';

    if (!isPaid) {
      const { FREE_TIER } = await import('@/lib/billing/free-tier-limits');
      const usage = await readFreeTierUsage(user.id);
      if (usage.free_generative_fill_uses >= FREE_TIER.generativeFillUses) {
        return NextResponse.json(
          {
            error: 'FREE_LIMIT_REACHED',
            message: `Free accounts are limited to ${FREE_TIER.generativeFillUses} Generative Fill uses. Upgrade to Pro for unlimited access.`,
            used: usage.free_generative_fill_uses,
            limit: FREE_TIER.generativeFillUses,
          },
          { status: 403 },
        );
      }
      await incrementFreeTierUsage(user.id, 'free_generative_fill_uses');
    }

    const creditConfig = await getCreditConfig(supabase);
    const cost = creditConfig.costs.image_standard || 10;

    const creditCheck = await ensureCredits({
      supabase,
      userId: user.id,
      cost,
      action: 'image_standard',
    });

    if (!creditCheck.ok) {
      return NextResponse.json(
        {
          error: 'INSUFFICIENT_CREDITS',
          message: 'Not enough credits to generate image.',
          credits: creditCheck.summary,
          required: cost,
        },
        { status: 402 },
      );
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
      console.warn('[Image] OpenRouter failed, falling back to free Pollinations API:', result.status);
      try {
        const { generatePollinationsImageUrl } = await import('@/lib/pollinations-image');
        
        let w = 1024;
        let h = 1024;
        if (typeof width === 'number' && typeof height === 'number') {
           w = Math.min(1920, Math.max(256, Math.round(width)));
           h = Math.min(1920, Math.max(256, Math.round(height)));
        }
        
        const fallbackUrl = await generatePollinationsImageUrl({
          prompt: String(prompt),
          width: w,
          height: h
        });
        
        // --- BACKGROUND REMOVAL (TRANSPARENT FLAG) ---
        let finalFallbackUrl = fallbackUrl;
        if (body.transparent) {
          const bgKey = process.env.REMOVE_BG_API_KEY?.trim();
          if (bgKey) {
            try {
              console.log('[Image] Transparent flag enabled for Pollinations, removing background...');
              const b64Data = fallbackUrl.split(',')[1];
              const formData = new FormData();
              formData.append('image_file_b64', b64Data);
              formData.append('size', 'auto');
              const bgRes = await fetch('https://api.remove.bg/v1.0/removebg', {
                method: 'POST',
                headers: { 'X-Api-Key': bgKey },
                body: formData,
              });
              if (bgRes.ok) {
                const arrayBuffer = await bgRes.arrayBuffer();
                const base64 = Buffer.from(arrayBuffer).toString('base64');
                finalFallbackUrl = `data:image/png;base64,${base64}`;
                console.log('[Image] Background removed successfully.');
              }
            } catch (bgErr) {
              console.warn('[Image] Background removal error:', bgErr);
            }
          }
        }
        // ----------------------------------------------
        
        return NextResponse.json({ url: finalFallbackUrl });
      } catch (fallbackError) {
        console.error('[Image] Pollinations fallback also failed:', fallbackError);
        return NextResponse.json(
          { error: `Image AI service error: OpenRouter ${result.status}` },
          { status: 502 }
        );
      }
    }

    // Fetch the OpenRouter image and return as Base64 PNG for CORS-free canvas rendering
    try {
      const imgRes = await fetch(result.url);
      if (!imgRes.ok) throw new Error(`Failed to fetch image: ${imgRes.status}`);
      let contentType = imgRes.headers.get('content-type') || 'image/png';
      let arrayBuffer = await imgRes.arrayBuffer();

      // --- BACKGROUND REMOVAL (TRANSPARENT FLAG) ---
      if (body.transparent) {
        const bgKey = process.env.REMOVE_BG_API_KEY?.trim();
        if (bgKey) {
          try {
            console.log('[Image] Transparent flag enabled, removing background...');
            const formData = new FormData();
            formData.append('image_file_b64', Buffer.from(arrayBuffer).toString('base64'));
            formData.append('size', 'auto');
            const bgRes = await fetch('https://api.remove.bg/v1.0/removebg', {
              method: 'POST',
              headers: { 'X-Api-Key': bgKey },
              body: formData,
            });
            if (bgRes.ok) {
              arrayBuffer = await bgRes.arrayBuffer();
              contentType = 'image/png';
              console.log('[Image] Background removed successfully.');
            } else {
              console.warn('[Image] Remove.bg failed:', await bgRes.text());
            }
          } catch (bgErr) {
            console.warn('[Image] Background removal error:', bgErr);
          }
        } else {
          console.warn('[Image] Transparent requested but REMOVE_BG_API_KEY is missing in .env.local');
        }
      }
      // ----------------------------------------------

      const base64 = Buffer.from(arrayBuffer).toString('base64');
      return NextResponse.json({ url: `data:${contentType};base64,${base64}` });
    } catch {
      // If proxy-fetch fails, return original URL as last resort
      return NextResponse.json({ url: result.url });
    }
  } catch (error) {
    console.error('Image Generation Error:', error);
    captureApiException(error, { requestId, route: 'POST /api/generate/image' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
