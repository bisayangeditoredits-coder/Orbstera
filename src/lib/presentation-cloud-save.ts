import type { PresentationData, Slide, SlideElement } from '@/types';

/** Inline data URLs above this length are uploaded to R2 before the deck JSON is POSTed. */
const DATA_URL_OFFLOAD_MIN_CHARS = 6_000;

/** Same-origin /api/presentations/upload-asset must stay under typical serverless body limits (e.g. Vercel ~4.5 MB). */
const SERVER_UPLOAD_MAX_BYTES = 4_000_000;

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

/**
 * Clones the presentation and replaces large `data:` image payloads with R2 HTTPS URLs
 * so the JSON POST stays under platform body limits (fixes HTTP 413 on autosave).
 */
export async function preparePresentationForCloudSave(presentation: PresentationData): Promise<PresentationData> {
  const deckId = presentation.id || 'draft';
  const dedupe = new Map<string, string>();
  const clone = structuredClone(presentation) as PresentationData;

  const processElement = async (el: SlideElement) => {
    if (el.type !== 'image' || !shouldOffloadDataUrl(el.src)) return;
    const url = await uploadDataUrlOnce(el.src!, deckId, dedupe);
    if (url) el.src = url;
  };

  const processSlide = async (slide: Slide) => {
    if (shouldOffloadDataUrl(slide.imageUrl)) {
      const url = await uploadDataUrlOnce(slide.imageUrl!, deckId, dedupe);
      if (url) slide.imageUrl = url;
    }
    const els = slide.elements;
    if (els?.length) {
      for (const el of els) await processElement(el);
    }
  };

  for (const slide of clone.slides || []) await processSlide(slide);
  return clone;
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
  const response = await fetch('/api/presentations', {
    method: 'POST',
    headers,
    body,
    cache: 'no-store',
  });
  return { response, prepared };
}
