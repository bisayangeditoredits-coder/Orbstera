import type { PresentationData, Slide, SlideElement } from '@/types';
import { CloudImageUploadError } from '@/lib/network-error-message';

/** Inline data URLs above this length are uploaded to R2 before the deck JSON is POSTed. */
const DATA_URL_OFFLOAD_MIN_CHARS = 6_000;

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
  parsed: { mime: string; bytes: Uint8Array },
  presentationId: string,
): Promise<string | null> {
  const fd = new FormData();
  fd.set('presentationId', presentationId);
  fd.set('mimeType', parsed.mime);
  fd.set('file', new Blob([parsed.bytes], { type: parsed.mime }));
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

  let networkThrow: unknown;

  try {
    const presignRes = await fetch('/api/presentations/presigned-asset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ presentationId, mimeType: parsed.mime }),
      cache: 'no-store',
    });

    if (presignRes.status === 401 || presignRes.status === 501) {
      return null;
    }

    if (presignRes.ok) {
      const { putUrl, publicUrl } = (await presignRes.json()) as { putUrl?: string; publicUrl?: string };
      if (putUrl && publicUrl) {
        try {
          const put = await fetch(putUrl, {
            method: 'PUT',
            headers: { 'Content-Type': parsed.mime },
            body: parsed.bytes as unknown as BodyInit,
          });
          if (put.ok) {
            dedupe.set(dataUrl, publicUrl);
            return publicUrl;
          }
        } catch (e) {
          networkThrow = networkThrow ?? e;
        }
      }
    }
  } catch (e) {
    networkThrow = networkThrow ?? e;
  }

  try {
    const viaServer = await uploadDataUrlViaServer(parsed, presentationId);
    if (viaServer) {
      dedupe.set(dataUrl, viaServer);
      return viaServer;
    }
  } catch (e) {
    networkThrow = networkThrow ?? e;
  }

  if (networkThrow) {
    throw new CloudImageUploadError(undefined, { cause: networkThrow });
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
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'));
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
