import * as Sentry from '@sentry/nextjs';

const sample = Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? '0.05');
const tracesSampleRate = Number.isFinite(sample) ? Math.min(1, Math.max(0, sample)) : 0.05;

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled: Boolean(process.env.SENTRY_DSN),
  tracesSampleRate,
  environment: process.env.SENTRY_ENVIRONMENT || process.env.VERCEL_ENV || process.env.NODE_ENV,
});
