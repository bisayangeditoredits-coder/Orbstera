import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getQueue } from '@/lib/queue/client';
import { BASE_QUEUE_NAMES } from '@/lib/queue/config';
import { headers } from 'next/headers';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // ── Auth Check ────────────────────────────────────────────────────────────
    let userId = null;
    let exportCredits = 0;
    let isPaidUser = false;

    try {
      const cookieStore = cookies();
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { get(name: string) { return cookieStore.get(name)?.value; } } }
      );
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        userId = user.id;
        exportCredits = user.user_metadata?.watermark_free_exports || 0;

        const { data: profile } = await supabase
          .from('profiles')
          .select('plan')
          .eq('id', user.id)
          .single();
        const plan = profile?.plan?.toLowerCase() || 'free';
        isPaidUser = plan === 'pro' || plan === 'creator_pro' || plan === 'student_pro';
      }
    } catch (_) { /* Default to watermark if auth fails */ }

    // ── Enqueue Job ─────────────────────────────────────────────────────────
    const reqHeaders = headers();
    const country = reqHeaders.get('x-vercel-ip-country') || '';
    let clientRegion: string | null = null;

    if (['US', 'CA', 'MX'].includes(country)) {
      clientRegion = 'us';
    } else if (['CN', 'JP', 'KR', 'SG', 'IN', 'AU', 'NZ'].includes(country)) {
      clientRegion = 'asia';
    } else if (['GB', 'FR', 'DE', 'IT', 'ES', 'NL', 'SE', 'CH', 'PL'].includes(country)) {
      clientRegion = 'eu';
    }

    const targetQueue = getQueue(BASE_QUEUE_NAMES.PPTX_EXPORT, clientRegion);
    const jobId = `pptx-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    await targetQueue.add('export-pptx', {
      body,
      userId,
      isPaidUser,
      exportCredits
    }, {
      jobId,
      removeOnComplete: true,
      removeOnFail: false,
    });

    return NextResponse.json({ jobId });
  } catch (err) {
    console.error('[Export API] Error:', err);
    return NextResponse.json({ error: 'Export failed to enqueue', detail: String(err) }, { status: 500 });
  }
}