/**
 * Optional per-plan OpenRouter API keys for cost isolation at scale.
 * Env: OPENROUTER_API_KEY (default), OPENROUTER_API_KEY_CREATOR_PRO, etc.
 */
import type { PlanTier } from '@/lib/billing/credits';

const ENV_BY_PLAN: Partial<Record<PlanTier, string>> = {
  creator_pro: 'OPENROUTER_API_KEY_CREATOR_PRO',
  student_pro: 'OPENROUTER_API_KEY_STUDENT_PRO',
  pro: 'OPENROUTER_API_KEY_STUDENT_PRO',
  admin: 'OPENROUTER_API_KEY_ADMIN',
};

export function resolveOpenRouterApiKey(plan?: string | null): string {
  const defaultKey = process.env.OPENROUTER_API_KEY?.trim() || '';
  const tier = String(plan || 'free').toLowerCase() as PlanTier;
  const envName = ENV_BY_PLAN[tier];
  if (envName) {
    const planKey = process.env[envName]?.trim();
    if (planKey) return planKey;
  }
  return defaultKey;
}
