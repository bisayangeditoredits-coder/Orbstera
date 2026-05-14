import { randomUUID } from 'crypto';

/** Prefer client/proxy `x-request-id`; otherwise generate for log correlation. */
export function getOrCreateRequestId(req: Request): string {
  const h = req.headers.get('x-request-id')?.trim();
  return h && h.length > 0 ? h : randomUUID();
}

export function apiLog(
  scope: string,
  level: 'info' | 'warn' | 'error',
  message: string,
  ctx: Record<string, unknown>,
): void {
  const payload = { ts: new Date().toISOString(), scope, level, message, ...ctx };
  const line = JSON.stringify(payload);
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export function captureApiException(err: unknown, ctx: Record<string, unknown>): void {
  const message = err instanceof Error ? err.message : String(err);
  apiLog('api', 'error', message, {
    ...ctx,
    name: err instanceof Error ? err.name : undefined,
    stack: err instanceof Error ? err.stack : undefined,
  });
  if (process.env.SENTRY_DSN) {
    void import('@sentry/nextjs')
      .then((Sentry) => {
        Sentry.captureException(err, { extra: ctx });
      })
      .catch(() => {
        /* optional */
      });
  }
}
