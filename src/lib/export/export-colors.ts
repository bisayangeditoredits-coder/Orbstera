/** pptxgenjs uses 6-char RGB hex; optional transparency is 0–100 (percent transparent). */
export function parseColorForPptx(color?: string): { color: string; transparency?: number } {
  if (!color) return { color: 'FFFFFF' };
  const t = color.trim();

  const rgba = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)$/i.exec(t);
  if (rgba) {
    const r = Math.min(255, parseInt(rgba[1], 10));
    const g = Math.min(255, parseInt(rgba[2], 10));
    const b = Math.min(255, parseInt(rgba[3], 10));
    const a = rgba[4] !== undefined ? Math.max(0, Math.min(1, parseFloat(rgba[4]))) : 1;
    const hexColor = [r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('').toUpperCase();
    return {
      color: hexColor,
      transparency: a < 1 ? Math.round((1 - a) * 100) : undefined,
    };
  }

  if (t.startsWith('#')) {
    const c = t.replace('#', '').toUpperCase();
    const expanded =
      c.length === 3 ? c[0] + c[0] + c[1] + c[1] + c[2] + c[2] : c.substring(0, 6);
    return { color: expanded.padEnd(6, '0').substring(0, 6) };
  }

  if (/^[0-9A-Fa-f]{3,8}$/.test(t)) {
    const c = t.toUpperCase();
    const expanded =
      c.length === 3 ? c[0] + c[0] + c[1] + c[1] + c[2] + c[2] : c.substring(0, 6);
    return { color: expanded.padEnd(6, '0').substring(0, 6) };
  }

  if (t === 'transparent') {
    return { color: 'FFFFFF', transparency: 100 };
  }

  return { color: 'FFFFFF' };
}

/** Merge element opacity (0–1) with fill transparency for pptxgenjs. */
export function combinedShapeTransparency(
  fillTransparency: number | undefined,
  elementOpacity: number | undefined,
): number | undefined {
  const op = elementOpacity ?? 1;
  const ft = fillTransparency ?? 0;
  if (op >= 1 && ft <= 0) return undefined;
  const opaque = op * (1 - ft / 100);
  if (opaque >= 0.999) return undefined;
  return Math.min(100, Math.max(0, Math.round((1 - opaque) * 100)));
}
