import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { errorResponse, notFoundResponse } from "@/lib/api/response";
import { caseIdSchema } from "@/lib/domain/schemas";
import { getProductionCaseRepository } from "@/lib/db/neon-repository";
import { sessionHashFromRequest } from "@/lib/security/case-session";

export async function POST(request: Request) {
  try {
    const { caseId } = caseIdSchema.parse(await request.json());
    const repository = getProductionCaseRepository();
    const ownerTokenHash = sessionHashFromRequest(request);
    if (!ownerTokenHash) return notFoundResponse("Case");
    const current = await repository.getCase(caseId, ownerTokenHash);
    if (!current) return notFoundResponse("Case");

    const paused = await repository.updateStatus(caseId, "paused");
    await repository.appendEvent({
      id: randomUUID(),
      caseId,
      eventType: "case.paused",
      actor: "user",
      status: "info",
      message: "Case paused by the user.",
      occurredAt: new Date().toISOString(),
    });

    return NextResponse.json({ case: (await repository.getCase(caseId)) ?? paused });
  } catch (error) {
    return errorResponse(error, "CASE_PAUSE_FAILED");
  }
}
