import pino from 'pino';
import * as Sentry from '@sentry/node';

// Setup Pino Logger
const transport = process.env.NODE_ENV !== 'production'
  ? pino.transport({
      target: 'pino-pretty',
      options: { colorize: true }
    })
  : undefined;

export const logger = pino(
  {
    level: process.env.LOG_LEVEL || 'info',
    redact: ['req.headers.authorization', 'body.password', 'body.token'],
    base: {
      pid: process.pid,
      env: process.env.NODE_ENV || 'development',
      region: process.env.AWS_REGION || 'global',
    }
  },
  transport
);

// Unified error tracking utility
export function logError(err: Error | unknown, context?: Record<string, any>) {
  const errorObject = err instanceof Error ? err : new Error(String(err));
  
  logger.error({ err: errorObject, ...context }, errorObject.message);

  // Capture in Sentry if configured
  if (process.env.SENTRY_DSN) {
    Sentry.withScope((scope) => {
      if (context) {
        Object.entries(context).forEach(([key, val]) => {
          scope.setExtra(key, val);
        });
      }
      Sentry.captureException(errorObject);
    });
  }
}

export function logInfo(message: string, context?: Record<string, any>) {
  logger.info(context || {}, message);
}
