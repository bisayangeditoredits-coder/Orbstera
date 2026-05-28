import { NextResponse } from 'next/server';
import type { ImageVisualProfile } from '@/lib/ai/agent-models';
import { openRouterImageGeneration } from '@/lib/ai/openrouter-image';
import { generateLeonardoImageUrl } from '@/lib/leonardo-image';
import { selectImageProvider, type AiTask } from '@/lib/ai/router';
import { getSpendState } from '@/lib/ai/spend';
import { requireAiUser, aiUnauthorized } from '@/lib/auth/require-ai-route';
import { captureApiException, getOrCreateRequestId } from '@/lib/observability';
import { imageRateLimit } from '@/lib/rate-limit';
import { readJsonBodyWithLimit } from '@/lib/http/request-body-limit';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';

export const runtime = 'nodejs';
export const maxDuration = 120;
const MAX_BODY_BYTES = 256 * 1024;

export async function POST(req: Request) {
  const requestId = getOrCreateRequestId(req);
  try {
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

    if (imageRateLimit) {
      const ip = req.headers.get('x-forwarded-for') ?? '127.0.0.1';
      const identifier = `${user.id}-${ip}`;
      try {
        const { success, limit, reset, remaining } = await imageRateLimit.limit(identifier);
        if (!success) {
          return NextResponse.json(
            { error: 'Rate limit exceeded. Please try again later.' },
            {
              status: 429,
              headers: {
                'X-RateLimit-Limit': limit.toString(),
                'X-RateLimit-Remaining': remaining.toString(),
                'X-RateLimit-Reset': reset.toString(),
              },
            }
          );
        }
      } catch (rlError) {
        console.warn('[Image] Rate limit check failed, failing open:', rlError);
      }
    }

    const bodyResult = await readJsonBodyWithLimit<Record<string, unknown>>(req, MAX_BODY_BYTES);
    if (!bodyResult.ok) return bodyResult.response;
    const body = bodyResult.value;
    const {
      prompt,
      size: sizeIn,
      width,
      height,
      visualProfile = 'cinematic',
      task = 'image_generate',
      sourceImage,
      maskImage,
    } = body as {
      prompt?: string;
      size?: string;
      width?: number;
      height?: number;
      visualProfile?: ImageVisualProfile;
      task?: AiTask;
      sourceImage?: string;
      maskImage?: string;
      transparent?: boolean;
    };

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const { createServerClient } = await import('@supabase/ssr');
    const { cookies } = await import('next/headers');

    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { get(name: string) { return cookieStore.get(name)?.value; } } }
    );

    const { getBillingPlan } = await import('@/lib/billing/resolve-plan');
    const { consumeFreeGenfillSlot, isPaidPlan } = await import('@/lib/billing/free-genfill-redis');
    const plan = await getBillingPlan(user.id);
    const isPaid = isPaidPlan(plan);

    const isGenfillTask = task === 'genfill_image' || task === 'magic_edit_image';

    // ── Retry helper: retries fn up to maxAttempts times on 429/503 responses ──
    const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));
    async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> {
      const backoffMs = [500, 1500, 3000];
      let lastErr: unknown;
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
          return await fn();
        } catch (err) {
          lastErr = err;
          const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
          const isRetryable = msg.includes('429') || msg.includes('503') ||
            msg.includes('rate limit') || msg.includes('too many');
          if (!isRetryable || attempt >= maxAttempts - 1) throw err;
          console.warn(`[Image] Retryable error (attempt ${attempt + 1}/${maxAttempts}), retrying in ${backoffMs[attempt]}ms:`, msg);
          await sleep(backoffMs[attempt]);
        }
      }
      throw lastErr;
    }

    // ── FREE USERS: Pollinations + monthly Redis cap (no credits) ──
    if (!isPaid) {
      const slot = await consumeFreeGenfillSlot(user.id);
      if (!slot.ok) {
        return NextResponse.json(
          {
            error: 'FREE_LIMIT_REACHED',
            message: 'You have used all 15 free AI image edits this month. Upgrade to Pro for unlimited.',
            used: slot.used,
            remaining: 0,
          },
          { status: 402 },
        );
      }
      try {
        const { generatePollinationsImageUrl } = await import('@/lib/pollinations-image');
        let pw = 1024;
        let ph = 1024;
        if (typeof width === 'number' && typeof height === 'number' && width > 0 && height > 0) {
          pw = Math.round(width);
          ph = Math.round(height);
          // Scale down proportionally if either exceeds 1024 (Pollinations free limit)
          if (pw > 1024 || ph > 1024) {
            const scale = Math.min(1024 / pw, 1024 / ph);
            pw = Math.round(pw * scale);
            ph = Math.round(ph * scale);
          }
          // Scale up proportionally if either is below 256 — never clamp independently
          if (pw < 256 || ph < 256) {
            const scale = Math.max(256 / pw, 256 / ph);
            pw = Math.round(pw * scale);
            ph = Math.round(ph * scale);
          }
          // Align to 8px grid for diffusion models
          pw = Math.max(8, Math.round(pw / 8) * 8);
          ph = Math.max(8, Math.round(ph / 8) * 8);
        }
        const { generateLeonardoImageUrl } = await import('@/lib/leonardo-image');
        const resObj = await withRetry(() => generateLeonardoImageUrl({ prompt: String(prompt), width: pw, height: ph }));
        let finalFreeUrl = resObj.url;
        
        if (body.transparent) {
          const bgKey = process.env.REMOVE_BG_API_KEY?.trim();
          if (bgKey) {
            try {
              const b64Data = finalFreeUrl.split(',')[1];
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
                finalFreeUrl = `data:image/png;base64,${Buffer.from(arrayBuffer).toString('base64')}`;
              }
            } catch (bgErr) {
              console.warn('[Image] Free-user background removal error:', bgErr);
            }
          }
        }
        return NextResponse.json({ url: finalFreeUrl, imageId: resObj.imageId });
      } catch (freeErr) {
        console.error('[Image] Leonardo generation failed for free user:', freeErr);
        const freeErrMsg = (freeErr instanceof Error ? freeErr.message : String(freeErr)).toLowerCase();
        if (freeErrMsg.includes('429') || freeErrMsg.includes('rate limit') || freeErrMsg.includes('too many')) {
          return NextResponse.json(
            { error: 'RATE_LIMITED', message: 'AI servers are busy. Please try again in a moment.' },
            { status: 429 },
          );
        }
        return NextResponse.json({ error: 'Image generation failed. Please try again.' }, { status: 502 });
      }
    }

    // ── PAID USERS: deduct credits then use OpenRouter → Pollinations fallback ──
    const { chargeCreditsBeforeJob, getActionCreditCost, getCreditConfig, getGenfillCreditAction } =
      await import('@/lib/billing/credits');
    const creditConfig = await getCreditConfig(supabase);
    const creditAction = isGenfillTask
      ? getGenfillCreditAction(plan)
      : (await import('@/lib/billing/credits')).getImageCreditAction(
          plan,
          (plan === 'creator_pro' || plan === 'admin') && visualProfile === 'cinematic',
        );
    const cost = getActionCreditCost(creditConfig, creditAction);

    const creditCheck = await chargeCreditsBeforeJob({
      supabase,
      userId: user.id,
      action: creditAction,
      cost,
      meta: { route: 'generate/image', task },
      idempotencyKey: requestId,
    });
    if (!creditCheck.ok) {
      return NextResponse.json(
        { error: 'INSUFFICIENT_CREDITS', message: 'Not enough credits to generate image.', credits: creditCheck.summary, required: cost },
        { status: 402 },
      );
    }

    let size = typeof sizeIn === 'string' && sizeIn.includes('x') ? sizeIn : '1024x1024';
    if (typeof width === 'number' && typeof height === 'number' && width > 0 && height > 0) {
      const w = Math.min(1920, Math.max(256, Math.round(width)));
      const h = Math.min(1920, Math.max(256, Math.round(height)));
      size = `${w}x${h}`;
    }

    const spend = await getSpendState({ supabase });
    const isGenfill = task === 'genfill_image' || task === 'magic_edit_image';
    const imgSel = selectImageProvider({
      plan,
      visualProfile,
      premiumRequested: (plan === 'creator_pro' || plan === 'admin') && visualProfile === 'cinematic',
      spendState: { forcedEconomyMode: spend.forcedEconomyMode },
      task: isGenfill ? task : 'image_generate',
      hasOpenRouterKey: true,
      hasClaidKey: Boolean(process.env.CLAID_API_KEY?.trim()),
      hasPollinationsKey: true,
    });

    // Fallback if we need to call leonardo manually (removed animate pre-check)

    const openRouterArgs = {
      prompt: String(prompt),
      size,
      visualProfile,
      model: imgSel.model,
      modelCascade: imgSel.modelCascade,
      qualityBoost: plan === 'creator_pro' || plan === 'admin' || plan === 'student_pro' || plan === 'pro',
      sourceImage: typeof sourceImage === 'string' ? sourceImage : undefined,
      maskImage: typeof maskImage === 'string' ? maskImage : undefined,
      plan,
    };
    let result = await openRouterImageGeneration(openRouterArgs);
    // Single retry on 429/503 from OpenRouter before falling back to Pollinations
    if (!result.ok && (result.status === 429 || result.status === 503)) {
      console.warn(`[Image] OpenRouter returned ${result.status}, retrying once after 1500ms...`);
      await sleep(1500);
      result = await openRouterImageGeneration(openRouterArgs);
    }

    if (!result.ok || !result.url) {
      console.warn('[Image] OpenRouter failed, falling back to Pollinations:', result.status);
      try {
        const { generatePollinationsImageUrl } = await import('@/lib/pollinations-image');
        let w = 1024;
        let h = 1024;
        if (typeof width === 'number' && typeof height === 'number') {
          w = Math.min(1920, Math.max(256, Math.round(width)));
          h = Math.min(1920, Math.max(256, Math.round(height)));
        }
        const fallbackUrl = await generatePollinationsImageUrl({ prompt: String(prompt), width: w, height: h });
        let finalFallbackUrl = fallbackUrl;
        if (body.transparent) {
          const bgKey = process.env.REMOVE_BG_API_KEY?.trim();
          if (bgKey) {
            try {
              const b64Data = fallbackUrl.split(',')[1];
              const formData = new FormData();
              formData.append('image_file_b64', b64Data);
              formData.append('size', 'auto');
              const bgRes = await fetch('https://api.remove.bg/v1.0/removebg', { method: 'POST', headers: { 'X-Api-Key': bgKey }, body: formData });
              if (bgRes.ok) {
                const arrayBuffer = await bgRes.arrayBuffer();
                finalFallbackUrl = `data:image/png;base64,${Buffer.from(arrayBuffer).toString('base64')}`;
              }
            } catch (bgErr) {
              console.warn('[Image] Background removal error:', bgErr);
            }
          }
        }
        return NextResponse.json({ url: finalFallbackUrl });
      } catch (fallbackError) {
        console.error('[Image] Pollinations fallback also failed:', fallbackError);
        return NextResponse.json({ error: `Image AI service error: OpenRouter ${result.status}` }, { status: 502 });
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
            // transparent mode enabled
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
              // background removal complete
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
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
