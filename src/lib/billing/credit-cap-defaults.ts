import type { PlanTier } from '@/lib/billing/credits';

/**
 * Canonical monthly credit caps (single source of truth).
 * 1 credit = $0.008 real AI cost → Student 500 cr = $4.00 max API spend (52% margin on $9 plan).
 * Creator 1,125 cr = $9.00 max API spend (57% margin on $22 plan).
 * Override at runtime via credit_configs row id = 'default' (cannot exceed these caps in code).
 */
export const CREDIT_CAP_MONTHLY: Record<PlanTier, number> = {
  free: 150,
  student_pro: 526,
  pro: 526,
  creator_pro: 1315,
  admin: 100_000,
};

/** Hard USD ceiling on OpenRouter spend per billing month (credits × usdPerCredit). */
export const PLAN_MAX_AI_SPEND_USD: Record<PlanTier, number> = {
  free: 150 * 0.008,
  student_pro: 4.21,
  pro: 4.21,
  creator_pro: 10.52,
  admin: 999_999,
};

export const CREDIT_USD_PER_CREDIT_DEFAULT = 0.008;
