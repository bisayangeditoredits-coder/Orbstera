/**
 * Subscription-tier OpenRouter model allocation.
 * All routes should resolve models through router.ts + these constants.
 */

import { AGENT_MODELS, IMAGE_MODELS } from '@/lib/ai/agent-models';
import { OR_MODELS } from '@/lib/ai/models';

export type SubscriptionTier = 'free' | 'student' | 'creator';

/** Models that must never run for Free (or economy) users. */
export const CREATOR_ONLY_TEXT_MODELS = new Set<string>([
  AGENT_MODELS.gptOrchestrator,
  AGENT_MODELS.gptOrchestratorAlt,
  AGENT_MODELS.claudeOpus,
  OR_MODELS.composerPrimary,
  OR_MODELS.composerElite,
  OR_MODELS.refineOpus,
]);

export const CREATOR_ONLY_IMAGE_MODELS = new Set<string>([
  IMAGE_MODELS.dalle,
  IMAGE_MODELS.imagen,
  IMAGE_MODELS.fluxUltra,
  IMAGE_MODELS.fluxCinematic,
  IMAGE_MODELS.typographyPremium,
  IMAGE_MODELS.genfillCreator,
  IMAGE_MODELS.genfillCreatorFallback,
]);

export const STUDENT_PREMIUM_IMAGE_MODELS = new Set<string>([
  IMAGE_MODELS.genfillPro,
  IMAGE_MODELS.fluxCinematic,
]);

// ── Planner (outline / spine chat) ───────────────────────────────────────────

export const PLANNER_MODELS = {
  creator: {
    primary: process.env.OPENROUTER_PLANNER_CREATOR ?? 'openai/gpt-5.5',
    fallbacks: [
      process.env.OPENROUTER_PLANNER_CREATOR_FB ?? 'anthropic/claude-sonnet-latest',
      'google/gemini-2.5-pro',
    ],
  },
  student: {
    primary: process.env.OPENROUTER_PLANNER_STUDENT ?? 'anthropic/claude-sonnet-latest',
    fallbacks: ['google/gemini-2.5-pro', OR_MODELS.coach],
  },
  free: {
    primary: OR_MODELS.coach,
    fallbacks: [
      'google/gemini-2.5-flash',
      'meta-llama/llama-3.3-70b-instruct:free',
      'meta-llama/llama-3.2-3b-instruct:free',
    ],
  },
} as const;

// ── Deck orchestration (intent / structure / compose) ────────────────────────

export const TIER_TEXT = {
  creator: {
    intent: AGENT_MODELS.gptOrchestrator,
    structure: AGENT_MODELS.claudeOpus,
    reason: AGENT_MODELS.claudeOpus,
    compose: OR_MODELS.composerPrimary,
    polish: OR_MODELS.refineOpus,
    magicEdit: AGENT_MODELS.gptOrchestrator,
    composeFallbacks: [
      OR_MODELS.composerFallback,
      AGENT_MODELS.claudeOpus,
      AGENT_MODELS.geminiPro,
      AGENT_MODELS.gptOrchestratorAlt,
    ],
    magicEditFallbacks: [
      AGENT_MODELS.gptOrchestrator,
      AGENT_MODELS.claudeOpus,
      AGENT_MODELS.geminiPro,
    ],
  },
  student: {
    intent: AGENT_MODELS.claudeStructure,
    structure: AGENT_MODELS.claudeStructure,
    reason: AGENT_MODELS.claudeStructure,
    compose: AGENT_MODELS.claudeStructure,
    polish: OR_MODELS.refineFallback,
    magicEdit: AGENT_MODELS.claudeStructure,
    composeFallbacks: [
      AGENT_MODELS.geminiPro,
      OR_MODELS.composerFallback,
      OR_MODELS.coach,
    ],
    magicEditFallbacks: [
      AGENT_MODELS.claudeStructure,
      AGENT_MODELS.geminiPro,
      OR_MODELS.coach,
    ],
  },
  free: {
    intent: OR_MODELS.coach,
    structure: OR_MODELS.coach,
    reason: OR_MODELS.coach,
    compose: OR_MODELS.coach,
    polish: OR_MODELS.coach,
    magicEdit: OR_MODELS.coach,
    composeFallbacks: ['google/gemini-2.5-flash', 'meta-llama/llama-3.2-3b-instruct:free'],
    magicEditFallbacks: ['google/gemini-2.5-flash', 'meta-llama/llama-3.2-3b-instruct:free'],
  },
} as const;

export function planToSubscriptionTier(
  plan: string | null | undefined,
  opts?: { freeTaste?: boolean; economy?: boolean },
): SubscriptionTier {
  if (opts?.economy) return 'free';
  if (opts?.freeTaste) return 'student';
  const p = String(plan || '').toLowerCase();
  if (p === 'creator_pro' || p === 'admin') return 'creator';
  if (p === 'student_pro' || p === 'pro') return 'student';
  return 'free';
}

export function uniqueModels(models: string[]): string[] {
  const seen = new Set<string>();
  return models.filter((m) => {
    if (!m || seen.has(m)) return false;
    seen.add(m);
    return true;
  });
}

/** Strip premium model IDs when tier does not allow them. */
export function capModelsToTier(models: string[], tier: SubscriptionTier): string[] {
  const isCreator = tier === 'creator';
  const isStudent = tier === 'student';

  return uniqueModels(
    models.filter((m) => {
      if (isCreator) return true;
      if (CREATOR_ONLY_TEXT_MODELS.has(m) || CREATOR_ONLY_IMAGE_MODELS.has(m)) return false;
      if (!isStudent && STUDENT_PREMIUM_IMAGE_MODELS.has(m)) return false;
      if (!isStudent && !isCreator && (m.includes('kontext') || m.includes('flux-pro'))) {
        return !m.includes('kontext-max') && !m.includes('flux-pro');
      }
      return true;
    }),
  );
}

export function getPlannerModelCascade(tier: SubscriptionTier): string[] {
  const cfg = PLANNER_MODELS[tier];
  return capModelsToTier(uniqueModels([cfg.primary, ...cfg.fallbacks]), tier);
}
