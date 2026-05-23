import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import {
  getCreditSummaryForUser,
  getCreditConfig,
  getActionCreditCost,
  getDeckGenerationCreditCost,
  normalizePlanTier,
  creditsToUsd,
} from '@/lib/billing/credits';
import { PLAN_MAX_AI_SPEND_USD } from '@/lib/billing/credit-cap-defaults';
import { getBillingPlan } from '@/lib/billing/resolve-plan';
import {
  FREE_GENFILL_MONTHLY_LIMIT,
  getFreeGenfillStatus,
  isPaidPlan,
} from '@/lib/billing/free-genfill-redis';

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
      deck_small: getDeckGenerationCreditCost(config, 5),
      deck_medium: getDeckGenerationCreditCost(config, 10),
      deck_large: getDeckGenerationCreditCost(config, 20),
      deck_polish: getActionCreditCost(config, 'deck_polish'),
      magic_edit: getActionCreditCost(config, 'magic_edit'),
      rewrite: getActionCreditCost(config, 'rewrite'),
      image_standard: getActionCreditCost(config, 'image_standard'),
      image_premium: getActionCreditCost(config, 'image_premium'),
      genfill_free: getActionCreditCost(config, 'genfill_free'),
      genfill_pro: getActionCreditCost(config, 'genfill_pro'),
      genfill_creator: getActionCreditCost(config, 'genfill_creator'),
      animation_enhance: getActionCreditCost(config, 'animation_enhance'),
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

    const freeGenfill = !isPaidPlan(plan) ? await getFreeGenfillStatus(user.id) : null;
    const freeTier = freeGenfill
      ? {
          freeGenFillUsed: freeGenfill.used,
          freeGenFillLimit: freeGenfill.limit,
          freeGenFillRemaining: freeGenfill.remaining,
          generativeFillUsed: freeGenfill.used,
          generativeFillLimit: FREE_GENFILL_MONTHLY_LIMIT,
          magicEditUsed: freeGenfill.used,
          magicEditLimit: FREE_GENFILL_MONTHLY_LIMIT,
        }
      : null;

    const maxAiBudgetUsd = PLAN_MAX_AI_SPEND_USD[plan] ?? 0;
    const usedUsd = creditsToUsd(summary.used, config);

    return NextResponse.json(
      {
        ok: true,
        maxAiBudgetUsd,
        usedUsd,
        userId: user.id,
        summary: { ...summary, usagePct },
        estimates,
        canAfford,
        freeTier,
        decksRemainingEstimate: Math.floor(
          summary.remaining / Math.max(1, estimates.deck_medium),
        ),
      },
      { headers: { 'Cache-Control': 'private, no-store, max-age=0' } },
    );
  } catch {
    return NextResponse.json({ ok: false, error: 'server_error' }, { status: 500 });
  }
}
