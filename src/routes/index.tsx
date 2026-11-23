import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen, ClipboardCheck, Compass, GitBranch, Gauge, HardDrive, LifeBuoy, Network, ShieldCheck, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicShell } from "@/components/account/PublicShell";
import { SECTION_VAR, type Section } from "@/lib/sections";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Continuity Compass — Plan, test and maintain BCP & DR" }, { name: "description", content: "Standalone business continuity and disaster recovery planning: guided BCP/DRP, recovery objectives, fallbacks, runbooks, tests, gaps and readiness." }, { property: "og:title", content: "Continuity Compass — Plan, test and maintain BCP & DR" }, { property: "og:description", content: "Standalone business continuity and disaster recovery planning: guided BCP/DRP, recovery objectives, fallbacks, runbooks, tests, gaps and readiness." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Landing,
});

const CAPS: { title: string; text: string; icon: typeof Compass; section: Section }[] = [
  { title: "Guided BCP/DRP Planning", text: "Build My BCP/DRP walks you from organization to approval in plain language.", icon: Compass, section: "overview" },
  { title: "Business Impact & Recovery Objectives", text: "Capture criticality, MTPD and Business RTO/RPO with inline definitions.", icon: Timer, section: "impact" },
  { title: "Dependencies", text: "Map processes to applications, infrastructure, data, facilities and vendors.", icon: Network, section: "impact" },
  { title: "Fallback Intelligence", text: "Fallback chains, common-mode dependency checks and governed 'process stops' risks.", icon: GitBranch, section: "resilience" },
  { title: "Recovery Strategies & Runbooks", text: "Separate temporary fallback from restoration; draft runbooks stay review-required.", icon: LifeBuoy, section: "resilience" },
  { title: "Tests & Evidence", text: "Plan tabletop, restore, failover and end-to-end tests; trace evidence to results.", icon: ClipboardCheck, section: "assurance" },
  { title: "Gaps & Approvals", text: "Track corrective actions and human approvals — nothing is auto-approved.", icon: ShieldCheck, section: "assurance" },
  { title: "Readiness & Warnings", text: "RTO conflicts, missing coverage and Next Best Action from your own data.", icon: Gauge, section: "overview" },
];

function Landing() {
  return (
    <PublicShell>
      <section className="text-sidebar-accent-foreground" style={{ background: "var(--gradient-hero)" }}>
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-[1.2fr_1fr] md:px-8 md:py-24">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-sidebar-primary">Business continuity · Disaster recovery</div>
            <h1 className="mt-4 text-4xl font-semibold leading-tight md:text-5xl">Know exactly how your business keeps running.</h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-sidebar-foreground">Continuity Compass helps you plan, validate, test and maintain business continuity and disaster recovery — from business impact to runbooks, evidence and approval.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild variant="orange" size="lg"><Link to="/sign-up">Get Started<ArrowRight /></Link></Button>
              <Button asChild variant="outline" size="lg" className="border-sidebar-border bg-transparent text-sidebar-accent-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"><Link to="/sign-in">Sign In</Link></Button>
            </div>
          </div>
          <ol aria-label="Planning sequence" className="self-center rounded-lg border border-sidebar-border bg-sidebar/60 p-5 text-sm">
            {["L1 Business Function — WHAT must continue", "L2 Process — HOW it is performed", "L3 Component — WHAT it depends on", "Fallback → Recovery Strategy → Runbook", "Test → Evidence → Gap → Approval"].map((s, i) => (
              <li key={s} className="flex items-center gap-3 border-b border-sidebar-border py-2.5 last:border-0"><span className="num grid h-6 w-6 place-items-center rounded bg-sidebar-primary text-xs text-sidebar-primary-foreground">{i + 1}</span>{s}</li>
            ))}
          </ol>
        </div>
      </section>
      <section aria-labelledby="caps" className="mx-auto max-w-6xl px-4 py-16 md:px-8">
        <h2 id="caps" className="text-2xl font-semibold text-primary">Everything a continuity program needs</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CAPS.map((c) => (
            <article key={c.title} className="rounded-md border border-border border-t-4 bg-card p-5" style={{ borderTopColor: SECTION_VAR[c.section] }}>
              <c.icon className="h-6 w-6" style={{ color: SECTION_VAR[c.section] }} aria-hidden />
              <h3 className="mt-3 font-semibold text-primary">{c.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{c.text}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="border-y border-border bg-card">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-2 md:px-8">
          <div>
            <HardDrive className="h-6 w-6 text-teal" aria-hidden />
            <h2 className="mt-3 text-xl font-semibold text-primary">Standalone first</h2>
            <p className="mt-3 text-sm leading-7">Continuity Compass works on its own. No ServiceNow, Google Cloud or other paid integration is needed to plan, test and maintain your BCP/DRP. Accounts secure access to the workspace; plan records in this prototype are kept in your browser on this device.</p>
          </div>
          <div>
            <div className="flex items-center gap-2"><h2 className="text-xl font-semibold text-primary">Optional integrations</h2><span className="rounded bg-muted px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Planned · not connected</span></div>
            <ul className="mt-3 space-y-3 text-sm leading-6">
              <li><b>ServiceNow</b> — planned optional link for CMDB/CI, Change, Incident and BCM sync. It would enhance Compass, never be required.</li>
              <li><b>Google Cloud</b> — planned optional AI analysis, document OCR, storage and text-to-speech.</li>
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">None of these integrations is active today.</p>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-4 py-14 text-center md:px-8">
        <h2 className="text-2xl font-semibold text-primary">Start your first plan today</h2>
        <p className="mt-2 text-sm text-muted-foreground">A short 90-second orientation, then guided step-by-step building.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3"><Button asChild variant="orange"><Link to="/sign-up">Create Account</Link></Button><Button asChild variant="outline"><Link to="/sign-in"><BookOpen />Sign In</Link></Button></div>
      </section>
    </PublicShell>
  );
}