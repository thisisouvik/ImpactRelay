import { z } from "zod";

export const caseModeSchema = z.enum(["rules", "local", "grok", "0g"]);

export const caseStatusSchema = z.enum([
  "received",
  "planning",
  "plan-ready",
  "running-free-tools",
  "payment-required",
  "running-paid-tool",
  "validating-evidence",
  "report-ready",
  "completed",
  "paused",
  "blocked",
  "failed",
]);

export const stepStatusSchema = z.enum([
  "pending",
  "ready",
  "running",
  "completed",
  "blocked",
  "failed",
]);

export const eventStatusSchema = z.enum(["info", "active", "complete", "warning", "error"]);

export const budgetSchema = z.object({
  capUsd: z.string().regex(/^\d+(\.\d{1,6})?$/, "Budget must be a decimal-safe amount"),
  spentUsd: z.string().regex(/^\d+(\.\d{1,6})?$/, "Spent amount must be decimal-safe"),
  reservedUsd: z.string().regex(/^\d+(\.\d{1,6})?$/, "Reserved amount must be decimal-safe"),
});

export const caseRequestSchema = z.object({
  title: z.string().trim().min(3).max(120),
  requestText: z.string().trim().min(20).max(10_000),
  mode: caseModeSchema.default("rules"),
  budgetCapUsd: z.string().regex(/^\d+(\.\d{1,6})?$/).default("0.05"),
});

export const agentStepSchema = z.object({
  id: z.string().min(1),
  toolId: z.string().min(1),
  purpose: z.string().min(1).max(500),
  input: z.record(z.string(), z.unknown()),
  requiresPayment: z.boolean(),
  estimatedCostUsd: z.string().regex(/^\d+(\.\d{1,6})?$/).optional(),
  requiresApproval: z.boolean(),
  status: stepStatusSchema,
});

export const agentPlanSchema = z.object({
  objective: z.string().min(1).max(500),
  constraints: z.array(z.string().min(1).max(300)).max(20),
  steps: z.array(agentStepSchema).min(1).max(12),
});

export const caseEventSchema = z.object({
  id: z.string().min(1),
  caseId: z.string().min(1),
  eventType: z.string().min(1),
  actor: z.enum(["user", "system", "planner", "tool", "paid-service"]),
  status: eventStatusSchema,
  message: z.string().min(1).max(1_000),
  occurredAt: z.string().datetime(),
});

export const evidenceItemSchema = z.object({
  id: z.string().min(1),
  caseId: z.string().min(1),
  sourceType: z.enum(["user", "free-tool", "paid-tool", "model"]),
  sourceName: z.string().min(1),
  sourceUrl: z.string().url().optional(),
  retrievedAt: z.string().datetime(),
  freshness: z.enum(["live", "recent", "stale", "unknown"]),
  summary: z.string().min(1).max(2_000),
  confidence: z.enum(["high", "medium", "low"]),
  contentHash: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const reportEvidenceReferenceSchema = z.object({
  text: z.string().min(1).max(1_000),
  evidenceIds: z.array(z.string().min(1)).max(10),
});

export const reportActionSchema = z.object({
  priority: z.string().min(1).max(20),
  action: z.string().min(1).max(500),
  rationale: z.string().min(1).max(1_000),
  evidenceIds: z.array(z.string().min(1)).max(10),
});

export const reportDraftSchema = z.object({
  summary: z.string().min(1).max(2_000),
  known: z.array(reportEvidenceReferenceSchema).max(10),
  nextActions: z.array(reportActionSchema).max(10),
  uncertainties: z.array(reportEvidenceReferenceSchema).max(10),
  providerId: z.enum(["rules", "grok", "local", "0g"]),
});

export const planRequestSchema = z.object({
  caseId: z.string().uuid(),
});

export const caseIdSchema = z.object({
  caseId: z.string().uuid(),
});

export type CaseMode = z.infer<typeof caseModeSchema>;
export type CaseStatus = z.infer<typeof caseStatusSchema>;
export type StepStatus = z.infer<typeof stepStatusSchema>;
export type Budget = z.infer<typeof budgetSchema>;
export type CaseRequest = z.infer<typeof caseRequestSchema>;
export type AgentStep = z.infer<typeof agentStepSchema>;
export type AgentPlan = z.infer<typeof agentPlanSchema>;
export type CaseEvent = z.infer<typeof caseEventSchema>;
export type EvidenceItem = z.infer<typeof evidenceItemSchema>;
export type ReportDraft = z.infer<typeof reportDraftSchema>;

export type CaseRecord = {
  id: string;
  title: string;
  requestText: string;
  status: CaseStatus;
  mode: CaseMode;
  budget: Budget;
  createdAt: string;
  updatedAt: string;
  plan?: AgentPlan;
  events: CaseEvent[];
  evidence: EvidenceItem[];
  report?: ReportDraft;
};
