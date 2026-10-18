import { describe, expect, it } from "vitest";
import { buildPlan } from "@/lib/agent/planner";
import type { CaseRecord } from "@/lib/domain/schemas";

const record: CaseRecord = {
  id: "44444444-4444-4444-8444-444444444444",
  title: "Weather and translation request",
  requestText: "Check the weather near the affected area and translate the support checklist into English and Assamese.",
  status: "planning",
  mode: "rules",
  budget: { capUsd: "0.05", spentUsd: "0", reservedUsd: "0" },
  createdAt: "2026-10-17T10:00:00.000Z",
  updatedAt: "2026-10-17T10:00:00.000Z",
  events: [],
  evidence: [],
};

describe("rules planner", () => {
  it("derives real tool steps from the submitted request", () => {
    const plan = buildPlan(record);
    const toolIds = plan.steps.map((step) => step.toolId);

    expect(toolIds).toEqual([
      "location.lookup",
      "weather.current",
    ]);
    expect(plan.steps.every((step) => step.status === "ready")).toBe(true);
  });

  it("adds nearby resource discovery after location resolution", () => {
    const plan = buildPlan({
      ...record,
      title: "Find local shelters",
      requestText: "Find nearby shelters and public water resources near Guwahati for a volunteer.",
    });

    expect(plan.steps.map((step) => step.toolId)).toEqual([
      "location.lookup",
      "resources.nearby",
    ]);
  });
});
