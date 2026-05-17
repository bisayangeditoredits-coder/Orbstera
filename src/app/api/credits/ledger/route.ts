import { NextResponse } from 'next/server';
import { createRouteSupabase, requireApiUser, PRIVATE_API_HEADERS } from '@/lib/auth/server';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const auth = await requireApiUser();
  if ('response' in auth) return auth.response;

  const url = new URL(req.url);
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit')) || 20));
  const offset = Math.max(0, Number(url.searchParams.get('offset')) || 0);

  const supabase = createRouteSupabase();
  const { data, error } = await supabase
    .from('credit_ledger')
    .select('delta, reason, meta, created_at')
    .eq('user_id', auth.user.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('[credits/ledger]', error.message);
    return NextResponse.json({ error: 'Failed to load ledger' }, { status: 500, headers: PRIVATE_API_HEADERS });
  }

  return NextResponse.json(
    { entries: data ?? [], limit, offset },
    { headers: PRIVATE_API_HEADERS },
  );
}
