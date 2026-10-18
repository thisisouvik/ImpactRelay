import "server-only";

import { Redis } from "@upstash/redis";

let redis: Redis | null | undefined;

function getRedis() {
  if (redis !== undefined) return redis;
  redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN ? Redis.fromEnv() : null;
  return redis;
}

export function cacheStatus() {
  return getRedis() ? "configured" : "unconfigured";
}

export async function getCachedJson<T>(key: string): Promise<T | null> {
  const client = getRedis();
  if (!client) return null;
  try {
    return await client.get<T>(`${process.env.REDIS_CACHE_PREFIX ?? "impactrelay"}:cache:${key}`);
  } catch {
    return null;
  }
}

export async function setCachedJson<T>(key: string, value: T, ttlSeconds: number) {
  const client = getRedis();
  if (!client) return false;
  try {
    await client.set(`${process.env.REDIS_CACHE_PREFIX ?? "impactrelay"}:cache:${key}`, value, { ex: ttlSeconds });
    return true;
  } catch {
    return false;
  }
}

export async function deleteCachedJson(key: string) {
  const client = getRedis();
  if (!client) return false;
  try {
    await client.del(`${process.env.REDIS_CACHE_PREFIX ?? "impactrelay"}:cache:${key}`);
    return true;
  } catch {
    return false;
  }
}
