import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { openRouterComplete } from '@/lib/ai/openrouter';
import { GEMINI_FLASH_FAST } from '@/lib/ai/smart-routing';
import { CREDIT_COSTS, normalizeBillingPlan } from '@/lib/billing/credits-policy';
import { consumeAiCredits, refundAiCredits } from '@/lib/billing/credits-server';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

const DECK_SYSTEM_PROMPT = `You are an expert prompt engineer for an AI presentation maker.
The user will give you a short, brief idea for a presentation.
Your task is to expand, enhance, and professionalize this idea into a detailed, highly descriptive prompt (2-4 sentences max).
Include suggested structure, tone, and key elements to cover. 
DO NOT include any conversational filler (no "Here is the enhanced prompt:"). 
JUST return the raw enhanced prompt text directly.`;

const IMAGE_SYSTEM_PROMPT = `You are an expert prompt engineer for image generation used inside presentation slides.
The user gives a short idea for a rectangular image region.
Expand it into ONE fluent, highly descriptive image prompt (2–3 sentences max): subject, lighting, composition, lens/depth, materials, color harmony.
Requirements: no on-image text, no logos, no watermarks, presentation-ready and tasteful.
Output ONLY the prompt text. No preamble or quotes.`;

export async function POST(req: Request) {
  let rewriteOutstanding = false;
  try {
    const { prompt, purpose } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    if (!process.env.OPENROUTER_API_KEY?.trim()) {
      return NextResponse.json({ error: 'OPENROUTER_API_KEY is not configured.' }, { status: 500 });
    }

    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { get(name: string) { return cookieStore.get(name)?.value; } } },
    );
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Please sign in to refine prompts.' }, { status: 401 });

    const { data: profile } = await supabase.from('profiles').select('plan').eq('id', user.id).maybeSingle();
    const billingPlan = normalizeBillingPlan(profile?.plan ?? user.user_metadata?.plan);

    const spend = await consumeAiCredits(supabase, user.id, CREDIT_COSTS.rewrite, billingPlan);
    if (!spend.ok) {
      if (spend.code === 'CONFIG_ERROR') {
        return NextResponse.json({ error: 'CREDITS_NOT_CONFIGURED', detail: spend.detail }, { status: 503 });
      }
      return NextResponse.json(
        {
          error: 'INSUFFICIENT_CREDITS',
          message: `Prompt refine uses ${CREDIT_COSTS.rewrite} credits.`,
          creditsRequired: CREDIT_COSTS.rewrite,
          creditsRemaining: spend.remaining,
        },
        { status: 403 },
      );
    }
    rewriteOutstanding = true;

    const system =
      String(purpose) === 'image' ? IMAGE_SYSTEM_PROMPT : DECK_SYSTEM_PROMPT;
    const maxTokens = String(purpose) === 'image' ? 220 : 150;

    let enhancedPrompt: string;
    try {
      enhancedPrompt = (
        await openRouterComplete(APP_URL, {
          model: GEMINI_FLASH_FAST,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: prompt },
          ],
          temperature: 0.7,
          max_tokens: maxTokens,
        })
      ).trim();
    } catch (e) {
      console.error('Enhance prompt OpenRouter error:', e);
      await refundAiCredits(supabase, user.id, CREDIT_COSTS.rewrite);
      rewriteOutstanding = false;
      return NextResponse.json(
        { error: e instanceof Error ? e.message : 'Failed to fetch from AI provider' },
        { status: 502 },
      );
    }

    if (!enhancedPrompt) {
      await refundAiCredits(supabase, user.id, CREDIT_COSTS.rewrite);
      rewriteOutstanding = false;
      return NextResponse.json({ enhancedPrompt: prompt });
    }

    rewriteOutstanding = false;
    return NextResponse.json({ enhancedPrompt });
  } catch (error) {
    console.error('Enhance prompt error:', error);
    if (rewriteOutstanding) {
      try {
        const cookieStore = cookies();
        const supabaseRefund = createServerClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          { cookies: { get(name: string) { return cookieStore.get(name)?.value; } } },
        );
        const {
          data: { user },
        } = await supabaseRefund.auth.getUser();
        if (user?.id) await refundAiCredits(supabaseRefund, user.id, CREDIT_COSTS.rewrite);
      } catch (_) {
        /* noop */
      }
    }
    return NextResponse.json({ error: 'Failed to enhance prompt' }, { status: 500 });
  }
}
