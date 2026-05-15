'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { readClientCache, writeClientCache, removeClientCache } from '@/lib/client-cache';
import { CLIENT_CACHE_MAX_AGE_MS } from '@/lib/auth/session-policy';

export type CreditEstimates = {
  deck_small:        number;
  deck_medium:       number;
  deck_large:        number;
  deck_small_images: number;
  deck_large_images: number;
  magic_edit:        number;
  rewrite:           number;
  image_standard:    number;
  image_premium:     number;
  animation_enhance: number;
};

export type CanAfford = {
  deck_small:  boolean;
  deck_medium: boolean;
  deck_large:  boolean;
  magic_edit:  boolean;
  image:       boolean;
};

export type CreditState = {
  loading:      boolean;
  error:        string | null;
  plan:         string;
  monthKey:     string;
  monthlyLimit: number;
  used:         number;
  remaining:    number;
  resetAt:      string | null;
  usagePct:     number;
  estimates:    CreditEstimates;
  canAfford:    CanAfford;
};

const CACHE_KEY = 'orbstera_credits_cache';

const DEFAULT_ESTIMATES: CreditEstimates = {
  deck_small:        40,
  deck_medium:       80,
  deck_large:        150,
  deck_small_images: 80,
  deck_large_images: 200,
  magic_edit:        5,
  rewrite:           3,
  image_standard:    10,
  image_premium:     20,
  animation_enhance: 5,
};

const DEFAULT_STATE: CreditState = {
  loading:      true,
  error:        null,
  plan:         'free',
  monthKey:     '',
  monthlyLimit: 100,
  used:         0,
  remaining:    100,
  resetAt:      null,
  usagePct:     0,
  estimates:    DEFAULT_ESTIMATES,
  canAfford: {
    deck_small:  true,
    deck_medium: false,
    deck_large:  false,
    magic_edit:  true,
    image:       true,
  },
};

let _cache: CreditState | null = null;
let _cacheUserId: string | null = null;
let _cacheTs = 0;
let _inflight: Promise<CreditState> | null = null;
const MEMORY_TTL_MS = 15_000;

async function fetchCredits(): Promise<CreditState> {
  const now = Date.now();
  if (_cache && _cacheUserId && now - _cacheTs < MEMORY_TTL_MS) return _cache;
  if (_inflight) return _inflight;

  _inflight = (async () => {
    try {
      const res = await fetch('/api/credits/summary', {
        cache: 'no-store',
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'api_error');

      const userId = typeof json.userId === 'string' ? json.userId : null;

      const state: CreditState = {
        loading:      false,
        error:        null,
        plan:         json.summary?.plan         ?? 'free',
        monthKey:     json.summary?.monthKey     ?? '',
        monthlyLimit: json.summary?.monthlyLimit ?? 100,
        used:         json.summary?.used         ?? 0,
        remaining:    json.summary?.remaining    ?? 0,
        resetAt:      json.summary?.resetAt      ?? null,
        usagePct:     json.summary?.usagePct     ?? 0,
        estimates:    json.estimates             ?? DEFAULT_ESTIMATES,
        canAfford:    json.canAfford             ?? DEFAULT_STATE.canAfford,
      };

      _cache = state;
      _cacheUserId = userId;
      _cacheTs = Date.now();

      if (userId) {
        writeClientCache(CACHE_KEY, userId, state);
      }

      return state;
    } catch (e) {
      return { ...DEFAULT_STATE, loading: false, error: e instanceof Error ? e.message : 'fetch_error' };
    } finally {
      _inflight = null;
    }
  })();

  return _inflight;
}

export function invalidateCreditCache(userId?: string | null) {
  _cache = null;
  _cacheUserId = null;
  _cacheTs = 0;
  if (userId) removeClientCache(CACHE_KEY, userId);
}

function readInitialState(): CreditState {
  if (_cache) return _cache;

  if (typeof window !== 'undefined') {
    try {
      const legacy = localStorage.getItem(CACHE_KEY);
      if (legacy) {
        const { state: s, ts } = JSON.parse(legacy);
        if (Date.now() - ts < CLIENT_CACHE_MAX_AGE_MS) {
          const cached: CreditState = { ...s, loading: false };
          _cache = cached;
          _cacheTs = ts;
          localStorage.removeItem(CACHE_KEY);
          return cached;
        }
        localStorage.removeItem(CACHE_KEY);
      }
    } catch {
      /* ignore legacy */
    }

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(`${CACHE_KEY}:`)) continue;
      try {
        const userId = key.slice(CACHE_KEY.length + 1);
        const cached = readClientCache<CreditState>(CACHE_KEY, userId, CLIENT_CACHE_MAX_AGE_MS);
        if (cached) {
          _cache = cached;
          _cacheUserId = userId;
          _cacheTs = Date.now();
          return cached;
        }
      } catch {
        /* try next */
      }
    }
  }

  return DEFAULT_STATE;
}

/**
 * Credits with memory + localStorage cache (max 3 days, per-user keys).
 */
export function useCredits(refreshInterval = 60_000): CreditState & { refresh: () => void } {
  const [state, setState] = useState<CreditState>(readInitialState);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    invalidateCreditCache(_cacheUserId);
    const next = await fetchCredits();
    setState(next);
  }, []);

  useEffect(() => {
    fetchCredits().then(setState);

    if (refreshInterval > 0) {
      timerRef.current = setInterval(() => {
        invalidateCreditCache(_cacheUserId);
        fetchCredits().then(setState);
      }, refreshInterval);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [refreshInterval]);

  return { ...state, refresh };
}
