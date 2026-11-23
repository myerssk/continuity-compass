/* eslint-disable @typescript-eslint/no-explicit-any */
// "Build My BCP/DRP" guided workflow. Every action writes to the existing tables through store.ts;
// the wizard state itself only stores pointers + unsaved drafts.
import type { Db, Rec, StageId, TableName, WizardState } from "./schema";
import { UNRESOLVED, assessmentFor, componentsOfFunction, computeWarnings, effectiveDisposition, fallbacksFor, functionsUsingComponent, missingObjectives, processesOf, techRtoConflicts } from "./rules";
import { createRec, deleteRec, getDb, saveWizard, updateRec } from "./store";

export type Role = "Business Owner" | "Process Owner" | "Technical Owner" | "BCP Coordinator" | "Approver";
export const STAGES: { id: StageId; title: string; role: Role[]; blurb: string }[] = [
  { id: "organization", title: "Organization", role: ["BCP Coordinator"], blurb: "Who the plan covers" },
  { id: "plan", title: "Plan", role: ["BCP Coordinator"], blurb: "Plan name, owner, review date" },
  { id: "function", title: "Business Function", role: ["Business Owner"], blurb: "The capability to protect" },
  { id: "bia", title: "BIA & Recovery Objectives", role: ["Business Owner"], blurb: "Impact, MTPD, RTO, RPO" },
  { id: "processes", title: "Business Processes", role: ["Process Owner"], blurb: "How the work gets done" },
  { id: "components", title: "Supporting Components", role: ["Technical Owner"], blurb: "Systems, sites, vendors, data" },
  { id: "fallbacks", title: "Fallbacks", role: ["Process Owner", "Technical Owner"], blurb: "How to keep going meanwhile" },
  { id: "strategy", title: "Recovery Strategy", role: ["Technical Owner", "BCP Coordinator"], blurb: "How normal service is restored" },
  { id: "runbook", title: "Runbook", role: ["BCP Coordinator"], blurb: "Step-by-step response (draft)" },
  { id: "test", title: "Test Plan", role: ["BCP Coordinator"], blurb: "How it will be proven" },
  { id: "validation", title: "Gaps & Validation", role: ["BCP Coordinator"], blurb: "What is still missing" },
  { id: "approval", title: "Review & Approval", role: ["Approver"], blurb: "Submit for sign-off" },
];
export const stageIndex = (s: StageId) => STAGES.findIndex((x) => x.id === s);
export const stageTitle = (s: StageId) => STAGES[stageIndex(s)]?.title ?? s;

const now = () => new Date().toISOString();
const has = (v: any) => v !== "" && v !== null && v !== undefined;
const n = (v: any) => (has(v) && !isNaN(Number(v)) ? Number(v) : null);
const find = (db: Db, t: TableName, id?: string) => (id ? db[t].find((r) => r.id === id) : undefined);

export function newWizard(partial: Partial<WizardState> = {}): WizardState {
  return { stage: "organization", answers: {}, no_tech: [], drafts: {}, started_at: now(), updated_at: now(), ...partial };
}
export const getWizard = (db: Db = getDb()) => db.wizard ?? null;
function patch(p: Partial<WizardState>) {
  const w = getWizard() ?? newWizard();
  saveWizard({ ...w, ...p });
}
export const setStage = (stage: StageId) => patch({ stage });
export function setDraft(stage: string, vals: Record<string, any>) {
  const w = getWizard() ?? newWizard();
  saveWizard({ ...w, drafts: { ...w.drafts, [stage]: vals } });
}
export function clearDraft(stage: string) {
  const w = getWizard(); if (!w || !(stage in w.drafts)) return;
  const d = { ...w.drafts }; delete d[stage]; saveWizard({ ...w, drafts: d });
}
export const exitWizard = () => saveWizard(null);

/** Start (or restart) the workflow, optionally for an existing function. */
export function startWizard(functionId?: string, stage?: StageId): WizardState {
  const db = getDb();
  let w = newWizard();
  const fn = find(db, "functions", functionId);
  if (fn) {
    const plan = find(db, "plans", fn.plan_id);
    w = { ...w, function_id: fn.id, plan_id: plan?.id, organization_id: plan?.organization_id,
      strategy_id: db.strategies.find((s) => s.target_type === "functions" && s.target_id === fn.id)?.id,
      runbook_id: db.runbooks.find((s) => s.target_type === "functions" && s.target_id === fn.id)?.id,
      test_id: db.tests.find((s) => s.target_type === "functions" && s.target_id === fn.id)?.id,
      approval_id: db.approvals.find((s) => s.target_type === "functions" && s.target_id === fn.id)?.id };
  }
  w.stage = stage ?? firstIncomplete(db, w);
  saveWizard(w);
  return w;
}

// ---------- scope & completion ----------
export function scope(db: Db, w: WizardState | null) {
  const fn = find(db, "functions", w?.function_id);
  const procs = fn ? processesOf(db, fn.id) : [];
  const comps = fn ? componentsOfFunction(db, fn.id) : [];
  return { org: find(db, "organizations", w?.organization_id), plan: find(db, "plans", w?.plan_id), fn, procs, comps };
}
/** Items the fallback stage asks about: the function, each process, each supporting component. */
export function fallbackPrompts(db: Db, w: WizardState | null): { key: string; table: "functions" | "processes" | "components"; rec: Rec }[] {
  const s = scope(db, w);
  if (!s.fn) return [];
  return [
    { key: `functions:${s.fn.id}`, table: "functions" as const, rec: s.fn },
    ...s.procs.map((p) => ({ key: `processes:${p.id}`, table: "processes" as const, rec: p })),
    ...s.comps.map((c) => ({ key: `components:${c.id}`, table: "components" as const, rec: c })),
  ];
}
const gapsOn = (db: Db, t: TableName, id: string) => db.gaps.filter((g) => g.target_type === t && g.target_id === id);
export function promptAnswered(db: Db, w: WizardState | null, p: { key: string; table: TableName; rec: Rec }) {
  return !!w?.answers[p.key] || fallbacksFor(db, p.table, p.rec.id).length > 0 || gapsOn(db, p.table, p.rec.id).length > 0 || !!assessmentFor(db, p.table, p.rec.id);
}

export function stageDone(db: Db, w: WizardState | null, id: StageId): boolean {
  const s = scope(db, w);
  switch (id) {
    case "organization": return !!s.org;
    case "plan": return !!s.plan;
    case "function": return !!s.fn;
    case "bia": return !!s.fn && [s.fn.mtpd_h, s.fn.rto_h, s.fn.rpo_h].every((v) => n(v) !== null) && has(s.fn.criticality);
    case "processes": return s.procs.length > 0;
    case "components": return s.procs.length > 0 && s.procs.every((p) => p.uses_technology === "No" || db.process_components.some((l) => l.process_id === p.id));
    case "fallbacks": { const ps = fallbackPrompts(db, w); return ps.length > 0 && ps.every((p) => promptAnswered(db, w, p)); }
    case "strategy": return !!s.fn && db.strategies.some((x) => x.target_type === "functions" && x.target_id === s.fn!.id);
    case "runbook": { const r = find(db, "runbooks", w?.runbook_id) ?? (s.fn && db.runbooks.find((x) => x.target_type === "functions" && x.target_id === s.fn!.id)); return !!r && r.status !== "Draft"; }
    case "test": return !!s.fn && db.tests.some((x) => x.target_type === "functions" && x.target_id === s.fn!.id);
    case "validation": return !!w?.validation_reviewed;
    case "approval": return !!s.fn && db.approvals.some((x) => x.target_type === "functions" && x.target_id === s.fn!.id);
  }
}
export function progress(db: Db, w: WizardState | null) {
  const done = STAGES.filter((s) => stageDone(db, w, s.id)).map((s) => s.id);
  return { done, pct: Math.round((done.length / STAGES.length) * 100) };
}
export function firstIncomplete(db: Db, w: WizardState | null): StageId {
  return STAGES.find((s) => !stageDone(db, w, s.id))?.id ?? "approval";
}
/** A stage can be opened once the records it builds on exist. */
export function stageAvailable(db: Db, w: WizardState | null, id: StageId) {
  const s = scope(db, w);
  if (id === "organization") return true;
  if (id === "plan") return !!s.org;
  if (id === "function") return !!s.plan;
  return !!s.fn;
}

// ---------- stage actions (all write through store.ts) ----------
function upsert(table: TableName, id: string | undefined, vals: Record<string, any>): Rec {
  const db = getDb();
  if (id && find(db, table, id)) { updateRec(table, id, vals); return find(getDb(), table, id)!; }
  return createRec(table, vals);
}
export function saveOrganization(vals: { name: string; industry?: string; region?: string }, existingId?: string) {
  const w = getWizard() ?? newWizard();
  const r = existingId ? find(getDb(), "organizations", existingId)! : upsert("organizations", w.organization_id, vals);
  patch({ organization_id: r.id, ...(w.organization_id !== r.id ? { plan_id: undefined, function_id: undefined } : {}) });
  clearDraft("organization");
  return r;
}
export function savePlan(vals: Record<string, any>, existingId?: string) {
  const w = getWizard()!;
  const r = existingId ? find(getDb(), "plans", existingId)! : upsert("plans", w.plan_id, { status: "Draft", version: "0.1", ...vals, organization_id: w.organization_id });
  patch({ plan_id: r.id, ...(w.plan_id !== r.id ? { function_id: undefined } : {}) });
  clearDraft("plan");
  return r;
}
export function saveFunction(vals: Record<string, any>) {
  const w = getWizard()!;
  const existing = find(getDb(), "functions", w.function_id);
  const r = upsert("functions", w.function_id, { ...(existing ? {} : { approval_status: "Draft", criticality: "High" }), ...vals, plan_id: w.plan_id });
  patch({ function_id: r.id });
  clearDraft("function");
  return r;
}
export function saveBia(vals: { criticality: string; mtpd_h: any; rto_h: any; rpo_h: any; operating_hours?: string; peak_periods?: string; description?: string }) {
  const w = getWizard()!;
  updateRec("functions", w.function_id!, { ...vals, mtpd_h: n(vals.mtpd_h), rto_h: n(vals.rto_h), rpo_h: n(vals.rpo_h) });
  clearDraft("bia");
}
export function addProcess(vals: Record<string, any>, usesTech: boolean) {
  const w = getWizard()!;
  const db = getDb();
  const seq = n(vals.recovery_sequence) ?? processesOf(db, w.function_id!).length + 1;
  const r = createRec("processes", { ...vals, function_id: w.function_id, recovery_sequence: seq, rto_h: n(vals.rto_h), rpo_h: n(vals.rpo_h), uses_technology: usesTech ? "Yes" : "No" });
  clearDraft("processes");
  return r;
}
export function setProcessUsesTech(processId: string, usesTech: boolean) {
  updateRec("processes", processId, { uses_technology: usesTech ? "Yes" : "No" });
}
const TECH_TYPES = ["Application", "Infrastructure", "Database", "Interface"];
export const needsTechObjectives = (type: string) => TECH_TYPES.includes(type);
export function addComponent(processId: string, vals: Record<string, any>) {
  const r = createRec("components", { ...vals, tech_rto_h: n(vals.tech_rto_h), tech_rpo_h: n(vals.tech_rpo_h) });
  linkComponent(processId, r.id);
  clearDraft("components");
  return r;
}
export function linkComponent(processId: string, componentId: string) {
  const db = getDb();
  if (db.process_components.some((l) => l.process_id === processId && l.component_id === componentId)) return;
  createRec("process_components", { process_id: processId, component_id: componentId });
  setProcessUsesTech(processId, true);
}
export function unlinkComponent(processId: string, componentId: string) {
  const l = getDb().process_components.find((x) => x.process_id === processId && x.component_id === componentId);
  if (l) deleteRec("process_components", l.id);
}
export function answerFallback(key: string, ans: "yes" | "no") {
  const w = getWizard()!;
  saveWizard({ ...w, answers: { ...w.answers, [key]: ans } });
  if (ans === "no") { const [t, id] = key.split(":") as [FbTarget, string]; recordNoFallback(t, id); }
}
type FbTarget = "functions" | "processes" | "components";
const today = () => new Date().toISOString().slice(0, 10);
/** Persists "No, it would stop" as a structured assessment (no fallback record is created). */
export function recordNoFallback(table: FbTarget, id: string): Rec {
  const db = getDb();
  const cur = assessmentFor(db, table, id);
  if (cur?.fallback_status === "No Fallback Available") return cur;
  if (fallbacksFor(db, table, id).length) return cur!; // a real fallback already exists; don't contradict it
  return createRec("fallback_assessments", { target_type: table, target_id: id, fallback_status: "No Fallback Available", continuity_capability: "Process Stops", risk_disposition: "Not Yet Addressed", gap_id: "", approval_id: "", disposition_owner: "", rationale: "", assessed_on: today(), disposition_on: "" });
}
const disp = (a: Rec, next: string, patch: Record<string, any> = {}) =>
  updateRec("fallback_assessments", a.id, { risk_disposition: next, disposition_on: today(), ...patch }, `Risk disposition: ${a.risk_disposition || "Not Yet Addressed"} → ${next}`);
const getA = (id: string) => getDb().fallback_assessments.find((a) => a.id === id);
/** Create Gap: ordinary gap record linked to the assessment; the original no-fallback answer stays. */
export function createGapForAssessment(assessmentId: string): Rec {
  const a = getA(assessmentId)!;
  const name = getDb()[a.target_type as TableName].find((r) => r.id === a.target_id)?.name ?? "";
  const g = createGap(a.target_type, a.target_id, "No fallback — business cannot continue", "High", `If ${name} is unavailable the business cannot continue (no fallback available).`, "Design and test a fallback or formally accept the risk");
  disp(a, "Gap Opened", { gap_id: g.id });
  return g;
}
/** Accept Risk: owner + rationale required; raises a Pending approval. Never validates anything. */
export function acceptRisk(assessmentId: string, owner: string, rationale: string): Rec {
  if (!owner.trim() || !rationale.trim()) throw new Error("Owner/approver and rationale are required to accept a risk");
  const a = getA(assessmentId)!;
  const ap = createRec("approvals", { target_type: a.target_type, target_id: a.target_id, approver: owner.trim(), role: "Risk acceptance", decision: "Pending", decided_on: "", comments: `Risk acceptance — no fallback available, process stops. Rationale: ${rationale.trim()}` });
  disp(a, "Risk Acceptance Pending", { disposition_owner: owner.trim(), rationale: rationale.trim(), approval_id: ap.id });
  return ap;
}
/** Mark Not Applicable: rationale required. Removes the warning but adds no fallback readiness. */
export function markNotApplicable(assessmentId: string, rationale: string, owner = "") {
  if (!rationale.trim()) throw new Error("A rationale is required to mark a fallback not applicable");
  disp(getA(assessmentId)!, "Not Applicable", { rationale: rationale.trim(), ...(owner.trim() ? { disposition_owner: owner.trim() } : {}) });
}
/** Function that owns a fallback target, for reopening the guided stage. */
export function owningFunction(db: Db, table: TableName, id: string): Rec | undefined {
  if (table === "functions") return db.functions.find((f) => f.id === id);
  if (table === "processes") { const p = db.processes.find((x) => x.id === id); return db.functions.find((f) => f.id === p?.function_id); }
  if (table === "components") return functionsUsingComponent(db, id)[0];
  return undefined;
}
/** Develop Fallback: reopen the guided Fallback stage focused on that exact item; the assessment is kept until a fallback is saved. */
export function developFallback(assessmentId: string) {
  const db = getDb(); const a = getA(assessmentId)!;
  const fn = owningFunction(db, a.target_type, a.target_id);
  const key = `${a.target_type}:${a.target_id}`;
  const cur = getWizard(db);
  if (!cur || cur.function_id !== fn?.id) startWizard(fn?.id, "fallbacks"); else setStage("fallbacks");
  const w = getWizard()!;
  saveWizard({ ...w, stage: "fallbacks", focus_key: key, answers: { ...w.answers, [key]: "yes" } });
}
/** Creates a fallback (status Draft — never Validated by the wizard) and its dependency links. */
export function saveFallback(target: { table: "functions" | "processes" | "components"; id: string }, vals: Record<string, any>, dependencyIds: string[], parentId?: string) {
  const r = createRec("fallbacks", {
    fallback_type: "Manual workaround", test_result: "Not tested", last_tested: "", evidence_ref: "",
    ...vals, capacity_pct: n(vals.capacity_pct), max_duration_h: n(vals.max_duration_h),
    target_type: target.table, target_id: target.id, parent_id: parentId ?? "", status: "Draft",
  });
  dependencyIds.forEach((c) => createRec("fallback_dependencies", { fallback_id: r.id, component_id: c }));
  answerFallback(`${target.table}:${target.id}`, "yes");
  const a = assessmentFor(getDb(), target.table, target.id);
  if (a && a.fallback_status === "No Fallback Available") {
    supersedeRiskApproval(a.approval_id, target);
    updateRec("fallback_assessments", a.id, { fallback_status: "Fallback Developed", continuity_capability: "Continues via Fallback", risk_disposition: "Superseded by Fallback", disposition_on: today() }, `Fallback "${r.name}" developed — assessment superseded (was ${effectiveDisposition(getDb(), a)}); fallback awaiting validation`);
  }
  clearDraft(`fallback:${target.table}:${target.id}`);
  const cw = getWizard(); if (cw?.focus_key) saveWizard({ ...cw, focus_key: undefined });
  return r;
}
/** Supersedes only the risk-acceptance approval linked to this exact assessment. Never deletes it or rewrites an earlier decision. */
function supersedeRiskApproval(approvalId: string | undefined, target: { table: string; id: string }) {
  if (!approvalId) return;
  const ap = getDb().approvals.find((x) => x.id === approvalId);
  if (!ap || ap.role !== "Risk acceptance" || ap.target_type !== target.table || ap.target_id !== target.id || ap.lifecycle) return;
  const reason = "Superseded by fallback development";
  if (ap.decision === "Pending")
    updateRec("approvals", ap.id, { decision: "Withdrawn", lifecycle: "Withdrawn — Superseded by Fallback Development", superseded_reason: reason, superseded_on: today() }, `Risk acceptance withdrawn — ${reason.toLowerCase()}`);
  else if (ap.decision === "Approved")
    updateRec("approvals", ap.id, { lifecycle: "Risk Accepted — Superseded by Fallback Development", superseded_reason: reason, superseded_on: today() }, `Risk accepted on ${ap.decided_on || "earlier date"} — now ${reason.toLowerCase()} (decision retained)`);
}
/** Common-mode warnings for one fallback, from the shared rule set. */
export const commonModeFor = (db: Db, fallbackId: string) => computeWarnings(db).filter((x) => x.kind === "common_dependency" && x.id === fallbackId);

/** One-click gap; returns the existing open gap instead of duplicating it. */
export function createGap(target_type: TableName, target_id: string, title: string, severity = "High", description = "", corrective_action = "") {
  const db = getDb();
  const dup = db.gaps.find((g) => g.target_type === target_type && g.target_id === target_id && g.title === title && g.status !== "Closed");
  if (dup) return dup;
  const owner = scope(db, getWizard(db)).fn?.owner ?? "";
  return createRec("gaps", { target_type, target_id, title, severity, description, corrective_action, owner, due_date: "", status: "Open" });
}
export const gapExists = (db: Db, target_type: TableName, target_id: string, title: string) => db.gaps.some((g) => g.target_type === target_type && g.target_id === target_id && g.title === title && g.status !== "Closed");

export function saveStrategy(vals: Record<string, any>) {
  const w = getWizard()!;
  const r = upsert("strategies", w.strategy_id, { status: "Draft", ...vals, est_recovery_h: n(vals.est_recovery_h), target_type: "functions", target_id: w.function_id });
  patch({ strategy_id: r.id });
  clearDraft("strategy");
  return r;
}

// ---------- draft runbook ----------
export interface DraftStep { title: string; role: string; est_minutes: number | null; instructions: string }
export function draftRunbookSteps(db: Db, w: WizardState): DraftStep[] {
  const s = scope(db, w);
  const fn = s.fn!;
  const fbs = fallbackPrompts(db, w).flatMap((p) => fallbacksFor(db, p.table, p.rec.id)).filter((f) => f.status !== "Retired");
  const strat = find(db, "strategies", w.strategy_id) ?? db.strategies.find((x) => x.target_type === "functions" && x.target_id === fn.id);
  const procs = [...s.procs].sort((a, b) => (n(a.recovery_sequence) ?? 99) - (n(b.recovery_sequence) ?? 99));
  const owners = [...new Set([fn.owner, ...procs.map((p) => p.owner), ...s.comps.map((c) => c.technical_owner), ...fbs.flatMap((f) => [f.owner, f.alternate_owner])].filter(Boolean))];
  const techOwners = [...new Set(s.comps.map((c) => c.technical_owner).filter(Boolean))];
  const list = (xs: string[], empty: string) => (xs.length ? xs.map((x) => `• ${x}`).join("\n") : empty);
  return [
    { title: "Activate: assess the disruption and declare an incident", role: fn.owner || "Business Owner", est_minutes: 15, instructions: `Confirm ${fn.name} is disrupted and estimate the outage. Declare an incident if it may exceed ${fn.rto_h ?? "?"}h (Business RTO); MTPD is ${fn.mtpd_h ?? "?"}h.` },
    { title: "Notify owners and stakeholders", role: "BCP Coordinator", est_minutes: 15, instructions: `Notify:\n${list(owners, "• (no owners recorded yet — add them)")}` },
    { title: "Activate fallback", role: fbs[0]?.owner || "Process Owner", est_minutes: 30, instructions: list(fbs.map((f) => `${f.name}${f.parent_id ? " (secondary)" : ""}: when ${f.activation_criteria || "criteria not documented"}; owner ${f.owner || "?"} / alt ${f.alternate_owner || "?"}; capacity ${f.capacity_pct ?? "?"}% for max ${f.max_duration_h ?? "?"}h`), "• No fallback documented — see open gaps; escalate immediately.") },
    { title: "Recover supporting components", role: techOwners[0] || "Technical Owner", est_minutes: null, instructions: `${strat ? `Strategy: ${strat.name} (${strat.strategy_type || "type not set"}).\n` : "No recovery strategy recorded.\n"}${list(procs.flatMap((p) => db.process_components.filter((l) => l.process_id === p.id).map((l) => { const c = find(db, "components", l.component_id); return c ? `[${p.name}] ${c.name} — ${c.technical_owner || "owner ?"}, Tech RTO ${c.tech_rto_h ?? "?"}h, backup: ${c.backup_method || "?"}, failover: ${c.failover || "?"}` : ""; })).filter(Boolean), "• No components recorded.")}` },
    { title: "Technical validation", role: techOwners.join(", ") || "Technical Owner", est_minutes: 30, instructions: "Confirm each recovered component is running, data is restored to within its Technical RPO, and interfaces are reconnected." },
    { title: "Business validation", role: [...new Set(procs.map((p) => p.owner).filter(Boolean))].join(", ") || "Process Owner", est_minutes: 30, instructions: list(procs.map((p) => `${p.name}: verify outputs (${p.outputs || "not documented"})`), "• Verify the function operates normally.") },
    { title: "Reconcile data and transactions", role: fbs[0]?.owner || "Process Owner", est_minutes: 60, instructions: list(fbs.map((f) => `${f.name}: ${f.reconciliation || "reconciliation not documented"}`), "• Reconcile any work done manually during the outage.") },
    { title: "Return to normal operations", role: fn.owner || "Business Owner", est_minutes: 30, instructions: list(fbs.map((f) => `${f.name}: ${f.return_to_normal || "return-to-normal not documented"}`), "• Stand down the incident.") },
    { title: "Capture evidence and lessons learned", role: "BCP Coordinator", est_minutes: 30, instructions: "Record timeline, achieved recovery time, screenshots/logs and sign-offs as Evidence; log any issues as Gaps." },
  ];
}
/** Creates a DRAFT runbook ("Generated draft — review required"). Never sets it to Approved. */
export function generateDraftRunbook(): Rec {
  const db = getDb(); const w = getWizard(db)!; const fn = scope(db, w).fn!;
  const existing = find(db, "runbooks", w.runbook_id);
  if (existing) { db.runbook_steps.filter((x) => x.runbook_id === existing.id).forEach((x) => deleteRec("runbook_steps", x.id)); updateRec("runbooks", existing.id, { status: "Draft", origin: "Generated draft — review required" }); }
  const rb = existing ?? createRec("runbooks", { target_type: "functions", target_id: fn.id, name: `${fn.name} recovery runbook`, owner: fn.owner ?? "", version: "0.1", status: "Draft", origin: "Generated draft — review required", last_reviewed: "" });
  draftRunbookSteps(getDb(), w).forEach((s, i) => createRec("runbook_steps", { ...s, runbook_id: rb.id, step_no: i + 1 }));
  patch({ runbook_id: rb.id });
  return rb;
}
/** Human review moves it to "In Review" — approval happens only through the approval workflow. */
export function markRunbookReviewed(reviewer: string) {
  const w = getWizard()!;
  updateRec("runbooks", w.runbook_id!, { status: "In Review", origin: "Manual", last_reviewed: new Date().toISOString().slice(0, 10), owner: find(getDb(), "runbooks", w.runbook_id)?.owner || reviewer });
}

// ---------- test plan ----------
export const EXPECTED_EVIDENCE: Record<string, string[]> = {
  Tabletop: ["Attendee list", "Scenario & discussion notes", "Actions / gaps raised"],
  Walkthrough: ["Step-by-step walkthrough record", "Issues found"],
  Simulation: ["Timeline of actions", "Achieved recovery time", "Issues found"],
  Failover: ["Failover start/finish timestamps", "Achieved RTO vs target", "System health screenshots", "Fail-back confirmation"],
  "Full interruption": ["Full timeline", "Achieved RTO/RPO", "Business sign-off"],
  Restore: ["Backup ID / restore point used", "Restore duration", "Data integrity check (achieved RPO)"],
  "Fallback / manual workaround": ["Volume processed in fallback (capacity %)", "Duration operated", "Reconciliation record", "Process owner sign-off"],
  Vendor: ["Vendor recovery confirmation", "Contractual SLA comparison", "Contact test log"],
  "Application recovery": ["Recovery timestamps", "Achieved Technical RTO/RPO", "Functional test results"],
  "End-to-end DR": ["Full timeline", "Achieved RTO/RPO per component", "Technical & business validation sign-offs", "Lessons learned"],
};
/** Plans a test (result "Scheduled"). Planning never marks a fallback or function as validated. */
export function planTest(vals: { name: string; test_type: string; scheduled_date: string; target_type?: TableName; target_id?: string; expected_evidence?: string }) {
  const w = getWizard()!;
  const r = createRec("tests", { target_type: vals.target_type ?? "functions", target_id: vals.target_id ?? w.function_id, name: vals.name, test_type: vals.test_type, scheduled_date: vals.scheduled_date, executed_date: "", result: "Scheduled", achieved_rto_h: null, findings: "", expected_evidence: vals.expected_evidence ?? (EXPECTED_EVIDENCE[vals.test_type] ?? []).join("\n") });
  patch({ test_id: r.id });
  clearDraft("test");
  return r;
}

// ---------- validation ----------
export interface Finding { assessmentId?: string | undefined; key: string; severity: "high" | "medium"; category: string; message: string; table: TableName; id: string; gapTitle: string; stage: StageId }
export function validationFindings(db: Db, w: WizardState | null): Finding[] {
  const s = scope(db, w);
  if (!s.fn) return [];
  const fn = s.fn;
  const inScope = new Set([`functions:${fn.id}`, ...s.procs.map((p) => `processes:${p.id}`), ...s.comps.map((c) => `components:${c.id}`)]);
  const fbs = db.fallbacks.filter((f) => inScope.has(`${f.target_type}:${f.target_id}`) && f.status !== "Retired");
  const out: Finding[] = [];
  for (const m of missingObjectives(db).filter((x) => inScope.has(`${x.table}:${x.id}`)))
    out.push({ key: `mo:${m.id}`, severity: m.table === "functions" ? "high" : "medium", category: "Missing objectives", message: `${m.name}: missing ${m.missing.join(", ")}`, table: m.table, id: m.id, gapTitle: `Recovery objectives missing (${m.missing.join(", ")})`, stage: m.table === "functions" ? "bia" : m.table === "processes" ? "processes" : "components" });
  for (const c of s.comps) for (const x of techRtoConflicts(db, c.id))
    out.push({ key: `rto:${c.id}:${x.id}`, severity: "high", category: "Technical RTO conflict", message: `${c.name}: Technical RTO ${x.technical}h exceeds ${x.level} "${x.name}" RTO ${x.required}h`, table: "components", id: c.id, gapTitle: `Technical RTO exceeds ${x.level} RTO (${x.name})`, stage: "components" });
  const warns = computeWarnings(db);
  for (const wn of warns) {
    const relevant = (wn.table === "functions" && wn.id === fn.id) || (wn.table === "fallbacks" && fbs.some((f) => f.id === wn.id));
    if (!relevant || wn.kind === "rto_exceeds" || wn.kind === "no_fallback_process_stops") continue;
    const label = { no_fallback: "Fallback assessment not completed", fallback_unvalidated: "Unvalidated fallback", common_dependency: "Common-mode dependency" }[wn.kind];
    out.push({ key: `w:${wn.kind}:${wn.id}`, severity: wn.severity, category: label, message: wn.message, table: wn.table, id: wn.id, gapTitle: label, stage: "fallbacks" });
  }
  for (const p of fallbackPrompts(db, w)) {
    const a = assessmentFor(db, p.table, p.rec.id);
    if (!a || a.fallback_status !== "No Fallback Available") continue;
    const d = effectiveDisposition(db, a);
    if (UNRESOLVED.includes(d)) out.push({ key: `nofb:${p.key}`, severity: d === "Not Yet Addressed" ? "high" : "medium", category: "No fallback available — process stops", message: `${p.rec.name}: process stops if unavailable (${d})`, table: p.table, id: p.rec.id, gapTitle: "No fallback — business cannot continue", stage: "fallbacks", assessmentId: a.id });
  }
  const items: [TableName, string][] = [["functions", fn.id], ...s.procs.map((p) => ["processes", p.id] as [TableName, string]), ...s.comps.map((c) => ["components", c.id] as [TableName, string])];
  const any = (t: "runbooks" | "tests" | "evidence") => items.some(([tt, id]) => db[t].some((r) => r.target_type === tt && r.target_id === id)) || (t !== "runbooks" && fbs.some((f) => db[t].some((r) => r.target_type === "fallbacks" && r.target_id === f.id)));
  const rbs = db.runbooks.filter((r) => items.some(([tt, id]) => r.target_type === tt && r.target_id === id));
  if (!any("runbooks")) out.push({ key: "rb", severity: "high", category: "Missing runbook", message: `${fn.name} has no runbook`, table: "functions", id: fn.id, gapTitle: "Runbook missing", stage: "runbook" });
  else if (rbs.every((r) => r.status === "Draft")) out.push({ key: "rbd", severity: "medium", category: "Runbook not reviewed", message: "Runbook is still an unreviewed draft", table: "runbooks", id: rbs[0]!.id, gapTitle: "Runbook draft not reviewed", stage: "runbook" });
  if (!any("tests")) out.push({ key: "ts", severity: "medium", category: "Missing test", message: `${fn.name} has no test or exercise planned`, table: "functions", id: fn.id, gapTitle: "No test planned", stage: "test" });
  if (!any("evidence")) out.push({ key: "ev", severity: "medium", category: "Missing evidence", message: `No test evidence captured for ${fn.name} yet`, table: "functions", id: fn.id, gapTitle: "Validation evidence missing", stage: "test" });
  return out;
}
export const markValidationReviewed = () => patch({ validation_reviewed: true });

// ---------- approval ----------
/** Submits into the existing approval workflow as "Pending". Never approves. */
export function submitForApproval(vals: { approver: string; role: string; comments: string }) {
  const w = getWizard()!; const db = getDb();
  const r = createRec("approvals", { target_type: "functions", target_id: w.function_id, approver: vals.approver, role: vals.role, decision: "Pending", decided_on: "", comments: vals.comments });
  const fn = find(db, "functions", w.function_id);
  if (fn && fn.approval_status !== "Approved") updateRec("functions", fn.id, { approval_status: "In Review" });
  const plan = find(db, "plans", w.plan_id);
  if (plan && (plan.status === "Draft" || !plan.status)) updateRec("plans", plan.id, { status: "In Review" });
  patch({ approval_id: r.id });
  return r;
}

// ---------- next best action ----------
export interface NextAction { kind?: "stage" | "risk"; title: string; reason: string; cta: string; functionId?: string | undefined; stage: StageId; resume: boolean }
export function nextBestAction(db: Db): NextAction | null {
  const w = db.wizard;
  if (w) {
    if (progress(db, w).done.length < STAGES.length) {
      const fn = scope(db, w).fn;
      return { title: `Resume: ${stageTitle(w.stage)}`, reason: fn ? `Your guided workflow for “${fn.name}” is ${progress(db, w).pct}% complete.` : "You have a guided workflow in progress.", cta: "Resume workflow", functionId: w.function_id, stage: w.stage, resume: true };
    }
  }
  if (!db.functions.length) return { title: "Build your first BCP/DRP", reason: db.organizations.length ? "You have started setup but no business function exists yet." : "Nothing has been documented yet. The guided workflow walks you through every step.", cta: "Build My BCP/DRP", stage: db.organizations.length ? (db.plans.length ? "function" : "plan") : "organization", resume: false };
  const order = { Critical: 0, High: 1, Medium: 2, Low: 3 } as Record<string, number>;
  const fns = [...db.functions].sort((a, b) => (order[a.criticality] ?? 9) - (order[b.criticality] ?? 9));
  for (const fn of fns) {
    const tmp = newWizard({ function_id: fn.id, plan_id: fn.plan_id, organization_id: find(db, "plans", fn.plan_id)?.organization_id, validation_reviewed: true });
    const st = STAGES.find((s) => s.id !== "validation" && !stageDone(db, tmp, s.id));
    if (st) return { kind: "stage", title: `${fn.name}: ${st.title}`, reason: `${fn.criticality ?? ""} function — “${st.title}” is not complete yet.`.trim(), cta: "Continue", functionId: fn.id, stage: st.id, resume: false };
  }
  // Every stage answered: surface documented "process stops" answers that are still unresolved risks.
  for (const fn of fns) {
    const tmp = newWizard({ function_id: fn.id });
    const open = fallbackPrompts(db, tmp).map((p) => assessmentFor(db, p.table, p.rec.id)).find((a) => a && a.fallback_status === "No Fallback Available" && UNRESOLVED.includes(effectiveDisposition(db, a)));
    if (open) {
      const name = db[open.target_type as TableName].find((r) => r.id === open.target_id)?.name ?? "";
      return { kind: "risk", title: `No fallback available — ${name} stops`, reason: `Assessed, but still an unresolved continuity risk (${effectiveDisposition(db, open)}). Choose: create gap, accept risk, develop fallback or mark not applicable.`, cta: "Review risk", functionId: fn.id, stage: "fallbacks", resume: false };
    }
  }
  return null;
}