import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { errorResponse, notFoundResponse } from "@/lib/api/response";
import { caseIdSchema, type AgentPlan } from "@/lib/domain/schemas";
import { getProductionCaseRepository } from "@/lib/db/neon-repository";
import { executeFreeTool } from "@/lib/tools/registry";
import { getLlmProvider } from "@/lib/ai/selection";
import { ProviderError } from "@/lib/ai/types";
import { buildRulesReport } from "@/lib/agent/report";
import { enforceRateLimit, rateLimitDeniedResponse, requestIdentifier } from "@/lib/infra/rate-limit";
import { sessionHashFromRequest } from "@/lib/security/case-session";

export async function POST(request: Request) {
  try {
    const limit = await enforceRateLimit(requestIdentifier(request), "agent:run");
    if (!limit.success) return rateLimitDeniedResponse(limit, "Execution is temporarily rate-limited. Try again shortly.");
    const { caseId } = caseIdSchema.parse(await request.json());
    const repository = getProductionCaseRepository();
    const ownerTokenHash = sessionHashFromRequest(request);
    if (!ownerTokenHash) return notFoundResponse("Case");
    const current = await repository.getCase(caseId, ownerTokenHash);
    if (!current) return notFoundResponse("Case");
    if (current.status !== "plan-ready") {
      return errorResponse(new Error(`Case cannot run from status ${current.status}.`), "INVALID_CASE_STATE", 409);
    }

    await repository.updateStatus(caseId, "running-free-tools");
    await repository.appendEvent({
      id: randomUUID(),
      caseId,
      eventType: "agent.free_tools.started",
      actor: "system",
      status: "active",
      message: "Free tool execution started. Each result will be validated and recorded with provenance.",
      occurredAt: new Date().toISOString(),
    });

    const plan = current.plan;
    if (!plan) return errorResponse(new Error("A plan is required before execution."), "PLAN_REQUIRED", 409);

    const nextPlan: AgentPlan = {
      ...plan,
      steps: plan.steps.map((step) => ({ ...step, status: "pending" as const })),
    };
    await repository.updatePlan(caseId, nextPlan);

    const previous: Record<string, Awaited<ReturnType<typeof executeFreeTool>>> = {};
    let hasFailure = false;

    const independentLocationTools = new Set(["resources.nearby", "weather.current"]);
    for (let stepIndex = 0; stepIndex < nextPlan.steps.length;) {
      const firstStep = nextPlan.steps[stepIndex];
      const batch = [firstStep];
      if (previous["location.lookup"]?.status === "completed" && independentLocationTools.has(firstStep.toolId)) {
        let nextIndex = stepIndex + 1;
        while (nextIndex < nextPlan.steps.length && independentLocationTools.has(nextPlan.steps[nextIndex].toolId)) {
          batch.push(nextPlan.steps[nextIndex]);
          nextIndex += 1;
        }
      }

      for (const step of batch) {
        await repository.appendEvent({
          id: randomUUID(),
          caseId,
          eventType: "tool.started",
          actor: "tool",
          status: "active",
          message: `Running ${step.toolId}.`,
          occurredAt: new Date().toISOString(),
        });
      }

      const results = await Promise.all(batch.map(async (step) => ({
        step,
        result: await executeFreeTool(step.toolId, step.input, {
          caseId,
          requestText: current.requestText,
          previous,
        }),
      })));

      for (const { step, result } of results) {
        previous[step.toolId] = result;

        const storedCase = await repository.getCase(caseId);
        const storedPlan = storedCase?.plan ?? nextPlan;
        const updatedStepStatus = result.status === "completed" ? "completed" : result.status === "blocked" ? "blocked" : "failed";
        const updatedPlan: AgentPlan = {
          ...storedPlan,
          steps: storedPlan.steps.map((candidate) => candidate.id === step.id
            ? { ...candidate, status: updatedStepStatus }
            : candidate),
        };
        await repository.updatePlan(caseId, updatedPlan);

        if (result.evidence) await repository.saveEvidence(result.evidence);
        if (result.status !== "completed") hasFailure = true;

        await repository.appendEvent({
          id: randomUUID(),
          caseId,
          eventType: result.status === "completed" ? "tool.completed" : `tool.${result.status}`,
          actor: "tool",
          status: result.status === "completed" ? "complete" : result.status === "blocked" ? "warning" : "error",
          message: result.message,
          occurredAt: new Date().toISOString(),
        });
      }
      stepIndex += batch.length;
    }

    const afterTools = await repository.getCase(caseId);
    if (!afterTools) return notFoundResponse("Case");

    if (hasFailure && afterTools.evidence.length === 0) {
      const blocked = await repository.updateStatus(caseId, "blocked");
      await repository.appendEvent({
        id: randomUUID(),
        caseId,
        eventType: "agent.free_tools.blocked",
        actor: "system",
        status: "warning",
        message: "Execution stopped with a partial record. No missing or failed tool result was promoted to evidence.",
        occurredAt: new Date().toISOString(),
      });
      return NextResponse.json({ case: (await repository.getCase(caseId)) ?? blocked, execution: "blocked" });
    }

    if (hasFailure) {
      await repository.appendEvent({
        id: randomUUID(),
        caseId,
        eventType: "agent.free_tools.partial",
        actor: "system",
        status: "warning",
        message: "One or more optional free tools failed. The available evidence remains visible and failed steps remain marked in the audit trail.",
        occurredAt: new Date().toISOString(),
      });
    }

    await repository.updateStatus(caseId, "validating-evidence");
    await repository.appendEvent({
      id: randomUUID(),
      caseId,
      eventType: "evidence.validation.completed",
      actor: "system",
      status: "complete",
      message: `${(await repository.getCase(caseId))?.evidence.length ?? 0} source-backed evidence item(s) passed schema validation.`,
      occurredAt: new Date().toISOString(),
    });

    const validatedCase = await repository.getCase(caseId);
    if (!validatedCase) return notFoundResponse("Case");

    if (validatedCase.mode === "rules") {
      const report = buildRulesReport(validatedCase, validatedCase.evidence);
      await repository.saveReport(caseId, report);
      await repository.appendEvent({
        id: randomUUID(),
        caseId,
        eventType: "rules.report-ready",
        actor: "system",
        status: "complete",
        message: "Transparent evidence brief generated from validated source signals.",
        occurredAt: new Date().toISOString(),
      });
    } else {
      try {
        const provider = getLlmProvider(validatedCase.mode);
        const report = await provider.summarize({
          caseRecord: validatedCase,
          evidence: validatedCase.evidence,
        });
        await repository.saveReport(caseId, report);
        await repository.appendEvent({
          id: randomUUID(),
          caseId,
          eventType: "provider.report-ready",
          actor: "planner",
          status: "complete",
          message: `${provider.id} produced a structured report referencing stored evidence IDs.`,
          occurredAt: new Date().toISOString(),
        });
      } catch (error) {
        const providerError = error instanceof ProviderError ? error : new Error("The selected provider could not synthesize a report.");
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
            code: providerError instanceof ProviderError ? providerError.code : "PROVIDER_REPORT_FAILED",
            message: providerError.message,
          },
        }, { status: providerError instanceof ProviderError && providerError.status === 429 ? 429 : 503 });
      }
    }

    const ready = await repository.updateStatus(caseId, "report-ready");
    await repository.appendEvent({
      id: randomUUID(),
      caseId,
      eventType: "case.evidence-ready",
      actor: "system",
      status: "complete",
      message: validatedCase.mode === "rules"
        ? "Evidence review and transparent Rules brief are ready."
        : "Evidence review and provider report are ready.",
      occurredAt: new Date().toISOString(),
    });
    return NextResponse.json({
      case: (await repository.getCase(caseId)) ?? ready,
      execution: hasFailure ? "partial" : "completed",
    }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return errorResponse(error, "AGENT_RUN_FAILED");
  }
}
