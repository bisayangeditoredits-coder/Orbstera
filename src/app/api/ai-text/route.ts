import { NextResponse } from 'next/server';
import { openRouterComplete } from '@/lib/ai/openrouter';
import { requireAiUser } from '@/lib/auth/require-ai-route';
import { chargeCreditsBeforeJob, getActionCreditCost, getCreditConfig } from '@/lib/billing/credits';

// Edge runtime is fine — requireAiUser uses fetch-based Supabase + Upstash
export const runtime = 'nodejs';

const MAX_TEXT_CHARS = 4000; // ~1000 tokens, enough for a full slide

export async function POST(req: Request) {
  try {
    // ── 1. Auth + rate limit ────────────────────────────────────────────────
    const auth = await requireAiUser(req, 'default');
    if ('response' in auth) return auth.response;
    const { user } = auth;

    // ── 2. Parse + validate ────────────────────────────────────────────────
    const { action, text } = await req.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }
    if (text.length > MAX_TEXT_CHARS) {
      return NextResponse.json(
        { error: `Text too long. Maximum ${MAX_TEXT_CHARS} characters.` },
        { status: 400 },
      );
    }

    const VALID_ACTIONS = ['grammar', 'professional', 'shorter', 'tagalog'] as const;
    if (!VALID_ACTIONS.includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const { createServerClient } = await import('@supabase/ssr');
    const { cookies } = await import('next/headers');
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      },
    );
    const creditConfig = await getCreditConfig(supabase);
    const rewriteCost = getActionCreditCost(creditConfig, 'rewrite');

    const creditResult = await chargeCreditsBeforeJob({
      supabase,
      userId: user.id,
      action: 'rewrite',
      cost: rewriteCost,
      meta: { feature: 'ai_text', action },
    });

    if (!creditResult.ok) {
      const msg =
        creditResult.error === 'INSUFFICIENT_CREDITS'
          ? `Not enough credits. You have ${creditResult.summary.remaining} remaining.`
          : 'Credit system unavailable. Please try again.';
      return NextResponse.json({ error: msg, code: creditResult.error }, { status: 402 });
    }

    // ── 4. Build prompt ────────────────────────────────────────────────────
    const BASE = 'You are an expert presentation editor. Return ONLY the final revised text. Do not include quotes, explanations, or conversational filler.';
    const ACTION_PROMPTS: Record<string, string> = {
      grammar:      `${BASE} Fix all grammatical errors and typos, keeping the original tone.`,
      professional: `${BASE} Rewrite the text to sound highly professional, corporate, and polished.`,
      shorter:      `${BASE} Summarize and condense so it fits on a presentation slide. Brief and punchy.`,
      tagalog:      `${BASE} Translate into fluent, natural-sounding Tagalog/Filipino.`,
    };

    // ── 5. Call AI ─────────────────────────────────────────────────────────
    const revisedText = await openRouterComplete(
      process.env.NEXT_PUBLIC_APP_URL ?? 'https://localhost:3000',
      {
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: ACTION_PROMPTS[action] },
          { role: 'user', content: text },
        ],
        temperature: 0.3,
        max_tokens: 500,
      },
    );

    return NextResponse.json({
      text: revisedText,
      creditsRemaining: creditResult.summary.remaining - 1,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    console.error('[ai-text] Error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
