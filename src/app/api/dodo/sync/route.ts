import { NextResponse } from 'next/server';
import {
  applySubscriptionUpgrade,
  isValidBillingUserId,
} from '@/lib/billing/subscription';
import { getServiceSupabase } from '@/lib/billing/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get('userId');
    const planId = url.searchParams.get('planId');
    const sig = url.searchParams.get('sig');

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const settingsUrl = `${appUrl}/my-presentations?payment=success#settings`;
    const failedUrl = `${appUrl}/my-presentations?payment=failed#settings`;

    if (!userId || !planId || !sig) {
      return NextResponse.redirect(failedUrl);
    }

    if (!isValidBillingUserId(userId)) {
      console.error('[Dodo Sync] Invalid user id');
      return NextResponse.redirect(failedUrl);
    }

    const crypto = await import('crypto');
    const secret = process.env.DODO_PAYMENTS_WEBHOOK_SECRET || '';
    if (!secret || secret === 'dev') {
      if (process.env.NODE_ENV === 'production') {
        console.error('[Dodo Sync] Webhook secret not configured in production');
        return NextResponse.redirect(failedUrl);
      }
    }
    const expectedSig = crypto
      .createHmac('sha256', secret || 'dev')
      .update(`${userId}:${planId}`)
      .digest('hex');

    if (sig !== expectedSig) {
      console.error('[Dodo Sync] Invalid signature mismatch');
      return NextResponse.redirect(`${appUrl}/my-presentations?payment=failed_sig#settings`);
    }

    const supabaseAdmin = getServiceSupabase();
    if (!supabaseAdmin) {
      console.error('[Dodo Sync] Missing Supabase configuration');
      return NextResponse.redirect(failedUrl);
    }

    const result = await applySubscriptionUpgrade({
      supabaseAdmin,
      userId,
      planId,
      eventType: 'checkout_return',
      resetCredits: true,
    });

    if (!result.ok) {
      console.error('[Dodo Sync] Upgrade failed:', result.error);
      return NextResponse.redirect(failedUrl);
    }

    return NextResponse.redirect(settingsUrl);
  } catch (error: unknown) {
    console.error('[Dodo Sync] Error:', error instanceof Error ? error.message : error);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    return NextResponse.redirect(`${appUrl}/my-presentations?payment=error#settings`);
  }
}
