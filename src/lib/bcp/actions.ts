/* Maps dashboard findings (missing objectives, failing checks, warnings) to the exact record + edit/workflow state that fixes them. Pure — tested in actions.test.ts. */
import type { Db, Rec, TableName } from "./schema";
import { componentsOfFunction, type Warning } from "./rules";

export const OBJECTIVE_KEYS: Partial<Record<TableName, string[]>> = {
  functions: ["mtpd_h", "rto_h", "rpo_h"], processes: ["rto_h", "rpo_h"], components: ["tech_rto_h", "tech_rpo_h"],
};
const LABEL_KEY: Record<string, string> = { MTPD: "mtpd_h", RTO: "rto_h", RPO: "rpo_h", "Tech RTO": "tech_rto_h", "Tech RPO": "tech_rpo_h" };

/** Plain-language help shown next to each objective field. Never suggests a value. */
export const OBJECTIVE_HELP: Record<string, string> = {
  mtpd_h: "MTPD — longest the business can tolerate this being unavailable before the damage becomes unacceptable. Hours, e.g. 72.",
  rto_h: "RTO — how quickly this must be working again after a disruption. Hours; should not exceed MTPD.",
  rpo_h: "RPO — the most data loss you can accept, measured back in time from the incident. Hours, e.g. 4 (0 = no loss).",
  tech_rto_h: "Technical RTO — how long the technology can realistically take to restore. Hours; compared with the business RTO.",
  tech_rpo_h: "Technical RPO — how much data the backup/replication could lose. Hours, e.g. 24 for a nightly backup.",
};

export interface FixAction { label: string; table: TableName; id: string; tab?: string; edit?: string[] }

/** Action for a "Missing recovery objectives" row: all missing fields together in one edit. */
export function missingAction(m: { table: TableName; id: string; missing: string[] }): FixAction {
  const edit = m.missing.map((l) => LABEL_KEY[l]!).filter(Boolean);
  const label = m.missing.length === 1 ? `Provide ${m.missing[0]}`
    : m.table === "components" ? "Provide Tech RTO/RPO"
    : m.missing.length === 2 && m.missing.every((x) => x === "RTO" || x === "RPO") ? "Provide RTO/RPO" : "Complete objectives";
  return { label, table: m.table, id: m.id, edit };
}

const empty = (v: unknown) => v === "" || v === null || v === undefined || isNaN(Number(v));

/** Action for a failing function readiness check. */
export function checkAction(db: Db, fn: Rec, check: string): FixAction {
  const at = (tab: string, label: string): FixAction => ({ label, table: "functions", id: fn.id, tab });
  const comps = componentsOfFunction(db, fn.id);
  switch (check) {
    case "Business RTO, RPO & MTPD defined": {
      const edit = (OBJECTIVE_KEYS.functions ?? []).filter((k) => empty(fn[k]));
      return { label: "Complete objectives", table: "functions", id: fn.id, edit: edit.length ? edit : OBJECTIVE_KEYS.functions! };
    }
    case "Components have technical RTO/RPO": {
      const c = comps.find((x) => empty(x.tech_rto_h) || empty(x.tech_rpo_h));
      if (!c) return at("Dependencies", "Add components");
      return { label: "Provide Tech RTO/RPO", table: "components", id: c.id, edit: ["tech_rto_h", "tech_rpo_h"].filter((k) => empty(c[k])) };
    }
    case "Technical RTOs within business RTO": {
      const c = comps.find((x) => !empty(x.tech_rto_h) && !empty(fn.rto_h) && Number(x.tech_rto_h) > Number(fn.rto_h));
      return c ? { label: "Review RTO conflict", table: "components", id: c.id, edit: ["tech_rto_h"] } : at("Dependencies", "Review dependencies");
    }
    case "Validated fallback in place": return at("Fallbacks", "Assess fallback");
    case "Recovery strategy defined": return at("Recovery", "Add strategy");
    case "Approved runbook": return at("Runbooks", "Review runbooks");
    case "Passed test in last 12 months": return at("Tests", "Plan / record test");
    case "No open critical/high gaps": return at("Gaps", "Review gaps");
    case "Function approved": return at("Overview", "Review approval");
    default: return at("Overview", "Review");
  }
}

/** Context-specific action for a warning. */
export function warningAction(w: Warning): FixAction {
  switch (w.kind) {
    case "rto_exceeds": return { label: "Review RTO conflict", table: w.table, id: w.id, edit: ["tech_rto_h"] };
    case "no_fallback": return { label: "Assess fallback", table: w.table, id: w.id, tab: "Fallbacks" };
    case "no_fallback_process_stops": return { label: "Review risk", table: w.table, id: w.id, tab: "Fallbacks" };
    case "fallback_unvalidated": return { label: "Plan / record test", table: w.table, id: w.id, tab: "Tests" };
    case "common_dependency": return { label: "Review dependencies", table: w.table, id: w.id, tab: "Dependencies" };
  }
}