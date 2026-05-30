import type { SupabaseClient } from '@supabase/supabase-js';
import { getPlanMonthlyCredits } from '@/lib/billing/credits';
import { syncCreditFastPathFromProfile } from '@/lib/billing/credit-redis';

function monthKeyUTC(d = new Date()): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidBillingUserId(userId: string): boolean {
  return UUID_RE.test(userId) && userId !== 'guest_test';
}

export type ApplySubscriptionArgs = {
  supabaseAdmin: SupabaseClient;
  userId: string;
  planId: string;
  eventType?: string;
  dodoData?: unknown;
  resetCredits?: boolean;
};

/** Single path for subscription upgrades (webhook + verified sync). */
export async function applySubscriptionUpgrade(
  args: ApplySubscriptionArgs,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { supabaseAdmin, userId, planId } = args;
  if (!isValidBillingUserId(userId)) {
    return { ok: false, error: 'INVALID_USER_ID' };
  }

  const { data: { user }, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (getUserError || !user) {
    console.error('[billing] failed to get user by id:', getUserError);
    return { ok: false, error: 'USER_NOT_FOUND' };
  }

  const normalizedPlan = String(planId || '').toLowerCase();
  if (!normalizedPlan || normalizedPlan === 'free') {
    return { ok: false, error: 'INVALID_PLAN' };
  }

  if (normalizedPlan === 'one_time_export') {
    const currentCredits = Number(user?.user_metadata?.watermark_free_exports) || 0;
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: { watermark_free_exports: currentCredits + 1 },
    });
    if (authError) {
      console.error('[billing] one_time_export metadata error:', authError);
      return { ok: false, error: 'AUTH_UPDATE_FAILED' };
    }
    return { ok: true };
  }

  const newLimit = getPlanMonthlyCredits(normalizedPlan);
  const resetCredits = args.resetCredits !== false;

  const profilePatch: Record<string, unknown> = {
    id: userId,
    plan: normalizedPlan,
    email: user.email || '',
  };
  if (resetCredits) {
    profilePatch.credits_used_month = 0;
    profilePatch.credits_monthly_limit = newLimit;
    profilePatch.credits_reset_at = new Date().toISOString();
  }

  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .upsert(profilePatch, { onConflict: 'id' });

  if (profileError) {
    console.error('[billing] profiles upsert error:', profileError);
    return { ok: false, error: 'PROFILE_UPDATE_FAILED' };
  }

  if (resetCredits) {
    const { error: ledgerError } = await supabaseAdmin.from('credit_ledger').insert({
      user_id: userId,
      delta: newLimit,
      reason: `subscription_${args.eventType || 'upgrade'}_${normalizedPlan}`,
      meta: {
        planId: normalizedPlan,
        eventType: args.eventType,
        dodoData: args.dodoData,
      },
    });
    if (ledgerError) {
      console.error('[billing] ledger insert error:', ledgerError);
    }
  }

  const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    user_metadata: { plan: normalizedPlan },
  });
  if (authError) {
    console.error('[billing] auth metadata error:', authError);
  }

  if (resetCredits) {
    await syncCreditFastPathFromProfile(userId, monthKeyUTC(), 0);
  }

  return { ok: true };
}

/** Idempotent webhook processing via dodo_webhook_events table. */
export async function markWebhookEventProcessed(
  supabaseAdmin: SupabaseClient,
  eventId: string,
): Promise<boolean> {
  if (!eventId) return true;
  try {
    const { error } = await supabaseAdmin.from('dodo_webhook_events').insert({
      event_id: eventId,
      processed_at: new Date().toISOString(),
    });
    if (error) {
      if (/duplicate|unique|23505/i.test(String(error.message || error.code))) {
        return false;
      }
      console.warn('[billing] webhook idempotency insert failed:', error.message);
    }
    return true;
  } catch {
    return true;
  }
}
