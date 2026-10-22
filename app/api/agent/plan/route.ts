import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { buildPlan } from "@/lib/agent/planner";
import { errorResponse, notFoundResponse } from "@/lib/api/response";
import { caseIdSchema, type AgentPlan } from "@/lib/domain/schemas";
import { getProductionCaseRepository } from "@/lib/db/neon-repository";
import { getLlmProvider } from "@/lib/ai/selection";
import { ProviderError } from "@/lib/ai/types";
import { availableFreeToolIds } from "@/lib/tools/registry";
import { enforceRateLimit, rateLimitDeniedResponse, requestIdentifier } from "@/lib/infra/rate-limit";
import { sessionHashFromRequest } from "@/lib/security/case-session";

export async function POST(request: Request) {
  try {
    const limit = await enforceRateLimit(requestIdentifier(request), "agent:plan");
    if (!limit.success) return rateLimitDeniedResponse(limit, "Planning is temporarily rate-limited. Try again shortly.");
    const { caseId } = caseIdSchema.parse(await request.json());
    const repository = getProductionCaseRepository();
    const ownerTokenHash = sessionHashFromRequest(request);
    if (!ownerTokenHash) return notFoundResponse("Case");
    const current = await repository.getCase(caseId, ownerTokenHash);
    if (!current) return notFoundResponse("Case");

    if (current.plan && current.status === "plan-ready") {
      return NextResponse.json({ case: current, plan: current.plan }, { headers: { "cache-control": "no-store" } });
    }

    if (current.status !== "received" && current.status !== "planning" && current.status !== "failed") {
      return errorResponse(new Error(`Case cannot be planned from status ${current.status}.`), "INVALID_CASE_STATE", 409);
    }

    const planningCase = current.status === "received"
      ? await repository.updateStatus(caseId, "planning")
      : current.status === "failed"
        ? await repository.updateStatus(caseId, "planning")
      : current;
    const now = new Date().toISOString();
    await repository.appendEvent({
      id: randomUUID(),
      caseId,
      eventType: "agent.planning.started",
      actor: "planner",
      status: "active",
      message: "The request is being converted into bounded, reviewable steps.",
      occurredAt: now,
    });

    let plan: AgentPlan;
    try {
      if (planningCase.mode === "rules") {
        await repository.appendEvent({
          id: randomUUID(),
          caseId,
          eventType: "provider.selected",
          actor: "planner",
          status: "complete",
          message: "Transparent rules planner selected for this case.",
          occurredAt: new Date().toISOString(),
        });
        plan = buildPlan(planningCase);
      } else {
        const provider = getLlmProvider(planningCase.mode);
        await repository.appendEvent({
          id: randomUUID(),
          caseId,
          eventType: "provider.selected",
          actor: "planner",
          status: "info",
          message: `${provider.id} provider selected for structured planning.`,
          occurredAt: new Date().toISOString(),
        });
        plan = await provider.plan({
          caseRecord: planningCase,
          availableToolIds: availableFreeToolIds(),
        });
      }
    } catch (error) {
      const providerError = error instanceof ProviderError ? error : new Error("The selected provider could not prepare a plan.");
      const failed = await repository.updateStatus(caseId, "failed");
      await repository.appendEvent({
        id: randomUUID(),
        caseId,
        eventType: "provider.failed",
        actor: "planner",
        status: "error",
        message: providerError.message,
        occurredAt: new Date().toISOString(),
      });
      return NextResponse.json({
        case: (await repository.getCase(caseId)) ?? failed,
        error: {
          code: providerError instanceof ProviderError ? providerError.code : "PROVIDER_PLAN_FAILED",
          message: providerError.message,
        },
      }, { status: providerError instanceof ProviderError && providerError.status === 429 ? 429 : 503 });
    }

    const plannedCase = await repository.savePlan(caseId, plan);
    await repository.appendEvent({
      id: randomUUID(),
      caseId,
      eventType: "agent.plan.ready",
      actor: "planner",
      status: "complete",
      message: `Plan ready with ${plan.steps.length} executable step${plan.steps.length === 1 ? "" : "s"}.`,
      occurredAt: new Date().toISOString(),
    });

    return NextResponse.json({ case: (await repository.getCase(caseId)) ?? plannedCase, plan });
  } catch (error) {
    return errorResponse(error, "PLAN_CREATE_FAILED");
  }
}
