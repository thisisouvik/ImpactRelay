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
    if (current.status !== "plan-ready") {
      return errorResponse(new Error(`Case cannot run from status ${current.status}.`), "INVALID_CASE_STATE", 409);
    }

    const running = repository.updateStatus(caseId, "running-free-tools");
    repository.appendEvent({
      id: randomUUID(),
      caseId,
      eventType: "agent.run.blocked",
      actor: "system",
      status: "warning",
      message: "Execution is paused because no tool adapter has been configured yet. No synthetic result was created.",
      occurredAt: new Date().toISOString(),
    });
    const blocked = repository.updateStatus(caseId, "blocked");
    return NextResponse.json({ case: blocked ?? running, execution: "blocked", reason: "TOOL_ADAPTERS_NOT_CONFIGURED" });
  } catch (error) {
    return errorResponse(error, "AGENT_RUN_FAILED");
  }
}
