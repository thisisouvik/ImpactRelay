// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const redis = vi.hoisted(() => ({ fromEnv: vi.fn(), evalsha: vi.fn(), eval: vi.fn() }));
const repository = vi.hoisted(() => vi.fn());

vi.mock("server-only", () => ({}));
// Keep the installed Ratelimit implementation (including its timeout behavior) real.
vi.mock("@upstash/redis", () => ({ Redis: { fromEnv: redis.fromEnv } }));
vi.mock("@/lib/db/neon-repository", () => ({ getProductionCaseRepository: repository }));
vi.mock("@/lib/ai/selection", () => ({ effectiveCaseMode: vi.fn(), getLlmProvider: vi.fn() }));
vi.mock("@/lib/infra/cache", () => ({ deleteCachedJson: vi.fn(), getCachedJson: vi.fn(), setCachedJson: vi.fn() }));
vi.mock("@/lib/agent/planner", () => ({ buildPlan: vi.fn() }));
vi.mock("@/lib/agent/report", () => ({ buildRulesReport: vi.fn() }));
vi.mock("@/lib/tools/registry", () => ({ availableFreeToolIds: vi.fn(), executeFreeTool: vi.fn() }));
vi.mock("@/lib/security/case-session", () => ({
  createCaseSessionToken: vi.fn(), hashCaseSession: vi.fn(), readCaseSession: vi.fn(),
  sessionCookie: vi.fn(), sessionHashFromRequest: vi.fn(),
}));

const now = new Date("2026-10-19T12:00:30.000Z");
const sensitiveError = new Error("Redis failed: https://secret.example.test Bearer private-token");

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  vi.setSystemTime(now);
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("RATE_LIMIT_MODE", "auto");
  vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://redis.example.test");
  vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "offline-token");
  vi.stubEnv("REDIS_CACHE_PREFIX", "rate-limit-offline-test");
  vi.stubEnv("VERCEL", "");
  redis.evalsha.mockReset().mockResolvedValue(19);
  redis.eval.mockReset();
  redis.fromEnv.mockReset().mockReturnValue({ evalsha: redis.evalsha, eval: redis.eval });
  repository.mockReset().mockImplementation(() => { throw new Error("Unexpected database access"); });
  vi.stubGlobal("fetch", vi.fn(() => { throw new Error("Unexpected network access"); }));
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("rate-limit enforcement with the installed SDK", () => {
  it("allows a below-limit request using the existing per-route 20/minute window without analytics", async () => {
    const { enforceRateLimit, redisStatus } = await import("@/lib/infra/rate-limit");
    expect(redisStatus()).toBe("configured");
    expect(await enforceRateLimit("203.0.113.8", "agent:plan")).toMatchObject({
      success: true, limit: 20, remaining: 19, reset: now.getTime() + 30_000, degraded: false,
    });
    expect(redis.evalsha).toHaveBeenCalledWith(expect.any(String), [
      expect.stringContaining("rate-limit-offline-test:agent:plan:203.0.113.8:"), expect.any(String),
    ], [20, now.getTime(), 60_000, 1]);
    expect(console.warn).not.toHaveBeenCalled();
    expect(console.error).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("preserves genuine quota denials, including the SDK's cached quota denial", async () => {
    redis.evalsha.mockResolvedValue(-1);
    const { enforceRateLimit, rateLimitResponse } = await import("@/lib/infra/rate-limit");
    for (let attempt = 0; attempt < 2; attempt++) {
      const result = await enforceRateLimit("203.0.113.8", "agent:run");
      expect(result).toMatchObject({ success: false, limit: 20, remaining: 0, degraded: false });
      expect(rateLimitResponse(result)).toEqual({
        "Retry-After": "30", "X-RateLimit-Limit": "20", "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": "2026-10-19T12:01:00.000Z",
      });
    }
    expect(redis.evalsha).toHaveBeenCalledTimes(1);
  });

  for (const missing of ["both", "url", "token"]) {
    it.each([
      ["development", "auto", true],
      ["development", "required", false],
      ["development", "disabled", true],
      ["production", "auto", false],
      ["production", "required", false],
      ["production", "disabled", false],
    ] as const)(`handles missing ${missing} credentials in %s/%s (success=%s)`, async (environment, mode, success) => {
      vi.stubEnv("NODE_ENV", environment);
      vi.stubEnv("RATE_LIMIT_MODE", mode);
      if (missing !== "token") vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
      if (missing !== "url") vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
      const { enforceRateLimit, redisStatus } = await import("@/lib/infra/rate-limit");
      expect(redisStatus()).toBe("unconfigured");
      expect(await enforceRateLimit("client", "cases:create")).toMatchObject({ success, degraded: true });
      expect(redis.fromEnv).not.toHaveBeenCalled();
    });
  }

  it("honors disabled development mode before constructing or calling Redis", async () => {
    vi.stubEnv("RATE_LIMIT_MODE", "disabled");
    redis.fromEnv.mockImplementation(() => { throw sensitiveError; });
    const { enforceRateLimit } = await import("@/lib/infra/rate-limit");
    expect(await enforceRateLimit("client", "cases:create")).toMatchObject({ success: true, degraded: true });
    expect(redis.fromEnv).not.toHaveBeenCalled();
  });

  it.each([19, -1])("still enforces configured Redis in disabled production mode (remaining=%s)", async (remaining) => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RATE_LIMIT_MODE", "disabled");
    redis.evalsha.mockResolvedValue(remaining);
    const { enforceRateLimit } = await import("@/lib/infra/rate-limit");
    expect(await enforceRateLimit("client", "cases:create")).toMatchObject({ success: remaining >= 0, degraded: false });
    expect(redis.evalsha).toHaveBeenCalledOnce();
  });

  it.each(["development", "production"])("fails closed on thrown Redis errors in %s without logging secrets", async (environment) => {
    vi.stubEnv("NODE_ENV", environment);
    redis.evalsha.mockRejectedValue(sensitiveError);
    const { enforceRateLimit } = await import("@/lib/infra/rate-limit");
    const result = await enforceRateLimit("client", "agent:plan");
    expect(result).toMatchObject({ success: false, degraded: true });
    expect(JSON.stringify(result)).not.toMatch(/secret|private-token|Bearer/);
    expect(console.warn).not.toHaveBeenCalled();
    expect(console.error).not.toHaveBeenCalled();
  });

  it("fails closed on Redis client initialization errors", async () => {
    redis.fromEnv.mockImplementation(() => { throw sensitiveError; });
    const { enforceRateLimit } = await import("@/lib/infra/rate-limit");
    expect(await enforceRateLimit("client", "agent:plan")).toMatchObject({ success: false, degraded: true });
  });

  it.each(["development", "production"])("rejects the SDK's success-with-timeout in %s and handles a late Redis rejection", async (environment) => {
    vi.stubEnv("NODE_ENV", environment);
    let rejectRedis!: (error: Error) => void;
    redis.evalsha.mockImplementation(() => new Promise((_resolve, reject) => { rejectRedis = reject; }));
    const { enforceRateLimit } = await import("@/lib/infra/rate-limit");
    const pending = enforceRateLimit("client", "agent:run");
    const settled = vi.fn();
    void pending.then(settled);
    await vi.advanceTimersByTimeAsync(4_999);
    expect(settled).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(await pending).toMatchObject({ success: false, degraded: true });
    rejectRedis(sensitiveError);
    await vi.advanceTimersByTimeAsync(0);
    expect(console.warn).not.toHaveBeenCalled();
    expect(console.error).not.toHaveBeenCalled();
  });

  it("rounds Retry-After up and never emits zero or negative delays", async () => {
    const { rateLimitResponse } = await import("@/lib/infra/rate-limit");
    expect(rateLimitResponse({ limit: 20, remaining: 0, reset: now.getTime() + 1_001 })["Retry-After"]).toBe("2");
    expect(rateLimitResponse({ limit: 20, remaining: 0, reset: now.getTime() - 1 })["Retry-After"]).toBe("1");
  });
});

describe("client IP trust boundary", () => {
  it("uses Vercel's dedicated client-IP header on Vercel instead of generic forwarding headers", async () => {
    vi.stubEnv("VERCEL", "1");
    const { requestIdentifier } = await import("@/lib/infra/rate-limit");
    expect(requestIdentifier(new Request("https://app.example.test", { headers: {
      "x-vercel-forwarded-for": "203.0.113.8", "x-forwarded-for": "198.51.100.9", "x-real-ip": "198.51.100.10",
    } }))).toBe("203.0.113.8");
  });

  it.each(["", "invalid", "203.0.113.8, 198.51.100.9"])("uses the shared fallback for a missing or malformed Vercel header (%s)", async (ip) => {
    vi.stubEnv("VERCEL", "1");
    const { requestIdentifier } = await import("@/lib/infra/rate-limit");
    expect(requestIdentifier(new Request("https://app.example.test", { headers: {
      "x-vercel-forwarded-for": ip, "x-forwarded-for": "198.51.100.9", "x-real-ip": "198.51.100.10",
    } }))).toBe("anonymous");
  });

  it("accepts IPv6 on Vercel", async () => {
    vi.stubEnv("VERCEL", "1");
    const { requestIdentifier } = await import("@/lib/infra/rate-limit");
    expect(requestIdentifier(new Request("https://app.example.test", { headers: { "x-vercel-forwarded-for": "2001:db8::8" } }))).toBe("2001:db8::8");
  });

  it("does not trust client-supplied forwarding headers outside Vercel", async () => {
    const { requestIdentifier } = await import("@/lib/infra/rate-limit");
    expect(requestIdentifier(new Request("https://app.example.test", { headers: {
      "x-vercel-forwarded-for": "203.0.113.8", "x-forwarded-for": "198.51.100.9", "x-real-ip": "198.51.100.10",
    } }))).toBe("anonymous");
  });
});

const routes = [
  ["cases:create", () => import("@/app/api/cases/route")],
  ["agent:plan", () => import("@/app/api/agent/plan/route")],
  ["agent:run", () => import("@/app/api/agent/run/route")],
] as const;

describe.each(routes)("%s route denial mapping", (_route, loadRoute) => {
  it.each(["quota", "missing", "error", "timeout"])("maps %s to a safe denial before reading input or accessing the database", async (failure) => {
    vi.stubEnv("NODE_ENV", "production");
    if (failure === "quota") redis.evalsha.mockResolvedValue(-1);
    if (failure === "missing") vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    if (failure === "error") redis.evalsha.mockRejectedValue(sensitiveError);
    if (failure === "timeout") redis.evalsha.mockImplementation(() => new Promise(() => {}));
    const { POST } = await loadRoute();
    const request = new Request("https://app.example.test/api", { method: "POST", body: "invalid JSON" });
    const readBody = vi.spyOn(request, "json");
    const pending = POST(request);
    if (failure === "timeout") await vi.advanceTimersByTimeAsync(5_000);
    const response = await pending;
    expect(response.status).toBe(failure === "quota" ? 429 : 503);
    expect(await response.json()).toEqual({ error: {
      code: failure === "quota" ? "RATE_LIMITED" : "RATE_LIMIT_UNAVAILABLE",
      message: failure === "quota" ? expect.any(String) : "Request protection is temporarily unavailable. Try again shortly.",
    } });
    expect(response.headers.get("cache-control")).toBe("no-store");
    if (failure === "quota") {
      expect(response.headers.get("retry-after")).toBe("30");
      expect(response.headers.get("x-ratelimit-limit")).toBe("20");
      expect(response.headers.get("x-ratelimit-remaining")).toBe("0");
    } else {
      expect(response.headers.has("x-ratelimit-limit")).toBe(false);
      expect(response.headers.has("retry-after")).toBe(false);
    }
    expect(readBody).not.toHaveBeenCalled();
    expect(repository).not.toHaveBeenCalled();
    expect(console.warn).not.toHaveBeenCalled();
    expect(console.error).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });
});
