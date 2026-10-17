import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { assertTransition } from "@/lib/agent/state-machine";
import {
  agentPlanSchema,
  budgetSchema,
  caseEventSchema,
  caseRequestSchema,
  caseStatusSchema,
  evidenceItemSchema,
  type AgentPlan,
  type CaseEvent,
  type CaseRecord,
  type CaseRequest,
  type CaseStatus,
  type EvidenceItem,
} from "@/lib/domain/schemas";
import type { CaseRepository } from "@/lib/db/repository";

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
  summary: string;
  confidence: string;
  content_hash: string;
};

const schemaSql = `
  CREATE TABLE IF NOT EXISTS cases (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    request_text TEXT NOT NULL,
    status TEXT NOT NULL,
    mode TEXT NOT NULL,
    cap_usd TEXT NOT NULL,
    spent_usd TEXT NOT NULL,
    reserved_usd TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    plan_json TEXT
  );

  CREATE TABLE IF NOT EXISTS case_events (
    id TEXT PRIMARY KEY NOT NULL,
    case_id TEXT NOT NULL REFERENCES cases(id),
    event_type TEXT NOT NULL,
    actor TEXT NOT NULL,
    status TEXT NOT NULL,
    message TEXT NOT NULL,
    occurred_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS evidence_items (
    id TEXT PRIMARY KEY NOT NULL,
    case_id TEXT NOT NULL REFERENCES cases(id),
    source_type TEXT NOT NULL,
    source_name TEXT NOT NULL,
    source_url TEXT,
    retrieved_at TEXT NOT NULL,
    summary TEXT NOT NULL,
    confidence TEXT NOT NULL,
    content_hash TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS case_events_case_id_idx ON case_events(case_id, occurred_at);
  CREATE INDEX IF NOT EXISTS evidence_items_case_id_idx ON evidence_items(case_id, retrieved_at);
`;

function databasePath() {
  const configuredPath = process.env.IMPACTRELAY_DB_PATH;
  return configuredPath && configuredPath.length > 0
    ? configuredPath
    : join(process.cwd(), "data", "impactrelay.sqlite");
}

function parsePlan(value: string | null): AgentPlan | undefined {
  if (!value) return undefined;
  return agentPlanSchema.parse(JSON.parse(value));
}

export class SQLiteCaseRepository implements CaseRepository {
  private readonly database: DatabaseSync;

  constructor(path = databasePath()) {
    mkdirSync(dirname(path), { recursive: true });
    this.database = new DatabaseSync(path);
    this.database.exec("PRAGMA foreign_keys = ON;");
    this.database.exec(schemaSql);
  }

  createCase(input: CaseRequest): CaseRecord {
    const request = caseRequestSchema.parse(input);
    const now = new Date().toISOString();
    const id = randomUUID();
    const budget = budgetSchema.parse({
      capUsd: request.budgetCapUsd,
      spentUsd: "0",
      reservedUsd: "0",
    });

    this.database.prepare(`
      INSERT INTO cases (id, title, request_text, status, mode, cap_usd, spent_usd, reserved_usd, created_at, updated_at, plan_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
    `).run(
      id,
      request.title,
      request.requestText,
      "received",
      request.mode,
      budget.capUsd,
      budget.spentUsd,
      budget.reservedUsd,
      now,
      now,
    );

    this.appendEvent({
      id: randomUUID(),
      caseId: id,
      eventType: "case.received",
      actor: "user",
      status: "info",
      message: "Case received and stored locally.",
      occurredAt: now,
    });

    return this.getCase(id) as CaseRecord;
  }

  getCase(id: string): CaseRecord | null {
    const row = this.database.prepare("SELECT * FROM cases WHERE id = ?").get<CaseRow>(id);
    if (!row) return null;

    const events = this.database
      .prepare("SELECT * FROM case_events WHERE case_id = ? ORDER BY occurred_at ASC")
      .all<EventRow>(id)
      .map((event) => caseEventSchema.parse({
        id: event.id,
        caseId: event.case_id,
        eventType: event.event_type,
        actor: event.actor,
        status: event.status,
        message: event.message,
        occurredAt: event.occurred_at,
      }));

    const evidence = this.database
      .prepare("SELECT * FROM evidence_items WHERE case_id = ? ORDER BY retrieved_at ASC")
      .all<EvidenceRow>(id)
      .map((item) => evidenceItemSchema.parse({
        id: item.id,
        caseId: item.case_id,
        sourceType: item.source_type,
        sourceName: item.source_name,
        sourceUrl: item.source_url ?? undefined,
        retrievedAt: item.retrieved_at,
        summary: item.summary,
        confidence: item.confidence,
        contentHash: item.content_hash,
      }));

    return {
      id: row.id,
      title: row.title,
      requestText: row.request_text,
      status: caseStatusSchema.parse(row.status),
      mode: row.mode as CaseRecord["mode"],
      budget: budgetSchema.parse({
        capUsd: row.cap_usd,
        spentUsd: row.spent_usd,
        reservedUsd: row.reserved_usd,
      }),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      plan: parsePlan(row.plan_json),
      events,
      evidence,
    };
  }

  updateStatus(id: string, status: CaseStatus): CaseRecord {
    const current = this.getCase(id);
    if (!current) throw new Error("Case not found");
    assertTransition(current.status, status);

    const now = new Date().toISOString();
    this.database.prepare("UPDATE cases SET status = ?, updated_at = ? WHERE id = ?").run(status, now, id);
    return this.getCase(id) as CaseRecord;
  }

  savePlan(id: string, plan: AgentPlan): CaseRecord {
    const current = this.getCase(id);
    if (!current) throw new Error("Case not found");
    const parsedPlan = agentPlanSchema.parse(plan);

    if (current.status !== "planning") {
      assertTransition(current.status, "planning");
    }

    const now = new Date().toISOString();
    this.database.prepare("UPDATE cases SET status = ?, plan_json = ?, updated_at = ? WHERE id = ?").run(
      "plan-ready",
      JSON.stringify(parsedPlan),
      now,
      id,
    );
    return this.getCase(id) as CaseRecord;
  }

  appendEvent(event: CaseEvent) {
    const parsed = caseEventSchema.parse(event);
    this.database.prepare(`
      INSERT INTO case_events (id, case_id, event_type, actor, status, message, occurred_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      parsed.id,
      parsed.caseId,
      parsed.eventType,
      parsed.actor,
      parsed.status,
      parsed.message,
      parsed.occurredAt,
    );
  }

  saveEvidence(item: EvidenceItem) {
    const parsed = evidenceItemSchema.parse(item);
    this.database.prepare(`
      INSERT INTO evidence_items (id, case_id, source_type, source_name, source_url, retrieved_at, summary, confidence, content_hash)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      parsed.id,
      parsed.caseId,
      parsed.sourceType,
      parsed.sourceName,
      parsed.sourceUrl ?? null,
      parsed.retrievedAt,
      parsed.summary,
      parsed.confidence,
      parsed.contentHash,
    );
  }

  close() {
    this.database.close();
  }
}

let repository: SQLiteCaseRepository | undefined;

export function getCaseRepository() {
  repository ??= new SQLiteCaseRepository();
  return repository;
}
