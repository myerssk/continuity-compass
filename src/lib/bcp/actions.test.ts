import { beforeEach, describe, expect, it } from "vitest";
import { clearAllData, getDb, loadDemoData, reloadFromStorage, updateRec } from "./store";
import { localStorageAdapter } from "./adapter";
import { computeWarnings, functionReadiness, missingObjectives } from "./rules";
import { checkAction, missingAction, warningAction } from "./actions";

beforeEach(() => { localStorage.clear(); reloadFromStorage(localStorageAdapter("bcp-prototype-db-v2")); clearAllData(); loadDemoData(); });
const row = (name: string) => missingObjectives(getDb()).find((m) => m.name === name)!;
const rec = (t: "functions" | "processes" | "components", name: string) => getDb()[t].find((r) => r.name === name)!;

describe("Actionable missing objectives", () => {
  it("points each missing-objective row at the exact record and all its missing fields", () => {
    expect(missingAction(row("Financial Reporting"))).toMatchObject({ label: "Provide RTO", table: "functions", id: "bf5", edit: ["rto_h"] });
    expect(missingAction(row("Month-end close"))).toMatchObject({ label: "Provide RTO/RPO", table: "processes", id: "bp10", edit: ["rto_h", "rpo_h"] });
    expect(missingAction(row("Contact Centre Telephony"))).toMatchObject({ label: "Provide Tech RPO", table: "components", id: "sc6", edit: ["tech_rpo_h"] });
  });

  it("saving the missing RTO updates count and readiness immediately and preserves other fields", () => {
    const before = missingObjectives(getDb()).length;
    const fn = rec("functions", "Financial Reporting");
    const score = functionReadiness(getDb(), fn).score;
    updateRec("functions", fn.id, { mtpd_h: fn.mtpd_h, rto_h: 48, rpo_h: fn.rpo_h });
    const after = rec("functions", "Financial Reporting");
    expect(missingObjectives(getDb()).length).toBe(before - 1);
    expect(functionReadiness(getDb(), after).checks.find((c) => c.label === "Business RTO, RPO & MTPD defined")!.ok).toBe(true);
    expect(functionReadiness(getDb(), after).score).toBeGreaterThan(score);
    const { rto_h: _a, ...restBefore } = fn; const { rto_h: _b, ...restAfter } = after;
    expect(restAfter).toEqual(restBefore);
    expect(getDb().mode).toBe("demo");
    expect(getDb().audit_log[0]!.summary).toBe("Changed Business RTO (h): — → 48");
  });

  it("a partial save keeps the row with only the still-missing field", () => {
    updateRec("processes", "bp10", { rto_h: 24, rpo_h: null });
    expect(row("Month-end close").missing).toEqual(["RPO"]);
    updateRec("processes", "bp10", { rto_h: 24, rpo_h: 8 });
    expect(row("Month-end close")).toBeUndefined();
  });

  it("Technical RPO edit clears the component row; warnings only clear when the rule is satisfied", () => {
    updateRec("components", "sc6", { tech_rto_h: rec("components", "Contact Centre Telephony").tech_rto_h, tech_rpo_h: 0.25 });
    expect(rec("components", "Contact Centre Telephony").tech_rpo_h).toBe(0.25);
    expect(row("Contact Centre Telephony")).toBeUndefined();
    const conflict = computeWarnings(getDb()).find((w) => w.kind === "rto_exceeds")!;
    expect(warningAction(conflict)).toMatchObject({ label: "Review RTO conflict", table: "components", id: conflict.id, edit: ["tech_rto_h"] });
  });
});

describe("Actionable warnings and failing checks", () => {
  it("routes each warning kind to the affected record and the right tab/edit", () => {
    for (const w of computeWarnings(getDb())) {
      const a = warningAction(w);
      expect(a.table).toBe(w.table); expect(a.id).toBe(w.id);
      expect(a.edit?.length || a.tab).toBeTruthy();
    }
    expect(warningAction({ kind: "common_dependency", table: "fallbacks", id: "x", message: "", severity: "high" }).tab).toBe("Dependencies");
    expect(warningAction({ kind: "no_fallback", table: "functions", id: "x", message: "", severity: "high" }).tab).toBe("Fallbacks");
  });
  it("failing objective check opens the function's missing objectives; other checks open their tab", () => {
    const fn = rec("functions", "Financial Reporting");
    expect(checkAction(getDb(), fn, "Business RTO, RPO & MTPD defined")).toMatchObject({ table: "functions", id: fn.id, edit: ["rto_h"] });
    expect(checkAction(getDb(), fn, "Recovery strategy defined").tab).toBe("Recovery");
    expect(checkAction(getDb(), fn, "Approved runbook").tab).toBe("Runbooks");
  });
});