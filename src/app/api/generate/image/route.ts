import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { ImageVisualProfile } from '@/lib/ai/agent-models';
import { openRouterImageGeneration } from '@/lib/ai/openrouter-image';
import { creditsForPremiumImage, normalizeBillingPlan } from '@/lib/billing/credits-policy';
import { consumeAiCredits, refundAiCredits } from '@/lib/billing/credits-server';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';

export async function POST(req: Request) {
  let imageCreditsOutstanding = 0;
  try {
    const body = await req.json();
    const {
      prompt,
      size: sizeIn,
      width,
      height,
      visualProfile = 'cinematic',
      polish,
    } = body as {
      prompt?: string;
      size?: string;
      width?: number;
      height?: number;
      visualProfile?: ImageVisualProfile;
      polish?: boolean;
    };

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    if (!OPENROUTER_API_KEY.trim()) {
      return NextResponse.json({ error: 'OPENROUTER_API_KEY is not configured.' }, { status: 503 });
    }

    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { get(name: string) { return cookieStore.get(name)?.value; } } },
    );
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Please sign in to generate images.' }, { status: 401 });
    }

    const { data: profile } = await supabase.from('profiles').select('plan').eq('id', user.id).maybeSingle();
    const billingPlan = normalizeBillingPlan(profile?.plan ?? user.user_metadata?.plan);
    const polishOn = polish !== false;
    const charge = creditsForPremiumImage(polishOn, visualProfile);
    const spend = await consumeAiCredits(supabase, user.id, charge, billingPlan);
    if (!spend.ok) {
      if (spend.code === 'CONFIG_ERROR') {
        return NextResponse.json({ error: 'CREDITS_NOT_CONFIGURED', detail: spend.detail }, { status: 503 });
      }
      return NextResponse.json(
        {
          error: 'INSUFFICIENT_CREDITS',
          creditsRequired: charge,
          creditsRemaining: spend.remaining,
          allowance: spend.allowance,
        },
        { status: 403 },
      );
    }
    imageCreditsOutstanding = charge;

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
      console.error('[Image] OpenRouter error:', result.status, result.body?.slice?.(0, 400));
      await refundAiCredits(supabase, user.id, imageCreditsOutstanding);
      imageCreditsOutstanding = 0;
      return NextResponse.json(
        { error: `Image AI service error: ${result.status}` },
        { status: 502 }
      );
    }

    imageCreditsOutstanding = 0;
    return NextResponse.json({ url: result.url });
  } catch (error) {
    console.error('Image Generation Error:', error);
    if (imageCreditsOutstanding > 0) {
      try {
        const cookieStore = cookies();
        const supabaseRefund = createServerClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          { cookies: { get(name: string) { return cookieStore.get(name)?.value; } } },
        );
        const {
          data: { user },
        } = await supabaseRefund.auth.getUser();
        if (user?.id) await refundAiCredits(supabaseRefund, user.id, imageCreditsOutstanding);
      } catch (_) {
        /* noop */
      }
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
