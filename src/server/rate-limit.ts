import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

import { isRedisConfigured } from "./config";

interface Bucket {
  count: number;
  resetAt: number;
}

const memory = new Map<string, Bucket>();
const redis = isRedisConfigured() ? Redis.fromEnv() : null;
const redisLimiters = new Map<string, Ratelimit>();

function memoryCheck(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const current = memory.get(key);
  if (!current || current.resetAt <= now) {
    memory.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true, retryAfter: Math.ceil(windowMs / 1000) };
  }
  current.count += 1;
  return {
    success: current.count <= limit,
    retryAfter: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
  };
}

/** Upstash in production, deterministic memory buckets in local/tests. */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<{ success: boolean; retryAfter: number }> {
  if (!redis) return memoryCheck(key, limit, windowSeconds * 1000);
  const limiterKey = `${limit}:${windowSeconds}`;
  let limiter = redisLimiters.get(limiterKey);
  if (!limiter) {
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limit, `${windowSeconds} s`),
      analytics: true,
      prefix: "fintype",
    });
    redisLimiters.set(limiterKey, limiter);
  }
  const result = await limiter.limit(key);
  return {
    success: result.success,
    retryAfter: Math.max(1, Math.ceil((result.reset - Date.now()) / 1000)),
  };
}

export function clearMemoryRateLimits(): void {
  memory.clear();
}
