/* eslint-disable @typescript-eslint/no-explicit-any */
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, CheckCircle2, GitBranch, Plus, RefreshCw, Trash2, Wand2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Meter, Pill, RecLink } from "@/components/bcp/ui";
import { DispositionActions } from "@/components/bcp/Disposition";
import { COVERAGE_LABEL, assessmentFor, fallbackCoverage, fallbackReadiness, fallbacksFor, functionReadiness } from "@/lib/bcp/rules";
import { tableDef, TEST_TYPES, type StageId, type TableName, type WizardState } from "@/lib/bcp/schema";
import { createRec, deleteRec, updateRec, useDb } from "@/lib/bcp/store";
import {
  EXPECTED_EVIDENCE, answerFallback, createGapForAssessment, commonModeFor, createGap, exitWizard, fallbackPrompts, gapExists, generateDraftRunbook,
  markRunbookReviewed, markValidationReviewed, planTest, saveFallback, saveOrganization, savePlan, setDraft, saveStrategy, scope, setStage, stageTitle, startWizard, submitForApproval, validationFindings,
} from "@/lib/bcp/wizard";
import { Area, Callout, DraftBadge, Q, Sel, StageNav, Text, inputCls, useDraft } from "./kit";

const FB_TYPES = tableDef("fallbacks").fields.find((f) => f.key === "fallback_type")!.options! as readonly string[];
const FB_BLANK = { name: "", fallback_type: "Manual workaround", activation_criteria: "", owner: "", alternate_owner: "", capacity_pct: "", max_duration_h: "", data_rpo_impact: "", reconciliation: "", return_to_normal: "", test_result: "Not tested", last_tested: "", deps: [] as string[] };

export function FallbacksStage({ w }: { w: WizardState }) {
  const db = useDb();
  const prompts = fallbackPrompts(db, w);
  return (
    <>
      <p className="mb-4 text-sm text-muted-foreground">For each item, tell us whether work can carry on while it is unavailable. If it can, describe the fallback. If not, you can record a gap instead — you don’t have to invent a fallback.</p>
      <div className="space-y-4">{prompts.map((p) => <FallbackPrompt key={p.key} w={w} p={p} />)}</div>
      <StageNav stage="fallbacks" hint="Answer every question to complete this step." />
    </>
  );
}

function FallbackPrompt({ w, p }: { w: WizardState; p: { key: string; table: "functions" | "processes" | "components"; rec: any } }) {
  const db = useDb();
  const fbs = fallbacksFor(db, p.table, p.rec.id);
  const assess = assessmentFor(db, p.table, p.rec.id);
  const noFb = assess?.fallback_status === "No Fallback Available" && !fbs.length;
  const focused = w.focus_key === p.key;
  const ans = fbs.length || focused || w.answers[p.key] === "yes" ? "yes" : noFb ? "no" : w.answers[p.key];
  const [form, setForm] = useState<null | { parent?: string }>(focused && !fbs.length ? {} : null);
  const cov = fallbackCoverage(db, p.table, p.rec.id);
  const kind = p.table === "functions" ? "capability" : p.table === "processes" ? "process" : "dependency";
  return (
    <section ref={(el) => { if (el && focused) el.scrollIntoView({ block: "center" }); }} className={`rounded-md border ${focused ? "border-teal ring-2 ring-teal/30" : "border-border"}`}>
      <header className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/40 px-3 py-2 text-sm"><Pill value={kind} tone="neutral" /><span className="order-last ml-auto"><Pill value={COVERAGE_LABEL[cov]} tone={cov === "fallback_validated" ? "good" : cov === "assessment_incomplete" ? "neutral" : cov === "not_applicable" || cov === "risk_accepted" ? "neutral" : "warn"} /></span><span className="font-semibold text-primary">If “{p.rec.name}” is unavailable, can the business continue?</span>{p.table !== "functions" && p.rec.criticality === undefined && null}</header>
      <div className="space-y-3 p-3">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant={ans === "yes" ? "teal" : "outline"} onClick={() => { answerFallback(p.key, "yes"); if (!fbs.length) setForm({}); }}>Yes, with a fallback</Button>
          <Button size="sm" variant={ans === "no" ? "orange" : "outline"} onClick={() => { answerFallback(p.key, "no"); setForm(null); }}>No, it would stop</Button>
        </div>
        {ans === "no" && noFb && assess && (
          <Callout tone="warn" title="Saved: no fallback available — the process stops">
            <p>This answer is recorded and stays a continuity risk until a coordinator decides how to handle it. You don’t have to invent a fallback.</p>
            <DispositionActions assessmentId={assess.id} inWizard />
          </Callout>
        )}
        {ans === "yes" && noFb && <p className="text-xs text-muted-foreground">Earlier assessment “no fallback — process stops” ({assess!.risk_disposition}) is kept until a fallback is saved.</p>}
        {fbs.map((f) => <FallbackCard key={f.id} f={f} onSecondary={() => setForm({ parent: f.id })} />)}
        {ans === "yes" && (form ? <FallbackForm w={w} p={p} parent={form.parent} onDone={() => setForm(null)} /> : <Button size="sm" variant="outline" onClick={() => setForm({})}><Plus />{fbs.length ? "Add another fallback" : "Describe the fallback"}</Button>)}
      </div>
    </section>
  );
}

function FallbackCard({ f, onSecondary }: { f: any; onSecondary: () => void }) {
  const db = useDb();
  const r = fallbackReadiness(db, f);
  const cm = commonModeFor(db, f.id);
  const parent = db.fallbacks.find((x) => x.id === f.parent_id);
  return (
    <div className="rounded border border-border p-2.5 text-sm">
      <div className="flex flex-wrap items-center gap-2"><GitBranch className="h-4 w-4 text-teal" /><RecLink db={db} table="fallbacks" id={f.id} />{parent && <span className="text-xs text-muted-foreground">secondary — after {parent.name}</span>}<Pill value={f.status} /><Pill value={f.test_result || "Not tested"} /><div className="ml-auto w-36"><Meter value={r.score} /></div></div>
      {f.status !== "Validated" && <p className="mt-1 text-xs text-muted-foreground">Not validated — a passed test within 12 months is needed.</p>}
      {cm.map((x) => <div key={x.message} className="mt-2"><Callout tone="bad" title="Common-mode dependency">{x.message}. If that item fails, the primary path and this fallback fail together.
        <div className="mt-2">{gapExists(db, "fallbacks", f.id, "Common-mode dependency") ? <Pill value="Gap logged" tone="good" /> : <Button size="sm" variant="orange" onClick={() => createGap("fallbacks", f.id, "Common-mode dependency", "High", x.message, "Remove the shared dependency from the fallback")}>Create gap</Button>}</div></Callout></div>)}
      {!f.parent_id && <Button size="sm" variant="ghost" className="mt-1" onClick={onSecondary}><Plus />Add secondary fallback (if this one fails)</Button>}
    </div>
  );
}

function FallbackForm({ w, p, parent, onDone }: { w: WizardState; p: { table: "functions" | "processes" | "components"; rec: any }; parent?: string | undefined; onDone: () => void }) {
  const db = useDb();
  const [v, set] = useDraft(`fallback:${p.table}:${p.rec.id}${parent ? `:${parent}` : ""}`, FB_BLANK);
  const comps = db.components;
  const deps: string[] = v.deps ?? [];
  const toggle = (id: string) => set("deps", deps.includes(id) ? deps.filter((x) => x !== id) : [...deps, id]);
  const save = () => {
    if (!String(v.name).trim()) { toast.error("Name the fallback"); return; }
    const { deps: d, ...vals } = v;
    saveFallback({ table: p.table, id: p.rec.id }, { ...vals, name: vals.name.trim() }, d ?? [], parent);
    toast.success(parent ? "Secondary fallback added (Draft)" : "Fallback added (Draft)"); onDone();
  };
  void w;
  return (
    <div className="rounded-md border border-teal/40 bg-accent/20 p-3">
      {parent && <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-teal">Secondary fallback — used if “{db.fallbacks.find((f) => f.id === parent)?.name}” fails</div>}
      <div className="grid gap-3 sm:grid-cols-2">
        <Q label="What is the fallback called?" required role="Process Owner"><Text v={v} k="name" set={set} placeholder="e.g. Paper order forms" /></Q>
        <Q label="What kind of fallback is it?"><Sel v={v} k="fallback_type" set={set} options={FB_TYPES} /></Q>
        <Q label="When exactly should it be switched on?" wide help="Activation criteria — the trigger, e.g. “System down > 30 min during business hours”."><Area v={v} k="activation_criteria" set={set} /></Q>
        <Q label="Who switches it on?"><Text v={v} k="owner" set={set} /></Q>
        <Q label="Who is the backup person?"><Text v={v} k="alternate_owner" set={set} /></Q>
        <Q label="What share of normal volume can it handle? (%)" help="Capacity %."><Text v={v} k="capacity_pct" set={set} type="number" /></Q>
        <Q label="How long can you run on it at most? (h)" help="Maximum duration before it becomes unsustainable."><Text v={v} k="max_duration_h" set={set} type="number" /></Q>
        <Q label="What happens to data while it runs?" wide help="Data / RPO impact — e.g. records kept on paper must be re-keyed."><Area v={v} k="data_rpo_impact" set={set} /></Q>
        <Q group label="What does the fallback itself rely on?" wide role="Technical Owner" help="Select every system, site, vendor or data source it needs. These are checked against the primary path for shared (common-mode) dependencies.">
          {comps.length ? <div className="flex flex-wrap gap-2">{comps.map((c) => <label key={c.id} className="flex items-center gap-1.5 rounded border border-border bg-card px-2 py-1 text-xs"><input type="checkbox" checked={deps.includes(c.id)} onChange={() => toggle(c.id)} />{c.name}</label>)}</div> : <span className="text-xs text-muted-foreground">No components recorded yet.</span>}
        </Q>
        <Q label="How is work done in the fallback reconciled afterwards?" wide><Area v={v} k="reconciliation" set={set} /></Q>
        <Q label="How do you switch back to normal?" wide help="Return-to-normal steps."><Area v={v} k="return_to_normal" set={set} /></Q>
        <Q label="Has it been tested?" help="Recording a result here does not validate it on its own — validation needs a Pass within 12 months."><Sel v={v} k="test_result" set={set} options={["Not tested", "Pass", "Partial", "Fail"]} /></Q>
        {v.test_result !== "Not tested" && <Q label="When was it last tested?"><Text v={v} k="last_tested" set={set} type="date" /></Q>}
      </div>
      <div className="mt-3 flex gap-2"><Button size="sm" variant="teal" onClick={save}>Save fallback</Button><Button size="sm" variant="outline" onClick={onDone}>Cancel</Button></div>
    </div>
  );
}

const STRAT_TYPES = tableDef("strategies").fields.find((f) => f.key === "strategy_type")!.options! as readonly string[];
export function StrategyStage({ w }: { w: WizardState }) {
  const db = useDb();
  const { fn } = scope(db, w);
  const cur = db.strategies.find((s) => s.id === w.strategy_id) ?? db.strategies.find((s) => s.target_type === "functions" && s.target_id === fn!.id);
  const [v, set] = useDraft("strategy", cur ? { name: cur.name, strategy_type: cur.strategy_type, est_recovery_h: cur.est_recovery_h ?? "", description: cur.description } : { name: `${fn!.name} restoration`, strategy_type: "Warm standby", est_recovery_h: "", description: "" });
  const fbs = fallbackPrompts(db, w).flatMap((p) => fallbacksFor(db, p.table, p.rec.id));
  const slow = v.est_recovery_h !== "" && fn!.rto_h != null && Number(v.est_recovery_h) > Number(fn!.rto_h);
  return (
    <>
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <Callout title="Fallback = keep going temporarily">How the business limps along while things are broken ({fbs.length ? fbs.map((f) => f.name).join(", ") : "none recorded"}).</Callout>
        <Callout title="Recovery strategy = restore normal service">How the systems, site or supplier are brought back to full operation — the subject of this step.</Callout>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Q label="Name of the recovery strategy" required role="Technical Owner"><Text v={v} k="name" set={set} /></Q>
        <Q label="Which approach restores normal service?" help="Active-active = always running elsewhere; warm standby = ready to switch; cold standby = must be built; backup & restore = rebuild from backups."><Sel v={v} k="strategy_type" set={set} options={STRAT_TYPES} /></Q>
        <Q label="How long will full restoration take? (h)"><Text v={v} k="est_recovery_h" set={set} type="number" /></Q>
        <Q label="Describe the restoration approach" wide role="BCP Coordinator"><Area v={v} k="description" set={set} /></Q>
      </div>
      {slow && <div className="mt-3"><Callout tone="warn">Estimated restoration ({v.est_recovery_h}h) is longer than the Business RTO ({fn!.rto_h}h). The fallback must cover the difference — or record a gap during validation.</Callout></div>}
      <StageNav stage="strategy" canContinue={!!String(v.name ?? "").trim()} onContinue={() => { saveStrategy(v); }} />
    </>
  );
}

export function RunbookStage({ w }: { w: WizardState }) {
  const db = useDb();
  const rb = db.runbooks.find((r) => r.id === w.runbook_id);
  const steps = rb ? db.runbook_steps.filter((s) => s.runbook_id === rb.id).sort((a, b) => a.step_no - b.step_no) : [];
  const [reviewed, setReviewed] = useState(false);
  const [reviewer, setReviewer] = useState("");
  const move = (i: number, d: -1 | 1) => { const a = steps[i]!, b = steps[i + d]; if (!b) return; updateRec("runbook_steps", a.id, { step_no: b.step_no }); updateRec("runbook_steps", b.id, { step_no: a.step_no }); };
  if (!rb) return (
    <>
      <Callout title="Generate a draft runbook">We’ll assemble a draft from the owners, dependencies, fallbacks and recovery strategy you’ve entered: activation, notifications, fallback activation, recovery, technical validation, business validation, reconciliation, return to normal and evidence capture. It stays a <b>Draft</b> until a person reviews it.</Callout>
      <Button className="mt-3" variant="teal" onClick={() => { generateDraftRunbook(); toast.success("Draft runbook generated — review required"); }}><Wand2 />Generate draft runbook</Button>
      <StageNav stage="runbook" canContinue={false} hint="Generate and review the runbook to continue" />
    </>
  );
  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2"><RecLink db={db} table="runbooks" id={rb.id} /><Pill value={rb.status} />{rb.status === "Draft" && <DraftBadge />}
        {rb.status === "Draft" && <Button size="sm" variant="ghost" className="ml-auto" onClick={() => { generateDraftRunbook(); toast.success("Draft regenerated from current data"); }}><RefreshCw />Regenerate from current data</Button>}</div>
      <ol className="space-y-2">{steps.map((s, i) => (
        <li key={s.id} className="grid grid-cols-[2rem_1fr_auto] gap-2 rounded border border-border p-2">
          <span className="num grid h-7 w-7 place-items-center rounded-full bg-primary text-xs text-primary-foreground">{s.step_no}</span>
          <div className="grid gap-1.5 sm:grid-cols-[1fr_14rem]">
            <input aria-label="Step title" className={inputCls} defaultValue={s.title} onBlur={(e) => updateRec("runbook_steps", s.id, { title: e.target.value })} />
            <input aria-label="Responsible role" className={inputCls} defaultValue={s.role} onBlur={(e) => updateRec("runbook_steps", s.id, { role: e.target.value })} />
            <textarea aria-label="Instructions" rows={3} className={`${inputCls} sm:col-span-2`} defaultValue={s.instructions} onBlur={(e) => updateRec("runbook_steps", s.id, { instructions: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1">
            <Button size="icon" variant="ghost" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp /></Button>
            <Button size="icon" variant="ghost" aria-label="Move down" disabled={i === steps.length - 1} onClick={() => move(i, 1)}><ArrowDown /></Button>
            <Button size="icon" variant="ghost" aria-label="Delete step" onClick={() => deleteRec("runbook_steps", s.id)}><Trash2 /></Button>
          </div>
        </li>))}</ol>
      <Button size="sm" variant="outline" className="mt-2" onClick={() => createRec("runbook_steps", { runbook_id: rb.id, step_no: (steps.at(-1)?.step_no ?? 0) + 1, title: "New step", role: "", est_minutes: null, instructions: "" })}><Plus />Add step</Button>
      {rb.status === "Draft" ? (
        <div className="mt-4"><Callout tone="warn" title="Review required">
          <p>Read and edit every step. Confirming moves the runbook to <b>In Review</b>; it is only approved through the approval workflow.</p>
          <div className="mt-2 flex flex-wrap items-center gap-3"><label className="flex items-center gap-2"><input type="checkbox" checked={reviewed} onChange={(e) => setReviewed(e.target.checked)} />I have reviewed and edited these steps</label>
            <input aria-label="Reviewer" placeholder="Your name" className={`${inputCls} w-48`} value={reviewer} onChange={(e) => setReviewer(e.target.value)} />
            <Button size="sm" variant="teal" disabled={!reviewed || !reviewer.trim()} onClick={() => { markRunbookReviewed(reviewer.trim()); toast.success("Runbook marked reviewed (In Review)"); }}><CheckCircle2 />Confirm review</Button></div>
        </Callout></div>
      ) : <div className="mt-4"><Callout tone="good">Reviewed{rb.last_reviewed ? ` on ${rb.last_reviewed}` : ""}. Status: {rb.status} — not approved yet.</Callout></div>}
      <StageNav stage="runbook" canContinue={rb.status !== "Draft"} hint={rb.status === "Draft" ? "Confirm your review to continue" : undefined} />
    </>
  );
}

const TEST_HELP: Record<string, string> = {
  Tabletop: "Talk through a scenario around a table.", Walkthrough: "Step through the runbook without executing.", Simulation: "Rehearse actions in a realistic scenario.",
  Failover: "Switch to standby systems for real.", "Full interruption": "Shut down the primary entirely.", Restore: "Restore data from backup and check it.",
  "Fallback / manual workaround": "Actually run the fallback for a period.", Vendor: "Confirm a supplier can recover as contracted.",
  "Application recovery": "Recover one application end-to-end.", "End-to-end DR": "Recover everything and validate the business works.",
};
const PICK_TYPES = ["Tabletop", "Restore", "Failover", "Fallback / manual workaround", "Vendor", "Application recovery", "End-to-end DR"].filter((t) => TEST_TYPES.includes(t));
export function TestStage({ w }: { w: WizardState }) {
  const db = useDb();
  const { fn, procs, comps } = scope(db, w);
  const fbs = fallbackPrompts(db, w).flatMap((p) => fallbacksFor(db, p.table, p.rec.id));
  const targets: { key: string; label: string }[] = [{ key: `functions:${fn!.id}`, label: `${fn!.name} (function)` }, ...procs.map((p) => ({ key: `processes:${p.id}`, label: `${p.name} (process)` })), ...comps.map((c) => ({ key: `components:${c.id}`, label: `${c.name} (component)` })), ...fbs.map((f) => ({ key: `fallbacks:${f.id}`, label: `${f.name} (fallback)` }))];
  const [v, set] = useDraft("test", { test_type: "Tabletop", target: targets[0]!.key, name: "", scheduled_date: "", expected_evidence: EXPECTED_EVIDENCE.Tabletop!.join("\n") });
  const planned = db.tests.filter((t) => targets.some((x) => x.key === `${t.target_type}:${t.target_id}`));
  return (
    <>
      {planned.length > 0 && <ul className="mb-4 space-y-1.5">{planned.map((t) => <li key={t.id} className="flex flex-wrap items-center gap-2 rounded border border-border px-3 py-2 text-sm"><RecLink db={db} table="tests" id={t.id} /><Pill value={t.test_type} tone="neutral" /><Pill value={t.result} /><span className="text-xs text-muted-foreground">{t.scheduled_date || "no date"}{t.result === "Scheduled" && " · planned only — nothing is validated until it passes"}</span></li>)}</ul>}
      <Q group label="What kind of test or exercise?" role="BCP Coordinator">
        <div className="mt-1 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{PICK_TYPES.map((t) => (
          <button key={t} type="button" onClick={() => setDraft("test", { ...v, test_type: t, expected_evidence: (EXPECTED_EVIDENCE[t] ?? []).join("\n") })} className={`rounded-md border p-2.5 text-left text-sm ${v.test_type === t ? "border-teal bg-accent/50 ring-2 ring-teal/30" : "border-border hover:border-teal/50"}`}><div className="font-semibold text-primary">{t}</div><div className="text-xs text-muted-foreground">{TEST_HELP[t]}</div></button>
        ))}</div>
      </Q>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Q label="What will be tested?"><select aria-label="target" className={inputCls} value={v.target} onChange={(e) => set("target", e.target.value)}>{targets.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}</select></Q>
        <Q label="When is it scheduled?"><Text v={v} k="scheduled_date" set={set} type="date" /></Q>
        <Q label="Test name" wide><Text v={v} k="name" set={set} placeholder={`${v.test_type} — ${fn!.name}`} /></Q>
        <Q label="Which evidence must be captured?" wide help="Recorded on the test so whoever runs it knows what proof to keep."><textarea aria-label="expected_evidence" rows={4} className={inputCls} value={v.expected_evidence} onChange={(e) => set("expected_evidence", e.target.value)} /></Q>
      </div>
      <Button className="mt-3" variant="teal" onClick={() => { const [tt, id] = String(v.target).split(":"); planTest({ name: v.name.trim() || `${v.test_type} — ${fn!.name}`, test_type: v.test_type, scheduled_date: v.scheduled_date, target_type: tt as TableName, target_id: id!, expected_evidence: v.expected_evidence }); toast.success("Test planned (Scheduled)"); }}><Plus />Plan this test</Button>
      <StageNav stage="test" canContinue={planned.length > 0} hint={!planned.length ? "Plan at least one test" : undefined} />
    </>
  );
}

export function ValidationStage({ w }: { w: WizardState }) {
  const db = useDb();
  const { fn } = scope(db, w);
  const f = validationFindings(db, w);
  const r = functionReadiness(db, fn!);
  const groups = [...new Set(f.map((x) => x.category))];
  return (
    <>
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-md border border-border p-3"><div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Readiness</div><div className="mt-1">{r.assessed ? <Meter value={r.score} /> : <span className="text-sm">Not yet assessed</span>}</div></div>
        <div className="rounded-md border border-border p-3"><div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Findings</div><div className="num text-2xl text-primary">{f.length}</div></div>
        <div className="rounded-md border border-border p-3"><div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Open gaps logged</div><div className="num text-2xl text-primary">{db.gaps.filter((g) => g.status !== "Closed" && f.some((x) => x.table === g.target_type && x.id === g.target_id)).length}</div></div>
      </div>
      {!f.length ? <Callout tone="good">No open findings for this function.</Callout> : (
        <div className="space-y-3">{groups.map((g) => (
          <section key={g} className="rounded-md border border-border">
            <header className="border-b border-border bg-muted/40 px-3 py-1.5 text-sm font-semibold text-primary">{g}</header>
            <ul className="divide-y divide-border">{f.filter((x) => x.category === g).map((x) => (
              <li key={x.key} className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
                <Pill value={x.severity === "high" ? "High" : "Medium"} /><span className="min-w-0 flex-1">{x.message}</span>
                <Button size="sm" variant="ghost" onClick={() => setStage(x.stage as StageId)}>Fix in “{stageTitle(x.stage)}”</Button>
                {gapExists(db, x.table, x.id, x.gapTitle) ? <Pill value="Gap logged" tone="good" /> : <Button size="sm" variant="orange" onClick={() => { if (x.assessmentId) { createGapForAssessment(x.assessmentId); toast.success("Gap created"); return; } createGap(x.table, x.id, x.gapTitle, x.severity === "high" ? "High" : "Medium", x.message); toast.success("Gap created"); }}>Create gap</Button>}
              </li>))}</ul>
          </section>))}</div>
      )}
      <p className="mt-3 text-xs text-muted-foreground">Checks use the same rules as the Warnings page and Dashboard. Nothing is marked validated here.</p>
      <StageNav stage="validation" continueLabel="Reviewed — continue" onContinue={() => { markValidationReviewed(); }} />
    </>
  );
}

export function ApprovalStage({ w }: { w: WizardState }) {
  const db = useDb();
  const nav = useNavigate();
  const { org, plan, fn, procs, comps } = scope(db, w);
  const fbs = fallbackPrompts(db, w).flatMap((p) => fallbacksFor(db, p.table, p.rec.id));
  const [v, set] = useDraft("approval", { approver: "", role: "", comments: "" });
  const approval = db.approvals.find((a) => a.id === w.approval_id) ?? db.approvals.find((a) => a.target_type === "functions" && a.target_id === fn!.id);
  const findings = validationFindings(db, w);
  const rows: [string, ReactNode][] = [
    ["Organization", <RecLink key="o" db={db} table="organizations" id={org?.id} />], ["Plan", <RecLink key="p" db={db} table="plans" id={plan?.id} />],
    ["Business function", <span key="f"><RecLink db={db} table="functions" id={fn!.id} /> · {fn!.criticality} · MTPD {fn!.mtpd_h ?? "—"}h · RTO {fn!.rto_h ?? "—"}h · RPO {fn!.rpo_h ?? "—"}h</span>],
    ["Processes", procs.map((p) => p.name).join(", ") || "—"], ["Supporting components", comps.map((c) => `${c.name} (${c.type})`).join(", ") || "—"],
    ["Fallbacks", fbs.map((f) => `${f.name} [${f.status}]`).join(", ") || "None"],
    ["Recovery strategy", db.strategies.filter((s) => s.target_type === "functions" && s.target_id === fn!.id).map((s) => s.name).join(", ") || "—"],
    ["Runbook", db.runbooks.filter((s) => s.target_type === "functions" && s.target_id === fn!.id).map((s) => `${s.name} [${s.status}]`).join(", ") || "—"],
    ["Tests planned", String(db.tests.filter((t) => [fn!.id, ...procs.map((p) => p.id), ...comps.map((c) => c.id), ...fbs.map((f) => f.id)].includes(t.target_id)).length)],
    ["Open findings / gaps", `${findings.length} findings · ${db.gaps.filter((g) => g.status !== "Closed").length} open gaps`],
  ];
  return (
    <>
      <dl className="divide-y divide-border rounded-md border border-border text-sm">{rows.map(([k, val]) => <div key={k} className="grid gap-1 px-3 py-2 sm:grid-cols-[12rem_1fr]"><dt className="text-muted-foreground">{k}</dt><dd>{val}</dd></div>)}</dl>
      {approval ? (
        <div className="mt-4 space-y-3">
          <Callout tone="good" title="Submitted for approval">Sent to {approval.approver}{approval.role ? ` (${approval.role})` : ""}. Decision: <b>{approval.decision}</b>. The approver records the decision on the Approvals page — nothing is approved automatically.</Callout>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild><Link to="/$type/$id" params={{ type: "approvals", id: approval.id }}>Open approval</Link></Button>
            <Button variant="outline" onClick={() => { const p = w.plan_id, o = w.organization_id; startWizard(); if (o) saveOrganization({ name: "" }, o); if (p) savePlan({}, p); setStage("function"); }}><Plus />Add another business function</Button>
            <Button variant="teal" onClick={() => { exitWizard(); nav({ to: "/dashboard" }); }}>Finish &amp; go to dashboard</Button>
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded-md border border-teal/40 bg-accent/20 p-3">
          {findings.length > 0 && <div className="mb-3"><Callout tone="warn">{findings.length} validation findings are still open. You can still submit — the approver will see them.</Callout></div>}
          <div className="grid gap-3 sm:grid-cols-2">
            <Q label="Who should approve this?" required role="Approver"><Text v={v} k="approver" set={set} /></Q>
            <Q label="Their role"><Text v={v} k="role" set={set} placeholder="e.g. COO" /></Q>
            <Q label="Notes for the approver" wide><Area v={v} k="comments" set={set} /></Q>
          </div>
          <Button className="mt-3" variant="teal" disabled={!String(v.approver ?? "").trim()} onClick={() => { submitForApproval({ approver: v.approver.trim(), role: v.role, comments: v.comments }); toast.success("Submitted — awaiting approver decision"); }}>Submit for approval</Button>
        </div>
      )}
      <StageNav stage="approval" canContinue={false} continueLabel="Last step" />
    </>
  );
}