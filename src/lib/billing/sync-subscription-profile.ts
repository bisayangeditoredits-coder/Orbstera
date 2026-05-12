import { utcYearMonth } from '@/lib/billing/credits-server';

/** Fields merged into `profiles` on successful paid subscription checkout / webhook. */
export function paidSubscriptionCreditsResetPatch(): Record<string, unknown> {
  return {
    monthly_ai_credits_used: 0,
    credits_cycle_key: utcYearMonth(),
    generations_used: 0,
    updated_at: new Date().toISOString(),
  };
}
