import { PresentationData } from '@/types';
import { preparePresentationForCloudSave, encodePresentationPostBody } from '@/lib/presentation-cloud-save';
import { EXPORT_OFFLOAD_BLOCKED_MESSAGE } from '@/lib/network-error-message';

/** Stay under typical serverless request body limits after gzip (Vercel ~4.5 MB). */
const EXPORT_JSON_BYTE_WARN = 3_800_000;

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
 */
export async function exportToPptx(presentation: PresentationData): Promise<void> {
  const prepared = await preparePresentationForCloudSave(presentation);
  const json = JSON.stringify(prepared);
  const byteLength = new TextEncoder().encode(json).byteLength;

  if (byteLength > EXPORT_JSON_BYTE_WARN && json.includes('data:image')) {
    throw new Error(EXPORT_OFFLOAD_BLOCKED_MESSAGE);
  }

  const { body, headers } = await encodePresentationPostBody(json);
  const response = await fetch('/api/export/pptx', {
    method: 'POST',
    headers,
    body,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(err.error || 'Export failed');
  }

  const disposition = response.headers.get('Content-Disposition');
  const match       = disposition?.match(/filename="(.+?)"/);
  const filename    = match?.[1] || 'presentation.pptx';

  const buffer = await response.arrayBuffer();
  const blob   = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  });

  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
