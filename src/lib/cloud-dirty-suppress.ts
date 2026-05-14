/** Used while applying server merge so Zustand does not treat it as a user edit. */
let suppressDepth = 0;

export function suppressCloudDirtyDuring<T>(fn: () => T): T {
  suppressDepth++;
  try {
    return fn();
  } finally {
    suppressDepth--;
  }
}

export function isCloudDirtySuppressed(): boolean {
  return suppressDepth > 0;
}
