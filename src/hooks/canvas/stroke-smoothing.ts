const DEFAULT_MIN_DIST = 4;

/** Append a point only when the cursor moved enough (reduces jagged oversampling). */
export function appendStrokePoint(
  flat: number[] | null,
  x: number,
  y: number,
  minDist = DEFAULT_MIN_DIST,
): number[] {
  if (!flat || flat.length < 2) return [x, y];
  const lx = flat[flat.length - 2];
  const ly = flat[flat.length - 1];
  if (Math.hypot(x - lx, y - ly) < minDist) return flat;
  return [...flat, x, y];
}

/**
 * Insert quadratic midpoints between samples so Konva `tension` renders a smooth curve.
 */
export function smoothStrokePoints(flat: number[]): number[] {
  if (flat.length < 6) return flat;
  const pts: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < flat.length; i += 2) {
    pts.push({ x: flat[i], y: flat[i + 1] });
  }
  const out: number[] = [pts[0].x, pts[0].y];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const mx = (a.x + b.x) * 0.5;
    const my = (a.y + b.y) * 0.5;
    out.push(a.x, a.y, mx, my);
  }
  const last = pts[pts.length - 1];
  out.push(last.x, last.y);
  return out;
}

export function strokeBounds(flat: number[]): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
} {
  const xs = flat.filter((_, i) => i % 2 === 0);
  const ys = flat.filter((_, i) => i % 2 === 1);
  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys),
  };
}

export function toRelativeStrokePoints(flat: number[], minX: number, minY: number): number[] {
  return flat.map((p, i) => (i % 2 === 0 ? p - minX : p - minY));
}
