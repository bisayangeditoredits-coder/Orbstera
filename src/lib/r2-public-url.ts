/** Normalized public R2 base (no trailing slash), or undefined if unset. */
export function getR2PublicBaseTrimmed(): string | undefined {
  const b = process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL?.trim();
  if (!b) return undefined;
  return b.replace(/\/$/, '');
}

/** If `url` is under the configured public R2 base, returns the object key; otherwise undefined. */
export function tryExtractR2ObjectKeyFromPublicUrl(url: string): string | undefined {
  const trimmed = url.trim();
  const base = getR2PublicBaseTrimmed();
  if (!base || !trimmed.startsWith(base)) return undefined;
  let key = trimmed.slice(base.length);
  if (key.startsWith('/')) key = key.slice(1);
  return key || undefined;
}

/**
 * Editor: load R2-backed images through the authenticated app origin so private buckets
 * and missing public GET still work. Stored JSON keeps the original HTTPS URL.
 */
export function editorImageFetchUrl(rawUrl: string | undefined | null): string {
  const trimmed = (rawUrl || '').trim();
  if (!trimmed) return '';
  const key = tryExtractR2ObjectKeyFromPublicUrl(trimmed);
  if (!key) return trimmed;
  return `/api/presentations/read-asset?key=${encodeURIComponent(key)}`;
}
