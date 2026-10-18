import type {
  AgentPlan,
  CaseEvent,
  CaseRecord,
  CaseRequest,
  CaseStatus,
  EvidenceItem,
  ReportDraft,
} from "@/lib/domain/schemas";

export type MaybePromise<T> = T | Promise<T>;

export interface CaseRepository {
  createCase(input: CaseRequest, ownerTokenHash?: string): MaybePromise<CaseRecord>;
  getCase(id: string, ownerTokenHash?: string): MaybePromise<CaseRecord | null>;
  listCases(ownerTokenHash?: string): MaybePromise<CaseRecord[]>;
  updateStatus(id: string, status: CaseStatus): MaybePromise<CaseRecord>;
  savePlan(id: string, plan: AgentPlan): MaybePromise<CaseRecord>;
  updatePlan(id: string, plan: AgentPlan): MaybePromise<CaseRecord>;
  appendEvent(event: CaseEvent): MaybePromise<void>;
  saveEvidence(item: EvidenceItem): MaybePromise<void>;
  saveReport(id: string, report: ReportDraft): MaybePromise<CaseRecord>;
}
