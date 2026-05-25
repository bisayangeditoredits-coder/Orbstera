/**
 * Serializes cloud deck saves (autosave, manual retry, flush-on-exit) to avoid overlapping POSTs and 409s.
 */
let chain: Promise<void> = Promise.resolve();

export function enqueueCloudSave<T>(fn: () => Promise<T>): Promise<T> {
  const next = chain.then(fn);
  chain = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}
