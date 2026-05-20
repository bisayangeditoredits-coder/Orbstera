import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getDeckComposerModels } from '@/lib/ai/models';
import { getQueue } from '@/lib/queue/client';
import { BASE_QUEUE_NAMES } from '@/lib/queue/config';
import { headers } from 'next/headers';

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
      pro: 10,
      student_pro: 10,
      creator_pro: 40,
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


    // Optimistic Concurrency Control: only update if the counter hasn't changed since we read it
    const { data: updateData, error: updateError } = await supabase
      .from('profiles')
      .update({ generations_used: usedGenerations + 1 })
      .eq('id', user.id)
      .eq('generations_used', usedGenerations)
      .select();

    if (updateError || !updateData || updateData.length === 0) {
      console.error('[Generate] Failed to increment generations_used. Possible race condition or limit reached.');
      return NextResponse.json({ error: 'Concurrent generation detected. Please wait for your previous generation to finish.' }, { status: 409 });
    }

    const reqHeaders = headers();
    const country = reqHeaders.get('x-vercel-ip-country') || '';
    let clientRegion: string | null = null;

    if (['US', 'CA', 'MX'].includes(country)) {
      clientRegion = 'us';
    } else if (['CN', 'JP', 'KR', 'SG', 'IN', 'AU', 'NZ'].includes(country)) {
      clientRegion = 'asia';
    } else if (['GB', 'FR', 'DE', 'IT', 'ES', 'NL', 'SE', 'CH', 'PL'].includes(country)) {
      clientRegion = 'eu';
    }

    const targetQueue = getQueue(BASE_QUEUE_NAMES.AI_GENERATION, clientRegion);
    const jobId = `gen-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    
    await targetQueue.add('generate-presentation', {
      userId: user.id,
      prompt: userPrompt,
      slideCount: finalSlideCount,
      tone: String(tone),
      language: String(language),
      styleMode,
      primaryModel,
      fallbackModel
    }, {
      jobId,
      removeOnComplete: true,
      removeOnFail: false,
    });

    return NextResponse.json({ jobId });
  } catch (error) {
    console.error('[Generate] Internal error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred during generation.' }, { status: 500 });
  }
}
