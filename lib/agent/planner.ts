import { randomUUID } from "node:crypto";
import { agentPlanSchema, type AgentPlan, type CaseRecord } from "@/lib/domain/schemas";

function hasLocationRequest(requestText: string) {
  return /near|around|location|shelter|relief|where|address|district|city/i.test(requestText);
}

function hasWeatherRequest(requestText: string) {
  return /weather|rain|flood|storm|forecast|risk|disruption/i.test(requestText);
}

function hasResourceRequest(requestText: string) {
  return /shelter|hospital|clinic|food|water|relief|supplies|resource|community|nearby|safe place/i.test(requestText);
}

function extractUrls(requestText: string) {
  return requestText.match(/https:\/\/[^\s<>()]+/gi)?.map((url) => url.replace(/[),.;!?]+$/, "")) ?? [];
}

export function buildPlan(caseRecord: CaseRecord): AgentPlan {
  const steps = [];

  if (hasLocationRequest(caseRecord.requestText) || hasWeatherRequest(caseRecord.requestText)) {
    steps.push({
      id: randomUUID(),
      toolId: "location.lookup",
      purpose: "Resolve the place and nearby public resources named or implied in the request.",
      input: { requestText: caseRecord.requestText },
      requiresPayment: false,
      requiresApproval: false,
      status: "ready" as const,
    });
  }

  if (hasResourceRequest(caseRecord.requestText)) {
    steps.push({
      id: randomUUID(),
      toolId: "resources.nearby",
      purpose: "Find nearby mapped public resources without claiming that availability or opening status is verified.",
      input: { requestText: caseRecord.requestText },
      requiresPayment: false,
      requiresApproval: false,
      status: "ready" as const,
    });
  }

  if (hasWeatherRequest(caseRecord.requestText)) {
    steps.push({
      id: randomUUID(),
      toolId: "weather.current",
      purpose: "Retrieve current weather context relevant to the request.",
      input: { requestText: caseRecord.requestText },
      requiresPayment: false,
      requiresApproval: false,
      status: "ready" as const,
    });
  }

  const sourceUrls = extractUrls(caseRecord.requestText);
  if (sourceUrls.length > 0) {
    steps.push({
      id: randomUUID(),
      toolId: "public.source.read",
      purpose: "Read the allow-listed public sources supplied in the request.",
      input: { urls: sourceUrls },
      requiresPayment: false,
      requiresApproval: false,
      status: "ready" as const,
    });
  }

  const plan = {
    objective: caseRecord.title,
    constraints: [
      "Use only source-backed claims in the final report.",
      "Run free read-only checks before proposing any paid step.",
      "Pause for human review before side effects or spending.",
    ],
    steps,
  } satisfies AgentPlan;

  return agentPlanSchema.parse(plan);
}
