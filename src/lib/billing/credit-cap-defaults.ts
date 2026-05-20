import type { PlanTier } from '@/lib/billing/credits';

/**
 * Canonical monthly credit caps (single source of truth).
 * Aligned with usdPerCredit $0.008 AI budget: Student $4, Creator $9.
 * Override at runtime via credit_configs row id = 'default'.
 */
export const CREDIT_CAP_MONTHLY: Record<PlanTier, number> = {
  free: 150,
  student_pro: 500,
  pro: 500,
  creator_pro: 1125,
  admin: 100_000,
};

export const CREDIT_USD_PER_CREDIT_DEFAULT = 0.008;
