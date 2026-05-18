import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { requireAiUser, aiUnauthorized } from '@/lib/auth/require-ai-route';
import { ensureCredits, getCreditConfig } from '@/lib/billing/credits';
import { getBillingPlan } from '@/lib/billing/resolve-plan';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';

export const runtime = 'nodejs';
export const maxDuration = 30;

// ── Tiered AI Models ─────────────────────────────────────────────────────────
// Free           → Best available free models (auto-fallback on 429)
// Student Pro    → Claude Sonnet (smart, fast, great at narrative structure)
// Creator Pro    → GPT-5.5 (frontier reasoning, investor-grade decks)
const FREE_MODELS = [
  'meta-llama/llama-3.3-70b-instruct:free', // Primary free model
  'mistralai/mistral-7b-instruct:free',      // Fallback #1
  'qwen/qwen3-8b:free',                      // Fallback #2
  'deepseek/deepseek-r1:free',               // Fallback #3
] as const;

const STUDENT_PRO_MODEL = 'anthropic/claude-sonnet-4-5';  // Fast + smart narrative
const CREATOR_PRO_MODEL = 'openai/gpt-5.5';               // Frontier — investor-grade

// ── System Prompts ────────────────────────────────────────────────────────────
const OUTPUT_RULES = `
STRICT RULES:
- Never repeat the same question, sentence, or bullet.
- On the FIRST reply: output the slide outline immediately. Do NOT ask clarifying questions unless the topic is literally empty.
- If the topic is vague, infer a reasonable subject and still output slides right away.
- Structure every outline reply as: (1) one short intro line (max 1 sentence), (2) numbered slides, (3) one closing line telling the user to click "Generate deck" when ready.
- Use this slide format exactly (one per line): Slide 1: Title — one-line key message
- First outline: maximum 8 slides unless the user asks for more.
- Keep total reply focused; no filler paragraphs or repeated phrases.`;

const BASE_SYSTEM_PROMPT = `You are the Orbstera Copilot, an expert presentation planner.
The user wants a professional presentation outline.

${OUTPUT_RULES}

Example slides:
Slide 1: Title — Hook and topic
Slide 2: Problem — Core pain point
Slide 3: Solution — Your approach

Use clean markdown only. No JSON.`;

const STUDENT_PRO_SYSTEM_PROMPT = `You are the Orbstera Pro Planner — a sharp presentation strategist with the instincts of a top consultant.
The user wants a compelling, well-structured deck.

${OUTPUT_RULES}

For each slide, use proven narrative frameworks (problem-solution, SCQA, hero's journey, or data-driven storytelling).
Make titles punchy and benefit-led. Max 10 slides unless asked for more.

Format:
Slide 1: Title — key message
Slide 2: Problem — ...

Be sharp, clear, and persuasive. Remind them to click "Generate deck" when the outline is ready.`;

const CREATOR_PRO_SYSTEM_PROMPT = `You are the Orbstera Creator Strategist — a world-class presentation director with the strategic depth of McKinsey and the storytelling of TED.
The user wants a high-impact, investor-grade or agency-ready deck.

${OUTPUT_RULES}

Apply the best narrative arc for the context:
- Investor decks: Problem → Market → Solution → Traction → Team → Ask
- Agency/client: Insight → Strategy → Creative → Results → Next Steps
- Educational: Hook → Context → Content blocks → Key takeaway → CTA

For each slide:
- Write a punchy, benefit-driven title (not generic like "Introduction")
- Add a one-line message that tells the audience exactly what to think
- Imply the slide type in the title when helpful (data, quote, split, hero, chart)

Max 12 slides unless asked for more. Be precise and investor-grade. No JSON.
Remind them to click "Generate deck" when ready.`;

export async function POST(req: Request) {
  try {
    const { messages, sessionId, topic } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages array is required' }, { status: 400 });
    }

    const auth = await requireAiUser(req, 'default');
    if ('response' in auth) {
      if (auth.response.status === 401) {
        return aiUnauthorized('Please sign in to use the presentation planner.');
      }
      return auth.response;
    }
    const user = auth.user;
    const userId = user.id;

    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { get(name: string) { return cookieStore.get(name)?.value; } } }
    );

    const plan = await getBillingPlan(user.id);
    const planTier: 'free' | 'student' | 'creator' =
      plan === 'creator_pro' || plan === 'admin'
        ? 'creator'
        : plan === 'pro' || plan === 'student_pro'
          ? 'student'
          : 'free';

    const creditConfig = await getCreditConfig(supabase);
    const plannerCost = creditConfig.costs.rewrite ?? 1;
    const creditCheck = await ensureCredits({
      supabase,
      userId: user.id,
      cost: plannerCost,
      action: 'rewrite',
      meta: { route: 'planner/chat', planTier },
    });
    if (!creditCheck.ok) {
      return NextResponse.json(
        {
          error: 'INSUFFICIENT_CREDITS',
          message: 'Not enough credits for planner messages.',
          credits: creditCheck.summary,
          required: plannerCost,
        },
        { status: 402 },
      );
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
    const topicLine =
      typeof topic === 'string' && topic.trim()
        ? `\nPresentation topic: "${topic.trim()}". Output the slide outline in your first reply using Slide N: Title — message format. Infer a reasonable subject if the topic is vague.`
        : '';

    let systemPrompt: string;
    let modelsToTry: string[];
    let temperature: number;
    let max_tokens: number;

    if (planTier === 'creator') {
      systemPrompt = CREATOR_PRO_SYSTEM_PROMPT + topicLine;
      modelsToTry = [CREATOR_PRO_MODEL, STUDENT_PRO_MODEL]; // GPT-5.5 → Claude fallback
      temperature = 0.55;
      max_tokens = 2500;
    } else if (planTier === 'student') {
      systemPrompt = STUDENT_PRO_SYSTEM_PROMPT + topicLine;
      modelsToTry = [STUDENT_PRO_MODEL];                    // Claude Sonnet only
      temperature = 0.6;
      max_tokens = 2000;
    } else {
      systemPrompt = BASE_SYSTEM_PROMPT + topicLine;
      modelsToTry = [...FREE_MODELS];                       // LLaMA → Mistral → Qwen cascade
      temperature = 0.7;
      max_tokens = 1024;
    }

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
        'X-Planner-Plan': planTier,
      },
    });
  } catch (error) {
    console.error('[Planner Chat] Error:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Failed to chat', detail: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
