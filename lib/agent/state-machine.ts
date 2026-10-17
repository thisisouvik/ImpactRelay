import type { CaseStatus } from "@/lib/domain/schemas";

const transitions: Record<CaseStatus, readonly CaseStatus[]> = {
  received: ["planning", "paused", "failed"],
  planning: ["plan-ready", "paused", "failed"],
  "plan-ready": ["running-free-tools", "paused", "failed"],
  "running-free-tools": ["payment-required", "validating-evidence", "paused", "blocked", "failed"],
  "payment-required": ["running-paid-tool", "validating-evidence", "paused", "blocked", "failed"],
  "running-paid-tool": ["validating-evidence", "paused", "blocked", "failed"],
  "validating-evidence": ["report-ready", "paused", "failed"],
  "report-ready": ["completed", "paused", "failed"],
  completed: [],
  paused: ["planning", "plan-ready", "running-free-tools", "payment-required", "running-paid-tool", "validating-evidence", "report-ready", "failed"],
  blocked: ["paused", "failed"],
  failed: ["received", "planning"],
};

export function canTransition(from: CaseStatus, to: CaseStatus) {
  return transitions[from].includes(to);
}

export function assertTransition(from: CaseStatus, to: CaseStatus) {
  if (!canTransition(from, to)) {
    throw new Error(`Illegal case transition: ${from} → ${to}`);
  }
}

export function nextPlanStatus(status: CaseStatus): CaseStatus {
  assertTransition(status, "planning");
  return "planning";
}
