/**
 * exportPdf — captures each slide DOM element and compiles into a multi-page PDF.
 * Uses html2canvas + jsPDF (client-side only).
 *
 * Usage:
 *   await exportPdf({ slideIds: ['slide-1', 'slide-2'], title: 'My Deck' });
 *
 * Each slide element must be in the DOM with id="slide-canvas-{slideId}".
 * If not found, a blank page with the slide index is inserted.
 */
export async function exportPdf({
  slideIds,
  title = 'Presentation',
  onProgress,
}: {
  slideIds: string[];
  title?: string;
  onProgress?: (current: number, total: number) => void;
}): Promise<void> {
  // Dynamically import to keep bundle size manageable
  const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
    import('jspdf'),
    import('html2canvas'),
  ]);

  // 16:9 at 1280×720 — standard slide ratio
  const W = 1280;
  const H = 720;

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'px',
    format: [W, H],
    compress: true,
  });

  for (let i = 0; i < slideIds.length; i++) {
    onProgress?.(i + 1, slideIds.length);

    const el = document.getElementById(`slide-canvas-${slideIds[i]}`);

    if (el) {
      const canvas = await html2canvas(el, {
        width: W,
        height: H,
        scale: 1.5,              // higher DPI for crispness
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        logging: false,
        imageTimeout: 8000,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.92);

      if (i > 0) doc.addPage([W, H], 'landscape');
      doc.addImage(imgData, 'JPEG', 0, 0, W, H, '', 'FAST');
    } else {
      // Fallback: blank page with index
      if (i > 0) doc.addPage([W, H], 'landscape');
      doc.setFontSize(32);
      doc.setTextColor(150);
      doc.text(`Slide ${i + 1}`, W / 2, H / 2, { align: 'center' });
    }
  }

  const safeName = title.replace(/[^a-zA-Z0-9\s-_]/g, '').trim() || 'Presentation';
  doc.save(`${safeName}.pdf`);
}

/**
 * exportFirstSlidePng — captures only the first slide as a PNG download.
 */
export async function exportFirstSlidePng({
  slideId,
  title = 'Slide',
}: {
  slideId: string;
  title?: string;
}): Promise<void> {
  const { default: html2canvas } = await import('html2canvas');

  const el = document.getElementById(`slide-canvas-${slideId}`);
  if (!el) throw new Error(`Slide element #slide-canvas-${slideId} not found in DOM`);

  const canvas = await html2canvas(el, {
    width: 1280,
    height: 720,
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: null,
    logging: false,
  });

  const link = document.createElement('a');
  link.download = `${title.replace(/[^a-zA-Z0-9\s-_]/g, '').trim() || 'Slide'}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}
