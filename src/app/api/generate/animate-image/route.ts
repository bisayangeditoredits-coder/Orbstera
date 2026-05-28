import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { generateLeonardoMotionUrl } from '@/lib/leonardo-image';
import { readJsonBodyWithLimit } from '@/lib/http/request-body-limit';

export const runtime = 'nodejs';
export const maxDuration = 120;
const MAX_BODY_BYTES = 16 * 1024;

export async function POST(req: Request) {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookiesToSet) => {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const bodyResult = await readJsonBodyWithLimit<{ imageId?: string }>(req, MAX_BODY_BYTES);
    if (!bodyResult.ok) return bodyResult.response;
    const body = bodyResult.value;
    const { imageId } = body;

    if (!imageId || typeof imageId !== 'string') {
      return NextResponse.json({ error: 'Valid Leonardo imageId is required' }, { status: 400 });
    }

    const { getBillingPlan } = await import('@/lib/billing/resolve-plan');
    const { isPaidPlan, consumeFreeGenfillSlot } = await import('@/lib/billing/free-genfill-redis');
    const plan = await getBillingPlan(user.id);
    const isPaid = isPaidPlan(plan);

    if (!isPaid) {
      const slot = await consumeFreeGenfillSlot(user.id);
      if (!slot.ok) {
        return NextResponse.json(
          {
            error: 'FREE_LIMIT_REACHED',
            message: 'You have used all 15 free AI image edits this month. Upgrade to Pro to animate more.',
            used: slot.used,
            remaining: 0,
          },
          { status: 402 },
        );
      }
    } else {
      const { chargeCreditsBeforeJob, getActionCreditCost, getCreditConfig } = await import('@/lib/billing/credits');
      const config = await getCreditConfig(supabase);
      const cost = getActionCreditCost(config, 'animation_enhance');
      const requestId = `anim_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const creditCheck = await chargeCreditsBeforeJob({
        supabase,
        userId: user.id,
        action: 'animation_enhance',
        cost,
        meta: { route: 'generate/animate-image' },
        idempotencyKey: requestId,
      });

      if (!creditCheck.ok) {
        return NextResponse.json(
          { error: 'INSUFFICIENT_CREDITS', message: 'Not enough credits to animate image.', credits: creditCheck.summary, required: cost },
          { status: 402 },
        );
      }
    }

    const videoUrl = await generateLeonardoMotionUrl({ imageId });
    
    return NextResponse.json({ url: videoUrl });
  } catch (error) {
    console.error('Animate Image Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to animate image' },
      { status: 500 }
    );
  }
}
