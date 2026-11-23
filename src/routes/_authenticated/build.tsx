import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Check, Compass, Lock, Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, Panel, Pill } from "@/components/bcp/ui";
import { RoleTag } from "@/components/bcp/wizard/kit";
import { BiaStage, ComponentsStage, FunctionStage, OrganizationStage, PlanStage, ProcessesStage } from "@/components/bcp/wizard/StagesSetup";
import { ApprovalStage, FallbacksStage, RunbookStage, StrategyStage, TestStage, ValidationStage } from "@/components/bcp/wizard/StagesResilience";
import { useDb } from "@/lib/bcp/store";
import { STAGES, exitWizard, progress, scope, setStage, stageAvailable, stageIndex, startWizard } from "@/lib/bcp/wizard";
import { cn } from "@/lib/utils";
import { HelpLink } from "@/components/bcp/HelpLink";

export const Route = createFileRoute("/_authenticated/build")({
  head: () => ({ meta: [{ title: "Build My BCP/DRP — Continuity Compass" }, { name: "description", content: "Guided, plain-language workflow that builds a business continuity and disaster recovery plan step by step." }, { property: "og:title", content: "Build My BCP/DRP — Continuity Compass" }, { property: "og:description", content: "Guided BCP/DRP builder: BIA, dependencies, fallbacks, runbook, tests and approval." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: BuildPage,
});

const VIEWS = { organization: OrganizationStage, plan: PlanStage, function: FunctionStage, bia: BiaStage, processes: ProcessesStage, components: ComponentsStage, fallbacks: FallbacksStage, strategy: StrategyStage, runbook: RunbookStage, test: TestStage, validation: ValidationStage, approval: ApprovalStage };
const STAGE_HELP = { organization: "organizations-plans", plan: "organizations-plans", function: "functions", bia: "recovery-objectives", processes: "processes", components: "components", fallbacks: "fallbacks", strategy: "strategies", runbook: "runbooks", test: "tests", validation: "warnings", approval: "approvals" };

function BuildPage() {
  const db = useDb();
  const w = db.wizard;
  if (!w) return <Intro />;
  const { done, pct } = progress(db, w);
  const { fn } = scope(db, w);
  const cur = STAGES[stageIndex(w.stage)]!;
  const View = VIEWS[w.stage];
  return (
    <>
      <PageHeader eyebrow={fn ? `Guided workflow · ${fn.name}` : "Guided workflow"} title="Build My BCP/DRP"
        actions={<Button variant="outline" onClick={() => { if (confirm("Stop this guided workflow? Records already saved stay in your registers.")) exitWizard(); }}><RotateCcw />Restart workflow</Button>}>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1"><div className="h-2 w-full max-w-64 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-teal transition-all" style={{ width: `${pct}%` }} /></div><span className="num whitespace-nowrap text-sm font-medium text-primary">{pct}% complete</span><span className="text-xs text-muted-foreground">{done.length}/{STAGES.length} stages · saved automatically in this browser</span></div>
      </PageHeader>
      <div className="grid gap-4 lg:grid-cols-[16rem_1fr]">
        <Button asChild variant="link" className="justify-start px-0 lg:col-span-2"><Link to="/quick-start">Quick Start Manual</Link></Button>
        <nav aria-label="Workflow stages" className="print:hidden">
          <ol className="space-y-0.5 rounded-md border border-border bg-card p-2">
            {STAGES.map((s, i) => {
              const ok = done.includes(s.id), avail = stageAvailable(db, w, s.id), active = s.id === w.stage;
              return (
                <li key={s.id}>
                  <button type="button" disabled={!avail} onClick={() => setStage(s.id)} className={cn("flex w-full items-center gap-2.5 rounded px-2 py-1.5 text-left text-sm", active ? "bg-accent text-primary shadow-[inset_3px_0_0_var(--teal)]" : "hover:bg-muted", !avail && "cursor-not-allowed opacity-50")}>
                    <span className={cn("grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold", ok ? "bg-success text-primary-foreground" : active ? "bg-teal text-teal-foreground" : "bg-muted text-muted-foreground")}>{ok ? <Check className="h-3.5 w-3.5" /> : !avail ? <Lock className="h-3 w-3" /> : i + 1}</span>
                    <span className="min-w-0"><span className="block truncate font-medium">{s.title}</span><span className="block truncate text-[11px] text-muted-foreground">{s.blurb}</span></span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>
        <Panel action={<HelpLink topic={STAGE_HELP[w.stage]} />} title={<span className="flex flex-wrap items-center gap-2">Step {stageIndex(cur.id) + 1} of {STAGES.length}: {cur.title}{done.includes(cur.id) && <Pill value="Complete" tone="good" />}<span className="ml-1 flex gap-1">{cur.role.map((r) => <RoleTag key={r} role={r} />)}</span></span>}>
          <View w={w} />
        </Panel>
      </div>
    </>
  );
}

function Intro() {
  const db = useDb();
  const nav = useNavigate();
  return (
    <>
      <PageHeader eyebrow="Guided workflow" title="Build My BCP/DRP"><p className="mt-1 max-w-2xl text-sm text-muted-foreground">Answer plain-language questions and Continuity Compass creates and links the right records for you — no need to know which register to use. Progress is saved in this browser so you can stop and resume any time.</p></PageHeader>
      <div className="grid gap-4 lg:grid-cols-3">
        <Button asChild variant="link" className="justify-start px-0 lg:col-span-3"><Link to="/quick-start">Quick Start Manual</Link></Button>
        <Panel title="Start a new plan" className="lg:col-span-2">
          <ol className="grid gap-2 text-sm sm:grid-cols-2">{STAGES.map((s, i) => <li key={s.id} className="flex items-center gap-2"><span className="num grid h-6 w-6 place-items-center rounded-full bg-primary text-[11px] text-primary-foreground">{i + 1}</span><span className="font-medium text-primary">{s.title}</span><span className="text-xs text-muted-foreground">— {s.blurb}</span></li>)}</ol>
          <p className="mt-4 text-xs text-muted-foreground">Generated content (such as runbooks) is always marked <b>Draft · Review required</b>. Planning a test never marks anything as validated, and nothing is approved without an approver’s decision.</p>
          <Button className="mt-4" variant="teal" size="lg" onClick={() => startWizard(undefined, "organization")}><Compass />Start building</Button>
        </Panel>
        <Panel title="Continue an existing function">
          {db.functions.length ? <ul className="space-y-2">{db.functions.map((f) => <li key={f.id} className="flex items-center justify-between gap-2 text-sm"><span className="min-w-0 truncate">{f.name} <Pill value={f.criticality} /></span><Button size="sm" variant="outline" onClick={() => startWizard(f.id)}><Play />Continue</Button></li>)}</ul> : <p className="text-sm text-muted-foreground">No business functions yet.</p>}
          <Button variant="link" className="mt-2 px-0" onClick={() => nav({ to: "/dashboard" })}>Back to dashboard</Button>
        </Panel>
      </div>
    </>
  );
}