import type { DeckMeta } from '@/types/deck-meta';

export function formatPlanLabel(plan: string): string {
  if (!plan) return '';
  const p = plan.toLowerCase();
  if (p === 'creator_pro') return 'Creator Pro';
  if (p === 'student_pro' || p === 'pro') return 'Student Pro';
  if (p === 'admin') return 'Admin';
  return 'Free';
}

export function sortByUpdated(a: DeckMeta, b: DeckMeta): number {
  const tb = Number.isFinite(Date.parse(b?.date ?? '')) ? Date.parse(b.date) : 0;
  const ta = Number.isFinite(Date.parse(a?.date ?? '')) ? Date.parse(a.date) : 0;
  return tb - ta;
}

export function sortByTitle(a: DeckMeta, b: DeckMeta): number {
  return (a.title ?? '').localeCompare(b.title ?? '', undefined, { sensitivity: 'base' });
}

/** Last 7 calendar days (oldest → newest), count of decks edited each day */
export function computeWeeklyActivity(decks: DeckMeta[]): number[] {
  const buckets = Array.from({ length: 7 }, () => 0);
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  for (const deck of decks) {
    const ts = Date.parse(deck?.date ?? '');
    if (!Number.isFinite(ts)) continue;
    const d = new Date(ts);
    d.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
    if (diffDays >= 0 && diffDays < 7) {
      buckets[6 - diffDays] += 1;
    }
  }
  return buckets;
}

export function sparklineHeights(values: number[], maxBar = 100): number[] {
  const max = Math.max(1, ...values);
  return values.map((v) => Math.max(8, Math.round((v / max) * maxBar)));
}

export type WeeklyGrowth = {
  current: number;
  previous: number;
  percent: number | null;
};

/** Decks edited in last 7d vs the 7d before that */
export function computeWeeklyGrowth(decks: DeckMeta[]): WeeklyGrowth {
  const now = Date.now();
  const ms7 = 7 * 86_400_000;
  let current = 0;
  let previous = 0;

  for (const deck of decks) {
    const ts = Date.parse(deck?.date ?? '');
    if (!Number.isFinite(ts)) continue;
    const age = now - ts;
    if (age <= ms7) current += 1;
    else if (age <= ms7 * 2) previous += 1;
  }

  let percent: number | null = null;
  if (previous > 0) {
    percent = Math.round(((current - previous) / previous) * 1000) / 10;
  } else if (current > 0) {
    percent = 100;
  }

  return { current, previous, percent };
}

export function totalSlides(decks: DeckMeta[]): number {
  return decks.reduce((sum, d) => sum + (d.slidesCount ?? 0), 0);
}
