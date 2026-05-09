import { PresentationData } from '@/types';

/**
 * Export a presentation to PPTX.
 *
 * Strategy: send the raw presentation data (elements with coordinates, text,
 * images, shapes) to the server. The server uses pptxgenjs to build a fully
 * editable PPTX file with real text boxes, embedded images, and shapes —
 * NOT screenshots. This makes every element selectable and editable in
 * PowerPoint, Keynote, and LibreOffice.
 */
export async function exportToPptx(presentation: PresentationData): Promise<void> {
  const response = await fetch('/api/export/pptx', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(presentation),
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