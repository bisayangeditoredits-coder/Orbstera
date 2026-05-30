const fs = require('fs');
let c = fs.readFileSync('src/lib/export/export-image.ts', 'utf8');

const videoFunc = `
/**
 * Fetch video bytes for PPTX embedding (data URI).
 * Works for Pexels MP4 URLs and R2-hosted videos.
 */
export async function fetchVideoAsBase64ForExport(src: string): Promise<string | null> {
  if (!src?.trim()) return null;
  const url = src.trim();

  if (url.startsWith('data:video/')) return url;
  if (url.startsWith('blob:')) {
    console.warn('[pptx-export] Cannot export blob: URL, skipping', url.slice(0, 80));
    return null;
  }

  // Try R2 first
  const r2Key = extractR2KeyFromImageSrc(url);
  if (r2Key) {
    const got = await r2ObjectToBuffer(r2Key);
    if (got) {
      return \`data:\${got.mime};base64,\${got.buf.toString('base64')}\`;
    }
  }

  const fetchUrl = normalizeFetchUrl(url);
  if (fetchUrl.startsWith('/api/')) {
    console.warn('[pptx-export] Unresolved internal API URL reached fetch, skipping', fetchUrl);
    return null;
  }

  try {
    const res = await fetch(fetchUrl, {
      signal: AbortSignal.timeout(60_000), // videos are bigger
      headers: {
        'User-Agent': 'Orbstera/1.0 (+https://orbstera.vercel.app; pptx-export)',
        Accept: 'video/*,*/*;q=0.8',
      },
      redirect: 'follow',
    });
    if (!res.ok) {
      console.warn('[pptx-export] video fetch failed', res.status, fetchUrl.slice(0, 120));
      return null;
    }
    const buf = await res.arrayBuffer();
    // BUG-44 fix: 100MB limit for videos to prevent memory exhaustion
    if (buf.byteLength < 16 || buf.byteLength > 100_000_000) {
      console.warn('[pptx-export] Video size out of bounds (16B - 100MB)', fetchUrl.slice(0, 120));
      return null;
    }
    const mime = (res.headers.get('content-type') || 'video/mp4').split(';')[0].trim();
    return \`data:\${mime};base64,\${Buffer.from(buf).toString('base64')}\`;
  } catch (e) {
    console.warn('[pptx-export] video fetch error', fetchUrl.slice(0, 120), e);
    return null;
  }
}
`;

if (!c.includes('fetchVideoAsBase64ForExport')) {
  fs.writeFileSync('src/lib/export/export-image.ts', c + '\\n' + videoFunc);
}
console.log('Video function added');
