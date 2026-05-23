/** Max authenticated session length before forced re-login (3 days). */
export const SESSION_MAX_AGE_MS = 3 * 24 * 60 * 60 * 1000;
export const SESSION_MAX_AGE_SEC = Math.floor(SESSION_MAX_AGE_MS / 1000);

/** HttpOnly cookie: when the current login session started (ISO string). */
export const SESSION_STARTED_COOKIE = 'orbstera_session_at';

/** Client-side caches must not outlive the session window. */
export const CLIENT_CACHE_MAX_AGE_MS = SESSION_MAX_AGE_MS;

export function isSessionStartedAtExpired(startedAt: string | undefined): boolean {
  if (!startedAt) return false;
  const t = Date.parse(startedAt);
  if (!Number.isFinite(t)) return false; // Unknown format — don't expire, let Supabase decide
  return Date.now() - t > SESSION_MAX_AGE_MS;
}

export function sessionExpiresAtIso(startedAt: string): string | null {
  const t = Date.parse(startedAt);
  if (!Number.isFinite(t)) return null;
  return new Date(t + SESSION_MAX_AGE_MS).toISOString();
}
