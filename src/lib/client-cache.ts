import { CLIENT_CACHE_MAX_AGE_MS } from '@/lib/auth/session-policy';

type CacheEnvelope<T> = {
  v: 1;
  userId: string | null;
  ts: number;
  data: T;
};

function storageKey(base: string, userId: string | null): string {
  return userId ? `${base}:${userId}` : base;
}

export function readClientCache<T>(
  baseKey: string,
  userId: string | null,
  maxAgeMs = CLIENT_CACHE_MAX_AGE_MS,
): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(storageKey(baseKey, userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEnvelope<T>;
    if (parsed.v !== 1) return null;
    if (parsed.userId !== userId) return null;
    if (Date.now() - parsed.ts > maxAgeMs) {
      localStorage.removeItem(storageKey(baseKey, userId));
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}

export function writeClientCache<T>(
  baseKey: string,
  userId: string | null,
  data: T,
): void {
  if (typeof window === 'undefined') return;
  try {
    const envelope: CacheEnvelope<T> = {
      v: 1,
      userId,
      ts: Date.now(),
      data,
    };
    localStorage.setItem(storageKey(baseKey, userId), JSON.stringify(envelope));
  } catch {
    /* quota / private mode */
  }
}

export function removeClientCache(baseKey: string, userId: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(storageKey(baseKey, userId));
  } catch {
    /* ignore */
  }
}

const CACHE_PREFIXES = [
  'orbstera_credits_cache',
  'orbstera_presentations_cache',
  'orbstera_profile_cache',
] as const;

/** Clear user-scoped caches on logout or session expiry. */
export function clearAllUserClientCaches(userId?: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (CACHE_PREFIXES.some((p) => key === p || key.startsWith(`${p}:`))) {
        keysToRemove.push(key);
      }
      if (userId && key.includes(userId)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
    // Legacy key without user suffix
    localStorage.removeItem('orbstera_credits_cache');
  } catch {
    /* ignore */
  }
}
