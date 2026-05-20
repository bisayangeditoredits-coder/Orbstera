/**
 * R2 deck index sharding for power users (500+ decks).
 * Env: R2_INDEX_SHARD_SIZE (default 200 decks per shard file).
 */
const DEFAULT_SHARD_SIZE = 200;

export function getIndexShardSize(): number {
  const n = Number(process.env.R2_INDEX_SHARD_SIZE || DEFAULT_SHARD_SIZE);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : DEFAULT_SHARD_SIZE;
}

export function indexShardKey(userId: string, shardIndex: number): string {
  return `presentations/${userId}/index-shard-${shardIndex}.json`;
}

export function indexMetaShardKey(userId: string, shardIndex: number): string {
  return `presentations/${userId}/index-shard-${shardIndex}.meta.json`;
}

/** Legacy single-file keys (default path). */
export function legacyIndexKey(userId: string): string {
  return `presentations/${userId}/index.json`;
}

export function legacyIndexMetaKey(userId: string): string {
  return `presentations/${userId}/index.meta.json`;
}

export function shardIndexForDeckCount(deckCount: number, shardSize = getIndexShardSize()): number {
  if (deckCount <= 0) return 0;
  return Math.floor((deckCount - 1) / shardSize);
}
