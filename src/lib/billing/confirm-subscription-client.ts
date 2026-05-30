'use client';

export const PENDING_PLAN_STORAGE_KEY = 'orbstera_pending_plan';
export const PENDING_PLAN_SIG_STORAGE_KEY = 'orbstera_pending_plan_sig';

export function storePendingCheckout(planId: string, sig: string) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(PENDING_PLAN_STORAGE_KEY, planId);
    sessionStorage.setItem(PENDING_PLAN_SIG_STORAGE_KEY, sig);
  } catch {
    /* ignore */
  }
}

/** @deprecated use storePendingCheckout */
export function storePendingPlan(planId: string) {
  storePendingCheckout(planId, '');
}

export function readPendingCheckout(): { planId: string | null; sig: string | null } {
  if (typeof window === 'undefined') return { planId: null, sig: null };
  try {
    return {
      planId: sessionStorage.getItem(PENDING_PLAN_STORAGE_KEY),
      sig: sessionStorage.getItem(PENDING_PLAN_SIG_STORAGE_KEY),
    };
  } catch {
    return { planId: null, sig: null };
  }
}

export function clearPendingCheckout() {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(PENDING_PLAN_STORAGE_KEY);
    sessionStorage.removeItem(PENDING_PLAN_SIG_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Fallback when Dodo return_url sync did not run (common in local/test checkout). */
export async function confirmSubscriptionAfterPayment(
  planId: string,
  sig?: string | null,
): Promise<boolean> {
  try {
    const res = await fetch('/api/dodo/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ planId, sig: sig || undefined }),
    });
    if (!res.ok) return false;
    const json = await res.json();
    return json.ok === true;
  } catch {
    return false;
  }
}

export async function finalizePaymentReturn(): Promise<void> {
  const { planId, sig } = readPendingCheckout();
  if (planId) {
    await confirmSubscriptionAfterPayment(planId, sig);
    clearPendingCheckout();
  }
  window.dispatchEvent(new Event('credits-updated'));
}
