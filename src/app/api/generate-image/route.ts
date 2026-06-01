import { NextResponse } from 'next/server';
import type { ImageVisualProfile } from '@/lib/ai/agent-models';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import {
  chargeCreditsBeforeJob,
  getActionCreditCost,
  getCreditConfig,
  getImageCreditAction,
} from '@/lib/billing/credits';
import { selectImageProvider } from '@/lib/ai/router';
import { addEstimatedSpend, getSpendState } from '@/lib/ai/spend';
import { requireAiUser, aiUnauthorized } from '@/lib/auth/require-ai-route';
import { captureApiException, getOrCreateRequestId } from '@/lib/observability';
import { readJsonBodyWithLimit } from '@/lib/http/request-body-limit';
import { regionToLeonardoPixels } from '@/lib/leonardo-dimensions';
import {
  generateLeonardoImageUrl,
  getLeonardoApiKey,
  isLeonardoConfigured,
  leonardoQualityForPlan,
} from '@/lib/leonardo-image';

const POLISH_SUFFIX =
  ', editorial quality, sharp focus, balanced composition, clean professional look, no text overlays, no watermarks';

export const runtime = 'nodejs';
export const maxDuration = 120;
const MAX_BODY_BYTES = 128 * 1024;

export async function POST(req: Request) {
  const requestId = getOrCreateRequestId(req);
  try {
    const auth = await requireAiUser(req, 'default');
    if ('response' in auth) {
      if (auth.response.status === 401) {
        return aiUnauthorized('Please sign in to generate images.');
      }
      return auth.response;
    }
    const user = auth.user;

    const bodyResult = await readJsonBodyWithLimit<Record<string, unknown>>(req, MAX_BODY_BYTES);
    if (!bodyResult.ok) return bodyResult.response;
    const body = bodyResult.value;
    const {
      prompt,
      width = 1024,
      height = 1024,
      polish = true,
      visualProfile = 'cinematic',
      task = 'image_generate',
    } = body as {
      prompt?: string;
      width?: number;
      height?: number;
      polish?: boolean;
      visualProfile?: ImageVisualProfile;
      task?: 'image_generate' | 'genfill_image' | 'magic_edit_image' | 'deck_slide_image';
    };

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    let text = String(prompt).trim();
    if (polish) {
      const lower = text.toLowerCase();
      const already = lower.includes('no text') || lower.includes('no watermark');
      if (!already) text = `${text}${POLISH_SUFFIX}`;
    }

    const rawW = Math.max(256, Math.min(1536, Math.round(Number(width)) || 1024));
    const rawH = Math.max(256, Math.min(1536, Math.round(Number(height)) || 1024));
    const { width: w, height: h } = regionToLeonardoPixels(rawW, rawH);
    const isDeckSlide = task === 'deck_slide_image';

    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { get(name: string) { return cookieStore.get(name)?.value; } } },
    );
    const { getBillingPlan } = await import('@/lib/billing/resolve-plan');
    const plan = await getBillingPlan(user.id);

    const creditConfig = await getCreditConfig(supabase);
    const premiumRequested = visualProfile === 'cinematic' && (plan === 'creator_pro' || plan === 'admin');
    const imageAction = getImageCreditAction(plan, premiumRequested);
    const imageCost = getActionCreditCost(creditConfig, imageAction);

    let creditsCharged = false;
    if (!isDeckSlide) {
      const credit = await chargeCreditsBeforeJob({
        supabase,
        userId: user.id,
        action: imageAction,
        cost: imageCost,
        meta: { w, h, visualProfile, provider: 'leonardo' },
        idempotencyKey: requestId,
      });
      if (!credit.ok) {
        // Fallback to Pollinations for ALL users who run out of credits
        const safePrompt = encodeURIComponent(text);
        const pUrl = `https://image.pollinations.ai/prompt/${safePrompt}?width=${w}&height=${h}&seed=${seed}&nologo=true`;
        return NextResponse.json({
          url: pUrl,
          seed,
          imageId: `fallback-${Date.now()}`,
          provider: 'pollinations',
          fallback: true,
        });
      }
      creditsCharged = true;
    } else {
      const credit = await chargeCreditsBeforeJob({
        supabase,
        userId: user.id,
        action: imageAction,
        cost: imageCost,
        meta: { w, h, visualProfile, deckSlide: true, provider: 'leonardo' },
        idempotencyKey: requestId,
      });
      if (!credit.ok) {
        // Fallback to Pollinations for ALL users who run out of credits (even during deck generation)
        const safePrompt = encodeURIComponent(text);
        const pUrl = `https://image.pollinations.ai/prompt/${safePrompt}?width=${w}&height=${h}&seed=${seed}&nologo=true`;
        return NextResponse.json({
          url: pUrl,
          seed,
          imageId: `fallback-${Date.now()}`,
          provider: 'pollinations',
          fallback: true,
        });
      }
      creditsCharged = true;
    }

    const spend = await getSpendState({ supabase });
    const sel = selectImageProvider({
      plan,
      visualProfile,
      premiumRequested,
      spendState: { forcedEconomyMode: spend.forcedEconomyMode },
      task,
      freeTaste: plan === 'free',
      hasOpenRouterKey: false,
      hasLeonardoKey: isLeonardoConfigured(),
      hasClaidKey: false,
      hasPollinationsKey: false,
    });

    const seed = Math.floor(Math.random() * 1_000_000);
    let url: string | undefined;
    let imageId: string | undefined;
    let provider: string | undefined;

    if (isLeonardoConfigured()) {
      try {
        const quality = leonardoQualityForPlan({
          plan,
          task: isDeckSlide ? 'deck_slide_image' : task,
          premiumRequested,
        });
        const result = await generateLeonardoImageUrl({
          prompt: text,
          width: w,
          height: h,
          quality,
          visualProfile,
          apiKey: getLeonardoApiKey() || undefined,
          enhancePrompt: !isDeckSlide,
        });
        imageId = result.imageId;
        provider = 'leonardo';

        if (creditsCharged) {
          const usdPerCredit = typeof creditConfig.usdPerCredit === 'number' ? creditConfig.usdPerCredit : 0;
          if (usdPerCredit > 0) {
            void addEstimatedSpend({ supabase, usdDelta: result.estimatedUsd });
          }
        }

        // Return CDN URL directly — client shows instantly and persists to R2 in background.
        // Avoids blocking on server-side base64 conversion (~5–15s per 1280×720 image).
        url = result.url;
      } catch (leonardoErr) {
        console.error('[generate-image] Leonardo failed:', leonardoErr);
        if (!isDeckSlide) {
          throw leonardoErr;
        }
      }
    }



    if (!url) {
      return NextResponse.json(
        { error: 'Image generation failed. Check LEONARDO_API_KEY configuration.' },
        { status: 502 },
      );
    }

    return NextResponse.json({
      url,
      seed,
      imageId,
      provider,
      fallback: false,
    });
  } catch (error) {
    console.error('Image Generation Error:', error);
    captureApiException(error, { requestId, route: 'POST /api/generate-image' });
    const message = error instanceof Error ? error.message : 'Failed to generate image';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
