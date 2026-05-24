function registerProcessErrorHandlers() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const onFatal = (label: string, reason: unknown) => {
    console.error(`[process] ${label}:`, reason);
    if (process.env.SENTRY_DSN) {
      void import('@sentry/nextjs')
        .then((Sentry) => {
          Sentry.captureException(reason instanceof Error ? reason : new Error(String(reason)));
        })
        .catch(() => {});
    }
  };
  process.on('unhandledRejection', (reason) => onFatal('unhandledRejection', reason));
  process.on('uncaughtException', (err) => onFatal('uncaughtException', err));
}

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    registerProcessErrorHandlers();
    const { validateProductionEnv } = await import('./lib/env-validation');
    validateProductionEnv();
    const { runStartupHealthChecks } = await import('./lib/observability');
    void runStartupHealthChecks();
    await import('../sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config');
  }
}
