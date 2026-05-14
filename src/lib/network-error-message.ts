/**
 * Turn browser/network fetch failures into short UI copy (TopBar sync pill, etc.).
 */
export function humanizeFetchError(e: unknown): string {
  if (e instanceof Error) {
    const m = e.message || '';
    const lower = m.toLowerCase();
    if (
      lower.includes('failed to fetch') ||
      lower.includes('networkerror') ||
      lower.includes('network request failed') ||
      lower.includes('load failed') ||
      lower.includes('fetch is aborted')
    ) {
      return 'Network error — check your connection and try again.';
    }
    return m;
  }
  if (typeof e === 'string' && e.trim()) return e;
  return 'Sync failed';
}
