import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getDeckComposerModelsForPlan } from '@/lib/ai/models';
import { buildComposerMessages } from '@/lib/ai/orchestration';
import { runOpenRouterOrchestration } from '@/lib/ai/prompt-chain';
import { openRouterStream } from '@/lib/ai/openrouter';
import { orchestrationRoutingForPlan } from '@/lib/ai/smart-routing';
import {
  bumpFreeLifetimeDeckCount,
  consumeAiCredits,
  isAiEconomyMode,
  refundAiCredits,
} from '@/lib/billing/credits-server';
import {
  creditsForPresentation,
  FREE_LIFETIME_DECK_CAP,
  maxSlidesForPlan,
  normalizeBillingPlan,
} from '@/lib/billing/credits-policy';

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
      .select('plan, generations_used, monthly_ai_credits_used, credits_cycle_key')
      .eq('id', user.id)
      .maybeSingle();

    const billingPlan = normalizeBillingPlan(profile?.plan || user.user_metadata?.plan);
    const usedFreeLifetimeDecks = Math.max(0, Number(profile?.generations_used) || 0);

    const maxSlides = maxSlidesForPlan(billingPlan);
    const finalSlideCount = Math.min(Math.max(1, slideCount), maxSlides);

    if (billingPlan === 'free' && usedFreeLifetimeDecks >= FREE_LIFETIME_DECK_CAP) {
      return NextResponse.json(
        {
          error: 'LIFETIME_DECK_CAP',
          message: `Free accounts include ${FREE_LIFETIME_DECK_CAP} lifetime AI presentations (5 slides max). Upgrade to keep creating.`,
          used: usedFreeLifetimeDecks,
          limit: FREE_LIFETIME_DECK_CAP,
        },
        { status: 403 },
      );
    }

    const deckCreditCost = creditsForPresentation(finalSlideCount);
    const spend = await consumeAiCredits(supabase, user.id, deckCreditCost, billingPlan);

    if (!spend.ok) {
      if (spend.code === 'CONFIG_ERROR') {
        return NextResponse.json(
          {
            error: 'CREDITS_NOT_CONFIGURED',
            message:
              'AI credits tracking is not set up yet. Run scripts/supabase-ai-credits.sql on your Supabase project.',
            detail: spend.detail,
          },
          { status: 503 },
        );
      }
      return NextResponse.json(
        {
          error: 'INSUFFICIENT_CREDITS',
          message: `This deck requires ${deckCreditCost} credits. Upgrade or wait for your monthly reset.`,
          creditsRequired: deckCreditCost,
          creditsRemaining: spend.remaining,
          allowance: spend.allowance,
          plan: billingPlan,
        },
        { status: 403 },
      );
    }

    const economyMode = isAiEconomyMode();
    const orchestrationRouting = orchestrationRoutingForPlan(
      billingPlan,
      economyMode,
      String(prompt || ''),
      finalSlideCount,
    );
    const { primary: primaryModel, fallback: fallbackModel } = getDeckComposerModelsForPlan(
      billingPlan,
      economyMode,
    );

    const userPrompt = String(prompt || '').trim();
    if (!userPrompt) {
      await refundAiCredits(supabase, user.id, deckCreditCost);
      return NextResponse.json({ error: 'Prompt is required.' }, { status: 400 });
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
              message: 'Preparing narrative intelligence…',
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
            orchestrationRouting,
            (phase, message) => {
              sendOrb({
                orb: {
                  phase,
                  message,
                },
              });
            }
          );

          sendOrb({
            orb: {
              phase: 'composing',
              message: 'Generating visuals & layouts…',
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
              message: 'Finalizing premium presentation…',
            },
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

          let ok = await tryStream(primaryModel);
          if (!ok && fallbackModel) {
            sendOrb({
              orb: {
                phase: 'fallback',
                message: 'Continuing with an alternate composer…',
              },
            });
            ok = await tryStream(fallbackModel);
          }
          if (!ok) {
            sendOrb({
              orb: { phase: 'error', message: 'Generation could not complete. Try again shortly.' },
            });
            await refundAiCredits(supabase, user.id, deckCreditCost);
          } else {
            await bumpFreeLifetimeDeckCount(supabase, user.id, billingPlan);
          }
        } catch (e: unknown) {
          console.error('[Generate] stream error:', e);
          await refundAiCredits(supabase, user.id, deckCreditCost);
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
