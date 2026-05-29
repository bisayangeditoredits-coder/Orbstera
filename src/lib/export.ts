import { PresentationData } from '@/types';
import {
  preparePresentationForCloudSave,
  encodePresentationPostBody,
  postPptxExportViaStaging,
  encodedBodyByteLength,
  VERCEL_DIRECT_POST_MAX_BYTES,
} from '@/lib/presentation-cloud-save';
import { EXPORT_OFFLOAD_BLOCKED_MESSAGE } from '@/lib/network-error-message';

/** Stay under typical serverless request body limits after gzip (Vercel ~4.5 MB). */
const EXPORT_JSON_BYTE_WARN = 3_800_000;

function isPptxZipSignature(buf: ArrayBuffer): boolean {
  if (buf.byteLength < 4) return false;
  const u = new Uint8Array(buf);
  return u[0] === 0x50 && u[1] === 0x4b;
}

async function readExportFailureMessage(res: Response): Promise<string> {
  const ct = (res.headers.get('content-type') || '').toLowerCase();
  const status = res.status;
  if (ct.includes('application/json')) {
    const j = (await res.json().catch(() => ({}))) as {
      error?: string;
      detail?: string;
      message?: string;
    };
    const msg = typeof j.message === 'string' ? j.message.trim() : '';
    if (msg) return msg;
    const err = typeof j.error === 'string' ? j.error.trim() : '';
    const detail = typeof j.detail === 'string' ? j.detail.trim() : '';
    if (detail && (!err || err === 'Export failed')) return detail.slice(0, 900);
    if (err && detail && err !== detail) return `${err}: ${detail.slice(0, 600)}`;
    if (err) return err;
    if (detail) return detail.slice(0, 900);
  } else {
    const text = await res.text().catch(() => '');
    if (text.trimStart().startsWith('{')) {
      try {
        const j = JSON.parse(text) as { error?: string; message?: string; detail?: string };
        if (typeof j.message === 'string' && j.message.trim()) return j.message.trim();
        const d = typeof j.detail === 'string' ? j.detail.trim() : '';
        const er = typeof j.error === 'string' ? j.error.trim() : '';
        if (d && (!er || er === 'Export failed')) return d.slice(0, 900);
        if (er) return er;
      } catch {
        /* ignore */
      }
    }
    if (status === 413) {
      return 'The export payload is too large for a direct upload. Try again—large decks use cloud staging automatically.';
    }
    if (text.trim()) return text.trim().slice(0, 500);
  }
  if (status === 401) return 'Sign in required to export.';
  if (status === 429) return 'Too many export requests. Try again shortly.';
  return `Export failed (HTTP ${status}).`;
}

/**
 * Export a presentation to PPTX.
 *
 * Strategy: send the raw presentation data (elements with coordinates, text,
 * images, shapes) to the server. The server uses pptxgenjs to build a fully
 * editable PPTX file with real text boxes, embedded images, and shapes —
 * NOT screenshots. This makes every element selectable and editable in
 * PowerPoint, Keynote, and LibreOffice.
 *
 * Large inline images are uploaded to R2 first (same path as cloud save) so the JSON POST stays small.
 * When the encoded POST body still exceeds the Vercel limit, the deck is staged to R2 (same as large saves)
 * and the export route loads it from a small JSON reference.
 */
/**
 * Converts all blob: URLs in a presentation clone to base64 data: URLs so they
 * survive the export pipeline (blob URLs are browser-session-only and cannot be
 * sent to the server).  Failures for individual images are silently ignored —
 * the element will simply be left without an image rather than blocking the
 * whole export.
 */
async function resolveBlobUrls(presentation: PresentationData): Promise<PresentationData> {
  const hasBlobUrls = (presentation.slides || []).some(
    (s) =>
      (s.imageUrl || '').startsWith('blob:') ||
      (s.elements || []).some((el) => el.type === 'image' && (el.src || '').startsWith('blob:')),
  );
  if (!hasBlobUrls) return presentation;

  const clone = structuredClone(presentation) as PresentationData;

  async function blobToDataUrl(blobUrl: string): Promise<string | null> {
    try {
      const res = await fetch(blobUrl);
      if (!res.ok) return null;
      const blob = await res.blob();
      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  }

  for (const slide of clone.slides || []) {
    if ((slide.imageUrl || '').startsWith('blob:')) {
      const dataUrl = await blobToDataUrl(slide.imageUrl!);
      if (dataUrl) slide.imageUrl = dataUrl;
    }
    for (const el of slide.elements || []) {
      if (el.type === 'image' && (el.src || '').startsWith('blob:')) {
        const dataUrl = await blobToDataUrl(el.src!);
        if (dataUrl) el.src = dataUrl;
        else el.src = ''; // clear unresolvable blob URL so it doesn't get sent as-is
      }
    }
  }

  return clone;
}

export async function exportToPptx(presentation: PresentationData): Promise<void> {
  // Resolve any blob: URLs to base64 data URLs before cloud-save preparation,
  // since blob URLs are session-only and cannot be sent to the server.
  const withResolvedBlobs = await resolveBlobUrls(presentation);
  const prepared = await preparePresentationForCloudSave(withResolvedBlobs);

  const pendingImages = (prepared.slides || []).some((s) =>
    (s.elements || []).some((el) => el.type === 'image' && el.aiImagePending && !el.src?.trim()),
  );
  if (pendingImages) {
    throw new Error(
      'Some images are still generating. Wait for them to finish on the canvas, then export again.',
    );
  }
  const json = JSON.stringify(prepared);
  const byteLength = new TextEncoder().encode(json).byteLength;

  if (byteLength > EXPORT_JSON_BYTE_WARN && json.includes('data:image')) {
    throw new Error(EXPORT_OFFLOAD_BLOCKED_MESSAGE);
  }

  const { body, headers } = await encodePresentationPostBody(json);
  const payloadBytes = encodedBodyByteLength(body);

  const response =
    payloadBytes > VERCEL_DIRECT_POST_MAX_BYTES
      ? await postPptxExportViaStaging(prepared, body, headers)
      : await fetch('/api/export/pptx', {
          method: 'POST',
          headers,
          body,
          cache: 'no-store',
        });

  if (!response.ok) {
    throw new Error(await readExportFailureMessage(response));
  }

  const disposition = response.headers.get('Content-Disposition');
  const match = disposition?.match(/filename="(.+?)"/);
  const filename = match?.[1] || 'presentation.pptx';

  const buffer = await response.arrayBuffer();

  if (!isPptxZipSignature(buffer)) {
    const slice = buffer.byteLength > 800 ? buffer.slice(0, 800) : buffer;
    const head = new TextDecoder().decode(slice);
    if (head.trimStart().startsWith('{')) {
      try {
        const j = JSON.parse(head) as { error?: string };
        if (typeof j.error === 'string' && j.error.trim()) {
          throw new Error(j.error.trim());
        }
      } catch (e) {
        if (e instanceof SyntaxError) {
          /* partial JSON in truncated slice — ignore */
        } else if (e instanceof Error) {
          throw e;
        }
      }
    }
    throw new Error('Server returned a response that is not a valid PPTX file. Try again or check server logs.');
  }

  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
