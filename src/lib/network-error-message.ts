/**
 * Aborted fetches (navigation, duplicate in-flight work, React strict remounts) are not
 * connectivity failures — callers should not show a scary "network error" for these.
 */
export function isAbortLikeError(e: unknown): boolean {
  if (e == null) return false;
  const name =
    typeof e === 'object' && e !== null && 'name' in e
      ? String((e as { name?: unknown }).name || '')
      : '';
  if (name === 'AbortError') return true;

  const msg =
    e instanceof Error
      ? e.message
      : typeof e === 'string'
        ? e
        : '';
  const lower = msg.toLowerCase();
  if (lower.includes('aborterror')) return true;
  if (lower.includes('the user aborted')) return true;
  if (lower.includes('signal is aborted')) return true;
  if (lower.includes('operation was aborted')) return true;
  if (lower.includes('fetch is aborted') || lower.includes('fetch was aborted')) return true;
  return false;
}

/**
 * Turn browser/network fetch failures into short UI copy (TopBar sync pill, etc.).
 */
export function humanizeFetchError(e: unknown): string {
  if (isAbortLikeError(e)) {
    return '';
  }
  if (e instanceof Error) {
    const m = e.message || '';
    const lower = m.toLowerCase();
    if (
      lower.includes('failed to fetch') ||
      lower.includes('networkerror') ||
      lower.includes('network request failed') ||
      lower.includes('load failed')
    ) {
      return 'Network error — check your connection and try again.';
    }
    return m;
  }
  if (typeof e === 'string' && e.trim()) return e;
  return 'Sync failed';
}
