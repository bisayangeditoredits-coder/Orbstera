import { NextResponse } from 'next/server';
import { openRouterComplete } from '@/lib/ai/openrouter';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { chargeCreditsBeforeJob, getActionCreditCost, getCreditConfig } from '@/lib/billing/credits';
import { requireAiUser, aiUnauthorized } from '@/lib/auth/require-ai-route';
import { captureApiException, getOrCreateRequestId } from '@/lib/observability';
import { readJsonBodyWithLimit } from '@/lib/http/request-body-limit';

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

export const runtime = 'nodejs';
export const maxDuration = 60;
const MAX_BODY_BYTES = 24 * 1024;

export async function POST(req: Request) {
  const requestId = getOrCreateRequestId(req);
  try {
    const bodyResult = await readJsonBodyWithLimit<{ prompt?: string; purpose?: string }>(
      req,
      MAX_BODY_BYTES,
    );
    if (!bodyResult.ok) return bodyResult.response;
    const { prompt, purpose } = bodyResult.value;

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    if (!process.env.OPENROUTER_API_KEY?.trim()) {
      return NextResponse.json({ error: 'OPENROUTER_API_KEY is not configured.' }, { status: 500 });
    }

    const auth = await requireAiUser(req, 'default');
    if ('response' in auth) {
      if (auth.response.status === 401) {
        return aiUnauthorized('Please sign in to enhance prompts.');
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

    const { getBillingPlan } = await import('@/lib/billing/resolve-plan');
    const plan = await getBillingPlan(user.id);

    const creditConfig = await getCreditConfig(supabase);
    const cost = getActionCreditCost(creditConfig, 'rewrite');
    const creditCheck = await chargeCreditsBeforeJob({
      supabase,
      userId: user.id,
      action: 'rewrite',
      cost,
      meta: { purpose },
      idempotencyKey: requestId,
    });

    if (!creditCheck.ok) {
      return NextResponse.json(
        {
          error: 'INSUFFICIENT_CREDITS',
          message: `Not enough credits to enhance prompt.`,
          credits: creditCheck.summary,
          required: cost,
        },
        { status: 402 },
      );
    }

    const system =
      String(purpose) === 'image' ? IMAGE_SYSTEM_PROMPT : DECK_SYSTEM_PROMPT;
    const maxTokens = String(purpose) === 'image' ? 220 : 150;

    let enhancedPrompt: string;
    try {
      enhancedPrompt = (
        await openRouterComplete(APP_URL, {
          model: 'meta-llama/llama-3.3-70b-instruct',
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
      return NextResponse.json(
        { error: e instanceof Error ? e.message : 'Failed to fetch from AI provider' },
        { status: 502 },
      );
    }

    if (!enhancedPrompt) {
      return NextResponse.json({ enhancedPrompt: prompt });
    }

    return NextResponse.json({ enhancedPrompt });
  } catch (error) {
    console.error('Enhance prompt error:', error);
    captureApiException(error, { requestId, route: 'POST /api/enhance-prompt' });
    return NextResponse.json({ error: 'Failed to enhance prompt' }, { status: 500 });
  }
}
