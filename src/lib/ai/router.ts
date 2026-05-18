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
  gpt55: 'GPT-5.5',
  gpt5: 'GPT-5',
  sonnet: 'Claude Sonnet',
  sonnetStrategy: 'Claude Sonnet · Strategy',
  opus: 'Claude Opus',
  opusStrategy: 'Claude Opus · Strategy',
  geminiPro: 'Gemini Pro',
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
  if (economy) return 'economy';
  if (freeTaste) return 'student';
  if (plan === 'free') return 'free';
  if (isCreatorTier(plan)) return 'creator';
  if (isPaid(plan)) return 'student';
  return 'free';
}

function uniqueModels(models: string[]): string[] {
  const seen = new Set<string>();
  return models.filter((m) => {
    if (!m || seen.has(m)) return false;
    seen.add(m);
    return true;
  });
}

function openRouterImageCascade(args: {
  tier: QualityTier;
  visualProfile: ImageVisualProfile;
  premium: boolean;
  task?: AiTask;
}): string[] {
  const isTypo = args.visualProfile === 'typography';
  const isGenfill = args.task === 'genfill_image' || args.task === 'magic_edit_image';

  if (args.tier === 'creator') {
    if (isTypo) {
      return uniqueModels([
        IMAGE_MODELS.typographyPremium,
        IMAGE_MODELS.typography,
        IMAGE_MODELS.fluxCinematic,
        IMAGE_MODELS.fallback,
      ]);
    }
    if (args.premium || isGenfill) {
      return uniqueModels([
        IMAGE_MODELS.fluxUltra,
        IMAGE_MODELS.fluxCinematic,
        IMAGE_MODELS.flux,
        IMAGE_MODELS.fallback,
      ]);
    }
    return uniqueModels([
      IMAGE_MODELS.fluxCinematic,
      IMAGE_MODELS.flux,
      IMAGE_MODELS.fallback,
    ]);
  }

  if (args.tier === 'student') {
    if (isTypo) {
      return uniqueModels([IMAGE_MODELS.typography, IMAGE_MODELS.flux, IMAGE_MODELS.fallback]);
    }
    return uniqueModels([
      IMAGE_MODELS.flux,
      IMAGE_MODELS.fluxCinematic,
      IMAGE_MODELS.fallback,
    ]);
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
  if (planTier === 'free' && !args.freeTaste) return false;

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
  const tier = resolveQualityTier(
    normalizePlan(args.plan),
    Boolean(args.spendState?.forcedEconomyMode),
    args.freeTaste,
  );

  if (tier === 'economy' || tier === 'free') {
    return uniqueModels([OR_MODELS.coach, AGENT_MODELS.claudeStructure, 'google/gemini-2.5-flash']);
  }
  if (tier === 'creator') {
    return uniqueModels([
      AGENT_MODELS.gptOrchestrator,
      AGENT_MODELS.claudeStructure,
      AGENT_MODELS.gptOrchestratorAlt,
      AGENT_MODELS.geminiPro,
    ]);
  }
  return uniqueModels([
    AGENT_MODELS.gptOrchestrator,
    AGENT_MODELS.claudeStructure,
    AGENT_MODELS.gptOrchestratorAlt,
    'google/gemini-2.5-flash',
  ]);
}

export function selectTextModel(args: {
  plan: string | null | undefined;
  task: AiTask;
  complexity: ComplexitySignals;
  spendState?: SpendState;
  freeTaste?: boolean;
}): SelectedTextModel {
  const planTier = normalizePlan(args.plan);
  const tier = resolveQualityTier(planTier, Boolean(args.spendState?.forcedEconomyMode), args.freeTaste);
  const isFreeTaste = Boolean(args.freeTaste);

  const lowCost: SelectedTextModel = {
    provider: 'openrouter',
    model: OR_MODELS.coach,
    label: TEXT_LABELS.economy,
    maxTokens: args.task === 'deck_compose' ? 16_000 : 4096,
    temperature: 0.25,
  };

  if (tier === 'economy' || tier === 'free') {
    return lowCost;
  }

  const isCreator = tier === 'creator';

  if (args.task === 'deck_intent') {
    return {
      provider: 'openrouter',
      model: AGENT_MODELS.gptOrchestrator,
      label: TEXT_LABELS.gpt55,
      maxTokens: isCreator ? 2800 : 2400,
      temperature: 0.22,
    };
  }

  if (args.task === 'deck_structure') {
    return isCreator
      ? {
          provider: 'openrouter',
          model: AGENT_MODELS.claudeStructure,
          label: TEXT_LABELS.sonnet,
          maxTokens: 4000,
          temperature: 0.25,
        }
      : {
          provider: 'openrouter',
          model: AGENT_MODELS.claudeStructure,
          label: TEXT_LABELS.sonnet,
          maxTokens: 3600,
          temperature: 0.25,
        };
  }

  if (args.task === 'deck_reason') {
    return isCreator
      ? {
          provider: 'openrouter',
          model: AGENT_MODELS.claudeStructure,
          label: TEXT_LABELS.sonnetStrategy,
          maxTokens: 2800,
          temperature: 0.35,
        }
      : {
          provider: 'openrouter',
          model: AGENT_MODELS.claudeStructure,
          label: TEXT_LABELS.sonnetStrategy,
          maxTokens: 2400,
          temperature: 0.35,
        };
  }

  if (args.task === 'deck_compose') {
    return {
      provider: 'openrouter',
      model: OR_MODELS.composerPrimary,
      label: isFreeTaste ? `${TEXT_LABELS.gpt55} · Preview` : TEXT_LABELS.gpt55,
      maxTokens: isCreator ? 28_000 : isFreeTaste ? 12_000 : 24_000,
      temperature: 0.28,
    };
  }

  if (args.task === 'magic_edit_text') {
    return isCreator
      ? {
          provider: 'openrouter',
          model: AGENT_MODELS.gptOrchestrator,
          label: TEXT_LABELS.gpt55,
          maxTokens: 3200,
          temperature: 0.15,
        }
      : {
          provider: 'openrouter',
          model: AGENT_MODELS.claudeStructure,
          label: TEXT_LABELS.sonnet,
          maxTokens: 2800,
          temperature: 0.15,
        };
  }

  if (args.task === 'deck_polish') {
    return isCreator
      ? {
          provider: 'openrouter',
          model: OR_MODELS.refineFallback,
          label: TEXT_LABELS.sonnet,
          maxTokens: 8000,
          temperature: 0.22,
        }
      : {
          provider: 'openrouter',
          model: OR_MODELS.refineFallback,
          label: TEXT_LABELS.sonnet,
          maxTokens: 6000,
          temperature: 0.25,
        };
  }

  return isCreator
    ? {
        provider: 'openrouter',
        model: OR_MODELS.refineFallback,
        label: TEXT_LABELS.sonnet,
        maxTokens: 6000,
        temperature: 0.25,
      }
    : {
        provider: 'openrouter',
        model: OR_MODELS.refineFallback,
        label: TEXT_LABELS.sonnet,
        maxTokens: 6000,
        temperature: 0.25,
      };
}

/** Compose fallback chain when primary stream fails. */
export function getComposeFallbackModels(args: {
  plan: string | null | undefined;
  spendState?: SpendState;
  freeTaste?: boolean;
}): string[] {
  const tier = resolveQualityTier(
    normalizePlan(args.plan),
    Boolean(args.spendState?.forcedEconomyMode),
    args.freeTaste,
  );
  if (tier === 'economy' || tier === 'free') {
    return uniqueModels([OR_MODELS.coach]);
  }
  if (tier === 'creator') {
    return uniqueModels([
      OR_MODELS.composerFallback,
      AGENT_MODELS.claudeStructure,
      AGENT_MODELS.geminiPro,
      OR_MODELS.refineFallback,
    ]);
  }
  return uniqueModels([
    OR_MODELS.composerFallback,
    AGENT_MODELS.claudeStructure,
    AGENT_MODELS.geminiPro,
  ]);
}

export function selectImageProvider(args: {
  plan: string | null | undefined;
  visualProfile: ImageVisualProfile;
  premiumRequested: boolean;
  spendState?: SpendState;
  task?: AiTask;
  freeTaste?: boolean;
  hasOpenRouterKey: boolean;
  hasClaidKey: boolean;
  hasPollinationsKey: boolean;
}): SelectedImageProvider {
  const planTier = normalizePlan(args.plan);
  const tier = resolveQualityTier(
    planTier,
    Boolean(args.spendState?.forcedEconomyMode),
    args.freeTaste,
  );
  const premiumAllowed = isCreatorTier(planTier) && tier === 'creator';
  const premium = Boolean(args.premiumRequested && premiumAllowed);
  const isTypo = args.visualProfile === 'typography';

  const labelForTier = (): string => {
    if (tier === 'creator') return premium ? 'Cinematic HD' : 'Pro Studio';
    if (tier === 'student') return 'Studio HD';
    return 'Standard';
  };

  const cascade = openRouterImageCascade({
    tier,
    visualProfile: args.visualProfile,
    premium,
    task: args.task,
  });
  const primaryModel = cascade[0];

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
