import { Redis } from '@upstash/redis';

/**
 * Upstash is optional: missing env must not break `next build` or cold imports.
 * Enhance-PPT skips caching when this is null.
 */
export const redis: Redis | null =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
        // Disable Next.js fetch caching for Upstash calls to prevent stale data
        // and ensure a smooth, perfect, live connection to Redis.
        fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' }),
      })
    : null;
