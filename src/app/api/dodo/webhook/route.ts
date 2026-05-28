import { NextResponse } from 'next/server';
import { apiLog, captureApiException, getOrCreateRequestId } from '@/lib/observability';
import { getServiceSupabase } from '@/lib/billing/supabase-admin';
import { readTextBodyWithLimit } from '@/lib/http/request-body-limit';
import {
  applySubscriptionUpgrade,
  markWebhookEventProcessed,
} from '@/lib/billing/subscription';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;
const MAX_WEBHOOK_BODY_BYTES = 256 * 1024;

export async function POST(req: Request) {
  const requestId = getOrCreateRequestId(req);
  try {
    const bodyResult = await readTextBodyWithLimit(req, MAX_WEBHOOK_BODY_BYTES);
    if (!bodyResult.ok) return bodyResult.response;
    const body = bodyResult.text;
    const signature = req.headers.get('x-dodo-signature');

    const supabaseAdmin = getServiceSupabase();
    if (!supabaseAdmin) {
      console.error('[Webhook] Missing Supabase configuration');
      return NextResponse.json({ error: 'Internal configuration error' }, { status: 500 });
    }
    const webhookSecret = (process.env.DODO_PAYMENTS_WEBHOOK_SECRET || '').trim();
    const isDev = process.env.NODE_ENV === 'development';

    if (!webhookSecret) {
      if (!isDev) {
        console.error('[Dodo Webhook] Missing DODO_PAYMENTS_WEBHOOK_SECRET in non-development');
        return NextResponse.json({ error: 'Webhook not configured' }, { status: 401 });
      }
      console.warn('[Dodo Webhook] DEV only: no DODO_PAYMENTS_WEBHOOK_SECRET — accepting without verification');
    } else {
      if (!signature) {
        console.error('[Dodo Webhook] Missing x-dodo-signature header');
        return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
      }
      const crypto = await import('crypto');
      const hmac = crypto.createHmac('sha256', webhookSecret);
      hmac.update(body);
      const computedSignature = hmac.digest('hex');
      const expected = Buffer.from(computedSignature, 'utf8');
      const provided = Buffer.from(signature.trim(), 'utf8');
      const isValidSig =
        expected.length === provided.length &&
        crypto.timingSafeEqual(expected, provided);
      if (!isValidSig) {
        console.error('[Dodo Webhook] Invalid signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    const payload = JSON.parse(body);
    const eventType = payload.type;
    const data = payload.data;
    const eventId = String(payload.id || payload.event_id || `${eventType}:${data?.id || ''}`);

    apiLog('dodo-webhook', 'info', `Received event: ${eventType}`, { requestId });

    if (
      eventType === 'subscription.active' ||
      eventType === 'subscription.renewed' ||
      eventType === 'payment.succeeded'
    ) {
      const shouldProcess = await markWebhookEventProcessed(supabaseAdmin, eventId);
      if (!shouldProcess) {
        apiLog('dodo-webhook', 'info', 'Duplicate event, skipping', { requestId });
        return NextResponse.json({ received: true, duplicate: true });
      }

      const metadata = data.metadata || {};
      const userId = metadata.userId;
      const planId = metadata.planId;

      if (userId && planId) {
        const result = await applySubscriptionUpgrade({
          supabaseAdmin,
          userId,
          planId,
          eventType,
          dodoData: data,
          resetCredits: true,
        });
        if (!result.ok) {
          console.error('[Dodo Webhook] Upgrade failed:', result.error);
          return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: unknown) {
    console.error('[Dodo Webhook] Error:', error instanceof Error ? error.message : error);
    captureApiException(error, { requestId, route: 'POST /api/dodo/webhook' });
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
