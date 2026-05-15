import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { getCreditSummary, getCreditConfig, estimateDeckCostCredits } from '@/lib/billing/credits';

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
      .select('plan')
      .eq('id', user.id)
      .maybeSingle();

    const plan = profile?.plan ?? user.user_metadata?.plan ?? 'free';
    const [summary, config] = await Promise.all([
      getCreditSummary({ supabase, userId: user.id, planRaw: plan }),
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

    return NextResponse.json(
      { ok: true, userId: user.id, summary: { ...summary, usagePct }, estimates, canAfford },
      { headers: { 'Cache-Control': 'private, no-store, max-age=0' } },
    );
  } catch {
    return NextResponse.json({ ok: false, error: 'server_error' }, { status: 500 });
  }
}
