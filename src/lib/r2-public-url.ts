/** Strip query and fragment so stored URLs still match the R2 public object path. */
function stripUrlQueryAndHash(url: string): string {
  const hashIdx = url.indexOf('#');
  let s = hashIdx === -1 ? url : url.slice(0, hashIdx);
  const qIdx = s.indexOf('?');
  if (qIdx !== -1) s = s.slice(0, qIdx);
  return s.trimEnd();
}

/**
 * All configured public bases (no trailing slash). Supports comma-separated
 * `NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL` and optional `NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URLS`
 * so old decks on a legacy host still resolve to keys for export / read-asset.
 */
export function getR2PublicBasesTrimmed(): string[] {
  const primary = process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL?.trim();
  const extra = process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URLS?.trim();
  const parts: string[] = [];
  if (primary) parts.push(...primary.split(','));
  if (extra) parts.push(...extra.split(','));
  const normalized = parts
    .map((p) => p.trim().replace(/\/$/, ''))
    .filter(Boolean);
  return [...new Set(normalized)];
}

/** First configured base; use for new uploads and legacy call sites. */
export function getR2PublicBaseTrimmed(): string | undefined {
  const bases = getR2PublicBasesTrimmed();
  return bases[0];
}

/** If `url` is under a configured public R2 base, returns the object key; otherwise undefined. */
export function tryExtractR2ObjectKeyFromPublicUrl(url: string): string | undefined {
  const pathOnly = stripUrlQueryAndHash(url.trim());
  for (const base of getR2PublicBasesTrimmed()) {
    if (!pathOnly.startsWith(base)) continue;
    let key = pathOnly.slice(base.length);
    if (key.startsWith('/')) key = key.slice(1);
    if (key) return key;
  }
  return undefined;
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
