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

const PLACEHOLDER_KEYS = new Set([
  '',
  'your-openrouter-api-key-here',
  'sk-or-v1-xxx',
]);

export function isOpenRouterConfigured(plan?: string | null): boolean {
  return Boolean(resolveOpenRouterApiKey(plan));
}

export function resolveOpenRouterApiKey(plan?: string | null): string {
  const defaultKey = normalizeOpenRouterKey(process.env.OPENROUTER_API_KEY);
  const tier = String(plan || 'free').toLowerCase() as PlanTier;
  const envName = ENV_BY_PLAN[tier];
  if (envName) {
    const planKey = normalizeOpenRouterKey(process.env[envName]);
    if (planKey) return planKey;
  }
  return defaultKey;
}

function normalizeOpenRouterKey(raw: string | undefined): string {
  let key = (raw || '').trim();
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1).trim();
  }
  if (PLACEHOLDER_KEYS.has(key)) return '';
  return key;
}
