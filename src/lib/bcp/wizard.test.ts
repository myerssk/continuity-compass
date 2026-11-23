import { beforeEach, describe, expect, it } from "vitest";
import { clearAllData, getDb, reloadFromStorage, updateRec } from "./store";
import { localStorageAdapter } from "./adapter";
import { biaIssues, computeWarnings, fallbackCoverage, functionReadiness, isFallbackValidated, techRtoConflicts } from "./rules";
import {
  acceptRisk, addComponent, addProcess, answerFallback, createGapForAssessment, developFallback, exitWizard, fallbackPrompts, markNotApplicable, createGap, generateDraftRunbook, getWizard, markRunbookReviewed, nextBestAction,
  planTest, progress, saveBia, saveFallback, saveFunction, saveOrganization, savePlan, setDraft, setStage, startWizard,
  stageDone, submitForApproval, validationFindings,
} from "./wizard";

function buildToComponents(techRto = 2) {
  startWizard();
  saveOrganization({ name: "Acme Test Co" });
  savePlan({ name: "Test BCP", owner: "Coordinator" });
  saveFunction({ name: "Order Fulfilment", owner: "Ops Lead" });
  saveBia({ criticality: "Critical", mtpd_h: 24, rto_h: 8, rpo_h: 1 });
  const proc = addProcess({ name: "Pick & pack", owner: "Warehouse Lead", rto_h: 4, rpo_h: 1 }, true);
  const comp = addComponent(proc.id, { name: "WMS", type: "Application", technical_owner: "IT Apps", tech_rto_h: techRto, tech_rpo_h: 1 });
  return { proc, comp };
}

beforeEach(() => { localStorage.clear(); reloadFromStorage(localStorageAdapter("bcp-prototype-db-v2")); clearAllData(); });

describe("Build My BCP/DRP wizard", () => {
  it("creates and links real records in the existing tables", () => {
    const { proc, comp } = buildToComponents();
    const db = getDb(); const w = getWizard(db)!;
    const fn = db.functions.find((f) => f.id === w.function_id)!;
    expect(db.organizations).toHaveLength(1);
    expect(db.plans[0]!.organization_id).toBe(db.organizations[0]!.id);
    expect(fn.plan_id).toBe(db.plans[0]!.id);
    expect(fn.rto_h).toBe(8);
    expect(proc.function_id).toBe(fn.id);
    expect(db.process_components).toEqual([expect.objectContaining({ process_id: proc.id, component_id: comp.id })]);
    expect(db.audit_log.length).toBeGreaterThan(0);
    expect(db.mode).toBe("user");
  });

  it("restores progress and unsaved drafts after a reload", () => {
    buildToComponents();
    setStage("fallbacks");
    setDraft("strategy", { name: "Half-typed strategy" });
    reloadFromStorage();
    const w = getWizard()!;
    expect(w.stage).toBe("fallbacks");
    expect(w.drafts.strategy).toEqual({ name: "Half-typed strategy" });
    expect(stageDone(getDb(), w, "components")).toBe(true);
  });

  it("yes-branch creates a Draft fallback with dependencies and flags a common-mode dependency", () => {
    const { proc, comp } = buildToComponents();
    const fb = saveFallback({ table: "processes", id: proc.id }, { name: "Paper pick lists", owner: "A", alternate_owner: "B", capacity_pct: 60, max_duration_h: 48 }, [comp.id]);
    const db = getDb();
    expect(fb.status).toBe("Draft");
    expect(db.fallback_dependencies).toEqual([expect.objectContaining({ fallback_id: fb.id, component_id: comp.id })]);
    expect(computeWarnings(db).some((x) => x.kind === "common_dependency" && x.id === fb.id)).toBe(true);
    expect(getWizard()!.answers[`processes:${proc.id}`]).toBe("yes");
  });

  it("no-branch records the answer and creates one gap without forcing a fallback", () => {
    const { proc } = buildToComponents();
    answerFallback(`processes:${proc.id}`, "no");
    createGap("processes", proc.id, "No fallback — business cannot continue");
    createGap("processes", proc.id, "No fallback — business cannot continue");
    const db = getDb();
    expect(db.fallbacks).toHaveLength(0);
    expect(db.gaps.filter((g) => g.target_id === proc.id)).toHaveLength(1);
    expect(db.gaps[0]!.status).toBe("Open");
  });

  it("warns when Technical RTO exceeds process and business RTO without changing either value", () => {
    const { comp, proc } = buildToComponents(12);
    const c = techRtoConflicts(getDb(), comp.id);
    expect(c.map((x) => [x.level, x.required, x.technical])).toEqual([["process", 4, 12], ["function", 8, 12]]);
    const db = getDb();
    expect(db.components[0]!.tech_rto_h).toBe(12);
    expect(db.processes.find((p) => p.id === proc.id)!.rto_h).toBe(4);
    expect(validationFindings(db, getWizard()).some((f) => f.category === "Technical RTO conflict")).toBe(true);
  });

  it("flags RTO longer than MTPD in the BIA but keeps the user's values", () => {
    expect(biaIssues({ criticality: "High", mtpd_h: 4, rto_h: 8, rpo_h: 1 })[0]).toMatch(/longer than MTPD/);
    buildToComponents();
    saveBia({ criticality: "High", mtpd_h: 4, rto_h: 8, rpo_h: 1 });
    expect(getDb().functions[0]!.rto_h).toBe(8);
  });

  it("never auto-validates or auto-approves", () => {
    const { proc, comp } = buildToComponents();
    const fb = saveFallback({ table: "processes", id: proc.id }, { name: "Manual", owner: "A" }, []);
    const rb = generateDraftRunbook();
    expect(rb.status).toBe("Draft");
    expect(rb.origin).toMatch(/review required/);
    expect(getDb().runbook_steps.filter((s) => s.runbook_id === rb.id)).toHaveLength(9);
    expect(stageDone(getDb(), getWizard(), "runbook")).toBe(false);
    markRunbookReviewed("Coordinator");
    expect(getDb().runbooks[0]!.status).toBe("In Review");
    const t = planTest({ name: "Fallback drill", test_type: "Fallback / manual workaround", scheduled_date: "2027-01-10", target_type: "fallbacks", target_id: fb.id });
    expect(t.result).toBe("Scheduled");
    expect(String(t.expected_evidence)).toMatch(/Reconciliation/);
    const after = getDb().fallbacks.find((f) => f.id === fb.id)!;
    expect(after.status).toBe("Draft");
    expect(isFallbackValidated(after)).toBe(false);
    const a = submitForApproval({ approver: "Jane Approver", role: "COO", comments: "" });
    const db = getDb();
    expect(a.decision).toBe("Pending");
    expect(db.functions[0]!.approval_status).toBe("In Review");
    expect(db.plans[0]!.status).toBe("In Review");
    expect(db.runbooks[0]!.status).not.toBe("Approved");
    void comp;
  });

  it("next best action points an empty system to the wizard and a partial one back to its stage", () => {
    expect(nextBestAction(getDb())).toMatchObject({ cta: "Build My BCP/DRP", stage: "organization" });
    buildToComponents();
    setStage("fallbacks");
    expect(nextBestAction(getDb())).toMatchObject({ resume: true, stage: "fallbacks" });
    expect(progress(getDb(), getWizard()).pct).toBe(Math.round((6 / 12) * 100));
    updateRec("functions", getDb().functions[0]!.id, { rto_h: null });
    expect(stageDone(getDb(), getWizard(), "bia")).toBe(false);
  });
});

describe("No fallback — process stops", () => {
  function finishWithNoFallback() {
    const { proc } = buildToComponents();
    answerFallback(`processes:${proc.id}`, "no");
    return proc;
  }
  const assess = (id: string) => getDb().fallback_assessments.find((a) => a.target_id === id)!;

  it("persists the negative answer as a structured assessment after the workflow ends and a refresh", () => {
    const proc = finishWithNoFallback();
    exitWizard();
    reloadFromStorage();
    const a = assess(proc.id);
    expect(a).toMatchObject({ fallback_status: "No Fallback Available", continuity_capability: "Process Stops", risk_disposition: "Not Yet Addressed" });
    expect(getDb().fallbacks).toHaveLength(0);
    expect(getDb().wizard).toBeNull();
  });

  it("counts the question as answered so Next Best Action does not ask it again, but keeps the risk visible", () => {
    const proc = finishWithNoFallback();
    const db = getDb(); const fnId = db.functions[0]!.id;
    for (const p of fallbackPrompts(db, getWizard())) if (p.rec.id !== proc.id) answerFallback(p.key, "no");
    expect(stageDone(getDb(), getWizard(), "fallbacks")).toBe(true);
    exitWizard(); reloadFromStorage();
    const nba = nextBestAction(getDb())!;
    expect(nba.title).not.toMatch(/: Fallbacks$/);
    const w = computeWarnings(getDb()).filter((x) => x.kind === "no_fallback_process_stops");
    expect(w.some((x) => x.id === proc.id && x.severity === "high")).toBe(true);
    expect(computeWarnings(getDb()).some((x) => x.kind === "no_fallback" && x.id === fnId)).toBe(false);
    expect(fallbackCoverage(getDb(), "processes", proc.id)).toBe("no_fallback_unresolved");
  });

  it("Create Gap links an ordinary gap and keeps the original assessment", () => {
    const proc = finishWithNoFallback();
    const g = createGapForAssessment(assess(proc.id).id);
    const a = assess(proc.id);
    expect(g).toMatchObject({ target_type: "processes", target_id: proc.id, status: "Open" });
    expect(a).toMatchObject({ gap_id: g.id, risk_disposition: "Gap Opened", fallback_status: "No Fallback Available" });
    expect(fallbackCoverage(getDb(), "processes", proc.id)).toBe("gap_opened");
    expect(computeWarnings(getDb()).find((x) => x.assessmentId === a.id)?.severity).toBe("medium");
  });

  it("Develop Fallback reopens that item's stage and a saved fallback supersedes the no-fallback state", () => {
    const proc = finishWithNoFallback();
    exitWizard();
    developFallback(assess(proc.id).id);
    const w = getWizard()!;
    expect(w).toMatchObject({ stage: "fallbacks", focus_key: `processes:${proc.id}` });
    expect(assess(proc.id).fallback_status).toBe("No Fallback Available");
    saveFallback({ table: "processes", id: proc.id }, { name: "Paper forms", owner: "A" }, []);
    const a = assess(proc.id);
    expect(a).toMatchObject({ fallback_status: "Fallback Developed", continuity_capability: "Continues via Fallback", risk_disposition: "Superseded by Fallback" });
    expect(computeWarnings(getDb()).some((x) => x.kind === "no_fallback_process_stops")).toBe(false);
    expect(fallbackCoverage(getDb(), "processes", proc.id)).toBe("fallback_unvalidated");
  });

  it("Accept Risk needs owner and rationale, stays pending and never improves readiness", () => {
    const proc = finishWithNoFallback();
    const id = assess(proc.id).id;
    const before = functionReadiness(getDb(), getDb().functions[0]!).score;
    expect(() => acceptRisk(id, "", "because")).toThrow();
    expect(() => acceptRisk(id, "COO", " ")).toThrow();
    const ap = acceptRisk(id, "COO", "Outage tolerable for 2 days");
    expect(ap.decision).toBe("Pending");
    expect(assess(proc.id).risk_disposition).toBe("Risk Acceptance Pending");
    expect(fallbackCoverage(getDb(), "processes", proc.id)).toBe("risk_acceptance_pending");
    expect(computeWarnings(getDb()).some((x) => x.assessmentId === id)).toBe(true);
    expect(functionReadiness(getDb(), getDb().functions[0]!).score).toBe(before);
    expect(getDb().fallbacks).toHaveLength(0);
  });

  it("Not Applicable requires a rationale and only then clears the warning", () => {
    const proc = finishWithNoFallback();
    const id = assess(proc.id).id;
    expect(() => markNotApplicable(id, "  ")).toThrow();
    expect(computeWarnings(getDb()).some((x) => x.assessmentId === id)).toBe(true);
    markNotApplicable(id, "Process retired next quarter");
    expect(computeWarnings(getDb()).some((x) => x.assessmentId === id)).toBe(false);
    expect(fallbackCoverage(getDb(), "processes", proc.id)).toBe("not_applicable");
    expect(getDb().fallbacks).toHaveLength(0);
  });

  it("keeps history of the original answer and every disposition change", () => {
    const proc = finishWithNoFallback();
    const id = assess(proc.id).id;
    createGapForAssessment(id);
    markNotApplicable(id, "Out of scope");
    const h = getDb().audit_log.filter((e) => e.record_id === id).map((e) => e.summary).reverse();
    expect(h[0]).toMatch(/^Created Fallback Assessment/);
    expect(h).toContain("Risk disposition: Not Yet Addressed → Gap Opened");
    expect(h).toContain("Risk disposition: Gap Opened → Not Applicable");
  });
});

describe("Risk acceptance superseded by fallback development", () => {
  function pendingAcceptance() {
    const { proc } = buildToComponents();
    answerFallback(`processes:${proc.id}`, "no");
    const a = getDb().fallback_assessments.find((x) => x.target_id === proc.id)!;
    const ap = acceptRisk(a.id, "COO", "Tolerable for 2 days");
    const other = submitForApproval({ approver: "CFO", role: "Plan owner", comments: "" });
    return { proc, a, ap, other };
  }
  const develop = (procId: string) => saveFallback({ table: "processes", id: procId }, { name: "Paper forms", owner: "A" }, []);
  const historyOf = (id: string) => getDb().audit_log.filter((l) => l.record_id === id).map((l) => l.summary).reverse();

  it("withdraws a pending risk acceptance, keeps it, and leaves the fallback unvalidated", () => {
    const { proc, a, ap, other } = pendingAcceptance();
    const fb = develop(proc.id);
    reloadFromStorage();
    const db = getDb();
    const rec = db.approvals.find((x) => x.id === ap.id)!;
    expect(rec).toMatchObject({ decision: "Withdrawn", lifecycle: "Withdrawn — Superseded by Fallback Development", superseded_reason: "Superseded by fallback development" });
    expect(db.approvals.filter((x) => x.decision === "Pending").map((x) => x.id)).toEqual([other.id]);
    expect(db.fallback_assessments.find((x) => x.id === a.id)).toMatchObject({ fallback_status: "Fallback Developed", risk_disposition: "Superseded by Fallback" });
    expect(db.fallbacks.find((f) => f.id === fb.id)!.status).toBe("Draft");
    expect(isFallbackValidated(db.fallbacks.find((f) => f.id === fb.id)!)).toBe(false);
    expect(fallbackCoverage(db, "processes", proc.id)).toBe("fallback_unvalidated");
    expect(computeWarnings(db).some((w) => w.kind === "no_fallback_process_stops")).toBe(false);
    expect(historyOf(ap.id).at(-1)).toMatch(/withdrawn — superseded by fallback development/i);
    expect(historyOf(a.id).at(-1)).toMatch(/was Risk Acceptance Pending.*awaiting validation/);
  });

  it("retains an approved risk acceptance as historical but marks it superseded", () => {
    const { proc, a, ap } = pendingAcceptance();
    updateRec("approvals", ap.id, { decision: "Approved", decided_on: "2026-11-01" });
    develop(proc.id);
    const db = getDb();
    expect(db.approvals.find((x) => x.id === ap.id)).toMatchObject({ decision: "Approved", decided_on: "2026-11-01", lifecycle: "Risk Accepted — Superseded by Fallback Development" });
    expect(db.fallback_assessments.find((x) => x.id === a.id)!.risk_disposition).toBe("Superseded by Fallback");
    expect(historyOf(a.id).at(-1)).toMatch(/was Risk Accepted\)/);
    expect(fallbackCoverage(db, "processes", proc.id)).toBe("fallback_unvalidated");
    const h = historyOf(ap.id);
    expect(h.some((s) => /Decision/.test(s))).toBe(true);
    expect(h.at(-1)).toMatch(/Risk accepted on 2026-11-01 — now superseded/);
  });
});