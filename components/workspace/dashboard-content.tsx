"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { CaseRecord } from "@/lib/domain/schemas";

type Health = { persistence?: string; planner?: string; status?: string };

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function DashboardContent() {
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [health, setHealth] = useState<Health | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [caseResponse, healthResponse] = await Promise.all([fetch("/api/cases", { cache: "no-store" }), fetch("/api/health", { cache: "no-store" })]);
      if (!caseResponse.ok) throw new Error("The case desk could not be loaded.");
      const casePayload = await caseResponse.json() as { cases?: CaseRecord[] };
      const healthPayload = await healthResponse.json() as Health;
      setCases(casePayload.cases ?? []);
      setHealth(healthPayload);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The workspace could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const ready = cases.filter((item) => ["plan-ready", "report-ready", "completed"].includes(item.status)).length;
  const evidence = cases.reduce((total, item) => total + item.evidence.length, 0);

  if (loading) return <section className="dashboard-loading"><RefreshCw className="spin" size={18} /> Loading live workspace data…</section>;
  if (error) return <section className="dashboard-empty"><div className="dashboard-empty__glyph">!</div><h2>Workspace unavailable</h2><p>{error}</p><Button onClick={() => void load()}><RefreshCw size={15} /> Try again</Button></section>;

  return <>
    <div className="dashboard-grid">
      <Card><CardHeader><span className="metric-icon metric-icon--signal">{cases.length}</span><span><small>Saved cases</small><strong>{cases.length ? "Live case desk" : "No cases yet"}</strong></span></CardHeader><CardContent><p>{cases.length ? `${cases.length} stored request${cases.length === 1 ? "" : "s"} available in this browser session.` : "Create a real request to start the case desk."}</p><Button asChild variant="outline" size="sm"><Link href="/cases/new">{cases.length ? "Create another" : "Create a case"} <ArrowRight size={14} /></Link></Button></CardContent></Card>
      <Card><CardHeader><span className="metric-icon metric-icon--field">{ready}</span><span><small>Review-ready</small><strong>{ready ? "Plans and reports" : "Waiting for a plan"}</strong></span></CardHeader><CardContent><p>Counts come from persisted case statuses, not a sample dashboard.</p><Button asChild variant="ghost" size="sm"><Link href="/cases">Review cases <ArrowRight size={14} /></Link></Button></CardContent></Card>
      <Card><CardHeader><span className="metric-icon metric-icon--amber">{evidence}</span><span><small>Evidence items</small><strong>{evidence ? "Source signals recorded" : "No evidence yet"}</strong></span></CardHeader><CardContent><p>Only validated adapter responses appear in this count. {health?.persistence ?? "Persistence"} is active.</p><Button asChild variant="ghost" size="sm"><Link href="/settings/integrations">View integrations <ArrowRight size={14} /></Link></Button></CardContent></Card>
    </div>
    {cases.length ? <section className="dashboard-recent"><div className="dashboard-recent__heading"><div><Badge tone="muted">Recent records</Badge><h2>Keep the latest trail close.</h2></div><Button asChild variant="outline" size="sm"><Link href="/cases">All cases <ArrowRight size={14} /></Link></Button></div><div className="dashboard-recent__list">{cases.slice(0, 3).map((item) => <Link className="dashboard-recent__item" href={`/cases/${item.id}`} key={item.id}><span><strong>{item.title}</strong><small>{item.mode} · updated {formatDate(item.updatedAt)}</small></span><Badge tone={item.status === "failed" ? "alert" : item.status === "report-ready" ? "signal" : "muted"}>{item.status}</Badge></Link>)}</div></section> : <section className="dashboard-empty"><div className="dashboard-empty__glyph">✳</div><h2>Your case desk is empty</h2><p>Start with a real, redacted request. ImpactRelay will preserve the original input and prepare a bounded plan.</p><Button asChild><Link href="/cases/new">Open a new case <ArrowRight size={16} /></Link></Button></section>}
  </>;
}
