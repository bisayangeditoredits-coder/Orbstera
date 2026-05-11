import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Best-effort usage logging for cost tracking. If the table isn't present yet,
// the route still returns 200 so the UI never breaks.

export const dynamic = 'force-dynamic';

type UsageKind = 'genfill_image' | 'magic_edit_image' | 'magic_edit_text';

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { kind?: UsageKind; meta?: Record<string, unknown> };
    const kind = body?.kind;
    const meta = body?.meta && typeof body.meta === 'object' ? body.meta : {};

    if (!kind) return NextResponse.json({ ok: false, error: 'kind_required' }, { status: 400 });

    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { get(name: string) { return cookieStore.get(name)?.value; } } },
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

    // Insert into `ai_usage_events` if it exists. Suggested schema:
    // - id uuid pk default gen_random_uuid()
    // - user_id uuid
    // - kind text
    // - meta jsonb
    // - created_at timestamptz default now()
    const { error } = await supabase.from('ai_usage_events').insert({
      user_id: user.id,
      kind,
      meta,
    });

    if (error) {
      // Table may not exist yet in dev; never fail the UI.
      console.warn('[usage/log] insert failed:', error.message);
      return NextResponse.json({ ok: true, logged: false });
    }

    return NextResponse.json({ ok: true, logged: true });
  } catch (e) {
    console.warn('[usage/log] error:', e);
    return NextResponse.json({ ok: true, logged: false });
  }
}

