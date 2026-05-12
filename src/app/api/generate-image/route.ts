import { createHash } from 'crypto';
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { generateClaidImageUrl } from '@/lib/claid-image';
import { generatePollinationsImageUrl } from '@/lib/pollinations-image';
import { openRouterImageGeneration } from '@/lib/ai/openrouter-image';
import type { ImageVisualProfile } from '@/lib/ai/agent-models';
import { creditsForPremiumImage, normalizeBillingPlan } from '@/lib/billing/credits-policy';
import { consumeAiCredits, refundAiCredits } from '@/lib/billing/credits-server';

const POLISH_SUFFIX =
  ', editorial quality, sharp focus, balanced composition, clean professional look, no text overlays, no watermarks';

/** In-process cache — reduces duplicate spend during retries / shared prompts on warm instances. */
const IMAGE_CACHE = new Map<string, { url: string; expiresAt: number }>();
const IMAGE_CACHE_TTL_MS = 86_400_000;
const IMAGE_CACHE_MAX = 400;

function cacheKeyForImage(parts: { prompt: string; w: number; h: number; profile: string; polish: boolean }) {
  return createHash('sha256')
    .update([parts.prompt, String(parts.w), String(parts.h), parts.profile, parts.polish ? '1' : '0'].join('\u0001'))
    .digest('hex');
}

function cacheGet(key: string): string | null {
  const row = IMAGE_CACHE.get(key);
  if (!row || row.expiresAt <= Date.now()) {
    if (row) IMAGE_CACHE.delete(key);
    return null;
  }
  return row.url;
}

function cacheSet(key: string, url: string) {
  if (IMAGE_CACHE.size >= IMAGE_CACHE_MAX) {
    const first = IMAGE_CACHE.keys().next().value as string | undefined;
    if (first) IMAGE_CACHE.delete(first);
  }
  IMAGE_CACHE.set(key, { url, expiresAt: Date.now() + IMAGE_CACHE_TTL_MS });
}

export async function POST(req: Request) {
  let imageCreditsOutstanding = 0;
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

    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { get(name: string) { return cookieStore.get(name)?.value; } } },
    );
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Please sign in to generate slide imagery.' }, { status: 401 });
    }

    const { data: profile } = await supabase.from('profiles').select('plan').eq('id', user.id).maybeSingle();
    const billingPlan = normalizeBillingPlan(profile?.plan ?? user.user_metadata?.plan);
    const polishBoolMain = Boolean(polish);

    const w = Math.max(256, Math.min(1536, Math.round(Number(width)) || 1024));
    const h = Math.max(256, Math.min(1536, Math.round(Number(height)) || 1024));

    let text = String(prompt).trim();
    if (polishBoolMain) {
      const lower = text.toLowerCase();
      const already = lower.includes('no text') || lower.includes('no watermark');
      if (!already) text = `${text}${POLISH_SUFFIX}`;
    }

    const ck = cacheKeyForImage({
      prompt: text,
      w,
      h,
      profile: visualProfile,
      polish: polishBoolMain,
    });
    const cachedUrl = cacheGet(ck);
    if (cachedUrl) {
      const seed = Math.floor(Math.random() * 1_000_000);
      return NextResponse.json({ url: cachedUrl, seed, cached: true });
    }

    const charge = creditsForPremiumImage(polishBoolMain, visualProfile);
    const spend = await consumeAiCredits(supabase, user.id, charge, billingPlan);
    if (!spend.ok) {
      if (spend.code === 'CONFIG_ERROR') {
        return NextResponse.json({ error: 'CREDITS_NOT_CONFIGURED', detail: spend.detail }, { status: 503 });
      }
      return NextResponse.json(
        {
          error: 'INSUFFICIENT_CREDITS',
          creditsRequired: charge,
          creditsRemaining: spend.remaining,
        },
        { status: 403 },
      );
    }
    imageCreditsOutstanding = charge;

    const hasOpenRouter = Boolean(process.env.OPENROUTER_API_KEY?.trim());
    if (hasOpenRouter) {
      const result = await openRouterImageGeneration({
        prompt: text,
        size: `${w}x${h}`,
        visualProfile,
      });
      if (result.ok && result.url) {
        cacheSet(ck, result.url);
        const seed = Math.floor(Math.random() * 1_000_000);
        imageCreditsOutstanding = 0;
        return NextResponse.json({ url: result.url, seed });
      }
      console.warn('[generate-image] OpenRouter failed, trying legacy providers:', result.status);
    }

    const hasClaid = Boolean(process.env.CLAID_API_KEY?.trim());
    const hasPollinations = Boolean(process.env.POLLINATIONS_API_KEY?.trim());

    if (!hasClaid && !hasPollinations) {
      await refundAiCredits(supabase, user.id, imageCreditsOutstanding);
      imageCreditsOutstanding = 0;
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

    const url = hasClaid
      ? await generateClaidImageUrl({ prompt: text, polish: polishBool, width: w, height: h })
      : await generatePollinationsImageUrl({
          prompt: text,
          width: w,
          height: h,
          polish: polishBool,
        });

    cacheSet(ck, url);
    imageCreditsOutstanding = 0;
    return NextResponse.json({ url, seed });
  } catch (error) {
    console.error('Image Generation Error:', error);
    if (imageCreditsOutstanding > 0) {
      try {
        const cookieStore = cookies();
        const supabaseRefund = createServerClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          { cookies: { get(name: string) { return cookieStore.get(name)?.value; } } },
        );
        const {
          data: { user },
        } = await supabaseRefund.auth.getUser();
        if (user?.id) await refundAiCredits(supabaseRefund, user.id, imageCreditsOutstanding);
      } catch (_) {
        /* noop */
      }
    }
    const message = error instanceof Error ? error.message : 'Failed to generate image';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
