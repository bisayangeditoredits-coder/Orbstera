import { OR_MODELS } from '@/lib/ai/models';
import { AGENT_MODELS, IMAGE_MODELS, type ImageVisualProfile } from '@/lib/ai/agent-models';

export type PlanTier = 'free' | 'student_pro' | 'pro' | 'creator_pro' | 'admin';

export type AiTask =
  | 'deck_intent'
  | 'deck_structure'
  | 'deck_reason'
  | 'deck_compose'
  | 'deck_polish'
  | 'magic_edit_text'
  | 'magic_edit_image'
  | 'genfill_image'
  | 'image_generate';

export type TextProvider = 'openrouter';
export type ImageProvider = 'openrouter' | 'claid' | 'pollinations';

export type SpendState = {
  /** If true, aggressively downshift to low-cost models. */
  forcedEconomyMode: boolean;
};

export type ComplexitySignals = {
  promptChars: number;
  slideCount: number;
  /** Derived by orchestration intent step (or heuristic) */
  needsDeepReasoning?: boolean;
  /** Optional categorization signal (startup_pitch, education, etc.) */
  presentationType?: string;
};

export type SelectedTextModel = {
  provider: TextProvider;
  /** Provider model ID (not user-facing). */
  model: string;
  /** A short label suitable for UI (no raw provider IDs). */
  label: string;
  /** Token budget guidance (caller may override). */
  maxTokens?: number;
  temperature?: number;
};

export type SelectedImageProvider = {
  provider: ImageProvider;
  model?: string; // only for openrouter images
  label: string;
  visualProfile: ImageVisualProfile;
  /** When true, charge premium image credits and prefer premium provider/model */
  premium: boolean;
};

function normalizePlan(plan: string | null | undefined): PlanTier {
  const p = String(plan || '').toLowerCase();
  if (p === 'creator_pro') return 'creator_pro';
  if (p === 'student_pro') return 'student_pro';
  if (p === 'pro') return 'pro';
  if (p === 'admin') return 'admin';
  return 'free';
}

function isPaid(plan: PlanTier): boolean {
  return plan === 'student_pro' || plan === 'pro' || plan === 'creator_pro' || plan === 'admin';
}

function complexityScore(s: ComplexitySignals): number {
  // 0..100-ish, intentionally simple and cheap.
  const slide = Math.min(40, Math.max(1, s.slideCount || 1));
  const prompt = Math.min(8000, Math.max(0, s.promptChars || 0));
  let score = 0;
  score += slide <= 5 ? 8 : slide <= 10 ? 18 : slide <= 20 ? 32 : 45;
  score += prompt < 300 ? 6 : prompt < 900 ? 14 : prompt < 1800 ? 24 : 34;
  if (s.needsDeepReasoning) score += 22;
  const pt = String(s.presentationType || '').toLowerCase();
  if (pt.includes('data') || pt.includes('analytics') || pt.includes('investor')) score += 8;
  return score;
}

export function shouldRunDeepReasoning(args: {
  plan: string | null | undefined;
  needsDeepReasoning: boolean;
  slideCount: number;
  spendState?: SpendState;
}): boolean {
  const planTier = normalizePlan(args.plan);
  if (!args.needsDeepReasoning) return false;
  if (args.spendState?.forcedEconomyMode) return false;
  if (planTier === 'free') return false;
  // Student pro can run deep reasoning but only on larger/technical decks.
  if (planTier === 'student_pro') return args.slideCount >= 10;
  return true;
}

export function selectTextModel(args: {
  plan: string | null | undefined;
  task: AiTask;
  complexity: ComplexitySignals;
  spendState?: SpendState;
}): SelectedTextModel {
  const planTier = normalizePlan(args.plan);
  const paid = isPaid(planTier);
  const score = complexityScore(args.complexity);
  const economy = Boolean(args.spendState?.forcedEconomyMode);

  // Default low-cost model for free + economy mode.
  const lowCost: SelectedTextModel = {
    provider: 'openrouter',
    model: OR_MODELS.coach, // gemini-2.5-flash by default
    label: 'Flash',
    maxTokens: args.task === 'deck_compose' ? 16_000 : 4096,
    temperature: 0.25,
  };

  if (!paid || economy) {
    // Free users: never use frontier models.
    return lowCost;
  }

  // Paid tiers: choose per task, with a conservative bias toward speed unless high complexity.
  if (args.task === 'deck_intent') {
    return score >= 55
      ? { provider: 'openrouter', model: AGENT_MODELS.gptOrchestrator, label: 'Orchestrator', maxTokens: 2400, temperature: 0.22 }
      : lowCost;
  }

  if (args.task === 'deck_structure') {
    return score >= 45
      ? { provider: 'openrouter', model: AGENT_MODELS.claudeStructure, label: 'Structure', maxTokens: 3600, temperature: 0.25 }
      : lowCost;
  }

  if (args.task === 'deck_reason') {
    // Deep reasoning is expensive; caller should gate with shouldRunDeepReasoning.
    return { provider: 'openrouter', model: AGENT_MODELS.deepseekReason, label: 'Reasoning', maxTokens: 2400, temperature: 0.35 };
  }

  if (args.task === 'deck_compose') {
    // Student pro: default to Flash unless complexity is high.
    if (planTier === 'student_pro' && score < 60) return lowCost;
    return {
      provider: 'openrouter',
      model: OR_MODELS.composerPrimary,
      label: 'Composer',
      maxTokens: 24_000,
      temperature: 0.28,
    };
  }

  if (args.task === 'deck_polish') {
    // Optional polish: keep it bounded, and only for creator_pro/admin by default.
    if (planTier !== 'creator_pro' && planTier !== 'admin') return lowCost;
    return {
      provider: 'openrouter',
      model: OR_MODELS.refineFallback,
      label: 'Refine',
      maxTokens: 6000,
      temperature: 0.25,
    };
  }

  // Magic edit + other: default to Flash for student_pro, refine for creator_pro.
  if (planTier === 'student_pro') return lowCost;
  return {
    provider: 'openrouter',
    model: OR_MODELS.refineFallback,
    label: 'Refine',
    maxTokens: 6000,
    temperature: 0.25,
  };
}

export function selectImageProvider(args: {
  plan: string | null | undefined;
  visualProfile: ImageVisualProfile;
  /** If true, allow premium model/provider routing */
  premiumRequested: boolean;
  spendState?: SpendState;
  /** Whether OpenRouter images are available */
  hasOpenRouterKey: boolean;
  /** Whether Claid is configured */
  hasClaidKey: boolean;
  /** Whether Pollinations is configured */
  hasPollinationsKey: boolean;
}): SelectedImageProvider {
  const planTier = normalizePlan(args.plan);
  const paid = isPaid(planTier);
  const economy = Boolean(args.spendState?.forcedEconomyMode);

  const premiumAllowed = (planTier === 'creator_pro' || planTier === 'admin') && !economy;
  const premium = Boolean(args.premiumRequested && premiumAllowed);

  // Prefer OpenRouter (Flux) when available for premium tiers; otherwise fall back.
  if (args.hasOpenRouterKey && (premium || paid)) {
    const model =
      args.visualProfile === 'typography' ? IMAGE_MODELS.typography : IMAGE_MODELS.flux;
    return {
      provider: 'openrouter',
      model,
      label: premium ? 'Cinematic' : 'Standard',
      visualProfile: args.visualProfile,
      premium,
    };
  }

  // Non-OpenRouter providers (hybrid direct): Claid first, then Pollinations.
  if (args.hasClaidKey) {
    return {
      provider: 'claid',
      label: premium ? 'Cinematic' : 'Standard',
      visualProfile: args.visualProfile,
      premium,
    };
  }
  if (args.hasPollinationsKey) {
    return {
      provider: 'pollinations',
      label: premium ? 'Cinematic' : 'Standard',
      visualProfile: args.visualProfile,
      premium,
    };
  }

  // Last resort: return OpenRouter selection even without key; caller will error cleanly.
  const model =
    args.visualProfile === 'typography' ? IMAGE_MODELS.typography : IMAGE_MODELS.flux;
  return {
    provider: 'openrouter',
    model,
    label: premium ? 'Cinematic' : 'Standard',
    visualProfile: args.visualProfile,
    premium,
  };
}

