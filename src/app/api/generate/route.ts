import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import crypto from 'crypto';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

const SYSTEM_PROMPT = `You are an elite, Silicon Valley-caliber Presentation Architect and Content Strategist. 
Your objective is to engineer a high-fidelity, industrial-grade presentation structure in strict JSON format.

VISUAL PHILOSOPHY:
- Minimalist Luxury: Use white space, monochromatic palettes with high-contrast accents.
- Architectural Hierarchy: Typography must be bold, spacious, and perfectly balanced.
- Cinematic Motion: Animations should be purposeful, smooth, and high-end.

CONTENT STRATEGY:
- Executive Summary level clarity: Each slide must have a clear, powerful headline.
- Data-Driven Narratives: Even in theoretical topics, use percentages, growth metrics, or logical proofs.
- Visionary Tone: Avoid generic corporate speak; use sophisticated, impactful vocabulary.
- Slide Variety: Mix Hero, Split, Media, and Stats slides. Never repeat the same layout 3 times in a row.

Output must be VALID RAW JSON ONLY. No markdown, no conversation.
Schema:
{
  "title": "Main Title (Strategic & Bold)",
  "theme": "industrial-minimal | tech-luxury | monochromatic-pro",
  "colorPalette": ["#Background", "#PrimaryText", "#Accent", "#SecondaryText"],
  "fontPairing": {"heading": "Architectural Font", "body": "Clean Sans-Serif"},
  "animationStyle": "cinematic-reveal",
  "slides": [
    {
      "id": "unique-id",
      "type": "hero | split | media | quote | chart | stats | timeline | roadmap",
      "title": "Slide Title (Action-oriented)",
      "subtitle": "High-impact insight or metric",
      "bullets": ["Concrete value prop 1", "Concrete value prop 2", "Evidence-based point 3"],
      "imagePrompt": "Cinematic, photorealistic, 8k, professional lighting, shot on 35mm, high-tech industrial aesthetic",
      "visualDirection": "Technical minimalism with glowing accents",
      "backgroundStyle": "mesh-gradient | frosted-glass | technical-grid",
      "animation": {"entrance": "glitch | reveal | elasticScale | flipIn | blurIn", "duration": 1000},
      "speakerNotes": "Strategic delivery notes for the executive speaker"
    }
  ]
}

Guidelines:
1. 'imagePrompt' must be a masterpiece of prompt engineering for elite image models.
2. 'bullets' should be concise but content-rich. Use 3-5 bullets per slide.
3. 'subtitle' is mandatory for hero and split slides to add depth.
4. Content must feel researched, professional, and world-class.`;

export async function POST(req: Request) {
  try {
    const { prompt, mode = 'standard', slideCount = 10, tone = 'professional', language = 'English' } = await req.json();

    // Authenticate user to determine Pro/Free plan and token limits
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

    // Fetch the freshest data straight from the public profiles table!
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan, generations_used')
      .eq('id', user.id)
      .single();

    // ─── PLAN DETECTION (3 tiers) ───────────────────────────
    const plan = profile?.plan?.toLowerCase() || 'free';
    const isFree = plan === 'free' || !plan;
    const isStudentPro = plan === 'pro';
    const isCreatorPro = plan === 'creator_pro';
    const isPaid = isStudentPro || isCreatorPro;
    const usedGenerations = profile?.generations_used || 0;

    // ─── FAIR MONTHLY LIMITS (profit-positive per tier) ─────
    // Free:         3 generations/mo  | Cost to us: ~$0.00 (free model) | Revenue: $0
    // Student Pro:  30 generations/mo | Cost to us: ~$0.30 (claude)     | Revenue: $5  → ~$4.70 profit
    // Creator Pro: 100 generations/mo | Cost to us: ~$1.00 (claude/r1)  | Revenue: $19 → ~$18 profit
    const LIMITS: Record<string, number> = {
      free:        3,
      pro:         30,
      creator_pro: 100,
    };
    const MAX_SLIDES: Record<string, number> = {
      free:        5,
      pro:         25,
      creator_pro: 50,
    };

    const monthlyLimit = LIMITS[plan] ?? 3;
    const maxSlides = MAX_SLIDES[plan] ?? 5;

    // ─── ENFORCE SLIDE CAP (respect the user's chosen count, capped at plan max) ─
    const finalSlideCount = Math.min(Math.max(1, slideCount), maxSlides);

    // ─── ENFORCE MONTHLY GENERATION LIMIT ───────────────────
    if (usedGenerations >= monthlyLimit) {
      const planLabel = isFree ? 'Free' : isStudentPro ? 'Student Pro' : 'Creator Pro';
      return NextResponse.json({
        error: 'LIMIT_REACHED',
        message: `You've used all ${monthlyLimit} of your ${planLabel} monthly AI generations. ${isFree ? 'Upgrade to Student Pro to get 30 generations!' : 'Your limit resets next month.'}`,
        used: usedGenerations,
        limit: monthlyLimit,
      }, { status: 403 });
    }

    // ─── MODEL ROUTING (strictly matching the UI) ────────────────
    // Standard -> DeepSeek Chat
    // Fast     -> Claude 3.5 Sonnet
    // Elite    -> DeepSeek R1
    
    // Security check: if free user tries to use paid models, force standard
    let secureMode = mode;
    if (!isPaid && (mode === 'fast' || mode === 'premium')) {
      secureMode = 'standard';
    }

    let primaryModel: string;
    let fallbackModel: string | null = null;

    if (secureMode === 'premium') {
      primaryModel = 'deepseek/deepseek-r1';
      fallbackModel = 'anthropic/claude-3.7-sonnet'; // Elite fallback
    } else if (secureMode === 'fast') {
      primaryModel = 'anthropic/claude-3.5-sonnet';
      fallbackModel = 'google/gemini-pro-1.5';       // Fast fallback
    } else {
      // Standard: strictly use free models so it works even with 0 balance
      primaryModel = 'meta-llama/llama-3.3-70b-instruct:free';
      fallbackModel = 'google/gemini-2.0-flash-lite-preview-02-05:free'; // Standard fallback
    }

    console.log(`[Generate] User: ${user.id} | Plan: ${plan} | Mode: ${secureMode} | Primary: ${primaryModel} | Slides: ${finalSlideCount} | Used: ${usedGenerations}/${monthlyLimit}`);

    const userMessage = `Construct a world-class ${tone} presentation in ${language} with exactly ${finalSlideCount} slides.
Topic: ${prompt}

Final Instruction: Return ONLY the JSON object. Do not explain. Do not talk. Only the architected data.`;

    async function callOpenRouter(targetModel: string): Promise<{ res: Response | null, error?: string }> {
      console.log(`[Generate] Trying: ${targetModel}`);
      try {
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENROUTER_API_KEY.trim()}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': APP_URL,
            'X-Title': 'Orvixes PPT Maker',
          },
          body: JSON.stringify({
            model: targetModel,
            stream: true,
            messages: [
              { role: 'system', content: SYSTEM_PROMPT },
              { role: 'user', content: userMessage },
            ],
            temperature: 0.3,
            max_tokens: 16000,
          }),
        });

        if (!res.ok) {
          let errText = await res.text().catch(() => '(no body)');
          try {
             const jsonErr = JSON.parse(errText);
             if (jsonErr.error && jsonErr.error.message) {
                 errText = jsonErr.error.message;
             }
          } catch(e) {}
          
          console.error(`[Generate] ${targetModel} → HTTP ${res.status}: ${errText}`);
          return { res: null, error: errText };
        }

        console.log(`[Generate] ${targetModel} → OK, streaming...`);
        return { res };
      } catch (e: any) {
        console.error(`[Generate] ${targetModel} → fetch error:`, e);
        return { res: null, error: e.message || 'Network error' };
      }
    }

    // ─── STRICT EXECUTION ───────────────────────────────────────────────────
    // We only try the exact model requested. If overloaded, try the equivalent fallback.
    let { res: response, error: firstError } = await callOpenRouter(primaryModel);
    let finalError = firstError;
    
    if (!response && fallbackModel) {
      console.warn(`[Generate] Primary ${primaryModel} failed. Falling back to equivalent: ${fallbackModel}`);
      const fallbackResult = await callOpenRouter(fallbackModel);
      response = fallbackResult.res;
      if (!response) finalError = fallbackResult.error;
    }

    if (!response) {
      console.error('[Generate] All models failed. Sending real error to UI.');
      return NextResponse.json({ error: finalError || 'All AI models are currently overloaded. Please try again later.' }, { status: 503 });
    }

    // ── INCREMENT USAGE COUNT ──────────────────────────────────────────────
    // Must happen BEFORE streaming starts (stream response closes the connection)
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ generations_used: usedGenerations + 1 })
      .eq('id', user.id);

    if (updateError) {
      // Log but don't block — user already started generation
      console.error('[Generate] ⚠️ Failed to increment generations_used:', updateError.message);
    } else {
      console.log(`[Generate] ✅ Usage incremented to ${usedGenerations + 1} for user ${user.id}`);
    }

    // Pipe the stream directly to the client
    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('[Generate] Internal error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred during generation.' }, { status: 500 });
  }
}
