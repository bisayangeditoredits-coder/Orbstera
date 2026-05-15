import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';

export const runtime = 'nodejs';
export const maxDuration = 30;

// ── Tiered AI Models ─────────────────────────────────────────────────────────
// Free users  → Try multiple free models in order (fallback on 429 rate-limit)
// Pro users   → Gemini 2.5 Flash paid (smarter, faster)
const FREE_MODELS = [
  'meta-llama/llama-3.3-70b-instruct:free', // Primary free model
  'mistralai/mistral-7b-instruct:free',      // Fallback #1
  'qwen/qwen3-8b:free',                      // Fallback #2
  'deepseek/deepseek-r1:free',               // Fallback #3
] as const;

const PRO_MODEL = 'google/gemini-2.5-flash';

// ── System Prompts ────────────────────────────────────────────────────────────
const BASE_SYSTEM_PROMPT = `You are the Orbstera Copilot, an expert presentation planner and strategist.
The user wants to create a professional presentation.
Your task is to discuss and refine the outline with them.

When the user gives a topic, propose a slide-by-slide outline. 
Format your outline clearly, for example:
Slide 1: Title
Slide 2: Problem
Slide 3: Solution

Be concise, highly professional, and ready to adapt based on their feedback.
If the user says "this looks good", remind them to click the "Approve & Generate" button in the UI.
DO NOT output JSON blocks unless asked. Just write the outline in clean markdown.`;

const PRO_SYSTEM_PROMPT = `You are the Orbstera Pro Copilot — a world-class presentation strategist and storytelling expert.
The user wants to create a high-impact professional presentation.

Your role:
1. Deeply understand the user's goal, audience, and desired outcome.
2. Propose a compelling slide-by-slide narrative arc — not just a list, but a STORY.
3. For each slide, suggest the type (title, problem, solution, data, quote, CTA, etc.) and key message.
4. Offer smart improvements based on persuasion frameworks (SCQA, Pyramid Principle, Hero's Journey).
5. Be ready to iterate quickly based on feedback.

Format your outline clearly:
**Slide 1: [Title]** — [1-line description of the key message]
**Slide 2: [Title]** — [1-line description]

Be sharp, strategic, and investor-grade in your thinking.
If the user is happy with the outline, remind them to click "Generate Presentation with this Outline".
DO NOT output JSON. Use clean markdown only.`;

export async function POST(req: Request) {
  try {
    const { messages, sessionId, topic } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages array is required' }, { status: 400 });
    }

    // ── Detect user plan (best-effort; defaults to free if unauthenticated) ──
    let userPlan: 'free' | 'pro' = 'free';
    let userId: string | null = null;

    try {
      const cookieStore = cookies();
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { get(name: string) { return cookieStore.get(name)?.value; } } }
      );
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        userId = user.id;
        const { data: profile } = await supabase
          .from('profiles')
          .select('plan')
          .eq('id', user.id)
          .maybeSingle();
        const plan = (profile?.plan || user.user_metadata?.plan || 'free').toLowerCase();
        if (plan === 'pro' || plan === 'student_pro' || plan === 'creator_pro' || plan === 'admin') {
          userPlan = 'pro';
        }
      }
    } catch {
      // If plan detection fails, default to free — never block the user
    }

    // ── Save user message to DB (best-effort, non-blocking) ──────────────────
    if (sessionId && userId) {
      try {
        const cookieStore = cookies();
        const supabase = createServerClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          { cookies: { get(name: string) { return cookieStore.get(name)?.value; } } }
        );
        const userMessage = messages[messages.length - 1];
        await supabase.from('chat_messages').insert({
          session_id: sessionId,
          role: 'user',
          content: userMessage.content,
        });
      } catch { /* ignore */ }
    }

    // ── Select model & system prompt based on plan ───────────────────────────
    const systemPrompt = userPlan === 'pro' ? PRO_SYSTEM_PROMPT : BASE_SYSTEM_PROMPT;
    const temperature  = userPlan === 'pro' ? 0.6 : 0.7;
    const max_tokens   = userPlan === 'pro' ? 2048 : 1024;

    // ── Try models in order (auto-fallback on 429 rate-limit) ────────────────
    const modelsToTry = userPlan === 'pro' ? [PRO_MODEL] : [...FREE_MODELS];
    let response: Response | null = null;
    let selectedModel = modelsToTry[0];

    for (const model of modelsToTry) {
      selectedModel = model;
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
          'X-Title': 'Orbstera Planner',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages,
          ],
          stream: true,
          temperature,
          max_tokens,
        }),
      });

      if (res.ok) {
        response = res;
        break; // success — stop trying
      }

      const status = res.status;
      console.warn(`[Planner] Model ${model} returned ${status}, ${status === 429 ? 'trying next...' : 'giving up.'}`);
      if (status !== 429) {
        // Non-rate-limit error — don't retry with another model
        const err = await res.text();
        throw new Error(`OpenRouter error (${status}): ${err}`);
      }
      // 429 — loop to next model
    }

    if (!response) {
      throw new Error('All AI models are currently rate-limited. Please try again in a moment.');
    }

    // ── Stream back to client while saving full response to DB ───────────────
    const decoder = new TextDecoder();
    let fullResponse = '';

    const transformStream = new TransformStream({
      transform(chunk, controller) {
        const text = decoder.decode(chunk);
        const lines = text.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            try {
              const data = JSON.parse(line.slice(6));
              const token = data.choices[0]?.delta?.content || '';
              fullResponse += token;
            } catch { /* ignore parse error */ }
          }
        }
        controller.enqueue(chunk);
      },
      async flush() {
        if (sessionId && userId && fullResponse) {
          try {
            const cookieStore = cookies();
            const supabase = createServerClient(
              process.env.NEXT_PUBLIC_SUPABASE_URL!,
              process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
              { cookies: { get(name: string) { return cookieStore.get(name)?.value; } } }
            );
            await supabase.from('chat_messages').insert({
              session_id: sessionId,
              role: 'assistant',
              content: fullResponse,
            });
          } catch { /* ignore */ }
        }
      },
    });

    // Pass the plan tier as a response header so the frontend can show a badge
    return new Response(response.body?.pipeThrough(transformStream), {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Planner-Model': selectedModel,
        'X-Planner-Plan': userPlan,
      },
    });
  } catch (error) {
    console.error('[Planner Chat] Error:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Failed to chat', detail: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
