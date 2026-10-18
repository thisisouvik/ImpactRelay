import { NextResponse } from "next/server";
import { getProductionCaseRepository } from "@/lib/db/neon-repository";
import { cacheStatus } from "@/lib/infra/cache";
import { redisStatus } from "@/lib/infra/rate-limit";
import { configuredMode } from "@/lib/ai/selection";

export async function GET() {
  try {
    getProductionCaseRepository();
    const rateLimit = redisStatus();
    const cache = cacheStatus();
    const degraded = process.env.RATE_LIMIT_MODE === "required" && rateLimit !== "configured";
    return NextResponse.json({
      status: degraded ? "degraded" : "ok",
      persistence: process.env.DATABASE_URL ? "neon" : "sqlite",
      planner: configuredMode() ?? "rules",
      rateLimit,
      cache,
      providers: {
        grok: process.env.XAI_API_KEY && process.env.XAI_MODEL ? "configured" : "unconfigured",
        local: process.env.LOCAL_LLM_BASE_URL && process.env.LOCAL_LLM_MODEL ? "configured" : "unconfigured",
        og: process.env.OG_COMPUTE_API_KEY && process.env.OG_COMPUTE_MODEL ? "configured" : "unconfigured",
      },
      timestamp: new Date().toISOString(),
    }, { status: degraded ? 503 : 200 });
  } catch {
    return NextResponse.json(
      { status: "degraded", persistence: "unavailable", planner: configuredMode() ?? "rules" },
      { status: 503 },
    );
  }
}
