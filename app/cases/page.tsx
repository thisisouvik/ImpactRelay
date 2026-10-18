import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Button } from "@/components/ui/button";
import { CasesList } from "@/components/cases/cases-list";
import { ImpactRelayLogo } from "@/components/brand/impactrelay-logo";

export const metadata: Metadata = { title: "Cases" };

export default function CasesPage() {
  return (
    <main className="app-page"><header className="app-topbar"><Link className="landing-brand" href="/"><ImpactRelayLogo /></Link><nav><Link href="/workspace">Workspace</Link><Link href="/cases" aria-current="page">Cases</Link><Link href="/settings/integrations">Integrations</Link></nav><div className="app-topbar__actions"><ThemeToggle /><Button asChild size="sm"><Link href="/cases/new">New case</Link></Button></div></header><div className="app-page__inner"><div className="page-intro"><div><Badge tone="muted">Case records</Badge><h1>Cases</h1><p>Stored requests, plans, evidence, and reports live here.</p></div></div><CasesList /></div></main>
  );
}
