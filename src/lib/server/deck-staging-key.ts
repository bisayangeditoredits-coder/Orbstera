/** Validates `presentations/{userId}/deck-staging/...` keys used by presign-deck-upload. */
export function isValidDeckStagingKey(userId: string, key: unknown): key is string {
  if (typeof key !== 'string' || !key.trim()) return false;
  const prefix = `presentations/${userId}/deck-staging/`;
  if (!key.startsWith(prefix)) return false;
  if (key.includes('..')) return false;
  return true;
}
