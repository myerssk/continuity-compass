import { Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen, Check, Compass } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useDb } from "@/lib/bcp/store";
import { QUICK_STEPS, quickStartChecks } from "@/lib/bcp/quick-start";
import { WARNING_LABEL } from "@/lib/bcp/rules";
import { useDataActions } from "./DataControls";
import { ReplayOnboardingButton } from "@/components/account/ReplayOnboardingButton";

const TERMS = [
  ["L1 Business Function", "WHAT must continue/recover"], ["L2 Business Process", "HOW it is performed"], ["L3 Supporting Component", "WHAT it depends on"],
  ["MTPD", "Longest tolerable disruption before unacceptable impact"], ["RTO", "Target recovery time"], ["RPO", "Maximum acceptable data loss measured in time"],
  ["Fallback", "Alternate way to continue/restore when the normal method is unavailable"], ["Runbook", "Exact recovery/continuity execution steps"],
];

export function QuickStart() {
  const db = useDb();
  const [functionId, setFunctionId] = useState("");
  const { setOpen, dialog } = useDataActions();
  const checks = quickStartChecks(db, functionId || undefined);
  const count = checks.filter(Boolean).length;
  return <>
    <header className="border-b border-border pb-5">
      <div className="text-xs font-semibold uppercase text-teal">Continuity Compass · Quick Start Manual</div>
      <h1 className="mt-2 text-2xl font-semibold text-primary">Quick Start</h1>
      <p className="mt-3 max-w-3xl text-sm leading-6">Fastest route: use <b>Build My BCP/DRP</b> for guided creation. Use the direct registers and Dashboard Edit/Fix actions to maintain or correct the same records—not a second copy of your plan.</p>
      <div className="mt-4 flex flex-wrap gap-2"><ReplayOnboardingButton /><Button asChild variant="teal"><Link to="/build"><Compass />Start/Continue Build My BCP/DRP</Link></Button><Button asChild variant="outline"><Link to="/help"><BookOpen />Full User Manual</Link></Button></div>
    </header>
    <section aria-label="Completion checklist" className="border-b border-border py-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h2 className="text-lg font-semibold text-primary">Your first-plan checklist</h2><p className="mt-1 text-sm text-muted-foreground">{count}/13 record-backed milestones found · {Math.round(count / 13 * 100)}% setup evidence, not readiness.</p></div>
        {db.functions.length > 0 && <label className="text-sm font-medium text-primary">Business function<select value={functionId} onChange={(e) => setFunctionId(e.target.value)} className="mt-1 block w-full max-w-80 rounded-md border border-input bg-card px-3 py-2"><option value="">First business function</option>{db.functions.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select></label>}
      </div>
      <progress aria-label="Record-backed setup progress" className="mt-3 h-2 w-full accent-teal" max={13} value={count} />
      <p className="mt-2 text-xs leading-5 text-muted-foreground">Checks reflect saved records for the selected function and its plan. They do not prove completeness or validation. Environment choice and final review require your judgment; a recorded gap is still work to address. This checklist saves no separate business data.</p>
      <nav aria-label="Quick Start steps" className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{QUICK_STEPS.map((s, i) => <a key={s.title} href={`#step-${i + 1}`} className="flex items-start gap-2 text-sm text-primary hover:underline"><span className="min-w-5 text-teal">{checks[i] ? <Check aria-label="Record evidence found" className="h-4 w-4" /> : i + 1}</span>{s.title}</a>)}</nav>
    </section>
    <aside className="my-5 rounded-md border border-border bg-muted p-4"><h2 className="mb-3 text-base font-semibold text-primary">What these terms mean</h2><dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">{TERMS.map(([term, meaning]) => <div key={term} className="text-sm leading-6"><dt className="font-semibold text-primary">{term}</dt><dd className="text-muted-foreground">{meaning}</dd></div>)}</dl></aside>
    <ol>{QUICK_STEPS.map((step, i) => <li key={step.title} id={`step-${i + 1}`} className="scroll-mt-6 border-b border-border py-5">
      <h2 className="text-lg font-semibold text-primary">{i + 1}. {step.title}</h2>
      <div className="mt-2 text-xs font-medium text-teal">{checks[i] ? "Record evidence found — review details below" : i === 0 || i === 14 ? "Your review required" : "Not yet evidenced for this function"}</div>
      <dl className="mt-3 grid gap-3 text-sm leading-6 lg:grid-cols-3">{[["What to do", step.do], ["Minimum information", step.minimum], ["Done looks like", step.done]].map(([label, text]) => <div key={label}><dt className="font-semibold text-primary">{label}</dt><dd className="mt-1 text-muted-foreground">{text}</dd></div>)}</dl>
      <div className="mt-4 flex flex-wrap gap-2">
        {i === 0 ? <><Button variant="outline" onClick={() => setOpen("clear")}>Start Fresh / Clear all data</Button><Button variant="orange" onClick={() => setOpen("demo")}>Load demo data</Button></> : step.table ? <Button asChild variant="outline" size="sm"><Link to="/$type" params={{ type: step.table }}>Go to {step.table === "strategies" ? "Recovery Strategies" : step.table === "tests" ? "Tests & Exercises" : step.table === "gaps" ? "Gaps & Actions" : step.table[0]?.toUpperCase() + step.table.slice(1)}<ArrowRight /></Link></Button> : <><Button asChild variant="outline" size="sm"><Link to="/dashboard">Go to Dashboard<ArrowRight /></Link></Button><Button asChild variant="outline" size="sm"><Link to="/warnings">Go to Warnings</Link></Button></>}
        <Button asChild variant="link" size="sm"><Link to="/help/$topic" params={{ topic: step.topic }}>Learn more<span className="sr-only"> about {step.title}</span><BookOpen /></Link></Button>
      </div>
      {i === 0 && <p className="mt-3 text-sm font-medium text-destructive">Clear all data is destructive and requires confirmation. Loading demo replaces current data only after confirmation; edits never automatically reload the demo.</p>}
    </li>)}</ol>
    <aside className="my-6 border-l-4 border-orange bg-orange/10 p-4"><h2 className="font-semibold text-primary">Watch for these warnings</h2><p className="mt-2 text-sm leading-6">Warnings are not necessarily software errors. They identify continuity conditions requiring review/action; they disappear only when their actual underlying condition is corrected.</p><ul className="my-3 list-disc space-y-1 pl-5 text-sm">{Object.values(WARNING_LABEL).map((label) => <li key={label}>{label}</li>)}</ul><Button asChild variant="outline" size="sm"><Link to="/warnings">Review Warnings<ArrowRight /></Link></Button></aside>
    <section className="py-4"><h2 className="text-lg font-semibold text-primary">First BCP complete — ready for review, not automatically mature</h2><p className="mt-3 max-w-4xl text-sm leading-7">Records alone do not make a plan mature. Review recovery strategies and runbooks, validate fallbacks through testing and evidence, perform exercises, retain evidence, address gaps and obtain human approvals. A planned test or accepted risk does not validate recovery capability. Continue improving through Dashboard and Next Best Action.</p><p className="mt-3 text-sm text-muted-foreground">Continuity Compass works standalone. ServiceNow and Google Cloud integrations are optional future additions, not active connections.</p><Button asChild variant="link" className="mt-2 px-0"><Link to="/help/$topic" params={{ topic: "integrations" }}>Learn more about optional integrations</Link></Button></section>
    {dialog}
  </>;
}