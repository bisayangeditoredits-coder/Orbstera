import type { PlanTier } from '@/lib/billing/credits';
import { normalizePlanTier } from '@/lib/billing/credits';
import { getServiceSupabase } from '@/lib/billing/supabase-admin';

/**
 * Authoritative billing plan from profiles.plan only (never user_metadata).
 */
export async function getBillingPlan(userId: string): Promise<PlanTier> {
  const admin = getServiceSupabase();
  if (!admin) return 'free';

  try {
    const { data, error } = await admin
      .from('profiles')
      .select('plan')
      .eq('id', userId)
      .maybeSingle();

    if (error || !data?.plan) return 'free';
    return normalizePlanTier(data.plan);
  } catch {
    return 'free';
  }
}
