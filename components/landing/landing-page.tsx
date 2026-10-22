import Link from "next/link";
import { ArrowRight, Check, CircleDot, Database, Fingerprint, LockKeyhole, Orbit, ShieldCheck, Sparkles, WalletCards } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { MotionReveal } from "@/components/ui/motion-reveal";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ImpactRelayLogo } from "@/components/brand/impactrelay-logo";

const pillars = [
  { icon: ShieldCheck, title: "Evidence before confidence", copy: "Every source-backed result carries its origin, retrieval time, freshness, and confidence." },
  { icon: LockKeyhole, title: "Bounded autonomy", copy: "The agent can propose a path, but policy and people keep control of execution." },
  { icon: WalletCards, title: "Human-controlled spend", copy: "Paid work is visible, budgeted, and approved before a transaction can happen." },
  { icon: Database, title: "Portable case records", copy: "Keep a reviewable record of requests, evidence, decisions, and next actions." },
];

const workflow = [
  ["01", "Submit", "Start with the request as it actually arrived."],
  ["02", "Plan", "Turn ambiguity into small, reviewable steps."],
  ["03", "Verify", "Gather source-backed signals before synthesis."],
  ["04", "Review", "See uncertainty, cost, and human checkpoints."],
  ["05", "Act", "Export a clear next step without hiding the trail."],
];

export function LandingPage() {
  return (
    <main className="landing-page">
      <nav className="landing-nav" aria-label="Main navigation">
        <Link className="landing-brand" href="/">
          <ImpactRelayLogo />
        </Link>
        <div className="landing-nav__links">
          <Link href="#how-it-works">How it works</Link>
          <Link href="#trust">Trust model</Link>
          <Link href="#trust">Trust model</Link>
        </div>
        <div className="landing-nav__actions">
          <ThemeToggle />
          <Button asChild variant="primary" size="sm"><Link href="/workspace">Open workspace <ArrowRight size={15} /></Link></Button>
        </div>
      </nav>

      <section className="landing-hero">
        <div className="landing-hero__copy">
          <MotionReveal>
            <Badge tone="signal"><CircleDot size={11} /> Evidence-first AI casework</Badge>
            <h1>Make the next step <em>clear.</em></h1>
            <p className="landing-hero__lead">ImpactRelay turns uncertain community-support requests into bounded plans, source-backed evidence, and human-readable actions.</p>
            <div className="landing-hero__actions">
              <Button asChild size="lg"><Link href="/cases/new">Create a case <ArrowRight size={17} /></Link></Button>
              <Button asChild variant="outline" size="lg"><Link href="#how-it-works">Explore the method</Link></Button>
            </div>
            <div className="landing-hero__note"><Check size={14} /> No fabricated evidence · no hidden signing · no sensitive demo data</div>
          </MotionReveal>
        </div>

        <MotionReveal delay={0.12} className="landing-hero__visual-wrap">
          <div className="landing-hero__visual" aria-label="Illustration of a reviewable case flow">
            <div className="visual-grid" aria-hidden="true" />
            <div className="visual-orbit visual-orbit--one" aria-hidden="true" />
            <div className="visual-orbit visual-orbit--two" aria-hidden="true" />
            <div className="visual-center"><Orbit size={21} /><strong>Case signal</strong><small>reviewable by design</small></div>
            <div className="visual-node visual-node--one"><Sparkles size={13} /><span>Plan</span><small>bounded</small></div>
            <div className="visual-node visual-node--two"><Database size={13} /><span>Evidence</span><small>traceable</small></div>
            <div className="visual-node visual-node--three"><WalletCards size={13} /><span>Approval</span><small>human edge</small></div>
            <div className="visual-node visual-node--four"><Fingerprint size={13} /><span>Receipt</span><small>verifiable</small></div>
            <div className="visual-caption"><span className="visual-caption__dot" /> A calmer operating system for uncertain work</div>
          </div>
        </MotionReveal>
      </section>

      <section className="landing-trust-strip" id="trust">
        <span>Designed for people who need an answer they can defend.</span>
        <span className="landing-trust-strip__rule" />
        <span>Local-first · inspectable · provider-neutral</span>
      </section>

      <section className="landing-section landing-section--pillars">
        <MotionReveal className="landing-section__heading">
          <Badge tone="muted">The operating principles</Badge>
          <h2>Useful intelligence without the black box.</h2>
          <p>The interface is designed for review, handoff, and trust—not just fluent output.</p>
        </MotionReveal>
        <div className="pillar-grid">
          {pillars.map((pillar, index) => {
            const Icon = pillar.icon;
            return <MotionReveal delay={index * 0.06} key={pillar.title}><Card className="pillar-card"><CardContent><span className="pillar-card__icon"><Icon size={19} /></span><h3>{pillar.title}</h3><p>{pillar.copy}</p><span className="pillar-card__index">0{index + 1}</span></CardContent></Card></MotionReveal>;
          })}
        </div>
      </section>

      <section className="landing-section landing-section--workflow" id="how-it-works">
        <MotionReveal className="landing-section__heading">
          <Badge tone="amber">The signal path</Badge>
          <h2>From messy request to defensible action.</h2>
          <p>Each transition stays visible so a human can pause, correct, approve, or export.</p>
        </MotionReveal>
        <div className="workflow-line">
          {workflow.map(([number, title, copy], index) => <MotionReveal delay={index * 0.05} key={number}><div className="workflow-step"><span>{number}</span><strong>{title}</strong><p>{copy}</p></div></MotionReveal>)}
        </div>
      </section>

      <section className="landing-section landing-og-section">
        <div className="landing-og-section__copy">
          <MotionReveal>
            <Badge tone="signal"><Orbit size={12} /> Optional decentralized intelligence</Badge>
            <h2>A home for AI that can show its route.</h2>
            <p>ImpactRelay can connect to 0G Compute Router as an optional server-side provider, preserving the same structured guardrails while opening a path to decentralized, TEE-aware inference.</p>
             <Button asChild variant="outline"><Link href="/settings/integrations">View integration status <ArrowRight size={15} /></Link></Button>
          </MotionReveal>
        </div>
        <MotionReveal delay={0.12} className="og-stack-card">
          <div className="og-stack-card__top"><span className="og-stack-card__signal" /> 0G integration map <Badge tone="muted">Optional</Badge></div>
          <div className="og-stack-card__rows"><div><span>Compute Router</span><strong>structured inference</strong></div><div><span>Privacy mode</span><strong>TeeML-aware route</strong></div><div><span>Storage archive</span><strong>encrypted export later</strong></div></div>
          <div className="og-stack-card__footer">No key in the browser · no silent provider switch</div>
        </MotionReveal>
      </section>

      <section className="landing-final-cta">
        <MotionReveal>
          <p className="eyebrow">Ready when you are</p>
          <h2>Start with the request. Keep the evidence.</h2>
          <p>Use Rules mode without credentials, then opt into Groq, Local, or 0G when you are ready.</p>
          <Button asChild size="lg"><Link href="/cases/new">Open a new case <ArrowRight size={17} /></Link></Button>
        </MotionReveal>
      </section>

      <footer className="landing-footer"><Link href="/" className="landing-brand"><ImpactRelayLogo compact size={22} /></Link><span>Evidence before confidence</span><Link href="/settings/integrations">Integration status</Link></footer>
    </main>
  );
}
