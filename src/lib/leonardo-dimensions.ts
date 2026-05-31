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

export const VALID_SDXL_COMBINATIONS = [
  { width: 1024, height: 1024 },
  { width: 1456, height: 720 },
  { width: 720, height: 1456 },
  { width: 1248, height: 832 },
  { width: 832, height: 1248 },
  { width: 1184, height: 880 },
  { width: 880, height: 1184 },
  { width: 1104, height: 944 },
  { width: 944, height: 1104 },
  { width: 1568, height: 672 },
  { width: 672, height: 1568 },
  { width: 1392, height: 752 },
  { width: 752, height: 1392 },
] as const;

/** Scale a region to Leonardo-friendly SDXL pixels while preserving aspect ratio. */
export function regionToLeonardoPixels(regionW: number, regionH: number): { width: number; height: number } {
  const ew = Math.max(1, regionW || 1024);
  const eh = Math.max(1, regionH || 1024);
  const targetRatio = ew / eh;

  let bestFit = VALID_SDXL_COMBINATIONS[0];
  let minDiff = Infinity;

  for (const combo of VALID_SDXL_COMBINATIONS) {
    const comboRatio = combo.width / combo.height;
    // Logarithmic difference ensures 2:1 and 1:2 are treated symmetrically
    const diff = Math.abs(Math.log(comboRatio) - Math.log(targetRatio));
    if (diff < minDiff) {
      minDiff = diff;
      bestFit = combo;
    }
  }

  return { width: bestFit.width, height: bestFit.height };
}
