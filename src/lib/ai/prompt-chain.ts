import { openRouterComplete, extractJsonObject } from '@/lib/ai/openrouter';
import { AGENT_MODELS } from '@/lib/ai/agent-models';

export type OrchestrationProgress = (phase: string, detail?: string) => void;

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
    console.warn(`[Orchestration] model ${model} step failed:`, e);
    return '';
  }
}

const S_INTENT = `You analyze presentation requests. Output ONE raw JSON only:
{"intentSummary":"","inferredAudience":"","presentationCategory":"","emotionalTone":"","successCriteria":[]}
Match the user's language. No markdown.`;

const S_STRUCTURE = `You design narrative architecture for decks. Output ONE raw JSON only:
{"acts":[{"name":"","beats":[]}],"slideFlowNotes":"","toneGuardrails":""}
Use the prior analyst JSON + original ask. Same language as user.`;

const S_REASON = `You are a strategic reasoning engine. Output plain text (max 900 words): strategic angles, risks, proof points, and how the deck should persuade. No JSON.`;

const S_GEMINI = `You enrich context for a presentation pipeline. Output plain text (max 700 words): visual metaphors, pacing, what to avoid, accessibility. Build on all prior context.`;

const S_LLAMA = `Expand a concise working outline for slides (plain text, max 600 words). Section headers OK.`;

const S_QWEN = `Merge all prior agent outputs into ONE raw JSON:
{"masterBrief":"","slideAnglePerAct":[],"imageryMood":"","headlineEnergy":"","constraints":[]}
masterBrief must be a single rich string the deck composer will follow (under 2000 chars). Same language as the original user. No markdown outside JSON.`;

const S_MISTRAL = `Tighten wording only. Input is JSON with masterBrief string. Output the SAME JSON shape with shorter, clearer masterBrief (same keys). JSON only.`;

const S_GROK = `Add creative headline energy. Input is JSON with masterBrief. Output same JSON shape; improve masterBrief with punchier openings where appropriate. JSON only.`;

/**
 * Sequential OpenRouter-only chain. Raw user text is never sent alone to the composer —
 * outputs a rich dossier string for preflight + composer.
 */
export async function runOpenRouterOrchestration(
  appUrl: string,
  rawUserPrompt: string,
  meta: { slideCount: number; tone: string; language: string },
  onProgress?: OrchestrationProgress
): Promise<{ dossierText: string; refinedBrief: string }> {
  const baseCtx = `Original user request:\n${rawUserPrompt}\n\nParameters: ${meta.slideCount} slides, tone=${meta.tone}, language=${meta.language}.`;

  onProgress?.('intent', AGENT_MODELS.gptOrchestrator);
  const intentOut = await step(
    appUrl,
    AGENT_MODELS.gptOrchestrator,
    S_INTENT,
    baseCtx,
    1200,
    0.2
  );

  onProgress?.('structure', AGENT_MODELS.claudeStructure);
  const structOut = await step(
    appUrl,
    AGENT_MODELS.claudeStructure,
    S_STRUCTURE,
    `${baseCtx}\n\nAnalyst JSON:\n${intentOut || '{}'}`,
    1600,
    0.25
  );

  onProgress?.('reasoning', AGENT_MODELS.deepseekReason);
  const reasonOut = await step(
    appUrl,
    AGENT_MODELS.deepseekReason,
    S_REASON,
    `${baseCtx}\n\nIntent:\n${intentOut}\n\nStructure:\n${structOut}`,
    1400,
    0.35
  );

  onProgress?.('context', AGENT_MODELS.geminiContext);
  const gemOut = await step(
    appUrl,
    AGENT_MODELS.geminiContext,
    S_GEMINI,
    `${baseCtx}\n\nIntent:\n${intentOut}\n\nStructure:\n${structOut}\n\nStrategy:\n${reasonOut}`,
    1200,
    0.3
  );

  onProgress?.('draft', AGENT_MODELS.llamaDraft);
  const llamaOut = await step(
    appUrl,
    AGENT_MODELS.llamaDraft,
    S_LLAMA,
    `${baseCtx}\n\nContext digest:\n${gemOut || reasonOut || structOut}`,
    900,
    0.35
  );

  onProgress?.('merge', AGENT_MODELS.qwenStructure);
  const merged = await step(
    appUrl,
    AGENT_MODELS.qwenStructure,
    S_QWEN,
    `${baseCtx}\n\n---INTENT---\n${intentOut}\n---STRUCTURE---\n${structOut}\n---STRATEGY---\n${reasonOut}\n---CONTEXT---\n${gemOut}\n---DRAFT---\n${llamaOut}`,
    2500,
    0.2
  );

  onProgress?.('readability', AGENT_MODELS.mistralConcise);
  const mistOut = await step(
    appUrl,
    AGENT_MODELS.mistralConcise,
    S_MISTRAL,
    merged || `{"masterBrief":${JSON.stringify(rawUserPrompt)}}`,
    1800,
    0.15
  );

  onProgress?.('creative', AGENT_MODELS.grokCreative);
  const grokOut = await step(
    appUrl,
    AGENT_MODELS.grokCreative,
    S_GROK,
    mistOut || merged || `{"masterBrief":${JSON.stringify(rawUserPrompt)}}`,
    1400,
    0.4
  );

  const finalJson = extractJsonObject(grokOut || mistOut || merged) ?? {};
  const refinedBrief =
    typeof finalJson.masterBrief === 'string' && finalJson.masterBrief.trim()
      ? finalJson.masterBrief.trim()
      : rawUserPrompt;

  const dossierText = [
    '=== ORCHESTRATION DOSSIER (multi-agent) ===',
    `INTENT_JSON:\n${intentOut || '{}'}`,
    `STRUCTURE_JSON:\n${structOut || '{}'}`,
    `STRATEGY_MEMO:\n${reasonOut || '(skipped)'}`,
    `CONTEXT_MEMO:\n${gemOut || '(skipped)'}`,
    `DRAFT_OUTLINE:\n${llamaOut || '(skipped)'}`,
    `MERGED_JSON:\n${merged || '{}'}`,
    `FINAL_MASTER_BRIEF:\n${refinedBrief}`,
  ].join('\n\n');

  return { dossierText, refinedBrief };
}
