import { NextResponse } from 'next/server';
import { SlideElement } from '@/types';
import { generateClaidImageUrl } from '@/lib/claid-image';
import { generatePollinationsImageUrl } from '@/lib/pollinations-image';
import { openRouterImageGeneration } from '@/lib/ai/openrouter-image';
import { getMagicEditTextModels, selectImageProvider } from '@/lib/ai/router';
import { getSpendState } from '@/lib/ai/spend';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { ensureCredits, getCreditConfig } from '@/lib/billing/credits';
import { getBillingPlan } from '@/lib/billing/resolve-plan';
import { FREE_TIER } from '@/lib/billing/free-tier-limits';
import { incrementFreeTierUsage, readFreeTierUsage } from '@/lib/billing/free-tier-usage';
import { requireAiUser, aiUnauthorized } from '@/lib/auth/require-ai-route';
import { captureApiException, getOrCreateRequestId } from '@/lib/observability';

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

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(req: Request) {
  const requestId = getOrCreateRequestId(req);
  try {
    const { prompt, element, slideContext } = await req.json();

    if (!prompt || !element) {
      return NextResponse.json({ error: 'Prompt and element data are required' }, { status: 400 });
    }

    if (!OPENROUTER_API_KEY.trim()) {
      return NextResponse.json({ error: 'OPENROUTER_API_KEY is not configured.' }, { status: 500 });
    }

    const auth = await requireAiUser(req, 'default');
    if ('response' in auth) {
      if (auth.response.status === 401) {
        return aiUnauthorized('Please sign in to use Magic Edit.');
      }
      return auth.response;
    }
    const userId = auth.user.id;

    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { get(name: string) { return cookieStore.get(name)?.value; } } },
    );

    const plan = await getBillingPlan(userId);
    const isPaid = plan === 'student_pro' || plan === 'pro' || plan === 'creator_pro' || plan === 'admin';

    if (!isPaid) {
      const usage = await readFreeTierUsage(userId);
      if (usage.free_magic_edit_uses >= FREE_TIER.magicEditUses) {
        return NextResponse.json(
          {
            error: 'FREE_LIMIT_REACHED',
            message: `Free accounts are limited to ${FREE_TIER.magicEditUses} AI Magic Edit uses. Upgrade to unlock unlimited access.`,
            used: usage.free_magic_edit_uses,
            limit: FREE_TIER.magicEditUses,
          },
          { status: 403 },
        );
      }
      await incrementFreeTierUsage(userId, 'free_magic_edit_uses');
    }
    // ────────────────────────────────────────────────────────────────────────

    // Credit Deduction
    const creditConfig = await getCreditConfig(supabase);
    // Pick the right credit action per plan+element type
    const isImageElement = element.type === 'image';
    let creditAction: import('@/lib/billing/credits').CreditAction;
    if (isImageElement) {
      if (plan === 'creator_pro' || plan === 'admin') creditAction = 'genfill_creator';
      else if (plan === 'student_pro' || plan === 'pro') creditAction = 'genfill_pro';
      else creditAction = 'genfill_free';
    } else {
      creditAction = 'magic_edit';
    }
    const cost = creditConfig.costs[creditAction] || 4;

    const creditCheck = await ensureCredits({
      supabase,
      userId,
      cost,
      action: creditAction,
      meta: { elementType: element.type, elementId: element.id },
    });

    if (!creditCheck.ok) {
      return NextResponse.json(
        {
          error: 'INSUFFICIENT_CREDITS',
          message: `You don't have enough credits for this magic edit.`,
          credits: creditCheck.summary,
          required: cost,
        },
        { status: 402 },
      );
    }

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

    const spend = await getSpendState({ supabase });
    const spendState = { forcedEconomyMode: spend.forcedEconomyMode };
    const models = getMagicEditTextModels({ plan, spendState });

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
      return NextResponse.json({ error: 'All AI models failed to process magic edit' }, { status: 502 });
    }

    const data = await response.json();
    const content: string | undefined = data.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json({ error: 'Empty response from AI' }, { status: 500 });
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = parseElementJson(content);
    } catch (e) {
      console.error('[MagicEdit] JSON parse:', e);
      return NextResponse.json({ error: 'AI returned invalid JSON' }, { status: 502 });
    }

    const updatedElement = { ...element, ...parsed } as SlideElement;

    if (updatedElement.type === 'image' && updatedElement.src?.startsWith('PROMPT:')) {
      // Free users can do gen fill (gated by generativeFillUses counter above)
      const isImageGenFill = true;
      if (!isPaid) {
        // Check gen fill specific limit for free users
        const usage = await readFreeTierUsage(userId);
        if (usage.free_generative_fill_uses >= FREE_TIER.generativeFillUses) {
          return NextResponse.json(
            {
              error: 'FREE_GENFILL_LIMIT_REACHED',
              message: `Free accounts can do ${FREE_TIER.generativeFillUses} generative fills. Upgrade for unlimited.`,
              used: usage.free_generative_fill_uses,
              limit: FREE_TIER.generativeFillUses,
            },
            { status: 403 },
          );
        }
        await incrementFreeTierUsage(userId, 'free_generative_fill_uses');
      }
      void isImageGenFill; // used above
      const promptText = updatedElement.src.replace(/^PROMPT:\s*/i, '').trim();
      const { width, height } = toPollinationPixels(
        Number(updatedElement.width) || Number(element.width) || 1024,
        Number(updatedElement.height) || Number(element.height) || 1024,
      );
      const hasClaid = Boolean(process.env.CLAID_API_KEY?.trim());
      const hasPollinations = Boolean(process.env.POLLINATIONS_API_KEY?.trim());
      const hasOpenRouter = Boolean(process.env.OPENROUTER_API_KEY?.trim());

      if (!hasOpenRouter && !hasClaid && !hasPollinations) {
        return NextResponse.json(
          {
            error:
              'Image generation is not configured. Set OPENROUTER_API_KEY, CLAID_API_KEY, or POLLINATIONS_API_KEY.',
          },
          { status: 503 }
        );
      }
      try {
        const imgSel = selectImageProvider({
          plan,
          visualProfile: 'cinematic',
          premiumRequested: plan === 'creator_pro' || plan === 'admin',
          spendState,
          task: 'magic_edit_image',
          hasOpenRouterKey: hasOpenRouter,
          hasClaidKey: hasClaid,
          hasPollinationsKey: hasPollinations,
        });

        if (imgSel.provider === 'openrouter' && hasOpenRouter) {
          const result = await openRouterImageGeneration({
            prompt: promptText,
            size: `${width}x${height}`,
            visualProfile: 'cinematic',
            model: imgSel.model,
            modelCascade: imgSel.modelCascade,
            qualityBoost: true,
          });
          if (result.ok && result.url) {
            updatedElement.src = result.url;
          }
        }

        const src = String(updatedElement.src || '');
        if (!src.startsWith('http') && !src.startsWith('data:')) {
          updatedElement.src = hasClaid
            ? await generateClaidImageUrl({ prompt: promptText, polish: true, width, height })
            : await generatePollinationsImageUrl({
                prompt: promptText,
                width,
                height,
                polish: true,
              });
        }

        // Best-effort usage log for dashboard cost tracking.
        try {
          const { error: usageLogError } = await supabase.from('ai_usage_events').insert({
            user_id: userId,
            kind: 'magic_edit_image',
            meta: { width, height },
          });
          if (usageLogError) {
            console.warn('[MagicEdit] ai_usage_events insert:', usageLogError);
          }
        } catch {
          /* ignore */
        }
      } catch (e) {
        console.error('[MagicEdit] Image generation:', e);
        return NextResponse.json(
          { error: e instanceof Error ? e.message : 'Failed to generate image for Magic Edit' },
          { status: 502 }
        );
      }
    }

    return NextResponse.json(updatedElement);
  } catch (error) {
    console.error('Magic Edit Error:', error);
    captureApiException(error, { requestId, route: 'POST /api/magic-edit' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
