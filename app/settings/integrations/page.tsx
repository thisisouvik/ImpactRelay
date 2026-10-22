"use client";

import Link from "next/link";
import { ArrowLeft, CheckCircle2, CircleAlert, Database, Gauge, KeyRound, Orbit, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ImpactRelayLogo } from "@/components/brand/impactrelay-logo";

type Health = { status?: string; persistence?: string; planner?: string; timestamp?: string; rateLimit?: string; cache?: string; providers?: Record<string, string> };

export default function IntegrationsPage() {
  const [health, setHealth] = useState<Health | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    try { setHealth(await fetch("/api/health").then((response) => response.json() as Promise<Health>)); } finally { setLoading(false); }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void refresh(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const items = [
    { icon: KeyRound, title: "Planning mode", detail: "APP_MODE overrides the provider selected for new cases.", value: health?.planner ?? "checking", tone: "field" as const },
    { icon: Database, title: "Database", detail: "SQLite locally; Neon when DATABASE_URL is configured.", value: health?.persistence ?? "checking", tone: health?.persistence === "neon" ? "signal" as const : "muted" as const },
    { icon: Gauge, title: "Redis limits", detail: "Upstash-backed limits for protected routes.", value: health?.rateLimit ?? "checking", tone: health?.rateLimit === "configured" ? "field" as const : "amber" as const },
    { icon: Orbit, title: "0G Compute", detail: "Optional OpenAI-compatible decentralized inference.", value: health?.providers?.og ?? "not configured", tone: health?.providers?.og === "configured" ? "signal" as const : "muted" as const },
    { icon: KeyRound, title: "Groq", detail: "Server-side inference via GROQ_API_KEY; GROQ_MODEL defaults to llama-3.3-70b-versatile.", value: health?.providers?.groq ?? "not configured", tone: health?.providers?.groq === "configured" ? "signal" as const : "muted" as const },
    { icon: Orbit, title: "Local model", detail: "Optional OpenAI-compatible model running on your own server.", value: health?.providers?.local ?? "not configured", tone: health?.providers?.local === "configured" ? "signal" as const : "muted" as const },
  ];

  return <main className="app-page"><header className="app-topbar"><Link className="landing-brand" href="/"><ImpactRelayLogo /></Link><nav><Link href="/workspace">Workspace</Link><Link href="/cases">Cases</Link><Link href="/settings/integrations" aria-current="page">Integrations</Link></nav><div className="app-topbar__actions"><ThemeToggle /><Button asChild variant="outline" size="sm"><Link href="/workspace"><ArrowLeft size={14} /> Workspace</Link></Button></div></header><div className="app-page__inner"><div className="page-intro"><div><Badge tone="muted">Runtime health</Badge><h1>Integrations</h1><p>Configuration status only. Secrets and private credentials are never shown.</p></div><Button variant="outline" size="sm" onClick={() => void refresh()} disabled={loading}><RefreshCw size={14} className={loading ? "spin" : ""} /> Refresh</Button></div><div className="integration-grid">{items.map((item) => { const Icon = item.icon; return <Card key={item.title}><CardHeader><span className="concept-icon"><Icon size={18} /></span><span><small>{item.title}</small><strong>{item.value}</strong></span>{item.value === "configured" || item.value === "rules" || item.value === "sqlite" ? <CheckCircle2 className="integration-ok" size={17} /> : <CircleAlert className="integration-alert" size={17} />}</CardHeader><CardContent><p>{item.detail}</p></CardContent></Card>; })}</div><section className="integration-note"><strong>0G is optional by design.</strong><span>Enable it only when the server has a dedicated `sk-` Router key and a funded 0G account. The browser never receives that key.</span></section></div></main>;
}
