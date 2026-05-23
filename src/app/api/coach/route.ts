import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { OR_MODELS } from '@/lib/ai/models';
import { openRouterComplete } from '@/lib/ai/openrouter';
import { requireAiUser, aiUnauthorized } from '@/lib/auth/require-ai-route';
import { chargeCreditsBeforeJob, getActionCreditCost, getCreditConfig } from '@/lib/billing/credits';
import { captureApiException, getOrCreateRequestId } from '@/lib/observability';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: Request) {
  const requestId = getOrCreateRequestId(req);
  try {
    const auth = await requireAiUser(req, 'default');
    if ('response' in auth) {
      if (auth.response.status === 401) {
        return aiUnauthorized('Please sign in to use the presentation coach.');
      }
      return auth.response;
    }
    const user = auth.user;

    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { get(name: string) { return cookieStore.get(name)?.value; } } },
    );

    const creditConfig = await getCreditConfig(supabase);
    const coachCost = getActionCreditCost(creditConfig, 'rewrite');

    const creditCheck = await chargeCreditsBeforeJob({
      supabase,
      userId: user.id,
      action: 'rewrite',
      cost: coachCost,
      meta: { route: 'coach' },
      idempotencyKey: requestId,
    });

    if (!creditCheck.ok) {
      return NextResponse.json(
        {
          error: 'INSUFFICIENT_CREDITS',
          message: 'Not enough credits for coaching.',
          credits: creditCheck.summary,
          required: coachCost,
        },
        { status: 402 },
      );
    }

    const { slideTitle, speakerNotes, presentationTitle } = await req.json();

    const text = await openRouterComplete(APP_URL, {
      model: OR_MODELS.coach,
      messages: [
        {
          role: 'system',
          content:
            'You are an executive presentation coach. Give 4–6 short bullet tips for delivery and narrative for THIS slide only. Plain text bullets, no JSON.',
        },
        {
          role: 'user',
          content: `Deck: ${presentationTitle || 'Presentation'}\nSlide: ${slideTitle || 'Untitled'}\nNotes: ${speakerNotes || '(none)'}`,
        },
      ],
    });

    return NextResponse.json({ tips: text });
  } catch (error) {
    console.error('[Coach] Error:', error);
    captureApiException(error, { requestId, route: 'POST /api/coach' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
