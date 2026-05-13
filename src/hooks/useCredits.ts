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

// Cache in module scope so all hook instances share the same fetch
let _cache: CreditState | null = null;
let _cacheTs = 0;
let _inflight: Promise<CreditState> | null = null;
const CACHE_TTL_MS = 30_000; // 30s

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
 * useCredits — lightweight hook for real-time credit state.
 * Fetches once per mount and refreshes every `refreshInterval` ms.
 *
 * @param refreshInterval How often to re-fetch in ms. Default 60 000 (1 min).
 */
export function useCredits(refreshInterval = 60_000): CreditState & { refresh: () => void } {
  const [state, setState] = useState<CreditState>(DEFAULT_STATE);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    invalidateCreditCache(); // force fresh fetch on manual refresh
    const next = await fetchCredits();
    setState(next);
  }, []);

  const refresh = useCallback(() => {
    invalidateCreditCache();
    fetchCredits().then(setState);
  }, []);

  useEffect(() => {
    // Initial load (use cache if fresh)
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
