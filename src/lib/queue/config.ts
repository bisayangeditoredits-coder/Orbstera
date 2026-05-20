import { Redis, RedisOptions } from 'ioredis';

// Construct standard Redis connection URL.
// BullMQ requires a standard Redis socket (redis:// or rediss://), not a REST URL.
let redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

if (!process.env.REDIS_URL && process.env.UPSTASH_REDIS_REST_URL) {
  const urlObj = new URL(process.env.UPSTASH_REDIS_REST_URL);
  const host = urlObj.hostname;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || '';
  redisUrl = `rediss://default:${token}@${host}:6379`;
}

const redisOptions: RedisOptions = {
  maxRetriesPerRequest: null,
};

export const connection = new Redis(redisUrl, redisOptions);

/**
 * Resolves regionalized queue names.
 * Example: 'ai-generation-queue' with region 'eu' -> 'ai-generation-queue-eu'
 */
export function getRegionalQueueName(baseName: string, region?: string | null): string {
  if (!region) return baseName;
  const normalizedRegion = region.trim().toLowerCase();
  
  // Maps standard regions/continents
  const allowedRegions = ['us', 'eu', 'asia'];
  if (allowedRegions.includes(normalizedRegion)) {
    return `${baseName}-${normalizedRegion}`;
  }
  return baseName;
}

export const BASE_QUEUE_NAMES = {
  AI_GENERATION: 'ai-generation-queue',
  IMAGE_GENERATION: 'image-generation-queue',
  PPTX_EXPORT: 'pptx-export-queue',
};

// Current worker's localized queues (bound to its region deployment)
const currentRegion = process.env.WORKER_REGION || null;
export const QUEUE_NAMES = {
  AI_GENERATION: getRegionalQueueName(BASE_QUEUE_NAMES.AI_GENERATION, currentRegion),
  IMAGE_GENERATION: getRegionalQueueName(BASE_QUEUE_NAMES.IMAGE_GENERATION, currentRegion),
  PPTX_EXPORT: getRegionalQueueName(BASE_QUEUE_NAMES.PPTX_EXPORT, currentRegion),
};
