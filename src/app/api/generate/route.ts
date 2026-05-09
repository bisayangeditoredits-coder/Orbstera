import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { pickComposerModel, type IntelligenceTier, OR_MODELS } from '@/lib/ai/models';
import {
  runPreflight,
  buildComposerMessages,
} from '@/lib/ai/orchestration';
import { openRouterStream } from '@/lib/ai/openrouter';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

function modeToTier(mode: string): IntelligenceTier {
  if (mode === 'fast') return 'fast';
  if (mode === 'premium') return 'elite';
  return 'free';
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      prompt,
      mode = 'standard',
      slideCount = 10,
      tone = 'professional',
      language = 'English',
      styleMode,
    } = body as {
      prompt?: string;
      mode?: string;
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
      .select('plan, generations_used')
      .eq('id', user.id)
      .maybeSingle();

    const plan = profile?.plan?.toLowerCase() || user.user_metadata?.plan?.toLowerCase() || 'free';
    const isPaid = plan === 'student_pro' || plan === 'pro' || plan === 'creator_pro';
    const usedGenerations = profile?.generations_used || 0;

    const LIMITS: Record<string, number> = {
      free:        3,
      pro:         30,
      student_pro: 30,
      creator_pro: 100,
    };
    const MAX_SLIDES: Record<string, number> = {
      free:        5,
      pro:         25,
      student_pro: 25,
      creator_pro: 40,
    };

    const monthlyLimit = LIMITS[plan] || 3;
    const maxSlides = MAX_SLIDES[plan] || 5;
    const finalSlideCount = Math.min(Math.max(1, slideCount), maxSlides);

    if (usedGenerations >= monthlyLimit) {
      const isFree = plan === 'free' || !plan;
      const planLabel = isFree ? 'Free' : plan === 'creator_pro' ? 'Creator Pro' : 'Student Pro';
      return NextResponse.json({
        error: 'LIMIT_REACHED',
        message: `You've used all ${monthlyLimit} of your ${planLabel} monthly AI generations.`,
        used: usedGenerations,
        limit: monthlyLimit,
      }, { status: 403 });
    }

    let secureMode = mode;
    if (!isPaid && (mode === 'fast' || mode === 'premium')) {
      secureMode = 'standard';
    }

    const tier = modeToTier(secureMode);
    const { primary: primaryModel, fallback: fallbackModel } = pickComposerModel(tier);
    const outlineModel = tier === 'free' ? OR_MODELS.outlineFree : tier === 'fast' ? OR_MODELS.outlineFast : OR_MODELS.outlineElite;

    const userPrompt = String(prompt || '').trim();
    if (!userPrompt) {
      return NextResponse.json({ error: 'Prompt is required.' }, { status: 400 });
    }

    const preflight = await runPreflight({
      appUrl: APP_URL,
      tier,
      userPrompt,
      slideCount: finalSlideCount,
      tone: String(tone),
      language: String(language),
    });

    const { system, user: userMessage } = buildComposerMessages({
      tier,
      preflightSummary: preflight.summaryForPrompt,
      userPrompt,
      slideCount: finalSlideCount,
      tone: String(tone),
      language: String(language),
      styleMode: styleMode ? String(styleMode) : undefined,
    });

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ generations_used: usedGenerations + 1 })
      .eq('id', user.id);

    if (updateError) {
      console.error('[Generate] Failed to increment generations_used:', updateError.message);
    }

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const sendOrb = (payload: Record<string, unknown>) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
        };

        sendOrb({
          orb: {
            phase: 'preflight_complete',
            tier,
            models: { outline: outlineModel, composer: primaryModel, fallback: fallbackModel },
            intent:
              typeof preflight.raw.detectedIntent === 'string'
                ? preflight.raw.detectedIntent
                : undefined,
            presentationType:
              typeof preflight.raw.presentationType === 'string'
                ? preflight.raw.presentationType
                : undefined,
          },
        });

        sendOrb({
          orb: {
            phase: 'streaming',
            model: primaryModel,
            message: 'Composing structured presentation JSON…',
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

        try {
          let ok = await tryStream(primaryModel);
          if (!ok && fallbackModel) {
            sendOrb({
              orb: {
                phase: 'fallback',
                model: fallbackModel,
                message: 'Primary composer unavailable — switching to fallback model.',
              },
            });
            ok = await tryStream(fallbackModel);
          }
          if (!ok) {
            sendOrb({
              orb: { phase: 'error', message: 'All composer models failed. Try again shortly.' },
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
