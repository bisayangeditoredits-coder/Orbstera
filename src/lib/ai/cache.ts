import crypto from 'crypto';
import { redis } from '@/lib/redis';

type CacheValue = Record<string, unknown> | string | number | boolean | null;

function hashKey(input: unknown): string {
  const raw = typeof input === 'string' ? input : JSON.stringify(input);
  return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 32);
}

export function makeAiCacheKey(args: {
  kind: 'orchestration' | 'intent' | 'structure' | 'reason' | 'composer';
  plan: string;
  prompt: string;
  slideCount: number;
  tone: string;
  language: string;
}): string {
  return `ai:${args.kind}:v1:${hashKey({
    plan: String(args.plan || 'free').toLowerCase(),
    prompt: String(args.prompt || '').trim(),
    slideCount: Math.max(1, Math.round(args.slideCount || 1)),
    tone: String(args.tone || '').trim().toLowerCase(),
    language: String(args.language || '').trim().toLowerCase(),
  })}`;
}

export async function aiCacheGet<T = CacheValue>(key: string): Promise<T | null> {
  if (!redis) return null;
  try {
    const v = await redis.get<T>(key);
    return v ?? null;
  } catch {
    return null;
  }
}

export async function aiCacheSet(key: string, value: CacheValue, ttlSeconds: number): Promise<void> {
  if (!redis) return;
  try {
    await redis.set(key, value, { ex: Math.max(5, Math.round(ttlSeconds)) });
  } catch {
    /* ignore */
  }
}

