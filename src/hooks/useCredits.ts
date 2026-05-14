'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

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

const LS_KEY = 'orbstera_credits_cache';

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

// Cache in module scope
let _cache: CreditState | null = null;
let _cacheTs = 0;
let _inflight: Promise<CreditState> | null = null;
const CACHE_TTL_MS = 15_000; // 15s internal TTL

async function fetchCredits(): Promise<CreditState> {
  const now = Date.now();
  if (_cache && now - _cacheTs < CACHE_TTL_MS) return _cache;
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
      
      _cache  = state;
      _cacheTs = Date.now();
      
      // Persist to localStorage for instant subsequent loads
      if (typeof window !== 'undefined') {
        localStorage.setItem(LS_KEY, JSON.stringify({ state, ts: _cacheTs }));
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

export function invalidateCreditCache() {
  _cache   = null;
  _cacheTs = 0;
}

/**
 * useCredits — high-performance hook with localStorage caching and background revalidation.
 */
export function useCredits(refreshInterval = 60_000): CreditState & { refresh: () => void } {
  // Try to initialize from memory cache or localStorage for instant UI
  const [state, setState] = useState<CreditState>(() => {
    if (_cache) return _cache;
    
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) {
        try {
          const { state: s, ts } = JSON.parse(saved);
          // Only use if less than 24h old to avoid stale info
          if (Date.now() - ts < 86_400_000) {
            const cached: CreditState = { ...s, loading: false };
            _cache = cached;
            _cacheTs = ts;
            return cached;
          }
        } catch (_) {}
      }
    }
    return DEFAULT_STATE;
  });

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    invalidateCreditCache();
    const next = await fetchCredits();
    setState(next);
  }, []);

  useEffect(() => {
    // Background revalidation
    fetchCredits().then(setState);

    if (refreshInterval > 0) {
      timerRef.current = setInterval(() => {
        invalidateCreditCache();
        fetchCredits().then(setState);
      }, refreshInterval);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [refreshInterval]);

  return { ...state, refresh };
}
