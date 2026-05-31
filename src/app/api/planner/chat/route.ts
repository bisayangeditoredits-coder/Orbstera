import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { requireAiUser, aiUnauthorized } from '@/lib/auth/require-ai-route';
import { chargeCreditsBeforeJob, getActionCreditCost, getCreditConfig } from '@/lib/billing/credits';
import { getBillingPlan } from '@/lib/billing/resolve-plan';
import { getPlannerModelCascade, type SubscriptionTier } from '@/lib/ai/tier-models';
import {
  isPlannerLlmConfigured,
  plannerModelsForBackend,
  resolveLlmBackend,
  streamLlmChat,
} from '@/lib/ai/llm-chat-stream';
import { readJsonBodyWithLimit } from '@/lib/http/request-body-limit';

export const runtime = 'nodejs';
/** Streaming planner replies; align with OpenRouter stream timeout budget. */
export const maxDuration = 120;
const MAX_BODY_BYTES = 256 * 1024;

type PlannerPreferences = {
  slideCount?: number;
  colorPalette?: string[];
  themeName?: string;
  layoutCategory?: string;
  themeExplicit?: boolean;
  paletteExplicit?: boolean;
  layoutCategoryExplicit?: boolean;
};

// ── System Prompts ────────────────────────────────────────────────────────────
function getOutputRules(brandKit?: { primary_color?: string; font?: string }, preferences?: PlannerPreferences) {
  if (preferences?.slideCount) {
    const themeLine =
      preferences.themeExplicit && preferences.themeName
        ? `Optional visual mood: "${preferences.themeName}" (do not ask for brand colors).`
        : 'The AI will choose visual direction — do not ask for brand colors unless the topic is extremely vague.';
    const layoutLine = preferences.layoutCategory
      ? `Optional layout inspiration: "${preferences.layoutCategory}" (you may pick a better structure for the topic).`
      : '';
    const colorLine =
      preferences.paletteExplicit && preferences.colorPalette?.length
        ? `Suggested colors (optional): ${preferences.colorPalette.join(', ')}.`
        : '';
    return `
STRICT RULES:
- Never repeat the same question, sentence, or bullet.
- [SETUP COMPLETE] The user already chose exactly ${preferences.slideCount} slides. ${themeLine} ${layoutLine} ${colorLine}
- DO NOT ask how many slides they want or what brand color to use.
- On the FIRST reply: output the FULL detailed slide outline immediately (unless the topic is extremely vague — then ask ONE short clarifying question only, then outline in the same or next reply).
- The outline MUST contain exactly ${preferences.slideCount} slides (Slide 1 through Slide ${preferences.slideCount}).
- Structure: (1) one short intro line, (2) ALL slides with FULL details below, (3) one closing line telling the user to click "Generate deck".
- For EVERY slide, use this EXACT multi-line format:

Slide N: Title — one-line key message
  • Bullet 1: specific content point or data highlight
  • Bullet 2: supporting detail, stat, or example
  • Bullet 3: additional context or call-to-action element
  Visual: [suggested layout — e.g. hero image, split-screen, chart, quote block, icon grid]

- Be SPECIFIC: write real content bullets, not vague placeholders like "add content here".
- Keep total reply focused; no filler paragraphs or repeated phrases.`;
  }

  if (brandKit && brandKit.primary_color) {
    return `
STRICT RULES:
- Never repeat the same question, sentence, or bullet.
- [GLOBAL BRAND KIT ACTIVE] The user already has their brand kit defined (Primary Color: ${brandKit.primary_color}${brandKit.font ? `, Font: ${brandKit.font}` : ''}).
- On the FIRST reply: DO NOT output an outline immediately! You MUST ask the user 1 short, engaging question:
  1) Ask how many slides they want for the presentation.
- Do NOT ask for their brand color, because it is automatically applied from their brand kit.
- Do NOT output the slide outline until the user has answered or explicitly asked you to just build it.
- Once ready to build, structure your outline reply as: (1) one short intro line, (2) ALL slides with FULL details below, (3) one closing line telling the user to click "Generate deck".
- For EVERY slide, use this EXACT multi-line format:

Slide N: Title — one-line key message
  • Bullet 1: specific content point or data highlight
  • Bullet 2: supporting detail, stat, or example
  • Bullet 3: additional context or call-to-action element
  Visual: [suggested layout — e.g. hero image, split-screen, chart, quote block, icon grid]

- Be SPECIFIC: write real content bullets, not vague placeholders.
- Keep total reply focused; no filler paragraphs or repeated phrases.`;
  }

  return `
STRICT RULES:
- Never repeat the same question, sentence, or bullet.
- On the FIRST reply: DO NOT output an outline immediately! You MUST ask the user 2 short, engaging questions before proceeding:
  1) Ask how many slides they want for the presentation.
  2) Ask what specific brand color or hex code they want to use for the design.
- Do NOT output the slide outline until the user has answered or explicitly asked you to just build it.
- Once ready to build, structure your outline reply as: (1) one short intro line, (2) ALL slides with FULL details below, (3) one closing line telling the user to click "Generate deck".
- For EVERY slide, use this EXACT multi-line format:

Slide N: Title — one-line key message
  • Bullet 1: specific content point or data highlight
  • Bullet 2: supporting detail, stat, or example
  • Bullet 3: additional context or call-to-action element
  Visual: [suggested layout — e.g. hero image, split-screen, chart, quote block, icon grid]

- Be SPECIFIC: write real content bullets, not vague placeholders.
- Keep total reply focused; no filler paragraphs or repeated phrases.`;
}

function getOutputRulesForPrompt(brandKit?: { primary_color?: string; font?: string }, preferences?: PlannerPreferences) {
  return getOutputRules(brandKit, preferences);
}

const getBaseSystemPrompt = (brandKit: { primary_color?: string; font?: string } | undefined, preferences?: PlannerPreferences) => `You are the Orbstera Copilot, an expert presentation planner.
The user wants a professional presentation outline.

${getOutputRulesForPrompt(brandKit, preferences)}

IMPORTANT — understand these shortcut messages immediately:
- "6 slides" / "10 slides" / "15 slides" → adjust the outline to that exact count
- "Minimal & clean" → use simple, text-forward slide titles
- "Bold & visual" → add visual/media slide types (image, split, quote)
- "Data-driven" → include at least 2 stats or chart slides
- "Investor pitch" → use investor narrative: Problem → Market → Solution → Traction → Team → Ask
- "Educational" → use Hook → Context → Lesson blocks → Key takeaway → CTA structure

Example detailed slide format:
Slide 1: The Future of Remote Work — Why the office is no longer the default
  • 73% of workers prefer hybrid or fully remote arrangements (Gallup 2024)
  • Companies that mandate full return-to-office report 24% higher turnover
  • This deck explores the data, the risks, and the winning strategy
  Visual: Hero slide with bold stat overlay on workspace photography

Slide 2: The Problem — Productivity myths are costing companies talent
  • Common misconception: remote workers are less productive
  • Stanford study shows 13% productivity boost in remote settings
  • Root cause: managers optimizing for visibility, not output
  Visual: Split-screen — office vs home setup with annotated stat callouts

Use clean markdown only. No JSON.`;

const getStudentProSystemPrompt = (brandKit: { primary_color?: string; font?: string } | undefined, preferences?: PlannerPreferences) => `You are the Orbstera Pro Planner — a sharp presentation strategist with the instincts of a top consultant.
The user wants a compelling, well-structured deck.

${getOutputRulesForPrompt(brandKit, preferences)}

For each slide, apply proven narrative frameworks (problem-solution, SCQA, hero's journey, or data-driven storytelling).
Make titles punchy and benefit-led.

For EVERY slide write:
- A sharp, benefit-driven title with key message on the same line
- 3 specific content bullets (real data points, insights, or action items — not generic fillers)
- A visual suggestion (layout type: hero, split, chart, quote, icon grid, timeline, etc.)

Example:
Slide 1: Redefining Leadership — The shift from authority to influence
  • Leaders who coach outperform those who direct by 2.4× (HBR 2023)
  • Command-and-control models increase attrition by 31% in knowledge workers
  • This deck maps the transition framework used by Fortune 100 companies
  Visual: Bold hero with leadership archetype contrast graphic

Be sharp, clear, and persuasive. Remind them to click "Generate deck" when the outline is ready.`;

const getCreatorProSystemPrompt = (brandKit: { primary_color?: string; font?: string } | undefined, preferences?: PlannerPreferences) => `You are the Orbstera Creator Strategist — a world-class presentation director with the strategic depth of McKinsey and the storytelling of TED.
The user wants a high-impact, investor-grade or agency-ready deck.

${getOutputRulesForPrompt(brandKit, preferences)}

Apply the best narrative arc for the context:
- Investor decks: Problem → Market → Solution → Traction → Team → Ask
- Agency/client: Insight → Strategy → Creative → Results → Next Steps
- Educational: Hook → Context → Content blocks → Key takeaway → CTA

For EVERY slide, provide:
1. A punchy, benefit-driven title with a precise one-line key message
2. 3–4 specific, substantive content bullets — include real data points, concrete examples, or precise action items. NO vague filler like "discuss the topic here".
3. A visual direction line specifying layout type and image/graphic concept

Example investor deck slide:
Slide 3: The Market Opportunity — A $47B problem with no dominant player
  • Global market for [sector] reaches $47B by 2027, growing at 18% CAGR (Statista)
  • Top 3 incumbents each hold <8% market share — no clear winner yet
  • Our beachhead segment: 12,000 mid-market firms spending avg $180K/yr on legacy tools
  Visual: TAM/SAM/SOM concentric circles with annotated dollar figures

Be precise, investor-grade, and strategically sharp. No JSON.
Remind them to click "Generate deck" when ready.`;


export async function POST(req: Request) {
  try {
    if (!isPlannerLlmConfigured()) {
      return NextResponse.json(
        {
          error: 'LLM_NOT_CONFIGURED',
          message:
            'AI Copilot needs OPENAI_API_KEY or OPENROUTER_API_KEY in .env.local, then restart npm run dev.',
        },
        { status: 503 },
      );
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

    const bodyResult = await readJsonBodyWithLimit<{
      messages?: { role: string; content: string }[];
      sessionId?: string;
      topic?: string;
      preferences?: PlannerPreferences;
    }>(req, MAX_BODY_BYTES);
    if (!bodyResult.ok) return bodyResult.response;
    const { messages, sessionId, topic, preferences } = bodyResult.value;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages array is required' }, { status: 400 });
    }

    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { get(name: string) { return cookieStore.get(name)?.value; } } }
    );

    // Fetch brand kit if exists
    const { data: profileData } = await supabase
      .from('profiles')
      .select('brand_kit')
      .eq('id', user.id)
      .single();
    
    const brandKit = profileData?.brand_kit as any;

    const plan = await getBillingPlan(user.id);
    const llmBackend = resolveLlmBackend(plan)!;
    let planTier: SubscriptionTier =
      plan === 'creator_pro' || plan === 'admin'
        ? 'creator'
        : plan === 'pro' || plan === 'student_pro'
          ? 'student'
          : 'free';

    const creditConfig = await getCreditConfig(supabase);
    const plannerCost = getActionCreditCost(creditConfig, 'rewrite');
    const creditCheck = await chargeCreditsBeforeJob({
      supabase,
      userId: user.id,
      action: 'rewrite',
      cost: plannerCost,
      meta: { route: 'planner/chat', planTier },
    });

    if (!creditCheck.ok) {
      if (planTier !== 'free' && creditCheck.error === 'INSUFFICIENT_CREDITS') {
        return NextResponse.json(
          {
            error: 'INSUFFICIENT_CREDITS',
            message: `Not enough credits for planner (${plannerCost} required).`,
            credits: creditCheck.summary,
            required: plannerCost,
          },
          { status: 402 },
        );
      }
      if (planTier !== 'free' && creditCheck.error !== 'INSUFFICIENT_CREDITS') {
        console.error(
          `[Planner] Paid user billing gate failed (${creditCheck.error}); continuing without charge.`,
        );
      } else {
        console.warn(`[Planner] Free user out of credits (${user.id}); using free models only.`);
      }
      planTier = 'free';
    }

    // ── Save user message to DB (best-effort, non-blocking) ──────────────────
    if (sessionId && userId) {
      try {
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

    const plannerPrefs =
      preferences?.slideCount && preferences.colorPalette?.length ? preferences : undefined;

    if (planTier === 'creator') {
      systemPrompt = getCreatorProSystemPrompt(brandKit, plannerPrefs) + topicLine;
      temperature = 0.55;
      max_tokens = 4000;
    } else if (planTier === 'student') {
      systemPrompt = getStudentProSystemPrompt(brandKit, plannerPrefs) + topicLine;
      temperature = 0.6;
      max_tokens = 3500;
    } else {
      systemPrompt = getBaseSystemPrompt(brandKit, plannerPrefs) + topicLine;
      temperature = 0.7;
      max_tokens = 3000;
    }

    modelsToTry =
      llmBackend === 'openai'
        ? plannerModelsForBackend(planTier, llmBackend)
        : getPlannerModelCascade(planTier);

    let response: Response | null = null;
    let selectedModel = modelsToTry[0];
    let allErrors: string[] = [];

    for (const model of modelsToTry) {
      selectedModel = model;
      const res = await streamLlmChat({
        backend: llmBackend,
        plan,
        model,
        messages,
        systemPrompt,
        temperature,
        max_tokens,
      });

      if (res.ok) {
        response = res;
        break; // success — stop trying
      }

      const status = res.status;
      const errText = await res.text();
      allErrors.push(`[${model}: ${status}] ${errText}`);
      console.warn(`[Planner] Model ${model} returned ${status}, trying next... Error: ${errText}`);
      
      // Only stop looping on severe auth errors
      if (status === 401) {
        const label = llmBackend === 'openai' ? 'OpenAI' : 'OpenRouter';
        throw new Error(`${label} auth error (${status}): ${errText}`);
      }
      
      // 400 (Invalid Model), 404, 429, 500+ -> loop to next model
    }

    if (!response) {
      const errorString = allErrors.join(' | ');
      if (errorString.includes('402') || errorString.includes('Insufficient credits') || errorString.includes('payment required')) {
        throw new Error('Insufficient OpenRouter credits. Please add funds to your OpenRouter account to continue.');
      } else if (errorString.includes('429') || errorString.includes('rate-limited') || errorString.includes('rate limit')) {
        throw new Error('The AI models are currently too busy (Rate Limited). Please wait a few moments and try again, or add credits to your OpenRouter account to prioritize your requests.');
      }
      throw new Error(`The AI models failed to respond correctly. Please try again. (Debug: ${allErrors[0]?.substring(0, 50)}...)`);
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
            // Reuse the shared supabase client — no new connection needed
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
