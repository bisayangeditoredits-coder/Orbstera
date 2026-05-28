import { NextResponse } from 'next/server';
import { DodoPayments } from 'dodopayments';
import {
  assertTrustedOrigin,
  requireApiUser,
  PRIVATE_API_HEADERS,
  untrustedOriginResponse,
} from '@/lib/auth/server';
import {
  enforceAiIpRateLimit,
  enforceAiUserRateLimit,
  requireRateLimitInfrastructure,
} from '@/lib/rate-limit-server';
import { readJsonBodyWithLimit } from '@/lib/http/request-body-limit';

export const maxDuration = 30;
const MAX_BODY_BYTES = 16 * 1024;

export async function POST(req: Request) {
  if (!assertTrustedOrigin(req)) return untrustedOriginResponse();
  try {
    const infra = requireRateLimitInfrastructure();
    if (infra) return infra;

    const ipLimited = await enforceAiIpRateLimit(req, 'default');
    if (ipLimited) return ipLimited;

    const auth = await requireApiUser();
    if ('response' in auth) {
      return NextResponse.json(
        { error: 'SIGN_IN_REQUIRED', message: 'Please sign in before checkout.' },
        { status: 401, headers: PRIVATE_API_HEADERS },
      );
    }

    const userLimited = await enforceAiUserRateLimit(req, auth.user.id, 'default');
    if (userLimited) return userLimited;

    const user = auth.user;
    const customerEmail = user.email;
    if (!customerEmail) {
      return NextResponse.json(
        { error: 'EMAIL_REQUIRED', message: 'Your account needs an email address for billing.' },
        { status: 400 },
      );
    }

    const customerName =
      (typeof user.user_metadata?.full_name === 'string' && user.user_metadata.full_name) ||
      customerEmail.split('@')[0] ||
      'Customer';
    const userId = user.id;

    const bodyResult = await readJsonBodyWithLimit<{ planId?: string; productId?: string }>(
      req,
      MAX_BODY_BYTES,
    );
    if (!bodyResult.ok) return bodyResult.response;
    const { planId, productId } = bodyResult.value;

    const PRODUCT_MAP: Record<string, string> = {
      student_pro: process.env.DODO_STUDENT_PRO_ID || '',
      creator_pro: process.env.DODO_CREATOR_PRO_ID || '',
      one_time_export: process.env.DODO_ONE_TIME_EXPORT_ID || 'pdt_0NeTHnd7mchKsmRaOBa1S',
    };

    const targetProductId = productId || (planId ? PRODUCT_MAP[planId] : undefined);

    if (!targetProductId) {
      return NextResponse.json({ error: 'Invalid product or plan ID' }, { status: 400 });
    }

    const apiKey = (process.env.DODO_PAYMENTS_API_KEY || '').trim();
    const isTest = process.env.DODO_PAYMENTS_ENDPOINT?.includes('test');

    const dodo = new DodoPayments({
      bearerToken: apiKey,
      environment: isTest ? 'test_mode' : 'live_mode',
    });

    const basePayload = {
      customer: {
        email: customerEmail,
        name: customerName,
      },
      product_cart: [
        {
          product_id: targetProductId,
          quantity: 1,
        },
      ],
      metadata: {
        userId,
        planId,
      },
    };

    const crypto = await import('crypto');
    const secret = process.env.DODO_PAYMENTS_WEBHOOK_SECRET || 'dev';
    const sig = crypto.createHmac('sha256', secret).update(`${userId}:${planId}`).digest('hex');

    const sessionPayload = {
      ...basePayload,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/dodo/sync?userId=${userId}&planId=${planId}&sig=${sig}`,
    };

    const session = await dodo.checkoutSessions.create(sessionPayload as Parameters<typeof dodo.checkoutSessions.create>[0]);

    return NextResponse.json({ url: session.checkout_url });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create checkout session';
    console.error('[Dodo] Checkout Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
