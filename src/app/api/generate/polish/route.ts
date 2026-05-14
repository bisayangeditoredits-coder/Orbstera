import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { AGENT_MODELS } from '@/lib/ai/agent-models';
import { OR_MODELS } from '@/lib/ai/models';
import { openRouterComplete, extractJsonObject } from '@/lib/ai/openrouter';
import { normalizePresentationPayload } from '@/lib/ai/orchestration';
import { enforceAiRateLimit } from '@/lib/rate-limit-server';
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

    const limited = await enforceAiRateLimit(req, user.id, 'default');
    if (limited) return limited;

    const { presentation } = await req.json();
    if (!presentation || typeof presentation !== 'object') {
      return NextResponse.json({ error: 'presentation required' }, { status: 400 });
    }

    const body = JSON.stringify(presentation);

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
      const polished = await runPolish(AGENT_MODELS.gptOrchestrator);
      return NextResponse.json(polished);
    } catch (e) {
      console.warn('[Polish] primary failed, fallback:', e);
      const polished = await runPolish(OR_MODELS.refineFallback);
      return NextResponse.json(polished);
    }
  } catch (e) {
    console.error('[Polish]', e);
    captureApiException(e, { requestId, route: 'POST /api/generate/polish' });
    return NextResponse.json({ error: 'Polish failed' }, { status: 500 });
  }
}
