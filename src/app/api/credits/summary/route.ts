import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import {
  getCreditSummaryForUser,
  getCreditConfig,
  estimateDeckCostCredits,
  normalizePlanTier,
} from '@/lib/billing/credits';
import { getBillingPlan } from '@/lib/billing/resolve-plan';

function normalizePlanForFree(plan: unknown): string {
  return normalizePlanTier(plan);
}

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { get(name: string) { return cookieStore.get(name)?.value; } } },
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

    const { data: profile } = await supabase
      .from('profiles')
      .select('plan, free_generative_fill_uses, free_magic_edit_uses')
      .eq('id', user.id)
      .maybeSingle();

    const plan = await getBillingPlan(user.id);
    const [summary, config] = await Promise.all([
      getCreditSummaryForUser({ supabase, userId: user.id }),
      getCreditConfig(supabase),
    ]);

    // Pre-compute cost estimates so the UI can show affordability instantly
    const estimates = {
      deck_small:        config.costs.deck_small        ?? 40,
      deck_medium:       config.costs.deck_medium       ?? 80,
      deck_large:        config.costs.deck_large        ?? 150,
      deck_small_images: estimateDeckCostCredits({ slideCount: 5,  includeImages: true, premiumImages: false, config }),
      deck_large_images: estimateDeckCostCredits({ slideCount: 15, includeImages: true, premiumImages: false, config }),
      magic_edit:        config.costs.magic_edit        ?? 5,
      rewrite:           config.costs.rewrite           ?? 3,
      image_standard:    config.costs.image_standard    ?? 10,
      image_premium:     config.costs.image_premium     ?? 20,
      animation_enhance: config.costs.animation_enhance ?? 5,
    };

    const usagePct = summary.monthlyLimit > 0
      ? Math.min(100, Math.round((summary.used / summary.monthlyLimit) * 100))
      : 0;

    const canAfford = {
      deck_small:  summary.remaining >= estimates.deck_small,
      deck_medium: summary.remaining >= estimates.deck_medium,
      deck_large:  summary.remaining >= estimates.deck_large,
      magic_edit:  summary.remaining >= estimates.magic_edit,
      image:       summary.remaining >= estimates.image_standard,
    };

    const freeTier =
      normalizePlanForFree(profile?.plan ?? plan) === 'free'
        ? {
            generativeFillUsed: profile?.free_generative_fill_uses ?? 0,
            generativeFillLimit: 5,
            magicEditUsed: profile?.free_magic_edit_uses ?? 0,
            magicEditLimit: 10,
          }
        : null;

    return NextResponse.json(
      {
        ok: true,
        userId: user.id,
        summary: { ...summary, usagePct },
        estimates,
        canAfford,
        freeTier,
        decksRemainingEstimate: Math.floor(
          summary.remaining /
            estimateDeckCostCredits({
              slideCount: 10,
              includeImages: true,
              premiumImages: String(plan).toLowerCase() === 'creator_pro',
              config,
            }),
        ),
      },
      { headers: { 'Cache-Control': 'private, no-store, max-age=0' } },
    );
  } catch {
    return NextResponse.json({ ok: false, error: 'server_error' }, { status: 500 });
  }
}
