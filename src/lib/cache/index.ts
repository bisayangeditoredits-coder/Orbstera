import { connection } from '../queue/config';
import crypto from 'crypto';

export async function getCache<T>(key: string): Promise<T | null> {
  try {
    const data = await connection.get(key);
    if (!data) return null;
    return JSON.parse(data) as T;
  } catch (error) {
    console.error(`[Cache] Error reading key ${key}:`, error);
    return null;
  }
}

export async function setCache(key: string, value: any, ttlSeconds: number = 86400): Promise<void> {
  try {
    const data = JSON.stringify(value);
    await connection.set(key, data, 'EX', ttlSeconds);
  } catch (error) {
    console.error(`[Cache] Error setting key ${key}:`, error);
  }
}

export async function invalidateCache(key: string): Promise<void> {
  try {
    await connection.del(key);
  } catch (error) {
    console.error(`[Cache] Error deleting key ${key}:`, error);
  }
}

/**
 * Creates a deterministic SHA-256 hash for a given prompt and parameters.
 */
export function hashPromptKey(prompt: string, params: Record<string, any>): string {
  const normalizedPrompt = prompt.trim().toLowerCase();
  // Sort parameters to ensure deterministic hashing
  const sortedParams = Object.keys(params)
    .sort()
    .reduce((acc, key) => {
      acc[key] = params[key];
      return acc;
    }, {} as Record<string, any>);
  
  const payload = JSON.stringify({ prompt: normalizedPrompt, ...sortedParams });
  return `ai:cache:` + crypto.createHash('sha256').update(payload).digest('hex');
}
