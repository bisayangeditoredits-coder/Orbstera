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
      })
    : null;
