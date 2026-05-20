import * as Sentry from '@sentry/node';
import { aiGenerationWorker } from './ai-generation.worker';
import { pptxExportWorker } from './pptx-export.worker';
import { logger, logInfo, logError } from '../lib/logger';

// Initialize Sentry for background process tracking
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 1.0, // Adjust in production
  });
  logInfo('Sentry tracking initialized for workers.');
} else {
  logger.warn('Sentry DSN not found. Workers running without remote error monitoring.');
}

logInfo('🚀 Orbstera Background Workers Starting...');

aiGenerationWorker.on('ready', () => {
  logInfo('✅ AI Generation Worker is listening on queue...');
});

aiGenerationWorker.on('failed', (job, err) => {
  logError(err, { jobId: job?.id, queue: 'ai-generation' });
});

pptxExportWorker.on('ready', () => {
  logInfo('✅ PPTX Export Worker is listening on queue...');
});

pptxExportWorker.on('failed', (job, err) => {
  logError(err, { jobId: job?.id, queue: 'pptx-export' });
});

// Graceful shutdown sequence
const shutdown = async () => {
  logInfo('Shutting down worker instances gracefully...');
  await Promise.all([
    aiGenerationWorker.close(),
    pptxExportWorker.close()
  ]);
  logInfo('Workers stopped.');
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('unhandledRejection', (reason) => {
  logError(reason, { source: 'unhandledRejection' });
});
process.on('uncaughtException', (error) => {
  logError(error, { source: 'uncaughtException' });
  // Sentry flush before dying
  if (process.env.SENTRY_DSN) {
    Sentry.close(2000).then(() => process.exit(1));
  } else {
    process.exit(1);
  }
});
