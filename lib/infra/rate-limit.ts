import "server-only";

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

let limiter: Ratelimit | null | undefined;

function getLimiter() {
  if (limiter !== undefined) return limiter;
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    limiter = null;
    return limiter;
  }
  limiter = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(20, "1 m"),
    analytics: true,
    prefix: process.env.REDIS_CACHE_PREFIX ?? "impactrelay",
  });
  return limiter;
}

export function redisStatus() {
  return getLimiter() ? "configured" : "unconfigured";
}

export async function enforceRateLimit(identifier: string, route: string) {
  const current = getLimiter();
  if (!current) {
    if (process.env.RATE_LIMIT_MODE === "required" || process.env.NODE_ENV === "production") {
      return { success: false, limit: 0, remaining: 0, reset: Date.now() + 60_000, degraded: true };
    }
    return { success: true, limit: 0, remaining: 0, reset: Date.now() + 60_000, degraded: true };
  }
  const result = await current.limit(`${route}:${identifier}`);
  return { ...result, degraded: false };
}

export function requestIdentifier(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? request.headers.get("x-real-ip")
    ?? "anonymous";
}

export function rateLimitResponse(result: { limit: number; remaining: number; reset: number }) {
  return {
    "Retry-After": String(Math.max(1, Math.ceil((result.reset - Date.now()) / 1000))),
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": new Date(result.reset).toISOString(),
  };
}
