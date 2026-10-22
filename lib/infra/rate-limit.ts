import "server-only";

import { isIP } from "node:net";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
  degraded: boolean;
};

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
    analytics: false,
    // The SDK allows on timeout; enforceRateLimit must reject its timeout result.
    timeout: 5_000,
    prefix: process.env.REDIS_CACHE_PREFIX ?? "impactrelay",
  });
  return limiter;
}

export function redisStatus() {
  return getLimiter() ? "configured" : "unconfigured";
}

function degradedResult(success = false): RateLimitResult {
  return { success, limit: 0, remaining: 0, reset: Date.now() + 60_000, degraded: true };
}

export async function enforceRateLimit(identifier: string, route: string): Promise<RateLimitResult> {
  const production = process.env.NODE_ENV === "production";
  if (!production && process.env.RATE_LIMIT_MODE === "disabled") return degradedResult(true);

  try {
    const current = getLimiter();
    if (!current) return degradedResult(!production && process.env.RATE_LIMIT_MODE !== "required");
    const result = await current.limit(`${route}:${identifier}`);
    // Upstash 2.0.7 returns success: true with reason: "timeout" on network stalls.
    if (result.reason === "timeout") return degradedResult();
    const { success, limit, remaining, reset } = result;
    return { success, limit, remaining, reset, degraded: false };
  } catch {
    // Configuration and Redis errors must never escape into route error responses/logs.
    return degradedResult();
  }
}

export function requestIdentifier(request: Request) {
  // Vercel sets this dedicated header at its ingress. Generic forwarding headers
  // and headers on other hosts have no established trust boundary here.
  const ip = process.env.VERCEL === "1" ? request.headers.get("x-vercel-forwarded-for")?.trim() : undefined;
  return ip && isIP(ip) ? ip : "anonymous";
}

export function rateLimitResponse(result: { limit: number; remaining: number; reset: number }) {
  return {
    "Retry-After": String(Math.max(1, Math.ceil((result.reset - Date.now()) / 1000))),
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": new Date(result.reset).toISOString(),
  };
}

export function rateLimitDeniedResponse(result: RateLimitResult, message: string) {
  if (result.degraded) {
    return Response.json({ error: {
      code: "RATE_LIMIT_UNAVAILABLE",
      message: "Request protection is temporarily unavailable. Try again shortly.",
    } }, { status: 503, headers: { "cache-control": "no-store" } });
  }
  return Response.json({ error: { code: "RATE_LIMITED", message } }, {
    status: 429,
    headers: { ...rateLimitResponse(result), "cache-control": "no-store" },
  });
}
