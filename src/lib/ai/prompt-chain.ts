import { extractJsonObject } from '@/lib/ai/openrouter';
import { openRouterCompleteCascade } from '@/lib/ai/openrouter-cascade';
import { OPENROUTER_TIMEOUT } from '@/lib/ai/openrouter-timeouts';
import { getTextModelCascade, selectTextModel, shouldRunDeepReasoning } from '@/lib/ai/router';
import { aiCacheGet, aiCacheSet, makeAiCacheKey } from '@/lib/ai/cache';
import {
  DIRECTOR_INTENT_SYSTEM,
  DIRECTOR_STRUCTURE_SYSTEM,
  DIRECTOR_REASON_SYSTEM,
} from '@/lib/ai/deck-generation-skill';

/** Human-readable progress only — never model IDs (shown in UI). */
export type OrchestrationProgress = (phase: string, message: string) => void;

async function step(
  appUrl: string,
  models: string[],
  system: string,
  user: string,
  maxTokens: number,
  temperature: number,
  plan?: string,
  freeTaste?: boolean,
  economy?: boolean,
  jsonMode?: boolean,
): Promise<string> {
  try {
    const { text } = await openRouterCompleteCascade(appUrl, {
      models,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature,
      max_tokens: maxTokens,
      plan,
      freeTaste,
      economy,
      timeoutMs: OPENROUTER_TIMEOUT.orchestrationStep,
      jsonMode,
    });
    return text;
  } catch (e) {
    console.warn(`[Orchestration] step failed:`, e);
    throw e;
  }
}

const S_INTENT = DIRECTOR_INTENT_SYSTEM;

const S_STRUCTURE = DIRECTOR_STRUCTURE_SYSTEM;

const S_REASON = DIRECTOR_REASON_SYSTEM;

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
    typeof args.intent.visualMood === 'string' && args.intent.visualMood
      ? `--- Visual mood family ---\n${args.intent.visualMood}\nKeep the deck in this family, but vary scene, crop, and composition by slide.`
      : '',
    typeof args.intent.imageryPalette === 'string' && args.intent.imageryPalette
      ? `--- Imagery palette ---\n${args.intent.imageryPalette}`
      : '',
    spine && `--- SLIDE BLUEPRINT (slideSpine — follow typeHint and layoutHint for each slide; refine headlines and imageBrief, do NOT use all-content slides) ---\n${spine}`,
    args.reasonMemo && `--- Strategy / reasoning layer ---\n${args.reasonMemo}`,
    `--- Flow notes ---\n${typeof args.structure.flowNotes === 'string' ? args.structure.flowNotes : ''}`,
    `--- Tone guardrails ---\n${typeof args.structure.toneGuardrails === 'string' ? args.structure.toneGuardrails : ''}`,
    typeof args.structure.imageryContinuity === 'string' && args.structure.imageryContinuity
      ? `--- Imagery continuity ---\n${args.structure.imageryContinuity}`
      : '',
  ].filter(Boolean);
  return parts.join('\n\n');
}

function deriveDnaFromDirector(
  intent: Record<string, unknown>,
  structure: Record<string, unknown>,
  reasonMemo: string
): {
  dna: {
    narrativeProfile: string;
    visualTone: string;
    typographyIdentity: string;
    spacingScale: 'compact' | 'balanced' | 'airy';
    motionProfile: 'cinematic_low' | 'cinematic_medium' | 'cinematic_high';
    densityMode: 'minimal' | 'standard' | 'rich';
    colorProfile: string;
  };
  preflight: Record<string, unknown>;
} {
  const presentationType = String(intent.presentationType || '').toLowerCase();
  const category = String(intent.presentationCategory || '').toLowerCase();
  const emotionalTone = String(intent.emotionalTone || '').toLowerCase();
  const visualMood = String(intent.visualMood || '').toLowerCase();
  const densityMode =
    intent.densityMode === 'minimal' || intent.densityMode === 'rich' ? intent.densityMode : 'standard';
  const cinematicIntensityRaw = String(intent.cinematicIntensity || '').toLowerCase();

  let narrativeProfile = presentationType || category || 'general';
  if (!narrativeProfile.includes('pitch') && presentationType === 'startup_pitch') {
    narrativeProfile = 'startup_pitch';
  }

  let spacingScale: 'compact' | 'balanced' | 'airy' = 'balanced';
  if (presentationType === 'investor_deck' || category.includes('boardroom')) spacingScale = 'compact';
  if (presentationType === 'education' || category.includes('classroom')) spacingScale = 'balanced';
  if (presentationType === 'marketing' || visualMood.includes('cinematic')) spacingScale = 'airy';

  let motionProfile: 'cinematic_low' | 'cinematic_medium' | 'cinematic_high' = 'cinematic_medium';
  if (cinematicIntensityRaw === 'low' || emotionalTone.includes('serious') || category.includes('boardroom')) {
    motionProfile = 'cinematic_low';
  } else if (cinematicIntensityRaw === 'high' || presentationType === 'marketing') {
    motionProfile = 'cinematic_high';
  }

  let visualTone = 'modern-dark';
  let colorProfile = 'tech_dark';
  if (presentationType === 'education' || category.includes('classroom')) {
    visualTone = 'light_clean';
    colorProfile = 'education_light';
  } else if (presentationType === 'corporate' || category.includes('boardroom')) {
    visualTone = 'corporate_light';
    colorProfile = 'corporate_blue';
  } else if (presentationType === 'marketing' || visualMood.includes('gradient')) {
    visualTone = 'cinematic_gradient';
    colorProfile = 'marketing_gradient';
  }

  let typographyIdentity = 'tech_sans';
  if (visualTone.includes('corporate') || category.includes('boardroom')) {
    typographyIdentity = 'corporate_serif';
  } else if (presentationType === 'creative' || visualMood.includes('editorial')) {
    typographyIdentity = 'editorial_mix';
  }

  const dna = {
    narrativeProfile,
    visualTone,
    typographyIdentity,
    spacingScale,
    motionProfile,
    densityMode: (densityMode as 'minimal' | 'standard' | 'rich') ?? 'standard',
    colorProfile,
  };

  const preflight = {
    presentationType: intent.presentationType,
    detectedIntent: intent.intentSummary,
    recommendedStyle: intent.recommendedStyle,
    inferredAudience: intent.inferredAudience,
    emotionalTone: intent.emotionalTone,
    visualMood: intent.visualMood,
    imageryPalette: intent.imageryPalette,
    successCriteria: intent.successCriteria,
    narrativeArc: Array.isArray(structure.acts)
      ? (structure.acts as { name?: string }[]).map((a) => a.name).filter(Boolean)
      : [],
    slideSpine: structure.slideSpine,
    strategyMemo: reasonMemo || null,
    dna,
  };

  return { dna, preflight };
}

/**
 * Lightweight pipeline: GPT intent → Claude spine → optional DeepSeek → brief for composer.
 * Optional Sonnet strategy pass when intent.needsDeepReasoning is true (paid tiers).
 */
export async function runOpenRouterOrchestration(
  appUrl: string,
  rawUserPrompt: string,
  meta: { slideCount: number; tone: string; language: string },
  onProgress?: OrchestrationProgress,
  opts?: { plan?: string; spendState?: { forcedEconomyMode: boolean }; freeTaste?: boolean }
): Promise<{ dossierText: string; refinedBrief: string; preflightSummary: string }> {
  const plan = String(opts?.plan || 'free').toLowerCase();
  const orchKey = makeAiCacheKey({
    kind: 'orchestration',
    plan,
    prompt: rawUserPrompt,
    slideCount: meta.slideCount,
    tone: meta.tone,
    language: meta.language,
  });
  const cached = await aiCacheGet<Record<string, unknown>>(orchKey);
  if (cached && typeof cached === 'object') {
    onProgress?.('cache', 'Reusing a cached orchestration brief…');
    return {
      dossierText: String(cached.dossierText || ''),
      refinedBrief: String(cached.refinedBrief || rawUserPrompt),
      preflightSummary: String(cached.preflightSummary || '{}'),
    };
  }

  const baseCtx = `Original user request:\n${rawUserPrompt}\n\nParameters: exactly ${meta.slideCount} slides, tone=${meta.tone}, language=${meta.language}.`;

  onProgress?.('understanding', 'Director: analyzing your vision…');
  const intentModel = selectTextModel({
    plan: opts?.plan,
    task: 'deck_intent',
    complexity: { promptChars: rawUserPrompt.length, slideCount: meta.slideCount },
    spendState: opts?.spendState,
    freeTaste: opts?.freeTaste,
  });
  const intentCascade = getTextModelCascade({
    plan: opts?.plan,
    task: 'deck_intent',
    spendState: opts?.spendState,
    freeTaste: opts?.freeTaste,
  });
  const intentOut = await step(
    appUrl,
    intentCascade.length ? intentCascade : [intentModel.model],
    S_INTENT,
    baseCtx,
    2000,
    0.22,
    opts?.plan,
    opts?.freeTaste,
    opts?.spendState?.forcedEconomyMode,
    true,
  );
  if (!intentOut.trim()) {
    throw new Error('Director intent step returned empty output');
  }
  const intent = extractJsonObject(intentOut) ?? {};

  const needsDeep =
    intent.needsDeepReasoning === true ||
    intent.needsDeepReasoning === 'true' ||
    String(intent.needsDeepReasoning).toLowerCase() === 'true';

  let reasonOut = '';
  const allowDeep = shouldRunDeepReasoning({
    plan: opts?.plan,
    needsDeepReasoning: needsDeep,
    slideCount: meta.slideCount,
    spendState: opts?.spendState,
    freeTaste: opts?.freeTaste,
  });
  if (allowDeep) {
    onProgress?.('reasoning', 'Adding strategic depth…');
    const reasonCascade = getTextModelCascade({
      plan: opts?.plan,
      task: 'deck_reason',
      spendState: opts?.spendState,
      freeTaste: opts?.freeTaste,
    });
    reasonOut = await step(
      appUrl,
      reasonCascade,
      S_REASON,
      `${baseCtx}\n\nAnalyst JSON:\n${intentOut || '{}'}`,
      2200,
      0.35,
      opts?.plan,
      opts?.freeTaste,
      opts?.spendState?.forcedEconomyMode,
    );
  } else {
    onProgress?.('reasoning', 'Skipping deep reasoning — fast path.');
  }

  onProgress?.('structure', 'Architect: drafting creative blueprint…');
  const structureCascade = getTextModelCascade({
    plan: opts?.plan,
    task: 'deck_structure',
    spendState: opts?.spendState,
    freeTaste: opts?.freeTaste,
  });
  const structOut = await step(
    appUrl,
    structureCascade,
    S_STRUCTURE,
    `${baseCtx}\n\nAnalyst JSON:\n${intentOut || '{}'}${
      reasonOut ? `\n\nStrategy memo:\n${reasonOut}` : ''
    }`,
    3200,
    0.25,
    opts?.plan,
    opts?.freeTaste,
    opts?.spendState?.forcedEconomyMode,
    true,
  );
  if (!structOut.trim()) {
    throw new Error('Director structure step returned empty output');
  }
  const structure = extractJsonObject(structOut) ?? {};

  const refinedBrief = buildRefinedBrief({
    rawUserPrompt,
    intent,
    structure,
    reasonMemo: reasonOut,
    meta,
  });
  const { dna, preflight } = deriveDnaFromDirector(intent, structure, reasonOut);
  const preflightSummary = JSON.stringify(preflight, null, 2);

  const dossierText = [
    '=== ORCHESTRATION CONTEXT (internal) ===',
    `INTENT_JSON:\n${intentOut || '{}'}`,
    `STRUCTURE_JSON:\n${structOut || '{}'}`,
    needsDeep ? `STRATEGY_MEMO:\n${reasonOut}` : 'STRATEGY_MEMO: (not required)',
    `MASTER_BRIEF_FOR_COMPOSER:\n${refinedBrief}`,
    `DIRECTOR_DNA_PRESET:\n${JSON.stringify(dna, null, 2)}`,
  ].join('\n\n');

  onProgress?.('synthesis', 'Brief ready — composer designing deck…');

  void aiCacheSet(
    orchKey,
    { dossierText, refinedBrief, preflightSummary },
    // Intelligent caching for prompt enhancements, slide structures, themes, layouts to reduce redundant AI costs
    7 * 24 * 3600
  );

  return { dossierText, refinedBrief, preflightSummary };
}
