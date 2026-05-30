import { NextResponse } from 'next/server';
import type { ImageVisualProfile } from '@/lib/ai/agent-models';
import { selectImageProvider, type AiTask } from '@/lib/ai/router';
import { getSpendState } from '@/lib/ai/spend';
import { requireAiUser, aiUnauthorized } from '@/lib/auth/require-ai-route';
import { captureApiException, getOrCreateRequestId } from '@/lib/observability';
import { imageRateLimit } from '@/lib/rate-limit';
import { readJsonBodyWithLimit } from '@/lib/http/request-body-limit';
import {
  generateLeonardoImageUrl,
  getLeonardoApiKey,
  isLeonardoConfigured,
  leonardoQualityForPlan,
  leonardoUrlToDataUrl,
} from '@/lib/leonardo-image';

export const runtime = 'nodejs';
export const maxDuration = 120;
const MAX_BODY_BYTES = 256 * 1024;

export async function POST(req: Request) {
  const requestId = getOrCreateRequestId(req);
  try {
    if (!isLeonardoConfigured()) {
      return NextResponse.json(
        { error: 'LEONARDO_API_KEY is not configured.' },
        { status: 503 },
      );
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
            },
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
    } = body as {
      prompt?: string;
      size?: string;
      width?: number;
      height?: number;
      visualProfile?: ImageVisualProfile;
      task?: AiTask;
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
      { cookies: { get(name: string) { return cookieStore.get(name)?.value; } } },
    );

    const { getBillingPlan } = await import('@/lib/billing/resolve-plan');
    const plan = await getBillingPlan(user.id);

    const isGenfillTask = task === 'genfill_image' || task === 'magic_edit_image';

    const { chargeCreditsBeforeJob, getActionCreditCost, getCreditConfig, getGenfillCreditAction, getImageCreditAction } =
      await import('@/lib/billing/credits');
    const creditConfig = await getCreditConfig(supabase);
    const creditAction = isGenfillTask
      ? getGenfillCreditAction(plan)
      : getImageCreditAction(
          plan,
          (plan === 'creator_pro' || plan === 'admin') && visualProfile === 'cinematic',
        );
    const cost = getActionCreditCost(creditConfig, creditAction);

    const creditCheck = await chargeCreditsBeforeJob({
      supabase,
      userId: user.id,
      action: creditAction,
      cost,
      meta: { route: 'generate/image', task, provider: 'leonardo' },
      idempotencyKey: requestId,
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

    let w = 1024;
    let h = 1024;
    if (typeof width === 'number' && typeof height === 'number' && width > 0 && height > 0) {
      w = Math.min(1536, Math.max(256, Math.round(width)));
      h = Math.min(1536, Math.max(256, Math.round(height)));
    } else if (typeof sizeIn === 'string' && sizeIn.includes('x')) {
      const [sw, sh] = sizeIn.split('x').map((n) => parseInt(n, 10));
      if (sw > 0) w = sw;
      if (sh > 0) h = sh;
    }

    const spend = await getSpendState({ supabase });
    const imgSel = selectImageProvider({
      plan,
      visualProfile,
      premiumRequested: (plan === 'creator_pro' || plan === 'admin') && visualProfile === 'cinematic',
      spendState: { forcedEconomyMode: spend.forcedEconomyMode },
      task: isGenfillTask ? task : 'image_generate',
      hasOpenRouterKey: false,
      hasLeonardoKey: isLeonardoConfigured(),
      hasClaidKey: false,
      hasPollinationsKey: false,
    });

    const quality = leonardoQualityForPlan({
      plan,
      task: isGenfillTask ? 'genfill_image' : 'image_generate',
      premiumRequested: (plan === 'creator_pro' || plan === 'admin') && visualProfile === 'cinematic',
    });

    let leonardoResult: Awaited<ReturnType<typeof generateLeonardoImageUrl>>;
    try {
      leonardoResult = await generateLeonardoImageUrl({
        prompt: String(prompt),
        width: w,
        height: h,
        quality,
        visualProfile,
        apiKey: getLeonardoApiKey() || undefined,
      });
    } catch (leonardoErr) {
      console.error('[Image] Leonardo failed:', leonardoErr);
      return NextResponse.json(
        {
          error: leonardoErr instanceof Error ? leonardoErr.message : 'Leonardo image generation failed',
        },
        { status: 502 },
      );
    }

    const { addEstimatedSpend } = await import('@/lib/ai/spend');
    void addEstimatedSpend({ supabase, usdDelta: leonardoResult.estimatedUsd });

    try {
      let dataUrl = await leonardoUrlToDataUrl(leonardoResult.url);

      if (body.transparent) {
        const bgKey = process.env.REMOVE_BG_API_KEY?.trim();
        if (bgKey) {
          try {
            const b64Data = dataUrl.split(',')[1];
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
              dataUrl = `data:image/png;base64,${Buffer.from(arrayBuffer).toString('base64')}`;
            } else {
              console.warn('[Image] Remove.bg failed:', await bgRes.text());
            }
          } catch (bgErr) {
            console.warn('[Image] Background removal error:', bgErr);
          }
        } else {
          console.warn('[Image] Transparent requested but REMOVE_BG_API_KEY is missing');
        }
      }

      return NextResponse.json({
        url: dataUrl,
        imageId: leonardoResult.imageId,
        provider: imgSel.provider,
      });
    } catch (fetchErr) {
      console.warn('[Image] Leonardo proxy fetch failed, returning CDN URL:', fetchErr);
      return NextResponse.json({
        url: leonardoResult.url,
        imageId: leonardoResult.imageId,
        provider: imgSel.provider,
      });
    }
  } catch (error) {
    console.error('Image Generation Error:', error);
    captureApiException(error, { requestId, route: 'POST /api/generate/image' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
