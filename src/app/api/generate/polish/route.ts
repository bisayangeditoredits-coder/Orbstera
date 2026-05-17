import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { AGENT_MODELS } from '@/lib/ai/agent-models';
import { OR_MODELS } from '@/lib/ai/models';
import { openRouterComplete, extractJsonObject } from '@/lib/ai/openrouter';
import { normalizePresentationPayload } from '@/lib/ai/orchestration';
import { requireAiUser, aiUnauthorized } from '@/lib/auth/require-ai-route';
import { ensureCredits, getCreditConfig } from '@/lib/billing/credits';
import { captureApiException, getOrCreateRequestId } from '@/lib/observability';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

const POLISH_SYSTEM = `You are the final cinematic polish agent (GPT‑5 class). You receive structured presentation JSON (no HTML).

Return ONE raw JSON object only — same schema as input — with improved headlines, subtitles, bullets, visualDirection, imagePrompt consistency, speakerNotes, and motion (animation + slideTransition) where it elevates storytelling.
Preserve slide count, ids, types, and chart data structurally.
Do not add HTML. Do not wrap in markdown.`;

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(req: Request) {
  const requestId = getOrCreateRequestId(req);
  try {
    const auth = await requireAiUser(req, 'default');
    if ('response' in auth) {
      if (auth.response.status === 401) {
        return aiUnauthorized('Please sign in to polish presentations.');
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

    const { presentation } = await req.json();
    if (!presentation || typeof presentation !== 'object') {
      return NextResponse.json({ error: 'presentation required' }, { status: 400 });
    }

    const creditConfig = await getCreditConfig(supabase);
    const polishCost = creditConfig.costs.deck_polish ?? 80;

    const creditCheck = await ensureCredits({
      supabase,
      userId: user.id,
      cost: polishCost,
      action: 'deck_polish',
      meta: { route: 'generate/polish' },
      idempotencyKey: requestId,
    });

    if (!creditCheck.ok) {
      return NextResponse.json(
        {
          error: 'INSUFFICIENT_CREDITS',
          message: 'Not enough credits to polish this deck.',
          credits: creditCheck.summary,
          required: polishCost,
        },
        { status: 402 },
      );
    }

    const body = JSON.stringify(presentation);

    const runPolish = async (model: string) => {
      const text = await openRouterComplete(APP_URL, {
        model,
        messages: [
          { role: 'system', content: POLISH_SYSTEM },
          { role: 'user', content: body },
        ],
      });
      return extractJsonObject(text);
    };

    let polished: Record<string, unknown> | null = null;
    try {
      polished = await runPolish(AGENT_MODELS.gptOrchestrator);
    } catch {
      polished = await runPolish(OR_MODELS.composerFallback);
    }

    if (!polished) {
      return NextResponse.json({ error: 'Polish failed' }, { status: 502 });
    }

    const normalized = normalizePresentationPayload(polished);
    return NextResponse.json({ presentation: normalized });
  } catch (error) {
    console.error('[Polish] Error:', error);
    captureApiException(error, { requestId, route: 'POST /api/generate/polish' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
