import { OR_MODELS } from '@/lib/ai/models';
import { AGENT_MODELS, IMAGE_MODELS, type ImageVisualProfile } from '@/lib/ai/agent-models';
import {
  capModelsToTier,
  planToSubscriptionTier,
  TIER_TEXT,
  uniqueModels,
  type SubscriptionTier,
} from '@/lib/ai/tier-models';

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
  | 'image_generate'
  | 'deck_slide_image';

export type TextProvider = 'openrouter';
export type ImageProvider = 'leonardo' | 'openrouter' | 'claid' | 'pollinations';

export type SpendState = {
  /** If true, aggressively downshift to low-cost models. */
  forcedEconomyMode: boolean;
};

export type ComplexitySignals = {
  promptChars: number;
  slideCount: number;
  needsDeepReasoning?: boolean;
  presentationType?: string;
};

export type SelectedTextModel = {
  provider: TextProvider;
  model: string;
  label: string;
  maxTokens?: number;
  temperature?: number;
};

export type SelectedImageProvider = {
  provider: ImageProvider;
  model?: string;
  /** OpenRouter model cascade (first success wins). */
  modelCascade?: string[];
  label: string;
  visualProfile: ImageVisualProfile;
  premium: boolean;
};

type QualityTier = 'economy' | 'free' | 'student' | 'creator';

const TEXT_LABELS = {
  economy: 'Gemini Flash',
  sonnet: 'Claude Sonnet',
  sonnetStrategy: 'Claude Sonnet · Strategy',
  opus: 'Claude Opus',
  opusStrategy: 'Claude Opus · Strategy',
  geminiPro: 'Gemini Pro',
  deepseek: 'DeepSeek R1',
} as const;

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

function isCreatorTier(plan: PlanTier): boolean {
  return plan === 'creator_pro' || plan === 'admin';
}

function resolveQualityTier(plan: PlanTier, economy: boolean, freeTaste?: boolean): QualityTier {
  // All tiers now use Creator Pro quality models
  return 'creator';
}

function toSubscriptionTier(
  plan: PlanTier,
  economy: boolean,
  freeTaste?: boolean,
): SubscriptionTier {
  return planToSubscriptionTier(plan, { economy, freeTaste });
}

function openRouterImageCascade(args: {
  tier: QualityTier;
  visualProfile: ImageVisualProfile;
  premium: boolean;
  task?: AiTask;
}): string[] {
  const isTypo = args.visualProfile === 'typography';
  const isGenfill = args.task === 'genfill_image' || args.task === 'magic_edit_image';

  // ── Generative Fill (FLUX Kontext family) ──────────────────────────
  if (isGenfill) {
    if (args.tier === 'creator') {
      return capModelsToTier(
        uniqueModels([
          IMAGE_MODELS.genfillCreator,
          IMAGE_MODELS.genfillCreatorFallback,
          IMAGE_MODELS.fluxUltra,
          IMAGE_MODELS.flux,
          IMAGE_MODELS.fallback,
        ]),
        'creator',
      );
    }
    if (args.tier === 'student') {
      return capModelsToTier(
        uniqueModels([
          IMAGE_MODELS.genfillPro,
          IMAGE_MODELS.flux,
          IMAGE_MODELS.fallback,
        ]),
        'student',
      );
    }
    return capModelsToTier(
      uniqueModels([IMAGE_MODELS.genfillFree, IMAGE_MODELS.fallback]),
      'free',
    );
  }

  // ── Standard image generation ─────────────────────────────────────
  if (args.tier === 'creator') {
    if (args.premium) {
      if (isTypo) {
        return capModelsToTier(
          uniqueModels([
            IMAGE_MODELS.typographyPremium,
            IMAGE_MODELS.fluxCinematic,
            IMAGE_MODELS.fluxUltra,
            IMAGE_MODELS.flux,
            IMAGE_MODELS.fallback,
            IMAGE_MODELS.dalle,
          ]),
          'creator',
        );
      }
      return capModelsToTier(
        uniqueModels([
          IMAGE_MODELS.fluxCinematic,
          IMAGE_MODELS.fluxUltra,
          IMAGE_MODELS.flux,
          IMAGE_MODELS.imagen,
          IMAGE_MODELS.fallback,
          IMAGE_MODELS.dalle,
        ]),
        'creator',
      );
    }
    return capModelsToTier(
      uniqueModels([
        IMAGE_MODELS.fluxCinematic,
        IMAGE_MODELS.flux,
        IMAGE_MODELS.fluxUltra,
        IMAGE_MODELS.fallback,
        IMAGE_MODELS.dalle,
      ]),
      'creator',
    );
  }

  if (args.tier === 'student') {
    if (isTypo) {
      return capModelsToTier(
        uniqueModels([IMAGE_MODELS.typography, IMAGE_MODELS.flux, IMAGE_MODELS.fallback]),
        'student',
      );
    }
    return capModelsToTier(uniqueModels([IMAGE_MODELS.flux, IMAGE_MODELS.fallback]), 'student');
  }

  return uniqueModels([IMAGE_MODELS.fallback, IMAGE_MODELS.flux]);
}

export function shouldRunDeepReasoning(args: {
  plan: string | null | undefined;
  needsDeepReasoning: boolean;
  slideCount: number;
  spendState?: SpendState;
  presentationType?: string;
  /** Free users on premium taste pass (strict lifetime cap enforced server-side). */
  freeTaste?: boolean;
}): boolean {
  const planTier = normalizePlan(args.plan);
  if (!args.needsDeepReasoning) return false;
  if (args.spendState?.forcedEconomyMode) return false;
  // All users have access to deep reasoning models now
  // if (planTier === 'free' && !args.freeTaste) return false;

  const pt = String(args.presentationType || '').toLowerCase();
  if (pt.includes('school') || pt.includes('simple')) return false;

  return true;
}

/** Ordered text models for Magic Edit element JSON (first success wins). */
export function getMagicEditTextModels(args: {
  plan: string | null | undefined;
  spendState?: SpendState;
  freeTaste?: boolean;
}): string[] {
  const sub = toSubscriptionTier(
    normalizePlan(args.plan),
    Boolean(args.spendState?.forcedEconomyMode),
    args.freeTaste,
  );
  return capModelsToTier(
    uniqueModels([TIER_TEXT[sub].magicEdit, ...TIER_TEXT[sub].magicEditFallbacks]),
    sub,
  );
}

export function selectTextModel(args: {
  plan: string | null | undefined;
  task: AiTask;
  complexity: ComplexitySignals;
  spendState?: SpendState;
  freeTaste?: boolean;
}): SelectedTextModel {
  const planTier = normalizePlan(args.plan);
  const qualityTier = resolveQualityTier(
    planTier,
    Boolean(args.spendState?.forcedEconomyMode),
    args.freeTaste,
  );
  const sub = toSubscriptionTier(
    planTier,
    Boolean(args.spendState?.forcedEconomyMode),
    args.freeTaste,
  );
  const isFreeTaste = Boolean(args.freeTaste);
  const isCreator = qualityTier === 'creator';
  const cfg = TIER_TEXT[sub];

  const labelForModel = (model: string): string => {
    if (model === AGENT_MODELS.claudeOpus || model === AGENT_MODELS.gptOrchestrator) return TEXT_LABELS.opus;
    if (model === AGENT_MODELS.claudeStructure) return TEXT_LABELS.sonnet;
    if (model === AGENT_MODELS.deepseekReason) return TEXT_LABELS.deepseek;
    if (model === AGENT_MODELS.geminiPro || model === AGENT_MODELS.gemini31Pro) return TEXT_LABELS.geminiPro;
    if (model.includes('claude-sonnet')) return TEXT_LABELS.sonnet;
    if (model.includes('claude-opus')) return TEXT_LABELS.opus;
    if (model.includes('deepseek')) return TEXT_LABELS.deepseek;
    if (model.includes('gemini-3.1') || model.includes('gemini-2.5-pro')) return TEXT_LABELS.geminiPro;
    if (model.includes('gemini')) {
      return isFreeTaste ? `${TEXT_LABELS.economy} · Preview` : TEXT_LABELS.economy;
    }
    if (model === OR_MODELS.composerPrimary) return TEXT_LABELS.opus;
    return TEXT_LABELS.sonnet;
  };

  let model = cfg.compose;
  let maxTokens = 4096;
  let temperature = 0.25;

  if (args.task === 'deck_intent') {
    model = isCreator ? cfg.intent : sub === 'student' ? cfg.intent : cfg.intent;
    maxTokens = isCreator ? 2800 : 2400;
    temperature = 0.22;
  } else if (args.task === 'deck_structure') {
    model = cfg.structure;
    maxTokens = isCreator ? 4000 : 3600;
    temperature = 0.25;
  } else if (args.task === 'deck_reason') {
    model = cfg.reason;
    maxTokens = isCreator ? 2800 : 2400;
    temperature = 0.35;
  } else if (args.task === 'deck_compose') {
    model = cfg.compose;
    maxTokens = isCreator ? 28_000 : isFreeTaste ? 12_000 : sub === 'student' ? 20_000 : 12_000;
    temperature = 0.28;
  } else if (args.task === 'magic_edit_text') {
    model = cfg.magicEdit;
    maxTokens = isCreator ? 3200 : 2800;
    temperature = 0.15;
  } else if (args.task === 'deck_polish') {
    model = cfg.polish;
    maxTokens = isCreator ? 8000 : 6000;
    temperature = isCreator ? 0.22 : 0.25;
  }

  model = capModelsToTier([model], sub)[0] ?? OR_MODELS.coach;

  return {
    provider: 'openrouter',
    model,
    label: labelForModel(model),
    maxTokens,
    temperature,
  };
}

/** Full text cascade for a task (primary + tier fallbacks). */
export function getTextModelCascade(args: {
  plan: string | null | undefined;
  task: AiTask;
  spendState?: SpendState;
  freeTaste?: boolean;
}): string[] {
  const primary = selectTextModel({
    plan: args.plan,
    task: args.task,
    complexity: { promptChars: 0, slideCount: 8 },
    spendState: args.spendState,
    freeTaste: args.freeTaste,
  });
  const sub = toSubscriptionTier(
    normalizePlan(args.plan),
    Boolean(args.spendState?.forcedEconomyMode),
    args.freeTaste,
  );
  let extras: string[];
  if (args.task === 'deck_compose') {
    extras = TIER_TEXT[sub].composeFallbacks;
  } else if (args.task === 'deck_reason') {
    extras = TIER_TEXT[sub].reasonFallbacks;
  } else if (args.task === 'deck_intent') {
    extras = TIER_TEXT[sub].intentFallbacks;
  } else if (args.task === 'deck_structure') {
    extras = TIER_TEXT[sub].structureFallbacks;
  } else {
    extras = TIER_TEXT[sub].magicEditFallbacks;
  }
  return capModelsToTier(uniqueModels([primary.model, ...extras]), sub);
}

/** Compose fallback chain when primary stream fails. */
export function getComposeFallbackModels(args: {
  plan: string | null | undefined;
  spendState?: SpendState;
  freeTaste?: boolean;
}): string[] {
  return getTextModelCascade({
    plan: args.plan,
    task: 'deck_compose',
    spendState: args.spendState,
    freeTaste: args.freeTaste,
  });
}

export function selectImageProvider(args: {
  plan: string | null | undefined;
  visualProfile: ImageVisualProfile;
  premiumRequested: boolean;
  spendState?: SpendState;
  task?: AiTask;
  freeTaste?: boolean;
  hasOpenRouterKey: boolean;
  hasLeonardoKey: boolean;
  hasClaidKey: boolean;
  hasPollinationsKey: boolean;
}): SelectedImageProvider {
  const planTier = normalizePlan(args.plan);
  const tier = resolveQualityTier(
    planTier,
    Boolean(args.spendState?.forcedEconomyMode),
    args.freeTaste,
  );
  const premiumAllowed = tier === 'creator';
  const premium = Boolean(args.premiumRequested && premiumAllowed);
  const isGenfill = args.task === 'genfill_image' || args.task === 'magic_edit_image';
  const isDeckSlide = args.task === 'deck_slide_image';

  const labelForTier = (): string => {
    if (isGenfill) {
      if (tier === 'creator') return 'Leonardo Kontext · Gen Fill';
      if (tier === 'student') return 'Leonardo · Gen Fill';
      return 'Leonardo · Gen Fill';
    }
    if (tier === 'creator') return premium ? 'Leonardo Cinematic HD' : 'Leonardo Pro Studio';
    if (tier === 'student') return 'Leonardo Studio HD';
    return 'Leonardo Standard';
  };

  // Leonardo is the sole AI image provider for deck slides + gen fill + editor images.
  if (args.hasLeonardoKey && (isGenfill || isDeckSlide || args.task === 'image_generate')) {
    return {
      provider: 'leonardo',
      label: labelForTier(),
      visualProfile: args.visualProfile,
      premium,
    };
  }

  const cascade = openRouterImageCascade({
    tier,
    visualProfile: args.visualProfile,
    premium,
    task: args.task,
  });
  const primaryModel = cascade[0];

  // Free gen fill — always use OpenRouter (even economy) so FLUX works
  if (isGenfill && (tier === 'free' || tier === 'economy')) {
    if (args.hasOpenRouterKey) {
      return {
        provider: 'openrouter',
        model: primaryModel,
        modelCascade: cascade,
        label: labelForTier(),
        visualProfile: args.visualProfile,
        premium: false,
      };
    }
    // Absolute fallback: Pollinations (limited but free)
    if (args.hasPollinationsKey) {
      return {
        provider: 'pollinations',
        label: 'Standard Gen Fill',
        visualProfile: args.visualProfile,
        premium: false,
      };
    }
  }

  // Paid tiers — prefer OpenRouter for quality
  if (args.hasOpenRouterKey && (tier === 'student' || tier === 'creator')) {
    return {
      provider: 'openrouter',
      model: primaryModel,
      modelCascade: cascade,
      label: labelForTier(),
      visualProfile: args.visualProfile,
      premium,
    };
  }

  if (tier === 'free' || tier === 'economy') {
    if (args.hasPollinationsKey) {
      return {
        provider: 'pollinations',
        label: 'Standard',
        visualProfile: args.visualProfile,
        premium: false,
      };
    }
    if (args.hasClaidKey) {
      return {
        provider: 'claid',
        label: 'Standard',
        visualProfile: args.visualProfile,
        premium: false,
      };
    }
  }

  if (args.hasClaidKey && tier !== 'free') {
    return {
      provider: 'claid',
      label: labelForTier(),
      visualProfile: args.visualProfile,
      premium,
    };
  }
  if (args.hasPollinationsKey && tier === 'free') {
    return {
      provider: 'pollinations',
      label: 'Standard',
      visualProfile: args.visualProfile,
      premium: false,
    };
  }

  if (args.hasOpenRouterKey) {
    return {
      provider: 'openrouter',
      model: primaryModel,
      modelCascade: cascade,
      label: labelForTier(),
      visualProfile: args.visualProfile,
      premium,
    };
  }

  return {
    provider: 'openrouter',
    model: primaryModel,
    modelCascade: cascade,
    label: labelForTier(),
    visualProfile: args.visualProfile,
    premium,
  };
}
