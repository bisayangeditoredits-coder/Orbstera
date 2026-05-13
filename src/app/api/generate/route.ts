import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { buildComposerMessages } from '@/lib/ai/orchestration';
import { runOpenRouterOrchestration } from '@/lib/ai/prompt-chain';
import { openRouterStream } from '@/lib/ai/openrouter';
import { selectTextModel } from '@/lib/ai/router';
import { ensureCredits, estimateDeckCostCredits, getCreditConfig } from '@/lib/billing/credits';
import { addEstimatedSpend, getSpendState } from '@/lib/ai/spend';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function POST(req: Request) {
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

    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { get(name: string) { return cookieStore.get(name)?.value; } } }
    );
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Please sign in to generate presentations.' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('plan')
      .eq('id', user.id)
      .maybeSingle();

    const plan = profile?.plan?.toLowerCase() || user.user_metadata?.plan?.toLowerCase() || 'free';

    const MAX_SLIDES: Record<string, number> = {
      free: 5,
      pro: 25,
      student_pro: 25,
      creator_pro: 40,
    };

    const maxSlides = MAX_SLIDES[plan] || 5;
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
    const creditCheck = await ensureCredits({
      supabase,
      userId: user.id,
      planRaw: plan,
      cost: estimatedCredits,
      action: finalSlideCount <= 6 ? 'deck_small' : finalSlideCount <= 15 ? 'deck_medium' : 'deck_large',
      meta: { slides: finalSlideCount, estimatedCredits },
    });
    if (!creditCheck.ok) {
      return NextResponse.json(
        {
          error: 'INSUFFICIENT_CREDITS',
          message: `You don't have enough credits for this generation.`,
          credits: creditCheck.summary,
          required: estimatedCredits,
        },
        { status: 402 },
      );
    }

    // Estimated spend tracking (credit-based approximation for protection).
    // Best-effort only; must never break generation.
    const usdPerCredit = typeof creditConfig.usdPerCredit === 'number' ? creditConfig.usdPerCredit : 0;
    if (usdPerCredit > 0) {
      void addEstimatedSpend({ supabase, usdDelta: estimatedCredits * usdPerCredit });
    }

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
              message: 'Preparing your presentation…',
            },
          });

          // Global spend protection signal (best-effort). Router will downshift if threshold is exceeded.
          const spend = await getSpendState({ supabase });
          const spendState = { forcedEconomyMode: spend.forcedEconomyMode };

          sendOrb({
            orb: {
              phase: 'structure_complete',
              message: 'Locking the narrative spine…',
            },
          });

          const { dossierText, refinedBrief, preflightSummary } = await runOpenRouterOrchestration(
            APP_URL,
            userPrompt,
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
            { plan, spendState },
          );

          sendOrb({
            orb: {
              phase: 'composing',
              message: 'Translating the brief into slide structure and motion…',
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
              phase: 'streaming',
              message: 'Rendering your deck…',
            },
          });

          const composerPrimary = selectTextModel({
            plan,
            task: 'deck_compose',
            complexity: { promptChars: userPrompt.length, slideCount: finalSlideCount },
            spendState,
          });

          const composerFallback = selectTextModel({
            plan: 'creator_pro', // fallback is allowed to be slightly stronger; still gated by availability
            task: 'deck_compose',
            complexity: { promptChars: userPrompt.length, slideCount: finalSlideCount },
            spendState,
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
          if (!ok && composerFallback.model && composerFallback.model !== composerPrimary.model) {
            sendOrb({
              orb: {
                phase: 'fallback',
                message: 'Continuing with an alternate composer…',
              },
            });
            ok = await tryStream(composerFallback.model);
          }
          if (!ok) {
            sendOrb({
              orb: { phase: 'error', message: 'Generation could not complete. Try again shortly.' },
            });
          }
        } catch (e: unknown) {
          console.error('[Generate] stream error:', e);
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
    return NextResponse.json({ error: 'An unexpected error occurred during generation.' }, { status: 500 });
  }
}
