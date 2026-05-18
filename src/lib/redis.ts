import { Redis } from '@upstash/redis';

/**
 * Upstash Redis singleton.
 *
 * - Optional: missing env must not break `next build` or cold imports.
 * - Automatic retry (3× with exponential back-off) is handled by the Upstash
 *   SDK when `retry` is set.
 * - `automaticDeserialization: true` (default) means cached JSON objects
 *   come back as parsed objects, not strings.
 */
export const redis: Redis | null =
  process.env.UPSTASH_REDIS_REST_URL?.trim() &&
  process.env.UPSTASH_REDIS_REST_TOKEN?.trim()
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL.trim(),
        token: process.env.UPSTASH_REDIS_REST_TOKEN.trim(),
        retry: {
          retries: 3,
          backoff: (attempt) => Math.min(50 * 2 ** attempt, 2000),
        },
        automaticDeserialization: true,
      })
    : null;

/**
 * Best-effort health-check ping.
 * Returns true if Redis responds within 2 seconds, false otherwise.
 * Never throws — safe to call in startup diagnostics.
 */
export async function pingRedis(): Promise<boolean> {
  if (!redis) return false;
  try {
    const result = await Promise.race([
      redis.ping(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Redis ping timeout')), 2000),
      ),
    ]);
    return result === 'PONG';
  } catch {
    return false;
  }
}
