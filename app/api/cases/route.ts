import { NextResponse } from "next/server";
import { caseRequestSchema } from "@/lib/domain/schemas";
import { errorResponse } from "@/lib/api/response";
import { getProductionCaseRepository } from "@/lib/db/neon-repository";
import { effectiveCaseMode } from "@/lib/ai/selection";
import { enforceRateLimit, rateLimitResponse, requestIdentifier } from "@/lib/infra/rate-limit";
import { deleteCachedJson, getCachedJson, setCachedJson } from "@/lib/infra/cache";
import type { CaseRecord } from "@/lib/domain/schemas";
import { createCaseSessionToken, hashCaseSession, readCaseSession, sessionCookie, sessionHashFromRequest } from "@/lib/security/case-session";

export async function POST(request: Request) {
  try {
    const limit = await enforceRateLimit(requestIdentifier(request), "cases:create");
    if (!limit.success) return NextResponse.json({ error: { code: "RATE_LIMITED", message: "Too many case creations. Try again shortly." } }, { status: 429, headers: rateLimitResponse(limit) });
    const input = caseRequestSchema.parse(await request.json());
    const sessionToken = readCaseSession(request) ?? createCaseSessionToken();
    const created = await getProductionCaseRepository().createCase({
      ...input,
      mode: effectiveCaseMode(input.mode),
    }, hashCaseSession(sessionToken));
    await deleteCachedJson(`cases:${hashCaseSession(sessionToken)}`);
    const response = NextResponse.json({ case: created }, { status: 201, headers: { "cache-control": "no-store" } });
    if (!readCaseSession(request)) response.headers.set("set-cookie", sessionCookie(sessionToken));
    return response;
  } catch (error) {
    return errorResponse(error, "CASE_CREATE_FAILED");
  }
}

export async function GET(request: Request) {
  try {
    const ownerTokenHash = sessionHashFromRequest(request);
    if (!ownerTokenHash) return NextResponse.json({ cases: [] }, { headers: { "cache-control": "no-store" } });
    const cacheKey = `cases:${ownerTokenHash}`;
    const cached = await getCachedJson<CaseRecord[]>(cacheKey);
    const cases = cached ?? (await getProductionCaseRepository().listCases(ownerTokenHash));
    if (!cached) await setCachedJson(cacheKey, cases, 15);
    return NextResponse.json({ cases }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return errorResponse(error, "CASE_LIST_FAILED");
  }
}
