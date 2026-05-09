import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { OR_MODELS } from '@/lib/ai/models';
import { openRouterComplete } from '@/lib/ai/openrouter';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function POST(req: Request) {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { get(name: string) { return cookieStore.get(name)?.value; } } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { slideTitle, speakerNotes, presentationTitle } = await req.json();

    const text = await openRouterComplete(APP_URL, {
      model: OR_MODELS.coach,
      messages: [
        {
          role: 'system',
          content:
            'You are an executive presentation coach. Give 4–6 short bullet tips for delivery and narrative for THIS slide only. Plain text bullets, no JSON.',
        },
        {
          role: 'user',
          content: `Deck: ${presentationTitle || 'Untitled'}\nSlide: ${slideTitle || ''}\nNotes: ${speakerNotes || '(none)'}`,
        },
      ],
      temperature: 0.4,
      max_tokens: 1024,
    });

    return NextResponse.json({ tips: text.trim() });
  } catch (e) {
    console.error('[Coach]', e);
    return NextResponse.json({ error: 'Coach unavailable' }, { status: 500 });
  }
}
