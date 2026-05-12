import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getDeckComposerModelsForPlan } from '@/lib/ai/models';
import { openRouterComplete, extractJsonObject } from '@/lib/ai/openrouter';
import { normalizePresentationPayload } from '@/lib/ai/orchestration';
import { CREDIT_COSTS, normalizeBillingPlan } from '@/lib/billing/credits-policy';
import { consumeAiCredits, isAiEconomyMode, refundAiCredits } from '@/lib/billing/credits-server';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

const POLISH_SYSTEM = `You are the final cinematic polish agent (GPT‑5 class). You receive structured presentation JSON (no HTML).

Return ONE raw JSON object only — same schema as input — with improved headlines, subtitles, bullets, visualDirection, imagePrompt consistency, speakerNotes, and motion (animation + slideTransition) where it elevates storytelling.
Preserve slide count, ids, types, and chart data structurally.
Do not add HTML. Do not wrap in markdown.`;

export async function POST(req: Request) {
  let polishOutstanding = false;
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { get(name: string) { return cookieStore.get(name)?.value; } } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { presentation } = await req.json();
    if (!presentation || typeof presentation !== 'object') {
      return NextResponse.json({ error: 'presentation required' }, { status: 400 });
    }

    const { data: profile } = await supabase.from('profiles').select('plan').eq('id', user.id).maybeSingle();
    const billingPlan = normalizeBillingPlan(profile?.plan ?? user.user_metadata?.plan);

    const spend = await consumeAiCredits(supabase, user.id, CREDIT_COSTS.animationPolish, billingPlan);
    if (!spend.ok) {
      if (spend.code === 'CONFIG_ERROR') {
        return NextResponse.json({ error: 'CREDITS_NOT_CONFIGURED' }, { status: 503 });
      }
      return NextResponse.json(
        {
          error: 'INSUFFICIENT_CREDITS',
          creditsRequired: CREDIT_COSTS.animationPolish,
          creditsRemaining: spend.remaining,
        },
        { status: 403 },
      );
    }
    polishOutstanding = true;

    const body = JSON.stringify(presentation);
    const { primary: polishPrimaryModel, fallback: polishFallbackModel } = getDeckComposerModelsForPlan(
      billingPlan,
      isAiEconomyMode(),
    );

    const runPolish = async (model: string) => {
      const text = await openRouterComplete(APP_URL, {
        model,
        messages: [
          { role: 'system', content: POLISH_SYSTEM },
          { role: 'user', content: body },
        ],
        temperature: 0.35,
        max_tokens: 24_000,
      });
      const raw = extractJsonObject(text);
      if (!raw) throw new Error('Polish parse failed');
      return normalizePresentationPayload(raw);
    };

    try {
      const polished = await runPolish(polishPrimaryModel);
      polishOutstanding = false;
      return NextResponse.json(polished);
    } catch (e) {
      console.warn('[Polish] primary failed, fallback:', e);
      const polished = await runPolish(polishFallbackModel);
      polishOutstanding = false;
      return NextResponse.json(polished);
    }
  } catch (e) {
    console.error('[Polish]', e);
    if (polishOutstanding) {
      try {
        const cookieStore = cookies();
        const sb = createServerClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          { cookies: { get(name: string) { return cookieStore.get(name)?.value; } } },
        );
        const {
          data: { user },
        } = await sb.auth.getUser();
        if (user?.id) await refundAiCredits(sb, user.id, CREDIT_COSTS.animationPolish);
      } catch (_) {
        /* noop */
      }
    }
    return NextResponse.json({ error: 'Polish failed' }, { status: 500 });
  }
}
