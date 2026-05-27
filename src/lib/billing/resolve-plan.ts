import type { PlanTier } from '@/lib/billing/credits';
import { normalizePlanTier } from '@/lib/billing/credits';
import { getServiceSupabase } from '@/lib/billing/supabase-admin';

/**
 * Authoritative billing plan from profiles.plan only (never user_metadata).
 */
export async function getBillingPlan(userId: string): Promise<PlanTier> {
  const admin = getServiceSupabase();
  if (!admin) {
    // CRITICAL: Without SUPABASE_SERVICE_ROLE_KEY, ALL users are treated as free.
    // Paid subscribers (Student Pro / Creator Pro) will lose access to their plan.
    // Set SUPABASE_SERVICE_ROLE_KEY in Vercel Environment Variables immediately.
    console.error(
      '[billing] SUPABASE_SERVICE_ROLE_KEY is missing or invalid. ' +
      'Cannot resolve billing plan — all users will be treated as FREE. ' +
      'Paying users will lose access to their purchased plan features.'
    );
    return 'free';
  }

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
