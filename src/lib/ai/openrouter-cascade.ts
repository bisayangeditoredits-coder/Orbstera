import { openRouterComplete, openRouterStream, type ChatMessage, type OpenRouterOptions } from '@/lib/ai/openrouter';
import { capModelsToTier, planToSubscriptionTier, type SubscriptionTier } from '@/lib/ai/tier-models';

export type CascadeCompleteResult = {
  text: string;
  modelUsed: string;
};

export type CascadeStreamResult = {
  response: Response;
  modelUsed: string;
};

function resolveTier(plan?: string | null, freeTaste?: boolean, economy?: boolean): SubscriptionTier {
  return planToSubscriptionTier(plan, { freeTaste, economy });
}

/**
 * Try models in order; returns first non-empty completion.
 * Models are capped to the user's tier before calling OpenRouter.
 */
export async function openRouterCompleteCascade(
  appUrl: string,
  args: {
    models: string[];
    messages: ChatMessage[];
    plan?: string | null;
    freeTaste?: boolean;
    economy?: boolean;
    temperature?: number;
    max_tokens?: number;
    timeoutMs?: number;
    jsonMode?: boolean;
  },
): Promise<CascadeCompleteResult> {
  const tier = resolveTier(args.plan, args.freeTaste, args.economy);
  const models = capModelsToTier(args.models, tier);
  if (models.length === 0) {
    throw new Error('No models available for tier');
  }

  let lastError: unknown;
  for (const model of models) {
    try {
      const text = await openRouterComplete(appUrl, {
        model,
        messages: args.messages,
        temperature: args.temperature,
        max_tokens: args.max_tokens,
        timeoutMs: args.timeoutMs,
        jsonMode: args.jsonMode,
        plan: args.plan,
      });
      if (text.trim()) {
        return { text: text.trim(), modelUsed: model };
      }
    } catch (e) {
      lastError = e;
      console.warn(`[OpenRouter cascade] ${model} failed:`, e instanceof Error ? e.message : e);
    }
  }

  throw lastError instanceof Error ? lastError : new Error('All models in cascade failed');
}

/**
 * Stream from the first model that returns HTTP 200 with a body.
 */
export async function openRouterStreamCascade(
  appUrl: string,
  args: {
    models: string[];
    messages: ChatMessage[];
    plan?: string | null;
    freeTaste?: boolean;
    economy?: boolean;
    temperature?: number;
    max_tokens?: number;
    timeoutMs?: number;
  },
): Promise<CascadeStreamResult> {
  const tier = resolveTier(args.plan, args.freeTaste, args.economy);
  const models = capModelsToTier(args.models, tier);
  if (models.length === 0) {
    throw new Error('No models available for tier');
  }

  let lastStatus = 502;
  let lastBody = '';

  for (const model of models) {
    const res = await openRouterStream(appUrl, {
      model,
      messages: args.messages,
      temperature: args.temperature,
      max_tokens: args.max_tokens,
      timeoutMs: args.timeoutMs,
      plan: args.plan,
    } satisfies OpenRouterOptions);

    if (res.ok && res.body) {
      return { response: res, modelUsed: model };
    }

    lastStatus = res.status;
    lastBody = await res.text().catch(() => '');
    console.warn(`[OpenRouter stream cascade] ${model} failed:`, lastStatus, lastBody.slice(0, 200));
  }

  throw new Error(`OpenRouter stream cascade failed (${lastStatus}): ${lastBody.slice(0, 300)}`);
}
