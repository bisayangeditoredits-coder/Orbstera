/** Leonardo SDXL/Phoenix allowed width/height bins. */
export const ALLOWED_LEONARDO_DIMS = [
  256, 320, 384, 448, 512, 576, 640, 672, 720, 752, 832, 880, 944, 1024, 1104, 1184, 1248, 1280, 1392, 1456, 1536, 1568,
] as const;

export function snapDim(n: number, min = 512, max = 1568): number {
  const v = Math.max(min, Math.min(max, Math.round(n) || 1024));
  return ALLOWED_LEONARDO_DIMS.reduce((prev, curr) =>
    Math.abs(curr - v) < Math.abs(prev - v) ? curr : prev,
  );
}

/** Scale a region to Leonardo-friendly pixels while preserving aspect ratio. */
export function regionToLeonardoPixels(regionW: number, regionH: number): { width: number; height: number } {
  const ew = Math.max(32, regionW || 1024);
  const eh = Math.max(32, regionH || 1024);
  const aspectRatio = ew / eh;
  let w: number;
  let h: number;

  if (ew >= eh) {
    w = Math.min(1536, Math.max(512, Math.round(ew)));
    h = Math.round(w / aspectRatio);
    if (h > 1536) {
      h = 1536;
      w = Math.round(h * aspectRatio);
    }
  } else {
    h = Math.min(1536, Math.max(512, Math.round(eh)));
    w = Math.round(h * aspectRatio);
    if (w > 1536) {
      w = 1536;
      h = Math.round(w / aspectRatio);
    }
  }

  if (w < 256 || h < 256) {
    const minScale = Math.max(256 / w, 256 / h);
    w = Math.round(w * minScale);
    h = Math.round(h * minScale);
  }

  return { width: snapDim(w, 256), height: snapDim(h, 256) };
}
