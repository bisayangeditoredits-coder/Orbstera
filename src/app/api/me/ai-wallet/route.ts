import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { buildAiWalletFromRow } from '@/lib/billing/credits-server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('plan, generations_used, monthly_ai_credits_used, credits_cycle_key')
      .eq('id', user.id)
      .maybeSingle();

    const wallet = buildAiWalletFromRow(profile, profile?.plan ?? user.user_metadata?.plan);
    return NextResponse.json(wallet);
  } catch (e) {
    console.error('[ai-wallet]', e);
    return NextResponse.json({ error: 'wallet_unavailable' }, { status: 500 });
  }
}
