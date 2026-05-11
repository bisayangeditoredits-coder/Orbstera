import { NextResponse } from 'next/server';
import { generateClaidImageUrl } from '@/lib/claid-image';
import { generatePollinationsImageUrl } from '@/lib/pollinations-image';
import { openRouterImageGeneration } from '@/lib/ai/openrouter-image';
import type { ImageVisualProfile } from '@/lib/ai/agent-models';

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

    const hasOpenRouter = Boolean(process.env.OPENROUTER_API_KEY?.trim());
    if (hasOpenRouter) {
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

    const url = hasClaid
      ? await generateClaidImageUrl({ prompt: text, polish: polishBool })
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
