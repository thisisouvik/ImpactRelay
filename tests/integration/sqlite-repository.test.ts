import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { SQLiteCaseRepository } from "@/lib/db/sqlite-repository";

const repositories: SQLiteCaseRepository[] = [];

afterEach(() => {
  for (const repository of repositories.splice(0)) repository.close();
});

describe("SQLite case repository", () => {
  it("persists a case, its plan, and its lifecycle events", () => {
    const directory = mkdtempSync(join(tmpdir(), "impactrelay-"));
    const repository = new SQLiteCaseRepository(join(directory, "case.sqlite"));
    repositories.push(repository);

    const record = repository.createCase({
      title: "Persisted support request",
      requestText: "Store this request and prepare a bounded plan from the submitted text.",
      mode: "rules",
      budgetCapUsd: "0.05",
    });
    repository.updateStatus(record.id, "planning");
    const saved = repository.savePlan(record.id, {
      objective: record.title,
      constraints: ["Use only source-backed claims."],
      steps: [{
        id: "55555555-5555-4555-8555-555555555555",
        toolId: "public.source.read",
        purpose: "Read public guidance.",
        input: { requestText: record.requestText },
        requiresPayment: false,
        requiresApproval: false,
        status: "ready",
      }],
    });

    expect(saved.status).toBe("plan-ready");
    expect(repository.getCase(record.id)?.plan?.steps).toHaveLength(1);
    expect(repository.getCase(record.id)?.events.length).toBeGreaterThanOrEqual(1);
  });
});
