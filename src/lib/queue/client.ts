import { Queue } from 'bullmq';
import { connection, BASE_QUEUE_NAMES, getRegionalQueueName } from './config';

const queueInstances: Record<string, Queue> = {};

/**
 * Get or create a BullMQ Queue instance, dynamically resolved by region.
 * This enables the serverless API routes to route tasks geographically.
 */
export function getQueue(baseQueueName: string, region?: string | null): Queue {
  const queueName = getRegionalQueueName(baseQueueName, region);
  if (!queueInstances[queueName]) {
    queueInstances[queueName] = new Queue(queueName, { connection });
  }
  return queueInstances[queueName];
}

// Static exports for default region routing
export const aiGenerationQueue = getQueue(BASE_QUEUE_NAMES.AI_GENERATION);
export const pptxExportQueue = getQueue(BASE_QUEUE_NAMES.PPTX_EXPORT);
export const imageGenerationQueue = getQueue(BASE_QUEUE_NAMES.IMAGE_GENERATION);
