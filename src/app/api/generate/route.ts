import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getDeckComposerModels } from '@/lib/ai/models';
import { buildComposerMessages } from '@/lib/ai/orchestration';
import { runOpenRouterOrchestration } from '@/lib/ai/prompt-chain';
import { openRouterStream } from '@/lib/ai/openrouter';

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
      .select('plan, generations_used')
      .eq('id', user.id)
      .maybeSingle();

    const plan = profile?.plan?.toLowerCase() || user.user_metadata?.plan?.toLowerCase() || 'free';
    const usedGenerations = profile?.generations_used || 0;

    const LIMITS: Record<string, number> = {
      free: 3,
      pro: 30,
      student_pro: 30,
      creator_pro: 100,
    };
    const MAX_SLIDES: Record<string, number> = {
      free: 5,
      pro: 25,
      student_pro: 25,
      creator_pro: 40,
    };

    const generationLimit = LIMITS[plan] || 3;
    const maxSlides = MAX_SLIDES[plan] || 5;
    const finalSlideCount = Math.min(Math.max(1, slideCount), maxSlides);

    if (usedGenerations >= generationLimit) {
      const isFree = plan === 'free' || !plan;
      const planLabel = isFree ? 'Free' : plan === 'creator_pro' ? 'Creator Pro' : 'Student Pro';
      const limitKind = isFree ? 'lifetime' : 'monthly';
      return NextResponse.json({
        error: 'LIMIT_REACHED',
        message: isFree
          ? `You've used all ${generationLimit} of your ${planLabel} AI presentations (${limitKind} limit). Upgrade to create more.`
          : `You've used all ${generationLimit} of your ${planLabel} ${limitKind} AI generations.`,
        used: usedGenerations,
        limit: generationLimit,
      }, { status: 403 });
    }

    const { primary: primaryModel, fallback: fallbackModel } = getDeckComposerModels();

    const userPrompt = String(prompt || '').trim();
    if (!userPrompt) {
      return NextResponse.json({ error: 'Prompt is required.' }, { status: 400 });
    }

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

        try {
          sendOrb({
            orb: {
              phase: 'starting',
              message: 'Preparing your presentation…',
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
            }
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
