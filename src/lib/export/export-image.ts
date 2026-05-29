import { GetObjectCommand } from '@aws-sdk/client-s3';
import { tryExtractR2ObjectKeyFromPublicUrl } from '@/lib/r2-public-url';
import { getR2BucketName, getR2Client } from '@/lib/server/r2-client';

const FETCH_HEADERS: HeadersInit = {
  'User-Agent': 'Orbstera/1.0 (+https://orbstera.vercel.app; pptx-export)',
  Accept: 'image/*,*/*;q=0.8',
};

async function r2ObjectToBuffer(key: string): Promise<{ buf: Buffer; mime: string } | null> {
  const client = getR2Client();
  const bucket = getR2BucketName();
  if (!client || !bucket) return null;
  try {
    const obj = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    const chunks: Buffer[] = [];
    for await (const chunk of obj.Body as AsyncIterable<Uint8Array | Buffer>) {
      chunks.push(Buffer.from(chunk));
    }
    const buf = Buffer.concat(chunks);
    const mime = obj.ContentType || 'image/jpeg';
    return { buf, mime };
  } catch {
    return null;
  }
}

/** Resolve R2 object key from stored src (public URL or /api/presentations/read-asset?key=). */
export function extractR2KeyFromImageSrc(src: string): string | undefined {
  const trimmed = src.trim();
  if (!trimmed) return undefined;

  if (trimmed.includes('read-asset')) {
    try {
      const u = trimmed.startsWith('http')
        ? new URL(trimmed)
        : new URL(trimmed, 'https://orbstera.local');
      const key = u.searchParams.get('key');
      if (key) {
        const decoded = decodeURIComponent(key);
        // BUG-39 fix: check for '..' AFTER decoding
        if (!decoded.includes('..')) return decoded;
      }
    } catch {
      const m = /[?&]key=([^&]+)/.exec(trimmed);
      if (m?.[1]) {
        try {
          const decoded = decodeURIComponent(m[1]);
          if (!decoded.includes('..')) return decoded;
        } catch {
          return undefined;
        }
      }
    }
  }

  const fromPublic = tryExtractR2ObjectKeyFromPublicUrl(trimmed);
  if (fromPublic) return fromPublic;

  const pathMatch = trimmed.match(/presentations\/[0-9a-f-]{8,}[^?#]*/i);
  if (pathMatch?.[0] && !pathMatch[0].includes('..')) {
    return pathMatch[0];
  }

  return undefined;
}

function normalizeFetchUrl(src: string): string {
  const t = src.trim();
  if (t.startsWith('//')) return `https:${t}`;
  if (t.startsWith('/') && !t.startsWith('//')) {
    const base =
      process.env.NEXT_PUBLIC_APP_URL?.trim() ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '');
    if (base) return new URL(t, base.replace(/\/$/, '')).href;
  }
  return t;
}

/**
 * Fetch image bytes for PPTX embedding (data URI).
 * Handles data:, R2 (private bucket), read-asset keys, and remote HTTPS (Wikipedia, etc.).
 */
export async function fetchImageAsBase64ForExport(src: string): Promise<string | null> {
  if (!src?.trim()) return null;
  const url = src.trim();

  if (url.startsWith('data:')) return url;
  if (url.startsWith('blob:')) {
    console.warn('[pptx-export] Cannot export blob: URL, skipping', url.slice(0, 80));
    return null;
  }

  const r2Key = extractR2KeyFromImageSrc(url);
  if (r2Key) {
    const got = await r2ObjectToBuffer(r2Key);
    if (got) {
      return `data:${got.mime};base64,${got.buf.toString('base64')}`;
    }
  }

  const fetchUrl = normalizeFetchUrl(url);
  if (fetchUrl.startsWith('/api/')) {
    console.warn('[pptx-export] Unresolved internal API URL reached fetch, skipping', fetchUrl);
    return null;
  }

  try {
    const res = await fetch(fetchUrl, {
      signal: AbortSignal.timeout(25_000),
      headers: FETCH_HEADERS,
      redirect: 'follow',
    });
    if (!res.ok) {
      console.warn('[pptx-export] image fetch failed', res.status, fetchUrl.slice(0, 120));
      return null;
    }
    const buf = await res.arrayBuffer();
    // BUG-43 fix: 20MB limit for images to prevent memory exhaustion
    if (buf.byteLength < 16 || buf.byteLength > 20_000_000) {
      console.warn('[pptx-export] Image size out of bounds (16B - 20MB)', fetchUrl.slice(0, 120));
      return null;
    }
    const mime = (res.headers.get('content-type') || 'image/jpeg').split(';')[0].trim();
    if (!mime.startsWith('image/')) {
      console.warn('[pptx-export] non-image content-type', mime, fetchUrl.slice(0, 120));
      return null;
    }
    return `data:${mime};base64,${Buffer.from(buf).toString('base64')}`;
  } catch (e) {
    console.warn('[pptx-export] image fetch error', fetchUrl.slice(0, 120), e);
    return null;
  }
}

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
      return `data:${got.mime};base64,${got.buf.toString('base64')}`;
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
    return `data:${mime};base64,${Buffer.from(buf).toString('base64')}`;
  } catch (e) {
    console.warn('[pptx-export] video fetch error', fetchUrl.slice(0, 120), e);
    return null;
  }
}
