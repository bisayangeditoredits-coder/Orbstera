import type { PlanTier } from '@/lib/billing/credits';

/**
 * Canonical monthly credit caps (single source of truth).
 * 1 credit = $0.0025 real AI cost.
 * Student Plan ($9): Net ~$8.43. Fixed profit target $3.00 → AI Budget $5.43 → 2172 credits.
 * Creator Plan ($22): Net ~$21.04. Fixed profit target $5.00 → AI Budget $16.04 → 6416 credits.
 * Override at runtime via credit_configs row id = 'default' (cannot exceed these caps in code).
 */
export const CREDIT_CAP_MONTHLY: Record<PlanTier, number> = {
  free: 300,
  student_pro: 2172,
  pro: 2172,
  creator_pro: 6416,
  admin: 100_000,
};

/** Hard USD ceiling on OpenRouter spend per billing month (credits × usdPerCredit). */
export const PLAN_MAX_AI_SPEND_USD: Record<PlanTier, number> = {
  free: 300 * 0.0025,
  student_pro: 5.43,
  pro: 5.43,
  creator_pro: 16.04,
  admin: 999_999,
};

export const CREDIT_USD_PER_CREDIT_DEFAULT = 0.0025;

