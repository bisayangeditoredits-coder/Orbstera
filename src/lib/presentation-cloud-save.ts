import type { PresentationData, Slide, SlideElement } from '@/types';
import { mapWithConcurrency } from '@/lib/async-pool';

/** Inline data URLs above this length are uploaded to R2 before the deck JSON is POSTed. */
const DATA_URL_OFFLOAD_MIN_CHARS = 2_000;

/** Parallel presign/upload cap (browser + API); override with NEXT_PUBLIC_CLOUD_SAVE_OFFLOAD_CONCURRENCY */
const DEFAULT_OFFLOAD_CONCURRENCY = 6;

function cloudSaveOffloadConcurrency(): number {
  const raw =
    typeof process !== 'undefined'
      ? process.env.NEXT_PUBLIC_CLOUD_SAVE_OFFLOAD_CONCURRENCY
      : undefined;
  const n = Number(raw);
  if (Number.isFinite(n) && n >= 1) return Math.min(12, Math.floor(n));
  return DEFAULT_OFFLOAD_CONCURRENCY;
}

/** Same-origin /api/presentations/upload-asset must stay under typical serverless body limits (e.g. Vercel ~4.5 MB). */
const SERVER_UPLOAD_MAX_BYTES = 4_000_000;

/** Above this size, POST the deck to R2 via presigned PUT then finalize (avoids Vercel request body limits). */
export const VERCEL_DIRECT_POST_MAX_BYTES = 2_800_000;

/** Fresh `ArrayBuffer` so `Blob` / `BodyInit` accept it under TS 5.x (avoids `Uint8Array<ArrayBufferLike>` vs `BlobPart`). */
function uint8ToArrayBuffer(src: Uint8Array): ArrayBuffer {
  const out = new ArrayBuffer(src.byteLength);
  new Uint8Array(out).set(src);
  return out;
}

function parseDataUrl(dataUrl: string): { mime: string; bytes: Uint8Array } | null {
  const match = /^data:([^;,]+)(;base64)?,(.*)$/s.exec(dataUrl);
  if (!match) return null;
  const mime = match[1].trim();
  const isB64 = Boolean(match[2]);
  const data = match[3];
  if (isB64) {
    try {
      const binary = atob(data);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return { mime, bytes };
    } catch {
      return null;
    }
  }
  try {
    const bytes = new TextEncoder().encode(decodeURIComponent(data));
    return { mime, bytes };
  } catch {
    return null;
  }
}

async function uploadDataUrlViaServer(
  payload: ArrayBuffer,
  mime: string,
  presentationId: string,
): Promise<string | null> {
  const fd = new FormData();
  fd.set('presentationId', presentationId);
  fd.set('mimeType', mime);
  fd.set('file', new Blob([payload], { type: mime }));
  const res = await fetch('/api/presentations/upload-asset', {
    method: 'POST',
    body: fd,
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const j = (await res.json().catch(() => ({}))) as { publicUrl?: string };
  return typeof j.publicUrl === 'string' ? j.publicUrl : null;
}

async function uploadDataUrlOnce(
  dataUrl: string,
  presentationId: string,
  dedupe: Map<string, string>,
): Promise<string | null> {
  const cached = dedupe.get(dataUrl);
  if (cached) return cached;

  const parsed = parseDataUrl(dataUrl);
  if (!parsed) return null;

  const payloadBuffer = uint8ToArrayBuffer(parsed.bytes);
  const { mime } = parsed;

  const tryPresignedPut = async (): Promise<string | null> => {
    try {
      const presignRes = await fetch('/api/presentations/presigned-asset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ presentationId, mimeType: mime }),
        cache: 'no-store',
      });

      if (presignRes.status === 401 || presignRes.status === 501) {
        return null;
      }

      if (!presignRes.ok) {
        return null;
      }

      const { putUrl, publicUrl } = (await presignRes.json()) as { putUrl?: string; publicUrl?: string };
      if (!putUrl || !publicUrl) return null;

      const put = await fetch(putUrl, {
        method: 'PUT',
        headers: { 'Content-Type': mime },
        body: payloadBuffer,
      });
      if (!put.ok) return null;
      dedupe.set(dataUrl, publicUrl);
      return publicUrl;
    } catch {
      return null;
    }
  };

  const tryServer = async (): Promise<string | null> => {
    if (payloadBuffer.byteLength > SERVER_UPLOAD_MAX_BYTES) return null;
    return uploadDataUrlViaServer(payloadBuffer, mime, presentationId);
  };

  // Prefer same-origin upload first under the serverless body cap — avoids browser→R2 CORS entirely.
  if (payloadBuffer.byteLength <= SERVER_UPLOAD_MAX_BYTES) {
    try {
      const url = await tryServer();
      if (url) {
        dedupe.set(dataUrl, url);
        return url;
      }
    } catch {
      /* fall through to presigned */
    }
    const presigned = await tryPresignedPut();
    if (presigned) return presigned;
    return null;
  }

  // Large payloads: direct R2 PUT only fits without hitting the app API body limit; then try server as last resort.
  const presignedLarge = await tryPresignedPut();
  if (presignedLarge) return presignedLarge;
  try {
    const url = await tryServer();
    if (url) {
      dedupe.set(dataUrl, url);
      return url;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function shouldOffloadDataUrl(s: string | undefined): s is string {
  return typeof s === 'string' && s.startsWith('data:') && s.length >= DATA_URL_OFFLOAD_MIN_CHARS;
}

type DataUrlOffloadJob = {
  dataUrl: string;
  apply: (publicUrl: string) => void;
};

/**
 * Clones the presentation and replaces large `data:` image payloads with R2 HTTPS URLs
 * so the JSON POST stays under platform body limits (fixes HTTP 413 on autosave).
 * Offloads unique data URLs concurrently to reduce serverless wall time.
 */
export async function preparePresentationForCloudSave(presentation: PresentationData): Promise<PresentationData> {
  const deckId = presentation.id || 'draft';
  const dedupe = new Map<string, string>();
  const clone = structuredClone(presentation) as PresentationData;
  const jobs: DataUrlOffloadJob[] = [];

  for (const slide of clone.slides || []) {
    if (shouldOffloadDataUrl(slide.imageUrl)) {
      const dataUrl = slide.imageUrl!;
      jobs.push({
        dataUrl,
        apply: (publicUrl) => {
          slide.imageUrl = publicUrl;
        },
      });
    }
    for (const el of slide.elements || []) {
      if (el.type === 'image' && shouldOffloadDataUrl(el.src)) {
        const dataUrl = el.src!;
        jobs.push({
          dataUrl,
          apply: (publicUrl) => {
            el.src = publicUrl;
          },
        });
      }
    }
  }

  if (jobs.length === 0) return clone;

  /** One upload per unique data URL; many elements can share the same inline image. */
  const byDataUrl = new Map<string, DataUrlOffloadJob[]>();
  for (const job of jobs) {
    const list = byDataUrl.get(job.dataUrl) ?? [];
    list.push(job);
    byDataUrl.set(job.dataUrl, list);
  }

  const uniqueUrls = Array.from(byDataUrl.keys());
  const concurrency = cloudSaveOffloadConcurrency();

  await mapWithConcurrency(uniqueUrls, concurrency, async (dataUrl) => {
    const url = await uploadDataUrlOnce(dataUrl, deckId, dedupe);
    if (!url) return;
    for (const job of byDataUrl.get(dataUrl) ?? []) {
      job.apply(url);
    }
  });

  return clone;
}

export function encodedBodyByteLength(body: BodyInit): number {
  if (typeof body === 'string') return new TextEncoder().encode(body).byteLength;
  if (body instanceof ArrayBuffer) return body.byteLength;
  if (ArrayBuffer.isView(body)) return body.byteLength;
  return VERCEL_DIRECT_POST_MAX_BYTES + 1;
}

async function postPresentationViaStaging(
  prepared: PresentationData,
  body: BodyInit,
  encodeHeaders: Record<string, string>,
): Promise<Response> {
  const gzip = encodeHeaders['Content-Encoding'] === 'gzip';
  const presentationId = prepared.id || 'draft';

  const pres = await fetch('/api/presentations/presign-deck-upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ presentationId, gzip }),
    cache: 'no-store',
  });

  if (!pres.ok) {
    const err = (await pres.json().catch(() => ({}))) as { error?: string };
    return new Response(JSON.stringify({ error: err.error || 'Presign failed' }), {
      status: pres.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { putUrl, stagingKey } = (await pres.json()) as { putUrl?: string; stagingKey?: string };
  if (!putUrl || !stagingKey) {
    return new Response(JSON.stringify({ error: 'Invalid presign response' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const putRes = await fetch(putUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': gzip ? 'application/gzip' : 'application/json',
    },
    body,
  });

  if (!putRes.ok) {
    return new Response(
      JSON.stringify({
        error:
          'Large deck upload failed (direct PUT to storage). Add Cloudflare R2 CORS allowing PUT from this site, same as for images.',
      }),
      { status: 502, headers: { 'Content-Type': 'application/json' } },
    );
  }

  return fetch('/api/presentations/complete-deck-upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stagingKey, gzip }),
    cache: 'no-store',
  });
}

/**
 * Same staging pipeline as cloud save, but final POST is /api/export/pptx with a small JSON body
 * so large gzipped deck JSON bypasses Vercel's ~4.5 MB request limit on the export route.
 */
export async function postPptxExportViaStaging(
  prepared: PresentationData,
  body: BodyInit,
  encodeHeaders: Record<string, string>,
): Promise<Response> {
  const gzip = encodeHeaders['Content-Encoding'] === 'gzip';
  const presentationId = prepared.id || 'draft';

  const pres = await fetch('/api/presentations/presign-deck-upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ presentationId, gzip }),
    cache: 'no-store',
  });

  if (!pres.ok) {
    const err = (await pres.json().catch(() => ({}))) as { error?: string };
    return new Response(JSON.stringify({ error: err.error || 'Export presign failed' }), {
      status: pres.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { putUrl, stagingKey } = (await pres.json()) as { putUrl?: string; stagingKey?: string };
  if (!putUrl || !stagingKey) {
    return new Response(JSON.stringify({ error: 'Invalid presign response' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const putRes = await fetch(putUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': gzip ? 'application/gzip' : 'application/json',
    },
    body,
  });

  if (!putRes.ok) {
    return new Response(
      JSON.stringify({
        error:
          'Export upload failed (direct PUT to storage). Add Cloudflare R2 CORS allowing PUT from this site, same as for images.',
      }),
      { status: 502, headers: { 'Content-Type': 'application/json' } },
    );
  }

  return fetch('/api/export/pptx', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stagingKey, gzip }),
    cache: 'no-store',
  });
}

/** Async gzip branch — unified API */
export async function encodePresentationPostBody(json: string): Promise<{ body: BodyInit; headers: Record<string, string> }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const bytes = new TextEncoder().encode(json);
  if (typeof CompressionStream === 'undefined' || bytes.byteLength < 48_000) {
    return { body: json, headers };
  }
  const stream = new Blob([uint8ToArrayBuffer(bytes)]).stream().pipeThrough(new CompressionStream('gzip'));
  const buf = await new Response(stream).arrayBuffer();
  headers['Content-Encoding'] = 'gzip';
  return { body: buf, headers };
}

/**
 * Full cloud persist: offload heavy data URLs, gzip large JSON, POST to /api/presentations.
 * Returns the prepared payload so callers can merge `slides` (R2 URLs) into local state after success.
 */
export async function postPresentationCloudSave(presentation: PresentationData): Promise<{
  response: Response;
  prepared: PresentationData;
}> {
  const prepared = await preparePresentationForCloudSave(presentation);
  const json = JSON.stringify(prepared);
  const { body, headers } = await encodePresentationPostBody(json);
  const payloadBytes = encodedBodyByteLength(body);

  const response =
    payloadBytes > VERCEL_DIRECT_POST_MAX_BYTES
      ? await postPresentationViaStaging(prepared, body, headers)
      : await fetch('/api/presentations', {
          method: 'POST',
          headers,
          body,
          cache: 'no-store',
        });
  return { response, prepared };
}

/** Browser keepalive/beacon limit — stay under typical 64KB caps. */
export const CLOUD_SAVE_KEEPALIVE_MAX_BYTES = 60_000;

/**
 * Best-effort save on tab hide/close using `fetch(..., { keepalive: true })`.
 * Skips oversized payloads (debounced autosave handles those).
 */
export async function flushPresentationCloudSaveKeepalive(
  presentation: PresentationData,
): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (!presentation?.id || presentation.title === 'Generating...' || !presentation.slides?.length) {
    return false;
  }

  try {
    const prepared = await preparePresentationForCloudSave(presentation);
    const json = JSON.stringify(prepared);
    const { body, headers } = await encodePresentationPostBody(json);
    const bytes = encodedBodyByteLength(body);
    if (bytes > CLOUD_SAVE_KEEPALIVE_MAX_BYTES) return false;

    const res = await fetch('/api/presentations', {
      method: 'POST',
      headers,
      body,
      cache: 'no-store',
      credentials: 'include',
      keepalive: true,
    });
    return res.ok || res.status === 409;
  } catch {
    return false;
  }
}
