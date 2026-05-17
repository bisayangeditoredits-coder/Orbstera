export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { validateProductionEnv } = await import('./lib/env-validation');
    validateProductionEnv();
    await import('./sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}
