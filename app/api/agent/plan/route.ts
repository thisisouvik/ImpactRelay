import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { buildPlan } from "@/lib/agent/planner";
import { errorResponse, notFoundResponse } from "@/lib/api/response";
import { caseIdSchema } from "@/lib/domain/schemas";
import { getCaseRepository } from "@/lib/db/sqlite-repository";

export async function POST(request: Request) {
  try {
    const { caseId } = caseIdSchema.parse(await request.json());
    const repository = getCaseRepository();
    const current = repository.getCase(caseId);
    if (!current) return notFoundResponse("Case");

    if (current.plan && current.status === "plan-ready") {
      return NextResponse.json({ case: current, plan: current.plan });
    }

    if (current.status !== "received" && current.status !== "planning") {
      return errorResponse(new Error(`Case cannot be planned from status ${current.status}.`), "INVALID_CASE_STATE", 409);
    }

    const planningCase = current.status === "received"
      ? repository.updateStatus(caseId, "planning")
      : current;
    const now = new Date().toISOString();
    repository.appendEvent({
      id: randomUUID(),
      caseId,
      eventType: "agent.planning.started",
      actor: "planner",
      status: "active",
      message: "The request is being converted into bounded, reviewable steps.",
      occurredAt: now,
    });

    const plan = buildPlan(planningCase);
    const plannedCase = repository.savePlan(caseId, plan);
    repository.appendEvent({
      id: randomUUID(),
      caseId,
      eventType: "agent.plan.ready",
      actor: "planner",
      status: "complete",
      message: `Plan ready with ${plan.steps.length} executable step${plan.steps.length === 1 ? "" : "s"}.`,
      occurredAt: new Date().toISOString(),
    });

    return NextResponse.json({ case: repository.getCase(caseId) ?? plannedCase, plan });
  } catch (error) {
    return errorResponse(error, "PLAN_CREATE_FAILED");
  }
}
