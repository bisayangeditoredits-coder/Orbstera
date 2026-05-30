/** Shared slide/card count options (homepage, planner, visuals step). */

export type SlideCountTier = 'free' | 'plus' | 'pro';

export type SlideCountOption = {
  count: number;
  tier: SlideCountTier;
};

export const SLIDE_COUNT_OPTIONS: SlideCountOption[] = [
  { count: 1, tier: 'free' },
  { count: 2, tier: 'free' },
  { count: 3, tier: 'free' },
  { count: 4, tier: 'free' },
  { count: 5, tier: 'free' },
  { count: 6, tier: 'free' },
  { count: 7, tier: 'free' },
  { count: 8, tier: 'free' },
  { count: 9, tier: 'free' },
  { count: 10, tier: 'free' },
  { count: 15, tier: 'plus' },
  { count: 20, tier: 'plus' },
  { count: 25, tier: 'pro' },
  { count: 30, tier: 'pro' },
  { count: 40, tier: 'pro' },
];

export const DEFAULT_SLIDE_COUNT = 10;

export const SLIDE_COUNT_VALUES = SLIDE_COUNT_OPTIONS.map((o) => o.count);

export function isValidSlideCount(n: number): boolean {
  return SLIDE_COUNT_VALUES.includes(n);
}

export function parseSlideCountParam(raw: string | null | undefined): number {
  if (!raw) return DEFAULT_SLIDE_COUNT;
  const n = parseInt(String(raw), 10);
  if (Number.isNaN(n) || !isValidSlideCount(n)) return DEFAULT_SLIDE_COUNT;
  return n;
}

export function nearestValidSlideCount(n: number): number {
  if (isValidSlideCount(n)) return n;
  let best = DEFAULT_SLIDE_COUNT;
  let bestDist = Infinity;
  for (const v of SLIDE_COUNT_VALUES) {
    const d = Math.abs(v - n);
    if (d < bestDist) {
      bestDist = d;
      best = v;
    }
  }
  return best;
}
