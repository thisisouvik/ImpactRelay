import { NextResponse } from "next/server";
import { getCaseRepository } from "@/lib/db/sqlite-repository";

export async function GET() {
  try {
    getCaseRepository();
    return NextResponse.json({
      status: "ok",
      persistence: "sqlite",
      planner: "rules",
      timestamp: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      { status: "degraded", persistence: "unavailable", planner: "rules" },
      { status: 503 },
    );
  }
}
