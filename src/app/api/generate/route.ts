import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { buildComposerMessages } from '@/lib/ai/orchestration';
import { runOpenRouterOrchestration } from '@/lib/ai/prompt-chain';
import { openRouterStream } from '@/lib/ai/openrouter';
import { getComposeFallbackModels, selectTextModel } from '@/lib/ai/router';
import {
  consumeCreditsForUser,
  estimateDeckCostCredits,
  getCreditConfig,
  getCreditSummaryForUser,
  refundCreditsForUser,
} from '@/lib/billing/credits';
import { getBillingPlan } from '@/lib/billing/resolve-plan';
import { FREE_TIER } from '@/lib/billing/free-tier-limits';
import { incrementFreeTierUsage, readFreeTierUsage } from '@/lib/billing/free-tier-usage';
import { addEstimatedSpend, getSpendState } from '@/lib/ai/spend';
import { requireAiUser } from '@/lib/auth/require-ai-route';
import { createJobRecord, enqueueGenerateJob, updateJobRecord } from '@/lib/jobs/redis-job-queue';
import { isGenerateQueueEnabled } from '@/lib/jobs/generate-queue-config';
import { captureApiException, getOrCreateRequestId } from '@/lib/observability';
import { v4 as uuidv4 } from 'uuid';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export const runtime = 'nodejs';
/** Raise on Vercel Pro+ if deck generation consistently hits the ceiling (dashboard → Functions). */
export const maxDuration = 300;

export async function POST(req: Request) {
  const requestId = getOrCreateRequestId(req);
  try {
    const body = await req.json();
    const {
      prompt,
      slideCount = 10,
      tone = 'professional',
      language = 'English',
      styleMode,
    } = body as {
      prompt?: string;
      slideCount?: number;
      tone?: string;
      language?: string;
      styleMode?: string;
    };

    if (!OPENROUTER_API_KEY.trim()) {
      return NextResponse.json({ error: 'OPENROUTER_API_KEY is not configured.' }, { status: 500 });
    }

    const auth = await requireAiUser(req, 'heavy');
    if ('response' in auth) return auth.response;
    const user = auth.user;

    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { get(name: string) { return cookieStore.get(name)?.value; } } }
    );

    const plan = await getBillingPlan(user.id);
    const isFreePlan = plan === 'free';
    let freeTaste = false;

    if (isFreePlan) {
      const freeUsage = await readFreeTierUsage(user.id);
      if (freeUsage.free_ai_deck_generations >= FREE_TIER.lifetimeAiDecks) {
        return NextResponse.json(
          {
            error: 'LIMIT_REACHED',
            message: `You've used all ${FREE_TIER.lifetimeAiDecks} free AI presentations. Upgrade to Student Pro for unlimited cinematic decks.`,
            used: freeUsage.free_ai_deck_generations,
            limit: FREE_TIER.lifetimeAiDecks,
          },
          { status: 403 },
        );
      }
      freeTaste = true;
    }

    const MAX_SLIDES: Record<string, number> = {
      free: FREE_TIER.maxSlidesPerDeck,
      pro: 25,
      student_pro: 25,
      creator_pro: 40,
    };

    const maxSlides = MAX_SLIDES[plan] || FREE_TIER.maxSlidesPerDeck;
    const finalSlideCount = Math.min(Math.max(1, slideCount), maxSlides);

    const userPrompt = String(prompt || '').trim();
    if (!userPrompt) {
      return NextResponse.json({ error: 'Prompt is required.' }, { status: 400 });
    }

    // Credits gate (configurable). We estimate before running any AI calls.
    const creditConfig = await getCreditConfig(supabase);
    const estimatedCredits = estimateDeckCostCredits({
      slideCount: finalSlideCount,
      includeImages: true,
      premiumImages: plan === 'creator_pro' || plan === 'admin',
      config: creditConfig,
    });
    const deckCreditAction =
      finalSlideCount <= 6 ? 'deck_small' : finalSlideCount <= 15 ? 'deck_medium' : 'deck_large';

    const creditPreview = await getCreditSummaryForUser({ supabase, userId: user.id });
    if (creditPreview.remaining < estimatedCredits) {
      return NextResponse.json(
        {
          error: 'INSUFFICIENT_CREDITS',
          message: `You don't have enough credits for this generation.`,
          credits: creditPreview,
          required: estimatedCredits,
        },
        { status: 402 },
      );
    }

    const charged = await consumeCreditsForUser({
      userId: user.id,
      cost: estimatedCredits,
      action: deckCreditAction,
      meta: { slides: finalSlideCount, estimatedCredits, route: 'generate' },
      idempotencyKey: requestId,
      supabase,
    });

    if (!charged.ok) {
      const status = charged.error === 'INSUFFICIENT_CREDITS' ? 402 : 503;
      return NextResponse.json(
        {
          error: charged.error,
          message:
            charged.error === 'INSUFFICIENT_CREDITS'
              ? `You don't have enough credits for this generation.`
              : 'Billing is temporarily unavailable.',
          credits: charged.summary,
          required: estimatedCredits,
        },
        { status },
      );
    }

    let creditsRefunded = false;
    const refundIfNeeded = async () => {
      if (creditsRefunded) return;
      creditsRefunded = true;
      await refundCreditsForUser({
        userId: user.id,
        cost: estimatedCredits,
        idempotencyKey: requestId,
        reason: 'generate_failed',
      });
    };

    // Estimated spend tracking (credit-based approximation for protection).
    // Best-effort only; must never break generation.
    const usdPerCredit = typeof creditConfig.usdPerCredit === 'number' ? creditConfig.usdPerCredit : 0;
    if (usdPerCredit > 0) {
      void addEstimatedSpend({ supabase, usdDelta: estimatedCredits * usdPerCredit });
    }

    const jobId = uuidv4();
    if (isGenerateQueueEnabled()) {
      const queued = await enqueueGenerateJob({
        jobId,
        userId: user.id,
        body: {
          prompt: userPrompt,
          slideCount: finalSlideCount,
          tone,
          language,
          styleMode,
          plan,
          estimatedCredits,
          deckCreditAction,
        },
      });
      if (queued) {
        return NextResponse.json(
          { jobId, status: 'queued', message: 'Generation queued. Poll GET /api/jobs/[id] for status.' },
          { status: 202 },
        );
      }
    }

    void createJobRecord({
      id: jobId,
      userId: user.id,
      type: 'deck_generate',
      status: 'running',
      progress: 0,
    });

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const sendOrb = (payload: Record<string, unknown>) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
        };

        try {
          sendOrb({
            orb: {
              phase: 'starting',
              message: freeTaste
                ? 'Premium preview — elite models composing your deck…'
                : 'Analyzing narrative architecture...',
              freeTaste,
              maxImages: freeTaste ? FREE_TIER.maxImagesPerDeck : undefined,
              targetSlides: finalSlideCount,
            },
          });

          // Global spend protection signal (best-effort). Router will downshift if threshold is exceeded.
          const spend = await getSpendState({ supabase });
          const spendState = { forcedEconomyMode: spend.forcedEconomyMode };

          sendOrb({
            orb: {
              phase: 'structure_complete',
              message: '✓ Structure complete',
            },
          });

          // Inject Brand Kit into the prompt if present
          let finalPrompt = userPrompt;
          const { data: profileData } = await supabase.from('profiles').select('brand_kit').eq('id', user.id).single();
          const brandKit = profileData?.brand_kit as any;
          if (brandKit && brandKit.primary_color) {
            finalPrompt += `\n\n[USER BRAND KIT]\nPlease STRICTLY apply the following brand kit rules to the generated JSON output:
- Primary Color: ${brandKit.primary_color} (Must be the dominant color in colorPalette)
- Font: ${brandKit.font || 'Default'}
- Brand Name/Company: ${brandKit.name || 'User Company'} (Use this anywhere a company name is needed in the slide titles or content)`;
          }

          const { dossierText, refinedBrief, preflightSummary } = await runOpenRouterOrchestration(
            APP_URL,
            finalPrompt,
            {
              slideCount: finalSlideCount,
              tone: String(tone),
              language: String(language),
            },
            (phase, message) => {
              sendOrb({
                orb: {
                  phase,
                  message,
                },
              });
            },
            { plan, spendState, freeTaste },
          );

          sendOrb({
            orb: {
              phase: 'slides_generated',
              message: '✓ Slides generated',
            },
          });

          const { system, user: userMessage } = buildComposerMessages({
            preflightSummary: `${preflightSummary}\n\n--- Full dossier ---\n${dossierText}`,
            userPrompt,
            refinedBrief,
            slideCount: finalSlideCount,
            tone: String(tone),
            language: String(language),
            styleMode: styleMode ? String(styleMode) : undefined,
          });

          sendOrb({
            orb: {
              phase: 'generating_visuals',
              message: '⟳ Generating visuals...',
            },
          });

          // Short delay to give a visual rhythm of progressive stages
          await new Promise((r) => setTimeout(r, 400));

          sendOrb({
            orb: {
              phase: 'enhancing_animations',
              message: '⟳ Enhancing animations...',
            },
          });

          await new Promise((r) => setTimeout(r, 400));

          sendOrb({
            orb: {
              phase: 'streaming',
              message: '⟳ Final cinematic polish...',
            },
          });

          const composerPrimary = selectTextModel({
            plan,
            task: 'deck_compose',
            complexity: { promptChars: userPrompt.length, slideCount: finalSlideCount },
            spendState,
            freeTaste,
          });

          sendOrb({
            orb: {
              phase: 'streaming',
              message: `Composing with ${composerPrimary.label}…`,
              modelLabel: composerPrimary.label,
              targetSlides: finalSlideCount,
            },
          });

          const composeFallbackModels = getComposeFallbackModels({
            plan,
            spendState,
            freeTaste,
          });

          async function tryStream(model: string): Promise<boolean> {
            const res = await openRouterStream(APP_URL, {
              model,
              messages: [
                { role: 'system', content: system },
                { role: 'user', content: userMessage },
              ],
            });
            if (!res.ok || !res.body) {
              const errText = await res.text().catch(() => '');
              console.error(`[Generate] ${model} failed:`, res.status, errText);
              return false;
            }
            const reader = res.body.getReader();
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              if (value) controller.enqueue(value);
            }
            return true;
          }

          let ok = await tryStream(composerPrimary.model);
          if (!ok) {
            for (const fallbackModel of composeFallbackModels) {
              if (fallbackModel === composerPrimary.model) continue;
              sendOrb({
                orb: {
                  phase: 'fallback',
                  message: 'Continuing with an alternate composer…',
                },
              });
              ok = await tryStream(fallbackModel);
              if (ok) break;
            }
          }
          if (!ok) {
            sendOrb({
              orb: { phase: 'error', message: 'Generation could not complete. Try again shortly.' },
            });
            await refundIfNeeded();
            void updateJobRecord(jobId, { status: 'failed', error: 'Stream failed' });
          } else {
            if (freeTaste) {
              void incrementFreeTierUsage(user.id, 'free_ai_deck_generations');
            }
            void updateJobRecord(jobId, { status: 'completed', progress: 100 });
          }
        } catch (e: unknown) {
          console.error('[Generate] stream error:', e);
          captureApiException(e, { requestId, route: 'POST /api/generate stream' });
          await refundIfNeeded();
          void updateJobRecord(jobId, {
            status: 'failed',
            error: e instanceof Error ? e.message : 'Stream failed',
          });
          sendOrb({
            orb: {
              phase: 'error',
              message: e instanceof Error ? e.message : 'Stream failed',
            },
          });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('[Generate] Internal error:', error);
    captureApiException(error, { requestId, route: 'POST /api/generate' });
    return NextResponse.json({ error: 'An unexpected error occurred during generation.' }, { status: 500 });
  }
}
