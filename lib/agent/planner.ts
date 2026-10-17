import { randomUUID } from "node:crypto";
import { agentPlanSchema, type AgentPlan, type CaseRecord } from "@/lib/domain/schemas";

function hasLanguageRequest(requestText: string) {
  return /bilingual|translate|translation|language|assamese|hindi|english/i.test(requestText);
}

function hasLocationRequest(requestText: string) {
  return /near|around|location|shelter|relief|where|address|district|city/i.test(requestText);
}

function hasWeatherRequest(requestText: string) {
  return /weather|rain|flood|storm|forecast|risk|disruption/i.test(requestText);
}

export function buildPlan(caseRecord: CaseRecord): AgentPlan {
  const steps = [];

  if (hasLocationRequest(caseRecord.requestText)) {
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

  steps.push({
    id: randomUUID(),
    toolId: "public.source.read",
    purpose: "Read allow-listed public guidance relevant to the request.",
    input: { requestText: caseRecord.requestText },
    requiresPayment: false,
    requiresApproval: false,
    status: "ready" as const,
  });

  if (hasLanguageRequest(caseRecord.requestText)) {
    steps.push({
      id: randomUUID(),
      toolId: "text.localize",
      purpose: "Prepare the requested language version after source facts are collected.",
      input: { requestText: caseRecord.requestText },
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
