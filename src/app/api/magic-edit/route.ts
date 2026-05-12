import { NextResponse } from 'next/server';
import { SlideElement } from '@/types';
import { generateClaidImageUrl } from '@/lib/claid-image';
import { generatePollinationsImageUrl } from '@/lib/pollinations-image';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { BillingPlan } from '@/lib/billing/credits-policy';
import { CREDIT_COSTS, normalizeBillingPlan } from '@/lib/billing/credits-policy';
import { consumeAiCredits, isAiEconomyMode, refundAiCredits } from '@/lib/billing/credits-server';
import { GEMINI_FLASH_FAST } from '@/lib/ai/smart-routing';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';

const SYSTEM_PROMPT = `You are a precision AI design assistant in a presentation editor.
The user edits ONE slide element. You receive its JSON, optional slide/deck context, and a short instruction.

Return the SAME JSON object shape and keys as the input element, with edits applied. Preserve \`id\`, \`zIndex\`, and layout (\`x\`, \`y\`, \`width\`, \`height\`) unless the user explicitly asks to move or resize.

ONLY output valid JSON. No markdown, no code fences, no commentary.

IMAGE rules:
- If the user wants a new or replaced image, set \`src\` to a highly detailed prompt beginning with exactly "PROMPT: " (one line or short paragraph, no line breaks inside the prefix).
- Match the presentation tone implied by context (professional deck imagery unless user says otherwise).

TEXT rules:
- Update \`content\` and any relevant \`textStyle\` (color, fontSize, fontWeight, textAlign).

SHAPE rules:
- Update \`shapeStyle\` (fill, stroke, strokeWidth, cornerRadius).`;

function parseElementJson(raw: string): Record<string, unknown> {
  const cleaned = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  try {
    return JSON.parse(cleaned) as Record<string, unknown>;
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>;
    }
    throw new Error('Could not parse model JSON');
  }
}

function magicEditModelFallbacks(plan: BillingPlan, economyMode: boolean): string[] {
  if (economyMode) return [GEMINI_FLASH_FAST];
  if (plan === 'creator_pro') {
    return [
      GEMINI_FLASH_FAST,
      'anthropic/claude-sonnet-latest',
      process.env.OPENROUTER_MAGIC_EDIT_FALLBACK?.trim() || 'openai/gpt-4.1-mini',
    ];
  }
  return [GEMINI_FLASH_FAST, process.env.OPENROUTER_MAGIC_EDIT_FALLBACK?.trim() || 'openai/gpt-4.1-mini'];
}

function toPollinationPixels(w: number, h: number) {
  const ew = Math.max(32, w || 1024);
  const eh = Math.max(32, h || 1024);
  const maxEdge = 1024;
  const scale = Math.min(maxEdge / ew, maxEdge / eh);
  let pw = Math.round(ew * scale);
  let ph = Math.round(eh * scale);
  pw = Math.max(256, Math.min(1024, pw));
  ph = Math.max(256, Math.min(1024, ph));
  return { width: pw, height: ph };
}

export async function POST(req: Request) {
  /** Ensures refunds if an unexpected exception happens post-charge. */
  let magicCreditsOutstanding = false;
  try {
    const { prompt, element, slideContext } = await req.json();

    if (!prompt || !element) {
      return NextResponse.json({ error: 'Prompt and element data are required' }, { status: 400 });
    }

    if (!OPENROUTER_API_KEY.trim()) {
      return NextResponse.json({ error: 'OPENROUTER_API_KEY is not configured.' }, { status: 500 });
    }

    // Basic plan-gate for Magic Edit on free users (best-effort; does not break if profiles table missing fields).
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { get(name: string) { return cookieStore.get(name)?.value; } } },
    );
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Please sign in to use Magic Edit.' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('plan, monthly_ai_credits_used, credits_cycle_key')
      .eq('id', userId)
      .maybeSingle();
    const billingPlan = normalizeBillingPlan(profile?.plan || user?.user_metadata?.plan);
    /** Only paid workspaces may use Magic Edit (server-enforced; UI already gates). */
    if (billingPlan === 'free') {
      return NextResponse.json(
        { error: 'Magic Edit is available on Student Pro and Creator Pro.' },
        { status: 403 },
      );
    }

    const spend = await consumeAiCredits(supabase, userId, CREDIT_COSTS.magicEdit, billingPlan);
    if (!spend.ok) {
      if (spend.code === 'CONFIG_ERROR') {
        return NextResponse.json(
          {
            error: 'CREDITS_NOT_CONFIGURED',
            message:
              'AI credits tracking is not set up yet. Run scripts/supabase-ai-credits.sql on your Supabase project.',
          },
          { status: 503 },
        );
      }
      return NextResponse.json(
        {
          error: 'INSUFFICIENT_CREDITS',
          message: `Magic Edit uses ${CREDIT_COSTS.magicEdit} credits.`,
          creditsRequired: CREDIT_COSTS.magicEdit,
          creditsRemaining: spend.remaining,
          allowance: spend.allowance,
        },
        { status: 403 },
      );
    }
    magicCreditsOutstanding = true;

    const ctx =
      slideContext && typeof slideContext === 'object'
        ? `
Deck / slide context (for tone and colors only — do not invent new elements):
- Deck title: ${String(slideContext.deckTitle || '').slice(0, 200) || '(none)'}
- Slide title: ${String(slideContext.slideTitle || '').slice(0, 200) || '(none)'}
- Palette (hex): ${Array.isArray(slideContext.palette) ? slideContext.palette.join(', ') : 'n/a'}
`
        : '';

    const userMessage = `Current element JSON:
${JSON.stringify(element, null, 2)}
${ctx}
User request: "${String(prompt).trim()}"

Return the modified element JSON only.`;

    const models = magicEditModelFallbacks(billingPlan, isAiEconomyMode());

    let response: Response | null = null;

    for (const model of models) {
      try {
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${OPENROUTER_API_KEY}`,
            'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
            'X-Title': 'Orbstera AI Magic Edit',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: SYSTEM_PROMPT },
              { role: 'user', content: userMessage },
            ],
            temperature: 0.15,
            max_tokens: 2800,
          }),
        });

        if (res.ok) {
          response = res;
          break;
        }
        console.error(`[MagicEdit] Model ${model} failed:`, await res.text());
      } catch (e) {
        console.error(`[MagicEdit] Error calling ${model}:`, e);
      }
    }

    if (!response) {
      await refundAiCredits(supabase, userId, CREDIT_COSTS.magicEdit);
      magicCreditsOutstanding = false;
      return NextResponse.json({ error: 'All AI models failed to process magic edit' }, { status: 502 });
    }

    const data = await response.json();
    const content: string | undefined = data.choices?.[0]?.message?.content;

    if (!content) {
      await refundAiCredits(supabase, userId, CREDIT_COSTS.magicEdit);
      magicCreditsOutstanding = false;
      return NextResponse.json({ error: 'Empty response from AI' }, { status: 500 });
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = parseElementJson(content);
    } catch (e) {
      console.error('[MagicEdit] JSON parse:', e);
      await refundAiCredits(supabase, userId, CREDIT_COSTS.magicEdit);
      magicCreditsOutstanding = false;
      return NextResponse.json({ error: 'AI returned invalid JSON' }, { status: 502 });
    }

    const updatedElement = { ...element, ...parsed } as SlideElement;

    if (updatedElement.type === 'image' && updatedElement.src?.startsWith('PROMPT:')) {
      const promptText = updatedElement.src.replace(/^PROMPT:\s*/i, '').trim();
      const { width, height } = toPollinationPixels(
        Number(updatedElement.width) || Number(element.width) || 1024,
        Number(updatedElement.height) || Number(element.height) || 1024,
      );
      const hasClaid = Boolean(process.env.CLAID_API_KEY?.trim());
      const hasPollinations = Boolean(process.env.POLLINATIONS_API_KEY?.trim());

      if (!hasClaid && !hasPollinations) {
        await refundAiCredits(supabase, userId, CREDIT_COSTS.magicEdit);
        magicCreditsOutstanding = false;
        return NextResponse.json(
          {
            error:
              'Image generation is not configured. Set CLAID_API_KEY or POLLINATIONS_API_KEY for Magic Edit images.',
          },
          { status: 503 }
        );
      }
      try {
        updatedElement.src = hasClaid
          ? await generateClaidImageUrl({ prompt: promptText, polish: true, width, height })
          : await generatePollinationsImageUrl({
              prompt: promptText,
              width,
              height,
              polish: true,
            });

        // Best-effort usage log for dashboard cost tracking.
        supabase.from('ai_usage_events').insert({
          user_id: userId,
          kind: 'magic_edit_image',
          meta: { width, height },
        }).catch(() => {});
      } catch (e) {
        console.error('[MagicEdit] Image generation:', e);
        await refundAiCredits(supabase, userId, CREDIT_COSTS.magicEdit);
        magicCreditsOutstanding = false;
        return NextResponse.json(
          { error: e instanceof Error ? e.message : 'Failed to generate image for Magic Edit' },
          { status: 502 }
        );
      }
    }

    magicCreditsOutstanding = false;
    return NextResponse.json(updatedElement);
  } catch (error) {
    console.error('Magic Edit Error:', error);
    if (magicCreditsOutstanding) {
      try {
        const cookieStore = cookies();
        const supabaseRefund = createServerClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          { cookies: { get(name: string) { return cookieStore.get(name)?.value; } } },
        );
        const { data: { user: refundUser } } = await supabaseRefund.auth.getUser();
        if (refundUser?.id) await refundAiCredits(supabaseRefund, refundUser.id, CREDIT_COSTS.magicEdit);
      } catch (_) {
        /* noop */
      }
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
