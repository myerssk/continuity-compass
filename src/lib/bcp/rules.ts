/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Db, Rec, TableName } from "./schema";

export type WarningKind = "rto_exceeds" | "no_fallback" | "no_fallback_process_stops" | "fallback_unvalidated" | "common_dependency";
export interface Warning { kind: WarningKind; table: TableName; id: string; message: string; severity: "high" | "medium"; assessmentId?: string | undefined }

export const WARNING_LABEL: Record<WarningKind, string> = {
  rto_exceeds: "Technical RTO exceeds Business RTO",
  no_fallback: "Critical item lacks fallback — not assessed",
  no_fallback_process_stops: "No fallback available — process stops",
  fallback_unvalidated: "Fallback not validated",
  common_dependency: "Primary & fallback share a dependency",
};

const num = (v: any) => (v === "" || v === null || v === undefined || isNaN(Number(v)) ? null : Number(v));
export const VALIDATION_MAX_DAYS = 365;

export function processesOf(db: Db, functionId: string) {
  return db.processes.filter((p) => p.function_id === functionId);
}
export function componentsOfProcess(db: Db, processId: string): Rec[] {
  const ids = db.process_components.filter((l) => l.process_id === processId).map((l) => l.component_id);
  return db.components.filter((c) => ids.includes(c.id));
}
export function componentsOfFunction(db: Db, functionId: string): Rec[] {
  const ids = new Set(processesOf(db, functionId).flatMap((p) => componentsOfProcess(db, p.id).map((c) => c.id)));
  return db.components.filter((c) => ids.has(c.id));
}
/** Components a component transitively depends on (excluding itself). */
export function upstreamOf(db: Db, componentId: string, seen = new Set<string>()): Set<string> {
  for (const d of db.component_dependencies.filter((x) => x.component_id === componentId)) {
    if (!seen.has(d.depends_on_id)) { seen.add(d.depends_on_id); upstreamOf(db, d.depends_on_id, seen); }
  }
  return seen;
}
/** All component ids the primary (non-fallback) path of an item relies on. */
export function primaryDependencies(db: Db, table: TableName, id: string): Set<string> {
  let base: string[] = [];
  if (table === "functions") base = componentsOfFunction(db, id).map((c) => c.id);
  else if (table === "processes") base = componentsOfProcess(db, id).map((c) => c.id);
  else if (table === "components") base = [id];
  const all = new Set(base);
  base.forEach((c) => upstreamOf(db, c).forEach((u) => all.add(u)));
  return all;
}
export function fallbacksFor(db: Db, table: TableName, id: string) {
  return db.fallbacks.filter((f) => f.target_type === table && f.target_id === id && f.status !== "Retired");
}
/** Functions whose processes use a component, directly. */
export function functionsUsingComponent(db: Db, componentId: string): Rec[] {
  const procIds = db.process_components.filter((l) => l.component_id === componentId).map((l) => l.process_id);
  const fnIds = new Set(db.processes.filter((p) => procIds.includes(p.id)).map((p) => p.function_id));
  return db.functions.filter((f) => fnIds.has(f.id));
}
export function isFallbackValidated(f: Rec, today = new Date()) {
  if (f.test_result !== "Pass" || !f.last_tested) return false;
  const days = (today.getTime() - new Date(f.last_tested).getTime()) / 86400000;
  return days <= VALIDATION_MAX_DAYS;
}
const isCritical = (c: any) => c === "Critical" || c === "High";

export function computeWarnings(db: Db, today = new Date()): Warning[] {
  const out: Warning[] = [];
  // 1. Technical RTO > Business RTO
  for (const c of db.components) {
    const t = num(c.tech_rto_h);
    if (t === null) continue;
    for (const fn of functionsUsingComponent(db, c.id)) {
      const b = num(fn.rto_h);
      if (b !== null && t > b)
        out.push({ kind: "rto_exceeds", table: "components", id: c.id, severity: "high", message: `${c.name}: technical RTO ${t}h exceeds ${fn.name} business RTO ${b}h` });
    }
  }
  // 2. Critical items without fallback (functions + their processes)
  for (const fn of db.functions.filter((f) => isCritical(f.criticality))) {
    const assessed = (db.fallback_assessments ?? []).some((a) => (a.target_type === "functions" && a.target_id === fn.id) || (a.target_type === "processes" && processesOf(db, fn.id).some((p) => p.id === a.target_id)));
    if (!assessed && !fallbacksFor(db, "functions", fn.id).length && !processesOf(db, fn.id).some((p) => fallbacksFor(db, "processes", p.id).length))
      out.push({ kind: "no_fallback", table: "functions", id: fn.id, severity: "high", message: `${fn.name} (${fn.criticality}) has no fallback at function or process level` });
  }
  // 2b. Documented "no fallback — process stops" answers that are still an unresolved risk
  for (const a of activeNoFallback(db)) {
    const disp = effectiveDisposition(db, a);
    if (!UNRESOLVED.includes(disp)) continue;
    const name = db[a.target_type as TableName]?.find((r) => r.id === a.target_id)?.name ?? a.target_id;
    out.push({ kind: "no_fallback_process_stops", table: a.target_type, id: a.target_id, assessmentId: a.id, severity: disp === "Not Yet Addressed" || disp === "Risk Acceptance Rejected" ? "high" : "medium", message: `${name}: no fallback available — process stops (${disp})` });
  }
  // 3. Fallback unvalidated
  for (const f of db.fallbacks.filter((x) => x.status !== "Retired")) {
    if (!isFallbackValidated(f, today))
      out.push({ kind: "fallback_unvalidated", table: "fallbacks", id: f.id, severity: "medium", message: `${f.name}: ${f.last_tested ? `last result "${f.test_result}" on ${f.last_tested}` : "never tested"}` });
  }
  // 4. Common dependency between primary and fallback
  for (const f of db.fallbacks.filter((x) => x.status !== "Retired")) {
    const primary = primaryDependencies(db, f.target_type, f.target_id);
    const fbDeps = new Set<string>();
    db.fallback_dependencies.filter((d) => d.fallback_id === f.id).forEach((d) => { fbDeps.add(d.component_id); upstreamOf(db, d.component_id).forEach((u) => fbDeps.add(u)); });
    const shared = [...fbDeps].filter((x) => primary.has(x));
    if (shared.length) {
      const names = shared.map((s) => db.components.find((c) => c.id === s)?.name ?? s).join(", ");
      out.push({ kind: "common_dependency", table: "fallbacks", id: f.id, severity: "high", message: `${f.name} shares ${names} with the primary path` });
    }
  }
  return out;
}

export function warningsFor(db: Db, table: TableName, id: string, all = computeWarnings(db)) {
  return all.filter((w) => {
    if (w.table === table && w.id === id) return true;
    if (w.table === "fallbacks") { const f = db.fallbacks.find((x) => x.id === w.id); return f?.target_type === table && f?.target_id === id; }
    if (table === "functions" && w.table === "components") return functionsUsingComponent(db, w.id).some((f) => f.id === id) && w.message.includes(db.functions.find((f) => f.id === id)?.name ?? "\u0000");
    return false;
  });
}

const related = (db: Db, t: "runbooks" | "tests" | "gaps" | "strategies", table: TableName, id: string) => db[t].filter((r) => r.target_type === table && r.target_id === id);

/** `assessed` is false when too few records exist to judge; UIs show "Not yet assessed" instead of a score. */
export interface Readiness { score: number; assessed: boolean; checks: { label: string; ok: boolean }[] }
export function functionReadiness(db: Db, fn: Rec, today = new Date()): Readiness {
  const procs = processesOf(db, fn.id);
  const comps = componentsOfFunction(db, fn.id);
  const items: [TableName, string][] = [["functions", fn.id], ...procs.map((p) => ["processes", p.id] as [TableName, string]), ...comps.map((c) => ["components", c.id] as [TableName, string])];
  const fbs = items.flatMap(([t, i]) => fallbacksFor(db, t, i));
  const anyOf = (t: "runbooks" | "tests" | "gaps" | "strategies") => items.flatMap(([tt, i]) => related(db, t, tt, i));
  const yearAgo = today.getTime() - VALIDATION_MAX_DAYS * 86400000;
  const checks = [
    { label: "Business RTO, RPO & MTPD defined", ok: [fn.rto_h, fn.rpo_h, fn.mtpd_h].every((v) => num(v) !== null) },
    { label: "Components have technical RTO/RPO", ok: comps.length > 0 && comps.every((c) => num(c.tech_rto_h) !== null && num(c.tech_rpo_h) !== null) },
    { label: "Technical RTOs within business RTO", ok: comps.every((c) => num(c.tech_rto_h) === null || num(fn.rto_h) === null || Number(c.tech_rto_h) <= Number(fn.rto_h)) },
    { label: "Validated fallback in place", ok: fbs.some((f) => isFallbackValidated(f, today)) },
    { label: "Recovery strategy defined", ok: anyOf("strategies").length > 0 },
    { label: "Approved runbook", ok: anyOf("runbooks").some((r) => r.status === "Approved") },
    { label: "Passed test in last 12 months", ok: anyOf("tests").some((t) => t.result === "Pass" && t.executed_date && new Date(t.executed_date).getTime() >= yearAgo) },
    { label: "No open critical/high gaps", ok: !anyOf("gaps").some((g) => g.status !== "Closed" && isCritical(g.severity)) },
    { label: "Function approved", ok: fn.approval_status === "Approved" },
  ];
  return { assessed: procs.length > 0, score: Math.round((checks.filter((c) => c.ok).length / checks.length) * 100), checks };
}

export function missingObjectives(db: Db) {
  const out: { table: TableName; id: string; name: string; missing: string[] }[] = [];
  const chk = (table: TableName, r: Rec, keys: [string, string][]) => {
    const m = keys.filter(([k]) => num(r[k]) === null).map(([, l]) => l);
    if (m.length) out.push({ table, id: r.id, name: r.name, missing: m });
  };
  db.functions.forEach((f) => chk("functions", f, [["mtpd_h", "MTPD"], ["rto_h", "RTO"], ["rpo_h", "RPO"]]));
  db.processes.forEach((p) => chk("processes", p, [["rto_h", "RTO"], ["rpo_h", "RPO"]]));
  db.components.forEach((c) => chk("components", c, [["tech_rto_h", "Tech RTO"], ["tech_rpo_h", "Tech RPO"]]));
  return out;
}

/** Fallback readiness: share of documentation, validation and independence checks met. */
export function fallbackReadiness(db: Db, f: Rec, today = new Date()): Readiness {
  const primary = primaryDependencies(db, f.target_type, f.target_id);
  const deps = db.fallback_dependencies.filter((d) => d.fallback_id === f.id);
  const shared = deps.some((d) => [d.component_id, ...upstreamOf(db, d.component_id)].some((x) => primary.has(x)));
  const hasEvidence = !!f.evidence_ref || db.evidence.some((e) => e.target_type === "fallbacks" && e.target_id === f.id);
  const checks = [
    { label: "Owner and alternate owner assigned", ok: !!f.owner && !!f.alternate_owner },
    { label: "Activation criteria defined", ok: !!f.activation_criteria },
    { label: "Capacity % and maximum duration set", ok: num(f.capacity_pct) !== null && num(f.max_duration_h) !== null },
    { label: "Data / RPO impact documented", ok: !!f.data_rpo_impact },
    { label: "Reconciliation and return-to-normal documented", ok: !!f.reconciliation && !!f.return_to_normal },
    { label: "Dependencies documented", ok: deps.length > 0 },
    { label: "No common-mode dependency with primary", ok: !shared },
    { label: "Passed test within 12 months", ok: isFallbackValidated(f, today) },
    { label: "Evidence attached", ok: hasEvidence },
  ];
  return { assessed: true, score: Math.round((checks.filter((c) => c.ok).length / checks.length) * 100), checks };
}

/** Overall plan readiness: average of assessed functions, or null when nothing can be assessed yet. */
export function overallReadiness(db: Db, today = new Date()): number | null {
  const r = db.functions.map((f) => functionReadiness(db, f, today)).filter((x) => x.assessed);
  return r.length ? Math.round(r.reduce((s, x) => s + x.score, 0) / r.length) : null;
}

/** Technical RTO vs every linked process RTO and function (business) RTO. Values are compared, never changed. */
export interface RtoConflict { level: "process" | "function"; table: TableName; id: string; name: string; required: number; technical: number }
export function techRtoConflicts(db: Db, componentId: string): RtoConflict[] {
  const c = db.components.find((x) => x.id === componentId);
  const t = num(c?.tech_rto_h);
  if (!c || t === null) return [];
  const out: RtoConflict[] = [];
  const procIds = db.process_components.filter((l) => l.component_id === componentId).map((l) => l.process_id);
  for (const p of db.processes.filter((x) => procIds.includes(x.id))) {
    const r = num(p.rto_h);
    if (r !== null && t > r) out.push({ level: "process", table: "processes", id: p.id, name: p.name, required: r, technical: t });
  }
  for (const fn of functionsUsingComponent(db, componentId)) {
    const r = num(fn.rto_h);
    if (r !== null && t > r) out.push({ level: "function", table: "functions", id: fn.id, name: fn.name, required: r, technical: t });
  }
  return out;
}

/** BIA sanity checks. Returns warnings only — callers must never alter the user's values. */
export function biaIssues(v: { criticality?: any; mtpd_h?: any; rto_h?: any; rpo_h?: any }): string[] {
  const out: string[] = [];
  const m = num(v.mtpd_h), r = num(v.rto_h), p = num(v.rpo_h);
  for (const [k, x] of [["MTPD", m], ["Business RTO", r], ["Business RPO", p]] as const) if (x !== null && x < 0) out.push(`${k} cannot be negative.`);
  if (m !== null && r !== null && r > m) out.push(`Business RTO (${r}h) is longer than MTPD (${m}h): recovery would finish after the point the business can no longer tolerate the outage.`);
  else if (m !== null && r !== null && r === m) out.push(`Business RTO equals MTPD (${m}h), leaving no safety margin.`);
  if (p !== null && m !== null && p > m) out.push(`Business RPO (${p}h) is longer than MTPD (${m}h) — check this much data loss is really acceptable.`);
  if (isCritical(v.criticality) && r === null) out.push(`${v.criticality} functions should have a Business RTO.`);
  if (v.criticality === "Critical" && r !== null && r > 72) out.push(`Marked Critical but Business RTO is ${r}h — confirm criticality or the RTO.`);
  return out;
}

// ---------- fallback assessments ("No, it would stop") ----------
/** Dispositions that still leave an unresolved continuity risk. */
export const UNRESOLVED = ["Not Yet Addressed", "Gap Opened", "Risk Acceptance Pending", "Risk Acceptance Rejected"];
export const activeNoFallback = (db: Db) => (db.fallback_assessments ?? []).filter((a) => a.fallback_status === "No Fallback Available");
export function assessmentFor(db: Db, table: TableName, id: string): Rec | undefined {
  return (db.fallback_assessments ?? []).filter((a) => a.target_type === table && a.target_id === id).at(-1);
}
/** Risk acceptance only becomes "Risk Accepted" when its linked approval is actually approved by a person. */
export function effectiveDisposition(db: Db, a: Rec): string {
  if (a.risk_disposition === "Risk Acceptance Pending" && a.approval_id) {
    const ap = db.approvals.find((x) => x.id === a.approval_id);
    if (ap?.decision === "Approved") return "Risk Accepted";
    if (ap?.decision === "Rejected") return "Risk Acceptance Rejected";
  }
  return a.risk_disposition || "Not Yet Addressed";
}
export type CoverageState = "assessment_incomplete" | "no_fallback_unresolved" | "gap_opened" | "risk_acceptance_pending" | "risk_accepted" | "not_applicable" | "fallback_unvalidated" | "fallback_validated";
export const COVERAGE_LABEL: Record<CoverageState, string> = {
  assessment_incomplete: "Assessment incomplete", no_fallback_unresolved: "No fallback — unresolved risk", gap_opened: "No fallback — gap opened",
  risk_acceptance_pending: "Risk acceptance pending", risk_accepted: "Risk accepted (no fallback)", not_applicable: "Fallback not applicable",
  fallback_unvalidated: "Fallback developed — unvalidated", fallback_validated: "Fallback validated",
};
/** Fallback coverage of one item. A documented "process stops" answer never counts as fallback readiness. */
export function fallbackCoverage(db: Db, table: TableName, id: string, today = new Date()): CoverageState {
  const fbs = fallbacksFor(db, table, id).filter((f) => f.status !== "Retired");
  if (fbs.some((f) => isFallbackValidated(f, today))) return "fallback_validated";
  if (fbs.length) return "fallback_unvalidated";
  const a = assessmentFor(db, table, id);
  if (!a || a.fallback_status !== "No Fallback Available") return "assessment_incomplete";
  const d = effectiveDisposition(db, a);
  return d === "Gap Opened" ? "gap_opened" : d === "Risk Acceptance Pending" ? "risk_acceptance_pending" : d === "Risk Accepted" ? "risk_accepted" : d === "Not Applicable" ? "not_applicable" : "no_fallback_unresolved";
}