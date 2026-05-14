/** Thrown when deck image offload fails after presigned PUT and same-origin fallback both fail. */
export class CloudImageUploadError extends Error {
  constructor(message?: string, options?: ErrorOptions) {
    super(message || 'Deck image upload failed', options);
    this.name = 'CloudImageUploadError';
  }
}

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

function isLikelyConnectivityFailure(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('network request failed') ||
    lower.includes('load failed')
  );
}

/**
 * Turn browser/network fetch failures into short UI copy (TopBar sync pill, etc.).
 */
export function humanizeFetchError(e: unknown): string {
  if (isAbortLikeError(e)) {
    return '';
  }
  if (e instanceof CloudImageUploadError) {
    return 'Could not upload deck images to cloud storage. If you are online, configure Cloudflare R2 CORS for PUT from this site, or try again in a moment.';
  }
  if (e instanceof Error) {
    const m = e.message || '';
    if (isLikelyConnectivityFailure(m)) {
      return 'Network error — check your connection and try again.';
    }
    return m;
  }
  if (typeof e === 'string' && e.trim()) return e;
  return 'Sync failed';
}

/** Message when export POST would still exceed limits because images could not be offloaded. */
export const EXPORT_OFFLOAD_BLOCKED_MESSAGE =
  'Export blocked: cloud storage is not configured or deck images could not be uploaded. Set NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL and R2 credentials, then try again.';
