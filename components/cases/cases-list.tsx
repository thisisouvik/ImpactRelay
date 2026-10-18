"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, FileText, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { CaseRecord } from "@/lib/domain/schemas";

type CasesResponse = { cases?: CaseRecord[]; error?: { message?: string } };

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function CasesList() {
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadCases() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/cases", { cache: "no-store" });
      const payload = await response.json() as CasesResponse;
      if (!response.ok) throw new Error(payload.error?.message ?? "Cases could not be loaded.");
      setCases(payload.cases ?? []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Cases could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadCases(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  if (loading) {
    return <section className="case-list-empty"><div className="dashboard-empty__glyph"><RefreshCw className="spin" size={24} /></div><h2>Loading cases</h2><p>Checking the connected case store.</p></section>;
  }

  if (error) {
    return <section className="case-list-empty"><div className="dashboard-empty__glyph">!</div><h2>Could not load cases</h2><p>{error}</p><Button onClick={() => void loadCases()}><RefreshCw size={16} /> Try again</Button></section>;
  }

  if (cases.length === 0) {
    return <section className="case-list-empty"><div className="dashboard-empty__glyph">◎</div><h2>No cases yet</h2><p>Create a case to begin building a real, inspectable record.</p><Button asChild><Link href="/cases/new">Create a case <ArrowRight size={16} /></Link></Button></section>;
  }

  return <section className="case-list" aria-label="Saved cases">
    <div className="case-list__toolbar"><p>{cases.length} {cases.length === 1 ? "case" : "cases"}</p><Button asChild size="sm"><Link href="/cases/new"><Plus size={15} /> New case</Link></Button></div>
    <div className="case-list__grid">
      {cases.map((item) => <Link className="case-list__card" href={`/cases/${item.id}`} key={item.id}>
        <div className="case-list__card-top"><span className="case-list__icon"><FileText size={17} /></span><Badge tone={item.status === "failed" ? "alert" : item.status === "report-ready" ? "signal" : "muted"}>{item.status}</Badge></div>
        <h2>{item.title}</h2>
        <p>{item.requestText}</p>
        <div className="case-list__meta"><span>{item.mode} mode</span><span>Updated {formatDate(item.updatedAt)}</span></div>
        <span className="case-list__open">Open case <ArrowRight size={15} /></span>
      </Link>)}
    </div>
  </section>;
}
