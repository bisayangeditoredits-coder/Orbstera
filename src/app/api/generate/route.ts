import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { buildComposerMessages } from '@/lib/ai/orchestration';
import { runOpenRouterOrchestration } from '@/lib/ai/prompt-chain';
import { openRouterStreamCascade } from '@/lib/ai/openrouter-cascade';
import { getComposeFallbackModels, selectTextModel } from '@/lib/ai/router';
import {
  chargeCreditsBeforeJob,
  estimateDeckCreditAction,
  getCreditConfig,
  getDeckGenerationCreditCost,
  refundCreditsForUser,
} from '@/lib/billing/credits';
import { getBillingPlan } from '@/lib/billing/resolve-plan';
import { FREE_TIER } from '@/lib/billing/free-tier-limits';
import { incrementFreeTierUsage, readFreeTierUsage } from '@/lib/billing/free-tier-usage';
import { addEstimatedSpend, getSpendState } from '@/lib/ai/spend';
import { requireAiUser } from '@/lib/auth/require-ai-route';
import { createJobRecord, enqueueGenerateJob, updateJobRecord } from '@/lib/jobs/redis-job-queue';
import { isGenerateQueueEnabled, shouldPreferAsyncGenerate } from '@/lib/jobs/generate-queue-config';
import { apiLog, captureApiException, getOrCreateRequestId } from '@/lib/observability';
import { v4 as uuidv4 } from 'uuid';
import { globalRateLimit } from '@/lib/rate-limit';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export const runtime = 'nodejs';
/** Raise on Vercel Pro+ if deck generation consistently hits the ceiling (dashboard → Functions). */
export const maxDuration = 300;

export async function POST(req: Request) {
  const requestId = getOrCreateRequestId(req);
  // Declared in outer scope so the catch block can refund credits on any error.
  let refundIfNeeded: (() => Promise<void>) | null = null;
  try {
    const contentLength = Number(req.headers.get('content-length') ?? 0);
    if (contentLength > 1 * 1024 * 1024) { // 1MB max payload
      return NextResponse.json({ error: 'Payload too large. Maximum size is 1MB.' }, { status: 413 });
    }

    if (!OPENROUTER_API_KEY.trim()) {
      return NextResponse.json({ error: 'OPENROUTER_API_KEY is not configured.' }, { status: 500 });
    }

    const auth = await requireAiUser(req, 'heavy');
    if ('response' in auth) return auth.response;
    const user = auth.user;

    if (globalRateLimit) {
      const ip = req.headers.get('x-forwarded-for') ?? '127.0.0.1';
      const identifier = `${user.id}-${ip}`;
      const { success, limit, reset, remaining } = await globalRateLimit.limit(identifier);
      if (!success) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Please try again later.' },
          {
            status: 429,
            headers: {
              'X-RateLimit-Limit': limit.toString(),
              'X-RateLimit-Remaining': remaining.toString(),
              'X-RateLimit-Reset': reset.toString(),
            },
          }
        );
      }
    }

    const body = await req.json();
    const {
      prompt,
      slideCount = 10,
      outlineSlideCount,
      plannerSessionId,
      tone = 'professional',
      language = 'English',
      styleMode,
      theme,
      colorPalette,
    } = body as {
      prompt?: string;
      slideCount?: number;
      outlineSlideCount?: number;
      plannerSessionId?: string;
      tone?: string;
      language?: string;
      styleMode?: string;
      theme?: string;
      colorPalette?: string[];
    };

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
    const requestedSlides =
      typeof outlineSlideCount === 'number' && outlineSlideCount > 0
        ? outlineSlideCount
        : slideCount;
    const finalSlideCount = Math.min(Math.max(1, requestedSlides), maxSlides);

    const userPrompt = String(prompt || '').trim();
    if (!userPrompt) {
      return NextResponse.json({ error: 'Prompt is required.' }, { status: 400 });
    }

    const creditConfig = await getCreditConfig(supabase);
    const deckCreditAction = estimateDeckCreditAction(finalSlideCount);
    const deckCreditCost = getDeckGenerationCreditCost(creditConfig, finalSlideCount);

    const charged = await chargeCreditsBeforeJob({
      supabase,
      userId: user.id,
      action: deckCreditAction,
      cost: deckCreditCost,
      meta: { slides: finalSlideCount, route: 'generate', plan },
      idempotencyKey: requestId,
    });

    if (!charged.ok) {
      const status = charged.error === 'INSUFFICIENT_CREDITS' ? 402 : 503;
      return NextResponse.json(
        {
          error: 'INSUFFICIENT_CREDITS',
          message: `Not enough credits for this generation (${deckCreditCost} required).`,
          credits: charged.summary,
          required: deckCreditCost,
        },
        { status },
      );
    }

    let creditsRefunded = false;
    refundIfNeeded = async () => {
      if (creditsRefunded) return;
      creditsRefunded = true;
      await refundCreditsForUser({
        userId: user.id,
        cost: deckCreditCost,
        idempotencyKey: requestId,
        reason: 'generate_failed',
      });
    };

    const usdPerCredit = typeof creditConfig.usdPerCredit === 'number' ? creditConfig.usdPerCredit : 0;
    if (usdPerCredit > 0) {
      void addEstimatedSpend({ supabase, usdDelta: deckCreditCost * usdPerCredit });
    }

    const jobId = uuidv4();
    const preferAsync = shouldPreferAsyncGenerate(finalSlideCount);
    if (preferAsync && isGenerateQueueEnabled()) {
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
          estimatedCredits: deckCreditCost,
          deckCreditAction,
          plannerSessionId: plannerSessionId || undefined,
          outlineSlideCount: finalSlideCount,
        },
      });
      if (queued) {
        return NextResponse.json(
          {
            jobId,
            status: 'queued',
            message: 'Generation queued. Poll GET /api/jobs/[id] for status.',
            progressUrl: `/api/jobs/${jobId}`,
          },
          { status: 202 },
        );
      }
      captureApiException(new Error('enqueueGenerateJob failed while workers enabled'), {
        requestId,
        route: 'POST /api/generate',
        userId: user.id,
        slideCount: finalSlideCount,
      });
    } else if (preferAsync && process.env.NODE_ENV === 'production') {
      apiLog('generate', 'warn', 'sync_sse_fallback_large_deck', {
        requestId,
        userId: user.id,
        slideCount: finalSlideCount,
        hint: 'Set GENERATE_WORKER_ENABLED=true and GENERATE_ASYNC_DEFAULT=true',
      });
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

          if (Array.isArray(colorPalette) && colorPalette.length >= 3) {
            finalPrompt += `\n\n[USER COLOR PALETTE]\nUse exactly this colorPalette array in the deck JSON: ${JSON.stringify(colorPalette)}`;
          }
          if (typeof theme === 'string' && theme.trim()) {
            finalPrompt += `\n\n[USER THEME]\nVisual theme name: "${theme.trim()}". Match this aesthetic in theme, colorPalette, and layout choices.`;
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

          const streamModels = [
            composerPrimary.model,
            ...composeFallbackModels.filter((m) => m !== composerPrimary.model),
          ];

          let ok = false;
          try {
            const { response: streamRes, modelUsed } = await openRouterStreamCascade(APP_URL, {
              models: streamModels,
              messages: [
                { role: 'system', content: system },
                { role: 'user', content: userMessage },
              ],
              plan,
              freeTaste,
              economy: spendState.forcedEconomyMode,
              max_tokens: composerPrimary.maxTokens,
              temperature: composerPrimary.temperature,
            });

            sendOrb({
              orb: {
                phase: 'streaming',
                message: `Composing with ${composerPrimary.label}…`,
                modelLabel: composerPrimary.label,
              },
            });

            const reader = streamRes.body!.getReader();
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              if (value) controller.enqueue(value);
            }
            ok = true;
            // stream complete
          } catch (streamErr) {
            console.error('[Generate] stream cascade failed:', streamErr);
            sendOrb({
              orb: {
                phase: 'fallback',
                message: 'Retrying with an alternate composer…',
              },
            });
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
    // Refund credits if they were charged but we never got to the stream
    if (refundIfNeeded) {
      try { await refundIfNeeded(); } catch (refundErr) {
        console.error('[Generate] Refund failed on outer catch:', refundErr);
      }
    }
    return NextResponse.json({ error: 'An unexpected error occurred during generation.' }, { status: 500 });
  }
}
