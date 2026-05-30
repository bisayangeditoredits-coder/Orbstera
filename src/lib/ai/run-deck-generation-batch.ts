import { mergeOrchestrationMetadata, normalizePresentationPayload, buildComposerMessages } from '@/lib/ai/orchestration';
import { runOpenRouterOrchestration } from '@/lib/ai/prompt-chain';
import { extractDeckJsonFromModelOutput } from '@/lib/ai/openrouter';
import { openRouterCompleteCascade } from '@/lib/ai/openrouter-cascade';
import { getTextModelCascade, selectTextModel } from '@/lib/ai/router';
import { getSpendState } from '@/lib/ai/spend';
import type { SupabaseClient } from '@supabase/supabase-js';

export type DeckGenerationJobBody = {
  prompt: string;
  slideCount: number;
  tone: string;
  language: string;
  styleMode?: string;
  plan: string;
  plannerSessionId?: string;
  outlineSlideCount?: number;
};

export async function runDeckGenerationBatch(args: {
  appUrl: string;
  supabase: SupabaseClient;
  userId: string;
  body: DeckGenerationJobBody;
  onProgress?: (progress: number, message: string) => void;
}): Promise<Record<string, unknown>> {
  const { appUrl, supabase, userId, body, onProgress } = args;
  const userPrompt = String(body.prompt || '').trim();
  if (!userPrompt) throw new Error('Prompt is required');

  onProgress?.(5, 'Starting orchestration…');
  const spend = await getSpendState({ supabase });
  const spendState = { forcedEconomyMode: spend.forcedEconomyMode };

  let finalPrompt = userPrompt;
  const { data: profileData } = await supabase
    .from('profiles')
    .select('brand_kit')
    .eq('id', userId)
    .maybeSingle();
  const brandKit = profileData?.brand_kit as Record<string, unknown> | null;
  if (brandKit && brandKit.primary_color) {
    finalPrompt += `\n\n[USER BRAND KIT]\nPrimary Color: ${brandKit.primary_color}\nFont: ${brandKit.font || 'Default'}\nBrand: ${brandKit.name || 'User Company'}`;
  }

  const { dossierText, refinedBrief, preflightSummary } = await runOpenRouterOrchestration(
    appUrl,
    finalPrompt,
    {
      slideCount: body.slideCount,
      tone: String(body.tone),
      language: String(body.language),
    },
    (_phase, message) => onProgress?.(25, message),
    { plan: body.plan, spendState },
  );

  onProgress?.(55, 'Composing deck…');
  const { system, user: userMessage } = buildComposerMessages({
    preflightSummary: `${preflightSummary}\n\n--- Full dossier ---\n${dossierText}`,
    userPrompt,
    refinedBrief,
    slideCount: body.slideCount,
    tone: String(body.tone),
    language: String(body.language),
    styleMode: body.styleMode ? String(body.styleMode) : undefined,
  });

  const composerPrimary = selectTextModel({
    plan: body.plan,
    task: 'deck_compose',
    complexity: { promptChars: userPrompt.length, slideCount: body.slideCount },
    spendState,
  });

  const models = getTextModelCascade({
    plan: body.plan,
    task: 'deck_compose',
    spendState,
  });

  let raw = '';
  try {
    const completed = await openRouterCompleteCascade(appUrl, {
      models: models.length ? models : [composerPrimary.model],
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userMessage },
      ],
      plan: body.plan,
      timeoutMs: 180_000,
      max_tokens: composerPrimary.maxTokens,
      temperature: composerPrimary.temperature,
    });
    raw = completed.text;
  } catch (e) {
    console.warn('[runDeckGenerationBatch] compose cascade failed:', e);
    const errorString = e instanceof Error ? e.message : String(e);
    if (errorString.includes('402') || errorString.includes('Insufficient credits') || errorString.includes('payment required')) {
      throw new Error('Insufficient OpenRouter credits. Please add funds to your OpenRouter account to continue.');
    } else if (errorString.includes('429') || errorString.includes('rate-limited') || errorString.includes('rate limit')) {
      throw new Error('The AI models are currently too busy (Rate Limited). Please wait a few moments and try again, or add credits to your OpenRouter account to prioritize your requests.');
    }
    throw new Error('The AI models failed to respond correctly during generation. Please try again.');
  }

  onProgress?.(85, 'Parsing deck…');
  const parsed = extractDeckJsonFromModelOutput(raw);
  if (!parsed) throw new Error('Could not parse deck JSON from model output');
  return normalizePresentationPayload(
    mergeOrchestrationMetadata(parsed, preflightSummary),
  ) as unknown as Record<string, unknown>;
}
