import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/health/route";

vi.mock("@/lib/db/neon-repository", () => ({ getProductionCaseRepository: vi.fn() }));
vi.mock("@/lib/infra/cache", () => ({ cacheStatus: () => "unconfigured" }));
vi.mock("@/lib/infra/rate-limit", () => ({ redisStatus: () => "configured" }));

describe("provider configuration health", () => {
  beforeEach(() => {
    vi.stubEnv("APP_MODE", "groq");
    vi.stubEnv("GROQ_API_KEY", undefined);
    vi.stubEnv("GROQ_MODEL", undefined);
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Unexpected network request in health tests."));
  });

  afterEach(() => vi.unstubAllEnvs());

  it("reports Groq as configured without exposing credentials", async () => {
    vi.stubEnv("GROQ_API_KEY", "gsk_health-test-key");
    const response = await GET();
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(JSON.parse(body)).toMatchObject({
      planner: "groq",
       providers: { groq: "configured" },
    });
    expect(body).not.toContain("gsk_health-test-key");
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it.each([undefined, "", "   "])("reports missing Groq credentials (%s)", async (apiKey) => {
    vi.stubEnv("GROQ_API_KEY", apiKey);
    const response = await GET();

    expect(await response.json()).toMatchObject({
       providers: { groq: "unconfigured" },
    });
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});
