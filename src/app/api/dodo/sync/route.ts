import { NextResponse } from 'next/server';
import {
  applySubscriptionUpgrade,
  isValidBillingUserId,
} from '@/lib/billing/subscription';
import { getServiceSupabase } from '@/lib/billing/supabase-admin';
import {
  isDodoPaymentStatusSuccess,
  isDodoTestMode,
  verifyCheckoutReturnSig,
} from '@/lib/billing/dodo-sync-secret';

export const dynamic = 'force-dynamic';

function redirectUrls(appUrl: string) {
  return {
    settingsUrl: `${appUrl}/my-presentations?payment=success#settings`,
    failedUrl: `${appUrl}/my-presentations?payment=failed#settings`,
    failedSigUrl: `${appUrl}/my-presentations?payment=failed_sig#settings`,
    errorUrl: `${appUrl}/my-presentations?payment=error#settings`,
  };
}

async function runUpgrade(userId: string, planId: string) {
  const supabaseAdmin = getServiceSupabase();
  if (!supabaseAdmin) {
    console.error('[Dodo Sync] Missing Supabase configuration');
    return { ok: false as const, error: 'SUPABASE_NOT_CONFIGURED' };
  }

  return applySubscriptionUpgrade({
    supabaseAdmin,
    userId,
    planId,
    eventType: 'checkout_return',
    resetCredits: true,
  });
}

/** Browser redirect after Dodo checkout — applies plan + resets credits. */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get('userId');
    const planId = url.searchParams.get('planId');
    const sig = url.searchParams.get('sig');
    const paymentStatus = url.searchParams.get('status');

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const { settingsUrl, failedUrl, failedSigUrl, errorUrl } = redirectUrls(appUrl);

    if (!userId || !planId || !sig) {
      return NextResponse.redirect(failedUrl);
    }

    if (!isValidBillingUserId(userId)) {
      console.error('[Dodo Sync] Invalid user id');
      return NextResponse.redirect(failedUrl);
    }

    if (!isDodoPaymentStatusSuccess(paymentStatus)) {
      console.warn('[Dodo Sync] Payment status not successful:', paymentStatus);
      return NextResponse.redirect(failedUrl);
    }

    if (!verifyCheckoutReturnSig(userId, planId, sig)) {
      console.error('[Dodo Sync] Invalid signature mismatch');
      return NextResponse.redirect(failedSigUrl);
    }

    const result = await runUpgrade(userId, planId);
    if (!result.ok) {
      console.error('[Dodo Sync] Upgrade failed:', result.error);
      return NextResponse.redirect(failedUrl);
    }

    return NextResponse.redirect(settingsUrl);
  } catch (error: unknown) {
    console.error('[Dodo Sync] Error:', error instanceof Error ? error.message : error);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    return NextResponse.redirect(redirectUrls(appUrl).errorUrl);
  }
}

/** Authenticated fallback when redirect sync fails (test mode, webhook delay, etc.). */
export async function POST(req: Request) {
  try {
    const { requireApiUser } = await import('@/lib/auth/server');
    const auth = await requireApiUser();
    if ('response' in auth) return auth.response;

    const body = (await req.json().catch(() => ({}))) as { planId?: string; sig?: string };
    const planId = String(body.planId || '').toLowerCase();
    const sig = typeof body.sig === 'string' ? body.sig : '';
    if (!planId || planId === 'free') {
      return NextResponse.json({ ok: false, error: 'INVALID_PLAN' }, { status: 400 });
    }

    const userId = auth.user.id;
    if (!isValidBillingUserId(userId)) {
      return NextResponse.json({ ok: false, error: 'INVALID_USER' }, { status: 400 });
    }

    if (!sig || !verifyCheckoutReturnSig(userId, planId, sig)) {
      return NextResponse.json({ ok: false, error: 'INVALID_SIGNATURE' }, { status: 403 });
    }

    const result = await runUpgrade(userId, planId);
    if (!result.ok) {
      console.error('[Dodo Sync] POST confirm failed:', result.error);
      return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      plan: planId,
      testMode: isDodoTestMode(),
    });
  } catch (error: unknown) {
    console.error('[Dodo Sync] POST error:', error instanceof Error ? error.message : error);
    return NextResponse.json({ ok: false, error: 'SYNC_FAILED' }, { status: 500 });
  }
}
