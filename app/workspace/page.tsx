import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CircleDot, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { DashboardContent } from "@/components/workspace/dashboard-content";
import { ImpactRelayLogo } from "@/components/brand/impactrelay-logo";

export const metadata: Metadata = { title: "Workspace" };

export default function WorkspaceDashboard() {
  return (
    <main className="app-page app-page--dashboard">
      <header className="app-topbar"><Link className="landing-brand" href="/"><ImpactRelayLogo /></Link><nav><Link href="/workspace" aria-current="page">Workspace</Link><Link href="/cases">Cases</Link><Link href="/settings/integrations">Integrations</Link></nav><div className="app-topbar__actions"><ThemeToggle /><Button asChild size="sm"><Link href="/cases/new"><Plus size={15} /> New case</Link></Button></div></header>
      <div className="app-page__inner">
        <div className="page-intro"><div><Badge tone="signal"><CircleDot size={11} /> Operations workspace</Badge><h1>Good morning. Keep the trail visible.</h1><p>Create a case, review its plan, and inspect every source-backed result from one calm desk.</p></div><Button asChild variant="outline"><Link href="/cases">View all cases <ArrowRight size={15} /></Link></Button></div>
         <DashboardContent />
      </div>
    </main>
  );
}
