"use client";

import { FormEvent, useEffect, useState } from "react";
import { SectionHeading } from "@/components/ui/section-heading";
import { StatusBadge } from "@/components/ui/status-badge";
import { EvidenceList } from "@/components/evidence/evidence-list";
import { ImpactRelayLogo } from "@/components/brand/impactrelay-logo";
import type { AgentPlan, CaseMode, CaseRecord, CaseStatus } from "@/lib/domain/schemas";

type ApiPayload = {
  case?: CaseRecord;
  plan?: AgentPlan;
  error?: { code?: string; message?: string };
  execution?: string;
  reason?: string;
};

const statusCopy: Record<CaseStatus, string> = {
  received: "Received",
  planning: "Planning",
  "plan-ready": "Plan ready",
  "running-free-tools": "Running free tools",
  "payment-required": "Payment required",
  "running-paid-tool": "Running paid tool",
  "validating-evidence": "Validating evidence",
  "report-ready": "Evidence ready",
  completed: "Completed",
  paused: "Paused",
  blocked: "Blocked safely",
  failed: "Failed",
};

function statusTone(status: CaseStatus): "signal" | "field" | "amber" | "alert" | "muted" {
  if (["completed", "report-ready"].includes(status)) return "field";
  if (["blocked", "failed"].includes(status)) return "alert";
  if (["planning", "running-free-tools", "running-paid-tool"].includes(status)) return "signal";
  if (["payment-required", "paused"].includes(status)) return "amber";
  return "muted";
}

function readableToolName(toolId: string) {
  return toolId.replaceAll(".", " · ");
}

async function readPayload(response: Response) {
  return (await response.json()) as ApiPayload;
}

export function Workspace({ initialCaseId, forceNew = false }: { initialCaseId?: string; forceNew?: boolean } = {}) {
  const [caseRecord, setCaseRecord] = useState<CaseRecord | null>(null);
  const [title, setTitle] = useState("");
  const [requestText, setRequestText] = useState("");
  const [mode, setMode] = useState<CaseMode>("rules");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const storedId = forceNew ? null : initialCaseId ?? window.localStorage.getItem("impactrelay.currentCaseId");
    if (!storedId) return;

    fetch(`/api/cases/${storedId}`)
      .then((response) => response.ok ? response.json() as Promise<ApiPayload> : null)
      .then((payload) => {
        if (payload?.case) setCaseRecord(payload.case);
        else window.localStorage.removeItem("impactrelay.currentCaseId");
      })
      .catch(() => window.localStorage.removeItem("impactrelay.currentCaseId"));
  }, [forceNew, initialCaseId]);

  async function preparePlan(caseId: string) {
    const response = await fetch("/api/agent/plan", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ caseId }),
    });
    const payload = await readPayload(response);
    if (payload.case) {
      setCaseRecord(payload.case);
      window.localStorage.setItem("impactrelay.currentCaseId", payload.case.id);
    }
    if (!response.ok || !payload.case) {
      throw new Error(payload.error?.message ?? "The plan could not be created.");
    }
    return payload.case;
  }

  async function handleCreateCase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch("/api/cases", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title, requestText, mode, budgetCapUsd: "0.05" }),
      });
      const payload = await readPayload(response);
      if (payload.case) {
        setCaseRecord(payload.case);
        window.localStorage.setItem("impactrelay.currentCaseId", payload.case.id);
      }
      if (!response.ok || !payload.case) {
        throw new Error(payload.error?.message ?? "The case could not be saved.");
      }

      setCaseRecord(payload.case);
      window.localStorage.setItem("impactrelay.currentCaseId", payload.case.id);
      const plannedCase = await preparePlan(payload.case.id);
      setCaseRecord(plannedCase);
      setNotice("Case stored in local SQLite. The plan was generated from your request.");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "The case could not be created.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGeneratePlan() {
    if (!caseRecord) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const plannedCase = await preparePlan(caseRecord.id);
      setCaseRecord(plannedCase);
      setNotice("Plan generated from the stored case request.");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "The plan could not be created.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRun() {
    if (!caseRecord) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/agent/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ caseId: caseRecord.id }),
      });
      const payload = await readPayload(response);
      if (payload.case) {
        setCaseRecord(payload.case);
        window.localStorage.setItem("impactrelay.currentCaseId", payload.case.id);
      }
      if (!response.ok || !payload.case) {
        throw new Error(payload.error?.message ?? "The case could not be run.");
      }
      setCaseRecord(payload.case);
      setNotice(payload.execution === "completed"
        ? "Free tools completed. Evidence was validated and the report was stored when a real provider was configured."
        : "Execution stopped safely. Failed provider or tool output was not promoted to evidence.");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "The case could not be run.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handlePause() {
    if (!caseRecord) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/agent/pause", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ caseId: caseRecord.id }),
      });
      const payload = await readPayload(response);
      if (!response.ok || !payload.case) {
        throw new Error(payload.error?.message ?? "The case could not be paused.");
      }
      setCaseRecord(payload.case);
      setNotice("Case paused. Its request and event history remain stored locally.");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "The case could not be paused.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleExport() {
    if (!caseRecord) return;
    const response = await fetch(`/api/cases/${caseRecord.id}/export?format=json`);
    const payload = await response.blob();
    const url = URL.createObjectURL(payload);
    const link = document.createElement("a");
    link.href = url;
    link.download = `impactrelay-${caseRecord.id}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setNotice("The stored case record was exported as JSON.");
  }

  function resetWorkspace() {
    setCaseRecord(null);
    window.localStorage.removeItem("impactrelay.currentCaseId");
    setTitle("");
    setRequestText("");
    setMode("rules");
    setNotice(null);
    setError(null);
  }

  return (
    <div className="app-shell">
      <aside className="case-rail" aria-label="Case navigation">
        <div className="brand-lockup"><ImpactRelayLogo /></div>

        <button className="primary-button primary-button--rail" type="button" onClick={resetWorkspace}>
          <span className="button-symbol" aria-hidden="true">+</span>
          New case
        </button>

        <div className="rail-section">
          <p className="rail-label">Workspace</p>
          <div className="case-link case-link--active" aria-current="page">
            <span className="case-link__marker case-link__marker--field" aria-hidden="true" />
            <span>
              <strong>{caseRecord ? caseRecord.title : "No case selected"}</strong>
               <small>{caseRecord ? "Stored case" : "Create a case to begin"}</small>
            </span>
          </div>
        </div>

        <div className="rail-section rail-section--fixture">
          <div className="rail-label-row">
            <p className="rail-label">Execution mode</p>
             <StatusBadge label={caseRecord?.mode ?? mode} tone="signal" />
          </div>
          <p className="rail-footnote">The current planner uses the submitted request directly. No sample case or provider response is bundled.</p>
        </div>

        <div className="rail-spacer" />

        <div className="rail-footer">
          <div className="rail-status-line">
             <StatusBadge label="Local-first" tone="field" />
             <span className="mono-text">live</span>
          </div>
          <p className="rail-footnote">Do not enter real sensitive personal data in this development build.</p>
        </div>
      </aside>

      <div className="workspace-frame">
        <div className="mobile-bar">
           <div className="brand-lockup"><ImpactRelayLogo /></div>
           <StatusBadge label={caseRecord?.mode ?? mode} tone="field" />
        </div>

        {!caseRecord ? (
          <main className="new-case-view">
            <div className="new-case-intro">
              <p className="eyebrow">Start a real case record</p>
              <h1>Turn a messy request into a reviewable plan.</h1>
              <p>Enter the request you actually want to assess. ImpactRelay stores it locally, records the lifecycle, and derives a bounded plan without inventing source results.</p>
            </div>

            <form className="case-form" onSubmit={handleCreateCase}>
              <label htmlFor="case-title">Case title</label>
              <input
                id="case-title"
                name="title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                 placeholder="e.g. Volunteer resource request"
                required
                minLength={3}
                maxLength={120}
              />

              <div className="form-label-row">
                <label htmlFor="case-request">Support request</label>
                <span className="field-hint">20–10,000 characters</span>
              </div>
              <textarea
                id="case-request"
                name="requestText"
                value={requestText}
                onChange={(event) => setRequestText(event.target.value)}
                placeholder="Describe what needs to be checked, where it is happening, and what the volunteer needs next."
                required
                minLength={20}
                maxLength={10_000}
                rows={8}
              />

              <div className="form-label-row">
                <label htmlFor="case-mode">Planning provider</label>
                <span className="field-hint">Server-side selection</span>
              </div>
              <select id="case-mode" value={mode} onChange={(event) => setMode(event.target.value as CaseMode)}>
                <option value="rules">Rules planner · no external credentials</option>
                <option value="local">Local model · OpenAI-compatible server</option>
                <option value="grok">Grok · xAI API</option>
                <option value="0g">0G Compute · decentralized Router</option>
              </select>

              <div className="form-safety-note">
                <span aria-hidden="true">◎</span>
                <span>Use fictional or redacted information while this local development flow is being built.</span>
              </div>

              {error ? <div className="form-error" role="alert">{error}</div> : null}

              <div className="form-actions">
                <button className="primary-button" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Saving case…" : "Save case and prepare plan"}
                  <span aria-hidden="true">→</span>
                </button>
                <span className="action-caption">Persists to local SQLite · rules planner</span>
              </div>
            </form>

            <div className="integrity-note">
              <strong>What this phase does not do</strong>
              <span>It does not fabricate evidence, call external tools, send payments, or claim an AI provider result. Those capabilities will be added only with real adapters.</span>
            </div>
          </main>
        ) : (
          <main className="case-view">
            <header className="case-header">
              <div className="case-header__topline">
                <div className="breadcrumb">
                  <span>Community assistance</span>
                  <span aria-hidden="true">/</span>
                  <span className="breadcrumb__current">{caseRecord.id}</span>
                </div>
                <div className="header-actions">
                  <StatusBadge label={`${caseRecord.mode} mode`} tone="signal" />
                  <StatusBadge label="SQLite" tone="field" />
                  <button className="quiet-button" type="button" onClick={handlePause} disabled={isSubmitting}>
                    <span aria-hidden="true">Ⅱ</span>
                    Pause
                  </button>
                  <button className="quiet-button" type="button" onClick={handleExport}>
                    <span aria-hidden="true">↓</span>
                    Export
                  </button>
                </div>
              </div>

              <div className="case-view-title">
                <div>
                  <div className="case-title-row">
                    <span className="case-number mono-text">{caseRecord.id}</span>
                    <StatusBadge label={statusCopy[caseRecord.status]} tone={statusTone(caseRecord.status)} />
                  </div>
                  <h1>{caseRecord.title}</h1>
                  <p>Stored request and execution history. Results will appear only after a real tool adapter returns them.</p>
                </div>
                <div className="case-meta-card">
                  <span>Created</span>
                  <strong>{new Date(caseRecord.createdAt).toLocaleString()}</strong>
                  <small>Budget cap · ${caseRecord.budget.capUsd}</small>
                </div>
              </div>

              {notice ? <div className="notice-banner" role="status" aria-live="polite"><span className="notice-banner__icon" aria-hidden="true">i</span>{notice}</div> : null}
              {error ? <div className="form-error" role="alert">{error}</div> : null}
            </header>

            <div className="case-content-grid">
              <section className="case-main-column" aria-label="Case record">
                <section className="request-card" aria-labelledby="request-title">
                  <SectionHeading eyebrow="Original input" title="Support request" description="The source text is preserved as entered and is the only input to the current planner." />
                  <blockquote id="request-title">{caseRecord.requestText}</blockquote>
                </section>

                <section className="plan-card" aria-labelledby="plan-title">
                  <div className="plan-card__heading">
                    <SectionHeading eyebrow="Bounded execution" title="Agent plan" description="Each step is explicit, typed, and stored with this case." />
                    {caseRecord.plan ? <StatusBadge label={`${caseRecord.plan.steps.length} steps`} tone="field" /> : null}
                  </div>
                  {caseRecord.plan ? (
                    <>
                      <div className="plan-objective"><span>Objective</span><strong>{caseRecord.plan.objective}</strong></div>
                      <div className="plan-steps">
                        {caseRecord.plan.steps.map((step, index) => (
                          <article className="plan-step" key={step.id}>
                            <span className="plan-step__number">{String(index + 1).padStart(2, "0")}</span>
                            <div>
                              <div className="plan-step__topline"><strong>{readableToolName(step.toolId)}</strong><StatusBadge label={step.requiresPayment ? "Paid" : "Free"} tone={step.requiresPayment ? "amber" : "field"} /></div>
                              <p>{step.purpose}</p>
                              <small>{step.requiresApproval ? "Human approval required" : "Read-only step · no approval required"}</small>
                            </div>
                          </article>
                        ))}
                      </div>
                      <div className="plan-constraints">
                        <span>Constraints recorded with plan</span>
                        {caseRecord.plan.constraints.map((constraint) => <span key={constraint}>· {constraint}</span>)}
                      </div>
                      <button className="primary-button" type="button" onClick={handleRun} disabled={isSubmitting || caseRecord.status !== "plan-ready"}>
                        {caseRecord.status === "blocked" ? "Execution blocked safely" : isSubmitting ? "Starting…" : "Run available steps"}
                        <span aria-hidden="true">→</span>
                      </button>
                    </>
                  ) : (
                    <div className="empty-record"><p>No plan is stored for this case yet.</p><button className="primary-button" type="button" onClick={handleGeneratePlan} disabled={isSubmitting}>Generate plan</button></div>
                  )}
                </section>

                <section className="event-record" aria-labelledby="event-title">
                  <SectionHeading eyebrow="Audit trail" title="Case events" description="Lifecycle events are persisted in SQLite; no hidden reasoning is displayed." action={<span className="stream-count">{caseRecord.events.length} events</span>} />
                  <div className="real-event-list">
                    {caseRecord.events.map((event) => (
                      <article className="real-event" key={event.id}>
                        <span className="real-event__marker" aria-hidden="true" />
                        <div><div className="real-event__meta"><span className="mono-text">{new Date(event.occurredAt).toLocaleString()}</span><strong>{event.actor}</strong><StatusBadge label={event.status} tone={event.status === "error" ? "alert" : event.status === "active" ? "signal" : "muted"} /></div><h3>{event.eventType}</h3><p>{event.message}</p></div>
                      </article>
                    ))}
                  </div>
                </section>

                <section className="evidence-record-panel" aria-labelledby="evidence-title">
                  <SectionHeading eyebrow="Source provenance" title="Evidence" description="Only adapter responses are promoted here. Model synthesis is not included in this phase." action={<span className="stream-count">{caseRecord.evidence.length} items</span>} />
                  <EvidenceList evidence={caseRecord.evidence} />
                </section>

                {caseRecord.report ? (
                  <section className="report-record-panel" aria-labelledby="report-title">
                     <SectionHeading eyebrow={caseRecord.report.providerId === "rules" ? "Transparent evidence brief" : "Provider synthesis"} title="Action brief" description={caseRecord.report.providerId === "rules" ? "Facts, human verification steps, and uncertainty are derived from validated sources without model claims." : "This report is generated only from the stored evidence IDs below."} action={<StatusBadge label={caseRecord.report.providerId === "rules" ? "Rules analysis" : `${caseRecord.report.providerId} provider`} tone="signal" />} />
                    <p className="report-summary">{caseRecord.report.summary}</p>
                    <div className="report-block">
                      <h3>What we know</h3>
                      {caseRecord.report.known.map((item) => <div className="report-record-item" key={item.text}><strong>{item.text}</strong><small>Evidence · {item.evidenceIds.length ? item.evidenceIds.join(", ") : "Not cited"}</small></div>)}
                    </div>
                    <div className="report-block">
                      <h3>Recommended next actions</h3>
                      {caseRecord.report.nextActions.map((item) => <div className="report-record-item" key={`${item.priority}-${item.action}`}><strong>{item.priority}. {item.action}</strong><small>{item.rationale} · Evidence · {item.evidenceIds.length ? item.evidenceIds.join(", ") : "Not cited"}</small></div>)}
                    </div>
                    <div className="report-block">
                      <h3>Still uncertain</h3>
                      {caseRecord.report.uncertainties.map((item) => <div className="report-record-item" key={item.text}><strong>{item.text}</strong><small>Evidence · {item.evidenceIds.length ? item.evidenceIds.join(", ") : "Not cited"}</small></div>)}
                    </div>
                  </section>
                ) : null}
              </section>

              <aside className="case-review-column" aria-label="Case review summary">
                <div className="review-card">
                  <p className="eyebrow">Evidence boundary</p>
                  <h2>{caseRecord.evidence.length ? `${caseRecord.evidence.length} source signal${caseRecord.evidence.length === 1 ? "" : "s"}` : "No evidence yet"}</h2>
                  <p>{caseRecord.evidence.length ? "These records came from real free-tool responses and include retrieval metadata." : "This case has not called a real external tool. The interface will not display placeholder sources or invented confidence."}</p>
                  <div className="review-card__status"><span className={`legend-dot legend-dot--${caseRecord.evidence.length ? "field" : "amber"}`} />{caseRecord.evidence.length ? "Provenance recorded" : "Real adapters pending"}</div>
                </div>
                <div className="review-card review-card--quiet">
                  <p className="eyebrow">Payment boundary</p>
                  <h2>No payment proposed</h2>
                  <p>Spending and approval controls remain locked until a real paid tool and verified quote exist.</p>
                </div>
                <div className="review-card review-card--quiet">
                  <p className="eyebrow">Persistence</p>
                  <h2>Local SQLite</h2>
                  <p>Case, plan, and event records are written to the local database path configured by `IMPACTRELAY_DB_PATH`.</p>
                </div>
              </aside>
            </div>
          </main>
        )}

        <footer className="workspace-footer">
          <span><span className="footer-signal" aria-hidden="true" /> No synthetic evidence or payment receipts.</span>
          <span className="mono-text">ImpactRelay · evidence before confidence</span>
        </footer>
      </div>
    </div>
  );
}
