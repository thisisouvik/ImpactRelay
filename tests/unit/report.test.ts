import { describe, expect, it } from "vitest";
import { buildRulesReport } from "@/lib/agent/report";
import type { CaseRecord, EvidenceItem } from "@/lib/domain/schemas";

const record: CaseRecord = {
  id: "99999999-9999-4999-8999-999999999999",
  title: "Shelter review",
  requestText: "Find nearby shelters after heavy rain and prepare a volunteer checklist.",
  status: "report-ready",
  mode: "rules",
  budget: { capUsd: "0.05", spentUsd: "0", reservedUsd: "0" },
  createdAt: "2026-10-18T10:00:00.000Z",
  updatedAt: "2026-10-18T10:01:00.000Z",
  events: [],
  evidence: [],
};

const evidence: EvidenceItem[] = [{
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  caseId: record.id,
  sourceType: "free-tool",
  sourceName: "OpenStreetMap Overpass",
  sourceUrl: "https://overpass-api.de/api/interpreter",
  retrievedAt: "2026-10-18T10:01:00.000Z",
  freshness: "live",
  summary: "Found 2 mapped public resources within 5 km. Availability was not verified.",
  confidence: "medium",
  contentHash: "a".repeat(64),
  metadata: { toolId: "resources.nearby", resourceCount: 2, availabilityVerified: false },
}];

describe("transparent Rules report", () => {
  it("keeps facts, human actions, and uncertainty separate", () => {
    const report = buildRulesReport(record, evidence);

    expect(report.providerId).toBe("rules");
    expect(report.known[0].evidenceIds).toEqual([evidence[0].id]);
    expect(report.nextActions[0].action).toContain("Call or visit");
    expect(report.uncertainties.some((item) => item.text.includes("availability"))).toBe(true);
  });
});
