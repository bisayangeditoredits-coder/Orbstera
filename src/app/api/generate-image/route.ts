import { NextResponse } from 'next/server';
import { generateClaidImageUrl } from '@/lib/claid-image';
import { generatePollinationsImageUrl } from '@/lib/pollinations-image';
import { openRouterImageGeneration } from '@/lib/ai/openrouter-image';
import type { ImageVisualProfile } from '@/lib/ai/agent-models';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { ensureCredits, getCreditConfig } from '@/lib/billing/credits';
import { selectImageProvider } from '@/lib/ai/router';
import { addEstimatedSpend, getSpendState } from '@/lib/ai/spend';

const POLISH_SUFFIX =
  ', editorial quality, sharp focus, balanced composition, clean professional look, no text overlays, no watermarks';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      prompt,
      width = 1024,
      height = 1024,
      polish = true,
      visualProfile = 'cinematic',
    } = body as {
      prompt?: string;
      width?: number;
      height?: number;
      polish?: boolean;
      visualProfile?: ImageVisualProfile;
    };

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    let text = String(prompt).trim();
    if (polish) {
      const lower = text.toLowerCase();
      const already = lower.includes('no text') || lower.includes('no watermark');
      if (!already) text = `${text}${POLISH_SUFFIX}`;
    }

    const w = Math.max(256, Math.min(1536, Math.round(Number(width)) || 1024));
    const h = Math.max(256, Math.min(1536, Math.round(Number(height)) || 1024));

    // Auth + credits (best-effort; never break editor if missing tables)
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { get(name: string) { return cookieStore.get(name)?.value; } } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    const { data: profile } = await supabase.from('profiles').select('plan').eq('id', user.id).maybeSingle();
    const plan = profile?.plan?.toLowerCase() || user.user_metadata?.plan?.toLowerCase() || 'free';

    const creditConfig = await getCreditConfig(supabase);
    const premiumRequested = visualProfile === 'cinematic' && (plan === 'creator_pro' || plan === 'admin');
    const imageCost = premiumRequested ? creditConfig.costs.image_premium : creditConfig.costs.image_standard;
    const credit = await ensureCredits({
      supabase,
      userId: user.id,
      planRaw: plan,
      cost: imageCost,
      action: premiumRequested ? 'image_premium' : 'image_standard',
      meta: { w, h, visualProfile },
    });
    if (!credit.ok) {
      return NextResponse.json(
        { error: 'INSUFFICIENT_CREDITS', message: `Not enough credits for image generation.`, credits: credit.summary, required: imageCost },
        { status: 402 },
      );
    }

    const usdPerCredit = typeof creditConfig.usdPerCredit === 'number' ? creditConfig.usdPerCredit : 0;
    if (usdPerCredit > 0) void addEstimatedSpend({ supabase, usdDelta: imageCost * usdPerCredit });

    const spend = await getSpendState({ supabase });
    const spendState = { forcedEconomyMode: spend.forcedEconomyMode };
    const sel = selectImageProvider({
      plan,
      visualProfile,
      premiumRequested,
      spendState,
      hasOpenRouterKey: Boolean(process.env.OPENROUTER_API_KEY?.trim()),
      hasClaidKey: Boolean(process.env.CLAID_API_KEY?.trim()),
      hasPollinationsKey: Boolean(process.env.POLLINATIONS_API_KEY?.trim()),
    });

    const hasOpenRouter = Boolean(process.env.OPENROUTER_API_KEY?.trim());
    if (sel.provider === 'openrouter' && hasOpenRouter) {
      const result = await openRouterImageGeneration({
        prompt: text,
        size: `${w}x${h}`,
        visualProfile,
      });
      if (result.ok && result.url) {
        const seed = Math.floor(Math.random() * 1_000_000);
        return NextResponse.json({ url: result.url, seed });
      }
      console.warn('[generate-image] OpenRouter failed, trying legacy providers:', result.status);
    }

    const hasClaid = Boolean(process.env.CLAID_API_KEY?.trim());
    const hasPollinations = Boolean(process.env.POLLINATIONS_API_KEY?.trim());

    if (!hasClaid && !hasPollinations) {
      return NextResponse.json(
        {
          error:
            'Image generation is not configured. Set OPENROUTER_API_KEY, or CLAID_API_KEY / POLLINATIONS_API_KEY (see .env.example).',
        },
        { status: 503 }
      );
    }

    const polishBool = Boolean(polish);
    const seed = Math.floor(Math.random() * 1_000_000);

    const url =
      sel.provider === 'claid' && hasClaid
        ? await generateClaidImageUrl({ prompt: text, polish: polishBool, width: w, height: h })
        : await generatePollinationsImageUrl({
            prompt: text,
            width: w,
            height: h,
            polish: polishBool,
          });

    return NextResponse.json({ url, seed });
  } catch (error) {
    console.error('Image Generation Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to generate image';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
