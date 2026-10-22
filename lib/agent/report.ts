import type { CaseRecord, EvidenceItem, ReportDraft } from "@/lib/domain/schemas";

function evidenceIds(evidence: EvidenceItem[]) {
  return evidence.map((item) => item.id);
}

export function buildRulesReport(caseRecord: CaseRecord, evidence: EvidenceItem[]): ReportDraft {
  const ids = evidenceIds(evidence);
  const byTool = new Map(evidence.map((item) => [item.metadata?.toolId, item]));
  const known = evidence.slice(0, 10).map((item) => ({
    text: item.summary,
    evidenceIds: [item.id],
  }));
  const nextActions = [
    {
      priority: "01",
      action: "Review the source links and confirm the most relevant finding with a local human contact.",
      rationale: "Public data can be delayed, incomplete, or different from conditions on the ground.",
      evidenceIds: ids.slice(0, 10),
    },
  ];

  if (byTool.get("resources.nearby") || evidence.some((item) => item.sourceName.includes("Overpass"))) {
    nextActions.unshift({
      priority: "00",
      action: "Call or visit the most relevant mapped resource before directing anyone there.",
      rationale: "The map identifies public locations, but does not verify current capacity, safety, or opening status.",
      evidenceIds: evidence.filter((item) => item.sourceName.includes("Overpass")).map((item) => item.id),
    });
  }

  const uncertainties = [
    {
      text: "Current availability, capacity, and on-the-ground safety were not verified by these public sources.",
      evidenceIds: ids.slice(0, 10),
    },
    {
      text: `This transparent Rules report was derived from ${evidence.length} validated source signal${evidence.length === 1 ? "" : "s"}; it is not a model-generated conclusion.`,
      evidenceIds: [],
    },
  ];

  const failedTools = caseRecord.events
    .filter((event) => event.eventType === "tool.failed" || event.eventType === "tool.blocked")
    .map((event) => event.message);
  if (failedTools.length > 0) {
    uncertainties.unshift({
      text: `A live tool did not complete: ${failedTools.join(" ")}`,
      evidenceIds: [],
    });
  }

  return {
    summary: `ImpactRelay reviewed ${evidence.length} validated public signal${evidence.length === 1 ? "" : "s"} for “${caseRecord.title}”. The brief separates retrieved facts from human verification steps and does not invent missing information.`,
    known,
    nextActions: nextActions.slice(0, 10),
    uncertainties,
    providerId: "rules",
  };
}
