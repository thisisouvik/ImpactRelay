import type {
  AgentPlan,
  CaseEvent,
  CaseRecord,
  CaseRequest,
  CaseStatus,
  EvidenceItem,
} from "@/lib/domain/schemas";

export interface CaseRepository {
  createCase(input: CaseRequest): CaseRecord;
  getCase(id: string): CaseRecord | null;
  updateStatus(id: string, status: CaseStatus): CaseRecord;
  savePlan(id: string, plan: AgentPlan): CaseRecord;
  appendEvent(event: CaseEvent): void;
  saveEvidence(item: EvidenceItem): void;
}
