import { AGENT_MODELS } from '@/lib/ai/agent-models';
import type { BillingPlan } from '@/lib/billing/credits-policy';

/** Single low-cost workhorse across free / student Tier-1 orchestration */
export const GEMINI_FLASH_FAST = 'google/gemini-2.5-flash';

export function isLikelyHeavyReasoningDeck(userPrompt: string, slideCount: number): boolean {
  const prompt = userPrompt.trim();
  if (slideCount > 14 || prompt.length > 900) return true;
  return /\b(derivativ|DCF|tensor|econometric|M\s*&\s*A|forecast model|clinical trial|SOC\s*2|ISO\s*27001|IPO|FDA|HIPAA|patent litigation|supply chain MILP)\b/i.test(
    prompt,
  );
}

export type OrchestrationRouting = {
  intentModel: string;
  structureModel: string;
  allowDeepSeek: boolean;
};

/**
 * Chooses orchestration LLMs by plan + heuristic depth. Never runs all frontier models —
 * DeepSeek activates only after intent JSON signals `needsDeepReasoning` AND allowDeepSeek.
 */
export function orchestrationRoutingForPlan(
  plan: BillingPlan,
  economyMode: boolean,
  userPrompt: string,
  slideCount: number,
): OrchestrationRouting {
  if (economyMode || plan === 'free') {
    return { intentModel: GEMINI_FLASH_FAST, structureModel: GEMINI_FLASH_FAST, allowDeepSeek: false };
  }

  if (plan === 'student_pro') {
    return { intentModel: GEMINI_FLASH_FAST, structureModel: GEMINI_FLASH_FAST, allowDeepSeek: false };
  }

  // creator_pro — premium path, escalates only when the deck looks analytically heavy
  const heavy = isLikelyHeavyReasoningDeck(userPrompt, slideCount);
  if (heavy) {
    return {
      intentModel: AGENT_MODELS.gptOrchestrator,
      structureModel: AGENT_MODELS.claudeStructure,
      allowDeepSeek: true,
    };
  }

  return {
    intentModel: GEMINI_FLASH_FAST,
    structureModel: AGENT_MODELS.claudeStructure,
    allowDeepSeek: false,
  };
}
