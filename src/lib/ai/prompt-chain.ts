import { openRouterComplete, extractJsonObject } from '@/lib/ai/openrouter';
import { AGENT_MODELS } from '@/lib/ai/agent-models';

/** Human-readable progress only — never model IDs (shown in UI). */
export type OrchestrationProgress = (phase: string, message: string) => void;

async function step(
  appUrl: string,
  model: string,
  system: string,
  user: string,
  maxTokens: number,
  temperature: number
): Promise<string> {
  try {
    const text = await openRouterComplete(appUrl, {
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature,
      max_tokens: maxTokens,
    });
    return String(text || '').trim();
  } catch (e) {
    console.warn(`[Orchestration] step failed (${model}):`, e);
    return '';
  }
}

const S_INTENT = `You are the lead strategist for an automatic presentation engine.

Output ONE raw JSON object only (no markdown):
{
  "intentSummary": "one sentence",
  "presentationType": "startup_pitch | investor_deck | business_proposal | education | product_showcase | marketing | corporate | storytelling | data_story | portfolio | other",
  "presentationCategory": "short string e.g. sales, classroom, boardroom, demo_day",
  "inferredAudience": "who will watch",
  "emotionalTone": "e.g. confident, urgent, warm, analytical",
  "needsDeepReasoning": false,
  "promptEnhancement": "single rich paragraph: infer missing context, sharpen storytelling, pacing, and emotional arc. Same language as the user. Under 1200 characters.",
  "recommendedStyle": "apple_keynote | startup_pitch | minimal_dark | corporate | futuristic | luxury | glassmorphism | bento | editorial | creative | cinematic",
  "visualMood": "short phrase for consistent imagery across slides",
  "successCriteria": ["2-5 bullets the final deck must satisfy"]
}

Set needsDeepReasoning to true ONLY if the deck needs heavy technical, mathematical, analytics, startup strategy, scientific, or legal-style argumentation. Otherwise false (most decks).

promptEnhancement must feel like the user is deeply understood — do not merely repeat their words; improve clarity and narrative.`;

const S_STRUCTURE = `You architect slide-by-slide narrative structure for a premium deck.

You receive: the user's ask, parameters, and analyst JSON from a prior step.

Output ONE raw JSON only (no markdown):
{
  "acts": [{"name": "act label", "beats": ["beat strings"]}],
  "slideSpine": [
    { "index": 1, "typeHint": "hero|split|content|quote|stats|closing|...", "headlineAngle": "what this slide must convey", "supportingPoints": ["up to 4 short notes"] }
  ],
  "flowNotes": "how tension and release should move across the deck",
  "toneGuardrails": "what to avoid / voice consistency"
}

The slideSpine array MUST have exactly as many objects as the requested slide count (indices 1..N). Same language as the user.`;

const S_REASON = `You are a strategic reasoning engine for a high-stakes deck.
Output plain text (max 700 words): angles, proof, risks, persuasion logic, and how slides should land. No JSON, no markdown fences.`;

function buildRefinedBrief(args: {
  rawUserPrompt: string;
  intent: Record<string, unknown>;
  structure: Record<string, unknown>;
  reasonMemo: string;
  meta: { slideCount: number; tone: string; language: string };
}): string {
  const enhancement =
    typeof args.intent.promptEnhancement === 'string'
      ? args.intent.promptEnhancement.trim()
      : '';
  const spine = args.structure.slideSpine != null ? JSON.stringify(args.structure.slideSpine) : '';
  const parts = [
    enhancement || args.rawUserPrompt,
    `--- Original ask (verbatim) ---\n${args.rawUserPrompt}`,
    `--- Parameters ---\nSlides: ${args.meta.slideCount}, tone hint: ${args.meta.tone}, language: ${args.meta.language}`,
    spine && `--- Approved slide spine (follow order & intent) ---\n${spine}`,
    args.reasonMemo && `--- Strategy / reasoning layer ---\n${args.reasonMemo}`,
    `--- Flow notes ---\n${typeof args.structure.flowNotes === 'string' ? args.structure.flowNotes : ''}`,
    `--- Tone guardrails ---\n${typeof args.structure.toneGuardrails === 'string' ? args.structure.toneGuardrails : ''}`,
  ].filter(Boolean);
  return parts.join('\n\n');
}

function buildPreflightSummary(
  intent: Record<string, unknown>,
  structure: Record<string, unknown>,
  reasonMemo: string
): string {
  const payload = {
    presentationType: intent.presentationType,
    detectedIntent: intent.intentSummary,
    recommendedStyle: intent.recommendedStyle,
    inferredAudience: intent.inferredAudience,
    emotionalTone: intent.emotionalTone,
    visualMood: intent.visualMood,
    successCriteria: intent.successCriteria,
    narrativeArc: Array.isArray(structure.acts)
      ? (structure.acts as { name?: string }[]).map((a) => a.name).filter(Boolean)
      : [],
    slideSpine: structure.slideSpine,
    strategyMemo: reasonMemo || null,
  };
  return JSON.stringify(payload, null, 2);
}

/**
 * Lightweight pipeline: GPT intent → Claude spine → optional DeepSeek → brief for composer.
 * Does not run every model; DeepSeek only when intent.needsDeepReasoning is true.
 */
export async function runOpenRouterOrchestration(
  appUrl: string,
  rawUserPrompt: string,
  meta: { slideCount: number; tone: string; language: string },
  onProgress?: OrchestrationProgress
): Promise<{ dossierText: string; refinedBrief: string; preflightSummary: string }> {
  const baseCtx = `Original user request:\n${rawUserPrompt}\n\nParameters: exactly ${meta.slideCount} slides, tone=${meta.tone}, language=${meta.language}.`;

  onProgress?.('understanding', 'Understanding your vision…');
  const intentOut = await step(
    appUrl,
    AGENT_MODELS.gptOrchestrator,
    S_INTENT,
    baseCtx,
    2000,
    0.22
  );
  const intent = extractJsonObject(intentOut) ?? {};

  const needsDeep =
    intent.needsDeepReasoning === true ||
    intent.needsDeepReasoning === 'true' ||
    String(intent.needsDeepReasoning).toLowerCase() === 'true';

  let reasonOut = '';
  if (needsDeep) {
    onProgress?.('reasoning', 'Adding strategic depth…');
    reasonOut = await step(
      appUrl,
      AGENT_MODELS.deepseekReason,
      S_REASON,
      `${baseCtx}\n\nAnalyst JSON:\n${intentOut || '{}'}`,
      2200,
      0.35
    );
  } else {
    onProgress?.('reasoning', 'Skipping deep reasoning — fast path.');
  }

  onProgress?.('structure', 'Structuring slides and flow…');
  const structOut = await step(
    appUrl,
    AGENT_MODELS.claudeStructure,
    S_STRUCTURE,
    `${baseCtx}\n\nAnalyst JSON:\n${intentOut || '{}'}${
      reasonOut ? `\n\nStrategy memo:\n${reasonOut}` : ''
    }`,
    3200,
    0.25
  );
  const structure = extractJsonObject(structOut) ?? {};

  const refinedBrief = buildRefinedBrief({
    rawUserPrompt,
    intent,
    structure,
    reasonMemo: reasonOut,
    meta,
  });
  const preflightSummary = buildPreflightSummary(intent, structure, reasonOut);

  const dossierText = [
    '=== ORCHESTRATION CONTEXT (internal) ===',
    `INTENT_JSON:\n${intentOut || '{}'}`,
    `STRUCTURE_JSON:\n${structOut || '{}'}`,
    needsDeep ? `STRATEGY_MEMO:\n${reasonOut}` : 'STRATEGY_MEMO: (not required)',
    `MASTER_BRIEF_FOR_COMPOSER:\n${refinedBrief}`,
  ].join('\n\n');

  onProgress?.('synthesis', 'Brief locked — composing deck…');

  return { dossierText, refinedBrief, preflightSummary };
}
