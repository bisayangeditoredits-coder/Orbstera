import { NextResponse } from 'next/server';
import { SlideElement } from '@/types';
import { generateClaidImageUrl } from '@/lib/claid-image';
import { generatePollinationsImageUrl } from '@/lib/pollinations-image';
import { generateLeonardoImageUrl } from '@/lib/leonardo-image';
import { openRouterImageGeneration } from '@/lib/ai/openrouter-image';
import { openRouterCompleteCascade } from '@/lib/ai/openrouter-cascade';
import { getMagicEditTextModels, selectImageProvider } from '@/lib/ai/router';
import { getSpendState } from '@/lib/ai/spend';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import {
  chargeCreditsBeforeJob,
  getActionCreditCost,
  getCreditConfig,
  getGenfillCreditAction,
} from '@/lib/billing/credits';
import { consumeFreeGenfillSlot, isPaidPlan } from '@/lib/billing/free-genfill-redis';
import { getBillingPlan } from '@/lib/billing/resolve-plan';
import { requireAiUser, aiUnauthorized } from '@/lib/auth/require-ai-route';
import { captureApiException, getOrCreateRequestId } from '@/lib/observability';
import { pollinationsChat } from '@/lib/pollinations-text';

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

    const { prompt, element, slideContext } = await req.json();

    if (!prompt || !element) {
      return NextResponse.json({ error: 'Prompt and element data are required' }, { status: 400 });
    }

    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { get(name: string) { return cookieStore.get(name)?.value; } } },
    );

    const plan = await getBillingPlan(userId);
    const paid = isPaidPlan(plan);
    const isImageElement = element.type === 'image';

    if (!paid && isImageElement) {
      const slot = await consumeFreeGenfillSlot(userId);
      if (!slot.ok) {
        return NextResponse.json(
          {
            error: 'FREE_LIMIT_REACHED',
            message: 'You have used all 15 free AI image edits this month. Upgrade to Pro for unlimited.',
            used: slot.used,
            remaining: 0,
          },
          { status: 402 },
        );
      }
    } else if (paid) {
      const creditConfig = await getCreditConfig(supabase);
      const creditAction = isImageElement ? getGenfillCreditAction(plan) : 'magic_edit';
      const cost = getActionCreditCost(creditConfig, creditAction);

      const creditCheck = await chargeCreditsBeforeJob({
        supabase,
        userId,
        action: creditAction,
        cost,
        meta: { elementType: element.type, elementId: element.id, route: 'magic-edit' },
        idempotencyKey: requestId,
      });

      if (!creditCheck.ok) {
        return NextResponse.json(
          {
            error: 'INSUFFICIENT_CREDITS',
            message: `Not enough credits for this magic edit (${cost} required).`,
            credits: creditCheck.summary,
            required: cost,
          },
          { status: 402 },
        );
      }
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

    let content: string | undefined;
    try {
      const completed = await openRouterCompleteCascade(
        process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        {
          models,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userMessage },
          ],
          plan,
          temperature: 0.15,
          max_tokens: 2800,
        },
      );
      content = completed.text;
    } catch {
      content = undefined;
    }

    if (!content) {
      // ── FREE FALLBACK: Pollinations text API (free, no key needed) ──
      console.warn('[MagicEdit] All OpenRouter models failed — falling back to Pollinations text API');
      try {
        const pollinationsContent = await pollinationsChat({
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userMessage },
          ],
          model: 'openai',
          temperature: 0.15,
          maxTokens: 2800,
        });

        let parsed: Record<string, unknown>;
        try {
          parsed = parseElementJson(pollinationsContent);
        } catch (e) {
          console.error('[MagicEdit] Pollinations JSON parse failed:', e, pollinationsContent);
          return NextResponse.json({ error: 'AI returned invalid JSON' }, { status: 502 });
        }

        const updatedElementFromFallback = { ...element, ...parsed } as import('@/types').SlideElement;

        // Handle image gen-fill prompt inside fallback result
        if (updatedElementFromFallback.type === 'image' && (updatedElementFromFallback as { src?: string }).src?.startsWith('PROMPT:')) {
          const promptText = ((updatedElementFromFallback as { src?: string }).src ?? '').replace(/^PROMPT:\s*/i, '').trim();
          const { width: fw, height: fh } = toPollinationPixels(
            Number((updatedElementFromFallback as { width?: number }).width) || 1024,
            Number((updatedElementFromFallback as { height?: number }).height) || 1024,
          );
          try {
            const resObj = await generateLeonardoImageUrl({ prompt: promptText, width: fw, height: fh });
            (updatedElementFromFallback as { src?: string }).src = resObj.url;
          } catch (imgErr) {
            console.error('[MagicEdit] Leonardo image gen in fallback failed:', imgErr);
            // Fallback to pollinations if leonardo fails
            try {
              (updatedElementFromFallback as { src?: string }).src = await generatePollinationsImageUrl({ prompt: promptText, width: fw, height: fh, polish: true });
            } catch (fallbackErr) {
              console.error('[MagicEdit] Pollinations fallback also failed:', fallbackErr);
            }
          }
        }

        return NextResponse.json(updatedElementFromFallback);
      } catch (pollinationsErr) {
        console.error('[MagicEdit] Pollinations text fallback failed:', pollinationsErr);
        return NextResponse.json({ error: 'All AI models failed to process magic edit' }, { status: 502 });
      }
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
      const promptText = updatedElement.src.replace(/^PROMPT:\s*/i, '').trim();
      const { width, height } = toPollinationPixels(
        Number(updatedElement.width) || Number(element.width) || 1024,
        Number(updatedElement.height) || Number(element.height) || 1024,
      );
      const hasClaid = Boolean(process.env.CLAID_API_KEY?.trim());
      // Pollinations is a free public API — no key required, always available
      const hasPollinations = true;
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
        if (!paid) {
          try {
            const resObj = await generateLeonardoImageUrl({
              prompt: promptText,
              width,
              height,
            });
            updatedElement.src = resObj.url;
          } catch (err) {
            updatedElement.src = await generatePollinationsImageUrl({
              prompt: promptText,
              width,
              height,
              polish: true,
            });
          }
        } else {
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
            const sourceForEdit =
              typeof element.src === 'string' && element.src.trim().startsWith('data:')
                ? element.src
                : typeof element.src === 'string' && element.src.startsWith('http')
                  ? element.src
                  : undefined;

            const result = await openRouterImageGeneration({
              prompt: promptText,
              size: `${width}x${height}`,
              visualProfile: 'cinematic',
              model: imgSel.model,
              modelCascade: imgSel.modelCascade,
              qualityBoost: true,
              sourceImage: sourceForEdit,
              plan,
            });
            if (result.ok && result.url) {
              updatedElement.src = result.url;
            }
          }

          const src = String(updatedElement.src || '');
          if (!src.startsWith('http') && !src.startsWith('data:')) {
            try {
              const resObj = await generateLeonardoImageUrl({ prompt: promptText, width, height });
              updatedElement.src = resObj.url;
            } catch (leoErr) {
              updatedElement.src = hasClaid
                ? await generateClaidImageUrl({ prompt: promptText, polish: true, width, height })
                : await generatePollinationsImageUrl({
                    prompt: promptText,
                    width,
                    height,
                    polish: true,
                  });
            }
          }
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
