import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { errorResponse, notFoundResponse } from "@/lib/api/response";
import { caseIdSchema } from "@/lib/domain/schemas";
import { getCaseRepository } from "@/lib/db/sqlite-repository";

export async function POST(request: Request) {
  try {
    const { caseId } = caseIdSchema.parse(await request.json());
    const repository = getCaseRepository();
    const current = repository.getCase(caseId);
    if (!current) return notFoundResponse("Case");

    const paused = repository.updateStatus(caseId, "paused");
    repository.appendEvent({
      id: randomUUID(),
      caseId,
      eventType: "case.paused",
      actor: "user",
      status: "info",
      message: "Case paused by the user.",
      occurredAt: new Date().toISOString(),
    });

    return NextResponse.json({ case: repository.getCase(caseId) ?? paused });
  } catch (error) {
    return errorResponse(error, "CASE_PAUSE_FAILED");
  }
}
