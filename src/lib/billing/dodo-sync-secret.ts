import crypto from 'crypto';

/** Shared HMAC secret for checkout return_url sig and /api/dodo/sync verification. */
export function getDodoBillingSyncSecret(): string {
  const configured = (process.env.DODO_PAYMENTS_WEBHOOK_SECRET || '').trim();
  if (configured) return configured;
  return 'dev';
}

export function isDodoTestMode(): boolean {
  return (process.env.DODO_PAYMENTS_ENDPOINT || '').includes('test');
}

export function buildCheckoutReturnSig(userId: string, planId: string): string {
  return crypto
    .createHmac('sha256', getDodoBillingSyncSecret())
    .update(`${userId}:${planId}`)
    .digest('hex');
}

export function verifyCheckoutReturnSig(userId: string, planId: string, sig: string): boolean {
  const expectedSig = buildCheckoutReturnSig(userId, planId);
  const expected = Buffer.from(expectedSig, 'utf8');
  const provided = Buffer.from(sig.trim(), 'utf8');
  return expected.length === provided.length && crypto.timingSafeEqual(expected, provided);
}

const SUCCESS_STATUSES = new Set(['succeeded', 'active', 'success', 'paid', 'completed']);

/** Dodo appends `status` to return_url after checkout. */
export function isDodoPaymentStatusSuccess(status: string | null): boolean {
  if (!status) return true;
  return SUCCESS_STATUSES.has(status.trim().toLowerCase());
}
