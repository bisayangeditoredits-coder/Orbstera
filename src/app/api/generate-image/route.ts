import { NextResponse } from 'next/server';
import { generateClaidImageUrl } from '@/lib/claid-image';
import { generatePollinationsImageUrl } from '@/lib/pollinations-image';
import { generateLeonardoImageUrl } from '@/lib/leonardo-image';
import { openRouterImageGeneration } from '@/lib/ai/openrouter-image';
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
      task?: 'image_generate' | 'genfill_image' | 'magic_edit_image';
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

    const w = Math.max(256, Math.min(1536, Math.round(Number(width)) || 1024));
    const h = Math.max(256, Math.min(1536, Math.round(Number(height)) || 1024));

    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { get(name: string) { return cookieStore.get(name)?.value; } } },
    );
    const { getBillingPlan } = await import('@/lib/billing/resolve-plan');
    const plan = await getBillingPlan(user.id);

    const creditConfig = await getCreditConfig(supabase);
    const isPaidPlan =
      plan === 'student_pro' || plan === 'pro' || plan === 'creator_pro' || plan === 'admin';
    const freeTaste = plan === 'free';
    const premiumRequested =
      visualProfile === 'cinematic' && (plan === 'creator_pro' || plan === 'admin');
    const imageAction = getImageCreditAction(plan, premiumRequested);
    const imageCost = getActionCreditCost(creditConfig, imageAction);
    const credit = await chargeCreditsBeforeJob({
      supabase,
      userId: user.id,
      action: imageAction,
      cost: imageCost,
      meta: { w, h, visualProfile },
      idempotencyKey: requestId,
    });
    if (!credit.ok) {
      return NextResponse.json(
        { error: 'INSUFFICIENT_CREDITS', message: `Not enough credits for image generation.`, credits: credit.summary, required: imageCost },
        { status: 402 },
      );
    }

    const usdPerCredit = typeof creditConfig.usdPerCredit === 'number' ? creditConfig.usdPerCredit : 0;
    if (usdPerCredit > 0) void addEstimatedSpend({ supabase, usdDelta: imageCost * usdPerCredit });

    const spend = await getSpendState({ supabase });
    const spendState = { forcedEconomyMode: spend.forcedEconomyMode };
    const sel = selectImageProvider({
      plan,
      visualProfile,
      premiumRequested,
      spendState,
      task,
      freeTaste,
      hasOpenRouterKey: Boolean(process.env.OPENROUTER_API_KEY?.trim()),
      hasClaidKey: Boolean(process.env.CLAID_API_KEY?.trim()),
      hasPollinationsKey: Boolean(process.env.POLLINATIONS_API_KEY?.trim()),
    });

    const hasClaid = Boolean(process.env.CLAID_API_KEY?.trim());
    const polishBool = Boolean(polish);
    const seed = Math.floor(Math.random() * 1_000_000);

    let url: string | undefined;
    let imageId: string | undefined;

    try {
      const res = await generateLeonardoImageUrl({ prompt: text, width: w, height: h });
      url = res.url;
      imageId = res.imageId;
    } catch (leoErr) {
      console.error('Leonardo failed, falling back:', leoErr);
      url =
        sel.provider === 'claid' && hasClaid
          ? await generateClaidImageUrl({ prompt: text, polish: polishBool, width: w, height: h })
          : await generatePollinationsImageUrl({
              prompt: text,
              width: w,
              height: h,
              polish: polishBool,
            });
    }

    return NextResponse.json({ url, seed, imageId });
  } catch (error) {
    console.error('Image Generation Error:', error);
    captureApiException(error, { requestId, route: 'POST /api/generate-image' });
    const message = error instanceof Error ? error.message : 'Failed to generate image';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
