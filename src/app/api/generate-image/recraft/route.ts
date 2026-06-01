import { NextResponse } from 'next/server';
import { requireAiUser } from '@/lib/auth/require-ai-route';
import {
  chargeCreditsBeforeJob,
  getActionCreditCost,
  getCreditConfig,
} from '@/lib/billing/credits';
import { getOrCreateRequestId, captureApiException } from '@/lib/observability';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { readJsonBodyWithLimit } from '@/lib/http/request-body-limit';

export const runtime = 'nodejs';
export const maxDuration = 120;
const MAX_BODY_BYTES = 64 * 1024;

export async function POST(req: Request) {
  const requestId = getOrCreateRequestId(req);
  try {
    const auth = await requireAiUser(req, 'default');
    if ('response' in auth) {
      if (auth.response.status === 401) {
        return NextResponse.json({ error: 'Please sign in to generate images.' }, { status: 401 });
      }
      return auth.response;
    }
    const user = auth.user;

    const bodyResult = await readJsonBodyWithLimit<{
      prompt: string;
      style?: 'vector' | 'raster';
      mode?: 'generate' | 'restyle';
      imageUrl?: string;
    }>(req, MAX_BODY_BYTES);
    if (!bodyResult.ok) return bodyResult.response;
    const body = bodyResult.value;
    const {
      prompt,
      style = 'vector',
      mode = 'generate',
      imageUrl,
    } = body as {
      prompt: string;
      style?: 'vector' | 'raster';
      mode?: 'generate' | 'restyle';
      imageUrl?: string;
    };

    if (!prompt && mode === 'generate') {
      return NextResponse.json({ error: 'Prompt is required for generation' }, { status: 400 });
    }

    if (mode === 'restyle' && !imageUrl) {
      return NextResponse.json({ error: 'Source image URL is required for restyling' }, { status: 400 });
    }

    const action = style === 'vector' ? 'recraft_v3_vector' : 'recraft_v2_raster';

    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { get(name: string) { return cookieStore.get(name)?.value; } } },
    );

    const creditConfig = await getCreditConfig(supabase);
    const cost = getActionCreditCost(creditConfig, action);

    const credit = await chargeCreditsBeforeJob({
      supabase,
      userId: user.id,
      action,
      cost,
      meta: { style, mode },
      idempotencyKey: requestId,
    });

    if (!credit.ok) {
      // Fallback to Pollinations for ALL users who run out of credits
      const safePrompt = encodeURIComponent(prompt);
      const pUrl = `https://image.pollinations.ai/prompt/${safePrompt}?width=1024&height=1024&seed=${Math.floor(Math.random() * 1000000)}&nologo=true`;
      return NextResponse.json({ 
        url: pUrl,
        fallback: true,
        provider: 'pollinations'
      });
    }

    const recraftKey = process.env.RECRAFT_API_KEY?.trim();
    if (!recraftKey) {
      return NextResponse.json(
        { error: 'Recraft API is not configured (RECRAFT_API_KEY missing).' },
        { status: 503 }
      );
    }

    let recraftUrl = 'https://external.api.recraft.ai/v1/images/generations';
    let requestBody: any = {
      prompt,
      style: style === 'vector' ? 'vector_illustration' : 'realistic_image',
    };

    if (mode === 'restyle') {
      recraftUrl = 'https://external.api.recraft.ai/v1/images/imageToImage';
      requestBody = {
        prompt,
        image: imageUrl, // Note: In a real implementation, you might need to upload the image or pass a base64 string depending on Recraft API docs.
        style: style === 'vector' ? 'vector_illustration' : 'realistic_image',
      };
    }

    const response = await fetch(recraftUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${recraftKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Recraft API Error:', response.status, errText);
      throw new Error(`Recraft API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data && data.data && data.data.length > 0) {
      return NextResponse.json({ url: data.data[0].url });
    }

    throw new Error('No image returned from Recraft');
  } catch (error) {
    console.error('Recraft Generation Error:', error);
    captureApiException(error, { requestId, route: 'POST /api/generate-image/recraft' });
    const message = error instanceof Error ? error.message : 'Failed to generate image with Recraft';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
