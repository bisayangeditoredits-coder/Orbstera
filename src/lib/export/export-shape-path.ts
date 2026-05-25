import type { SlideElement } from '@/types';

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Konva path shapes use SVG path data in `content` with a 100×100 viewBox.
 * pptxgenjs has no native path — embed as SVG image data URI.
 */
export function shapePathToSvgDataUri(el: SlideElement): string | null {
  if (el.shapeType !== 'path') return null;
  const d = (el.content || '').trim();
  if (!d) return null;

  const fill = el.shapeStyle?.fill || '#38BDF8';
  const stroke = el.shapeStyle?.stroke || 'transparent';
  const strokeWidth = el.shapeStyle?.strokeWidth ?? 0;
  const strokeAttr =
    stroke && stroke !== 'transparent'
      ? ` stroke="${escapeXml(stroke)}" stroke-width="${strokeWidth}"`
      : '';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none"><path d="${escapeXml(d)}" fill="${escapeXml(fill)}"${strokeAttr}/></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg, 'utf8').toString('base64')}`;
}
