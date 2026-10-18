import "server-only";

import { neon } from "@neondatabase/serverless";
import { randomUUID } from "node:crypto";
import { assertTransition } from "@/lib/agent/state-machine";
import {
  agentPlanSchema,
  budgetSchema,
  caseEventSchema,
  caseRequestSchema,
  caseStatusSchema,
  evidenceItemSchema,
  reportDraftSchema,
  type AgentPlan,
  type CaseEvent,
  type CaseRecord,
  type CaseRequest,
  type CaseStatus,
  type EvidenceItem,
  type ReportDraft,
} from "@/lib/domain/schemas";
import type { CaseRepository } from "@/lib/db/repository";

type NeonSql = ReturnType<typeof neon>;

type CaseRow = {
  id: string;
  title: string;
  request_text: string;
  status: string;
  mode: string;
  cap_usd: string;
  spent_usd: string;
  reserved_usd: string;
  created_at: string;
  updated_at: string;
  plan_json: string | null;
  report_json: string | null;
  owner_token_hash: string | null;
};

type EventRow = {
  id: string;
  case_id: string;
  event_type: string;
  actor: string;
  status: string;
  message: string;
  occurred_at: string;
};

type EvidenceRow = {
  id: string;
  case_id: string;
  source_type: string;
  source_name: string;
  source_url: string | null;
  retrieved_at: string;
  freshness: string;
  summary: string;
  confidence: string;
  content_hash: string;
  metadata_json: unknown;
};

const schemaSql = `
CREATE TABLE IF NOT EXISTS cases (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  request_text TEXT NOT NULL,
  status TEXT NOT NULL,
  mode TEXT NOT NULL,
  cap_usd TEXT NOT NULL,
  spent_usd TEXT NOT NULL,
  reserved_usd TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  plan_json JSONB,
  report_json JSONB,
  owner_token_hash TEXT
);
ALTER TABLE cases ADD COLUMN IF NOT EXISTS owner_token_hash TEXT;
CREATE TABLE IF NOT EXISTS case_events (
  id UUID PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  actor TEXT NOT NULL,
  status TEXT NOT NULL,
  message TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE IF NOT EXISTS evidence_items (
  id UUID PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL,
  source_name TEXT NOT NULL,
  source_url TEXT,
  retrieved_at TIMESTAMPTZ NOT NULL,
  freshness TEXT NOT NULL,
  summary TEXT NOT NULL,
  confidence TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  metadata_json JSONB
);
CREATE INDEX IF NOT EXISTS case_events_case_id_idx ON case_events(case_id, occurred_at);
CREATE INDEX IF NOT EXISTS evidence_items_case_id_idx ON evidence_items(case_id, retrieved_at);
`;

function parseJson<T>(value: T | string | null): T | null {
  if (value === null || value === undefined) return null;
  return typeof value === "string" ? JSON.parse(value) as T : value;
}

export class NeonCaseRepository implements CaseRepository {
  private readonly sql: NeonSql;
  private initialized: Promise<void> | undefined;

  constructor(connectionString = process.env.DATABASE_URL) {
    if (!connectionString) throw new Error("DATABASE_URL is required for Neon persistence.");
    this.sql = neon(connectionString);
  }

  private ensureSchema() {
    this.initialized ??= this.sql.query(schemaSql).then(() => undefined);
    return this.initialized;
  }

  private async hydrate(row: CaseRow): Promise<CaseRecord> {
    await this.ensureSchema();
    const events = await this.sql`SELECT id, case_id, event_type, actor, status, message, occurred_at FROM case_events WHERE case_id = ${row.id} ORDER BY occurred_at ASC` as unknown as EventRow[];
    const evidence = await this.sql`SELECT id, case_id, source_type, source_name, source_url, retrieved_at, freshness, summary, confidence, content_hash, metadata_json FROM evidence_items WHERE case_id = ${row.id} ORDER BY retrieved_at ASC` as unknown as EvidenceRow[];
    const plan = parseJson<AgentPlan>(row.plan_json);
    const report = parseJson<ReportDraft>(row.report_json);

    return {
      id: row.id,
      title: row.title,
      requestText: row.request_text,
      status: caseStatusSchema.parse(row.status),
      mode: row.mode as CaseRecord["mode"],
      budget: budgetSchema.parse({ capUsd: row.cap_usd, spentUsd: row.spent_usd, reservedUsd: row.reserved_usd }),
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
      plan: plan ? agentPlanSchema.parse(plan) : undefined,
      report: report ? reportDraftSchema.parse(report) : undefined,
      events: events.map((event: EventRow) => caseEventSchema.parse({
        id: event.id,
        caseId: event.case_id,
        eventType: event.event_type,
        actor: event.actor,
        status: event.status,
        message: event.message,
        occurredAt: new Date(event.occurred_at).toISOString(),
      })),
      evidence: evidence.map((item: EvidenceRow) => evidenceItemSchema.parse({
        id: item.id,
        caseId: item.case_id,
        sourceType: item.source_type,
        sourceName: item.source_name,
        sourceUrl: item.source_url ?? undefined,
        retrievedAt: new Date(item.retrieved_at).toISOString(),
        freshness: item.freshness,
        summary: item.summary,
        confidence: item.confidence,
        contentHash: item.content_hash,
        metadata: parseJson(item.metadata_json) ?? undefined,
      })),
    };
  }

  async createCase(input: CaseRequest, ownerTokenHash?: string) {
    await this.ensureSchema();
    const request = caseRequestSchema.parse(input);
    const id = randomUUID();
    const now = new Date().toISOString();
    const budget = budgetSchema.parse({ capUsd: request.budgetCapUsd, spentUsd: "0", reservedUsd: "0" });
    await this.sql`INSERT INTO cases (id, title, request_text, status, mode, cap_usd, spent_usd, reserved_usd, created_at, updated_at, owner_token_hash) VALUES (${id}, ${request.title}, ${request.requestText}, 'received', ${request.mode}, ${budget.capUsd}, ${budget.spentUsd}, ${budget.reservedUsd}, ${now}, ${now}, ${ownerTokenHash ?? null})`;
    await this.appendEvent({ id: randomUUID(), caseId: id, eventType: "case.received", actor: "user", status: "info", message: "Case received and stored in Neon.", occurredAt: now });
    return (await this.getCase(id)) as CaseRecord;
  }

  async getCase(id: string, ownerTokenHash?: string) {
    await this.ensureSchema();
    const rows = ownerTokenHash
      ? await this.sql`SELECT * FROM cases WHERE id = ${id} AND owner_token_hash = ${ownerTokenHash} LIMIT 1` as unknown as CaseRow[]
      : await this.sql`SELECT * FROM cases WHERE id = ${id} LIMIT 1` as unknown as CaseRow[];
    return rows[0] ? this.hydrate(rows[0]) : null;
  }

  async listCases(ownerTokenHash?: string) {
    await this.ensureSchema();
    const rows = ownerTokenHash
      ? await this.sql`SELECT * FROM cases WHERE owner_token_hash = ${ownerTokenHash} ORDER BY updated_at DESC` as unknown as CaseRow[]
      : await this.sql`SELECT * FROM cases ORDER BY updated_at DESC` as unknown as CaseRow[];
    return Promise.all(rows.map((row: CaseRow) => this.hydrate(row)));
  }

  async updateStatus(id: string, status: CaseStatus) {
    const current = await this.getCase(id);
    if (!current) throw new Error("Case not found");
    assertTransition(current.status, status);
    const now = new Date().toISOString();
    await this.sql`UPDATE cases SET status = ${status}, updated_at = ${now} WHERE id = ${id}`;
    return (await this.getCase(id)) as CaseRecord;
  }

  async savePlan(id: string, plan: AgentPlan) {
    const current = await this.getCase(id);
    if (!current) throw new Error("Case not found");
    if (current.status !== "planning") assertTransition(current.status, "planning");
    const parsed = agentPlanSchema.parse(plan);
    const now = new Date().toISOString();
    await this.sql`UPDATE cases SET status = 'plan-ready', plan_json = ${JSON.stringify(parsed)}::jsonb, updated_at = ${now} WHERE id = ${id}`;
    return (await this.getCase(id)) as CaseRecord;
  }

  async updatePlan(id: string, plan: AgentPlan) {
    const parsed = agentPlanSchema.parse(plan);
    const now = new Date().toISOString();
    await this.sql`UPDATE cases SET plan_json = ${JSON.stringify(parsed)}::jsonb, updated_at = ${now} WHERE id = ${id}`;
    return (await this.getCase(id)) as CaseRecord;
  }

  async appendEvent(event: CaseEvent) {
    const parsed = caseEventSchema.parse(event);
    await this.ensureSchema();
    await this.sql`INSERT INTO case_events (id, case_id, event_type, actor, status, message, occurred_at) VALUES (${parsed.id}, ${parsed.caseId}, ${parsed.eventType}, ${parsed.actor}, ${parsed.status}, ${parsed.message}, ${parsed.occurredAt})`;
  }

  async saveEvidence(item: EvidenceItem) {
    const parsed = evidenceItemSchema.parse(item);
    await this.ensureSchema();
    await this.sql`INSERT INTO evidence_items (id, case_id, source_type, source_name, source_url, retrieved_at, freshness, summary, confidence, content_hash, metadata_json) VALUES (${parsed.id}, ${parsed.caseId}, ${parsed.sourceType}, ${parsed.sourceName}, ${parsed.sourceUrl ?? null}, ${parsed.retrievedAt}, ${parsed.freshness}, ${parsed.summary}, ${parsed.confidence}, ${parsed.contentHash}, ${parsed.metadata ? JSON.stringify(parsed.metadata) : null}::jsonb)`;
  }

  async saveReport(id: string, report: ReportDraft) {
    const parsed = reportDraftSchema.parse(report);
    const now = new Date().toISOString();
    await this.sql`UPDATE cases SET report_json = ${JSON.stringify(parsed)}::jsonb, updated_at = ${now} WHERE id = ${id}`;
    return (await this.getCase(id)) as CaseRecord;
  }
}

let productionRepository: CaseRepository | undefined;

export function getProductionCaseRepository(): CaseRepository {
  if (process.env.DATABASE_URL) {
    productionRepository ??= new NeonCaseRepository();
  } else {
    // Loaded lazily so local rules mode remains usable without Neon packages configured.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getSQLiteCaseRepository } = require("@/lib/db/sqlite-repository") as typeof import("@/lib/db/sqlite-repository");
    productionRepository ??= getSQLiteCaseRepository();
  }
  return productionRepository;
}
