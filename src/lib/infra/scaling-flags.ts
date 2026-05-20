/** Centralized scaling-related env flags (single source for routes + health). */

function intEnv(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** Slide count at or above which async queue is preferred when workers are enabled. */
export function asyncGenerateSlideThreshold(): number {
  return intEnv('GENERATE_ASYNC_SLIDE_THRESHOLD', 12);
}

/** Slide count at or above which PPTX export uses async worker queue (?async=1). */
export function asyncExportSlideThreshold(): number {
  return intEnv('EXPORT_ASYNC_SLIDE_THRESHOLD', 12);
}
