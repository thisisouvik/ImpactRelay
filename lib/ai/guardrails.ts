import { randomUUID } from "node:crypto";
import { agentPlanSchema, reportDraftSchema, type AgentPlan, type CaseRecord, type ReportDraft } from "@/lib/domain/schemas";
import { ProviderOutputError, type ProviderId } from "@/lib/ai/types";
import { extractLocationQuery } from "@/lib/tools/location";

function extractUrls(requestText: string) {
  return requestText.match(/https:\/\/[^\s<>()]+/gi)?.map((url) => url.replace(/[),.;!?]+$/, "")) ?? [];
}

function inputForTool(toolId: string, caseRecord: CaseRecord) {
  if (toolId === "public.source.read") return { urls: extractUrls(caseRecord.requestText) };
  if (toolId === "location.lookup") return { locationQuery: extractLocationQuery(caseRecord.requestText), requestText: caseRecord.requestText };
  return { requestText: caseRecord.requestText };
}

export function normalizeProviderPlan(raw: unknown, input: { caseRecord: CaseRecord; availableToolIds: string[]; providerId: ProviderId }): AgentPlan {
  const parsed = agentPlanSchema.safeParse({
    ...raw as Record<string, unknown>,
    steps: Array.isArray((raw as { steps?: unknown })?.steps)
      ? (raw as { steps: Array<Record<string, unknown>> }).steps.map((step) => ({
        ...step,
        id: typeof step.id === "string" && step.id.length > 0 ? step.id : randomUUID(),
        input: typeof step.input === "object" && step.input !== null ? step.input : {},
        requiresPayment: false,
        requiresApproval: false,
        status: "ready",
      }))
      : [],
  });

  if (!parsed.success) throw new ProviderOutputError(`The ${input.providerId} provider returned an invalid plan shape.`, parsed.error);

  const seen = new Set<string>();
  const steps = parsed.data.steps.map((step) => {
    if (!input.availableToolIds.includes(step.toolId)) {
      throw new ProviderOutputError(`The ${input.providerId} provider selected an unavailable tool: ${step.toolId}.`);
    }
    if (seen.has(step.toolId)) {
      throw new ProviderOutputError(`The ${input.providerId} provider selected the tool more than once: ${step.toolId}.`);
    }
    seen.add(step.toolId);
    return {
      ...step,
      id: randomUUID(),
      input: inputForTool(step.toolId, input.caseRecord),
      requiresPayment: false,
      requiresApproval: false,
      status: "ready" as const,
    };
  });

  if (steps.length === 0) throw new ProviderOutputError(`The ${input.providerId} provider returned no executable read-only steps.`);
  return agentPlanSchema.parse({ ...parsed.data, steps });
}

export function normalizeProviderReport(raw: unknown, input: { evidenceIds: string[]; providerId: ProviderId }): ReportDraft {
  const parsed = reportDraftSchema.safeParse({ ...raw as Record<string, unknown>, providerId: input.providerId });
  if (!parsed.success) throw new ProviderOutputError(`The ${input.providerId} provider returned an invalid report shape.`, parsed.error);

  const allowed = new Set(input.evidenceIds);
  const references = [
    ...parsed.data.known,
    ...parsed.data.uncertainties,
    ...parsed.data.nextActions,
  ];
  for (const reference of references) {
    for (const evidenceId of reference.evidenceIds) {
      if (!allowed.has(evidenceId)) throw new ProviderOutputError(`The ${input.providerId} provider referenced an unknown evidence ID.`);
    }
  }
  return parsed.data;
}
