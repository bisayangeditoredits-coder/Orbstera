/** Private API / auth responses — never cache on shared CDN. */
export const PRIVATE_NO_STORE = {
  'Cache-Control': 'private, no-store, max-age=0',
  Pragma: 'no-cache',
} as const;

/**
 * User-scoped immutable assets (UUID keys). Safe for browser + edge CDN via `private`.
 * Vercel still authenticates the route; CDN caches per authenticated session.
 */
export const PRIVATE_IMMUTABLE_ASSET = {
  'Cache-Control': 'private, max-age=31536000, immutable',
} as const;

/**
 * Semi-static public proxy responses (e.g. generated image proxies).
 * `s-maxage` lets the edge absorb repeat traffic; SWR serves stale while revalidating.
 */
export const PUBLIC_CDN_PROXY = {
  'Cache-Control': 'public, s-maxage=86400, max-age=86400, stale-while-revalidate=604800',
} as const;

/** Long-lived public immutable assets (static seeds, versioned URLs). */
export const PUBLIC_IMMUTABLE = {
  'Cache-Control': 'public, max-age=31536000, immutable',
} as const;
