/**
 * Subscription-tier OpenRouter model allocation.
 * All routes should resolve models through router.ts + these constants.
 *
 * NOTE: All tiers (Free, Student, Creator) now use the EXACT SAME models (Creator-level).
 * Billing is managed strictly through token caps in credits.ts.
 */

import { AGENT_MODELS, IMAGE_MODELS } from '@/lib/ai/agent-models';
import { OR_MODELS } from '@/lib/ai/models';

export type SubscriptionTier = 'free' | 'student' | 'creator';

/** Deprecated: Models are now unified. Retained for type compatibility. */
export const CREATOR_ONLY_TEXT_MODELS = new Set<string>();
export const CREATOR_ONLY_IMAGE_MODELS = new Set<string>();
export const STUDENT_PREMIUM_IMAGE_MODELS = new Set<string>();

// ── Planner (outline / spine chat) ───────────────────────────────────────────

export const PLANNER_MODELS = {
  creator: {
    primary: process.env.OPENROUTER_PLANNER_CREATOR ?? 'anthropic/claude-sonnet-4.6',
    fallbacks: [
      process.env.OPENROUTER_PLANNER_CREATOR_FB ?? 'google/gemini-3.1-pro-preview',
      'anthropic/claude-opus-4.6',
    ],
  },
  student: {
    primary: process.env.OPENROUTER_PLANNER_CREATOR ?? 'anthropic/claude-sonnet-4.6',
    fallbacks: [
      process.env.OPENROUTER_PLANNER_CREATOR_FB ?? 'google/gemini-3.1-pro-preview',
      'anthropic/claude-opus-4.6',
    ],
  },
  free: {
    primary: process.env.OPENROUTER_PLANNER_CREATOR ?? 'anthropic/claude-sonnet-4.6',
    fallbacks: [
      process.env.OPENROUTER_PLANNER_CREATOR_FB ?? 'google/gemini-3.1-pro-preview',
      'anthropic/claude-opus-4.6',
    ],
  },
} as const;

// ── Deck orchestration (intent / structure / compose) ────────────────────────

const CREATOR_TIER_TEXT = {
  intent: AGENT_MODELS.gptOrchestrator,
  structure: AGENT_MODELS.claudeStructure,
  reason: AGENT_MODELS.deepseekReason,
  compose: OR_MODELS.composerPrimary,
  polish: OR_MODELS.refineOpus,
  magicEdit: AGENT_MODELS.claudeStructure,
  composeFallbacks: [
    OR_MODELS.composerElite,
    OR_MODELS.composerFallback,
    AGENT_MODELS.gemini31Pro,
    AGENT_MODELS.geminiPro,
  ],
  reasonFallbacks: [
    AGENT_MODELS.claudeStructure,
    AGENT_MODELS.gemini31Pro,
    AGENT_MODELS.geminiPro,
  ],
  intentFallbacks: [
    AGENT_MODELS.claudeStructure,
    AGENT_MODELS.gemini31Pro,
    AGENT_MODELS.geminiPro,
  ],
  structureFallbacks: [
    AGENT_MODELS.gptOrchestratorAlt,
    AGENT_MODELS.gemini31Pro,
    AGENT_MODELS.geminiPro,
  ],
  magicEditFallbacks: [
    AGENT_MODELS.gptOrchestrator,
    AGENT_MODELS.claudeStructure,
    AGENT_MODELS.geminiPro,
  ],
};

export const TIER_TEXT = {
  creator: CREATOR_TIER_TEXT,
  student: CREATOR_TIER_TEXT,
  free: CREATOR_TIER_TEXT,
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

/** 
 * Strip premium model IDs when tier does not allow them.
 * NOTE: All tiers are now allowed all models. This simply returns unique models.
 */
export function capModelsToTier(models: string[], tier: SubscriptionTier): string[] {
  return uniqueModels(models);
}

export function getPlannerModelCascade(tier: SubscriptionTier): string[] {
  const cfg = PLANNER_MODELS[tier];
  return capModelsToTier(uniqueModels([cfg.primary, ...cfg.fallbacks]), tier);
}
