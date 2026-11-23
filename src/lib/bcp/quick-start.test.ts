import { describe, expect, it } from "vitest";
import { emptyDb, demoDb } from "./seed";
import { quickStartChecks } from "./quick-start";

describe("Quick Start record evidence", () => {
  it("empty setup has no evidenced milestones and never becomes ready", () => {
    expect(quickStartChecks(emptyDb())).toEqual(Array(15).fill(false));
  });
  it("requires all three BIA objectives and accepts zero data-loss time", () => {
    const db = emptyDb();
    db.functions.push({ id: "fn", mtpd_h: 24, rto_h: 4, rpo_h: "" });
    expect(quickStartChecks(db, "fn")[4]).toBe(false);
    const fn = db.functions[0];
    if (!fn) throw new Error("Missing test function");
    fn.rpo_h = 0;
    expect(quickStartChecks(db, "fn")[4]).toBe(true);
  });
  it("does not borrow another function's strategies, approvals or process links", () => {
    const db = emptyDb();
    db.functions.push({ id: "one" }, { id: "two" });
    db.processes.push({ id: "p", function_id: "two", uses_technology: "No" });
    db.strategies.push({ id: "s", target_type: "functions", target_id: "two" });
    db.approvals.push({ id: "a", target_type: "functions", target_id: "two", decision: "Approved" });
    expect(quickStartChecks(db, "one")[8]).toBe(false);
    expect(quickStartChecks(db, "one")[13]).toBe(false);
    expect(quickStartChecks(db, "two")[6]).toBe(true);
  });
  it("a saved no-fallback assessment evidences an answer, not validation", () => {
    const db = emptyDb();
    db.functions.push({ id: "fn" });
    db.fallback_assessments.push({ id: "a", target_type: "functions", target_id: "fn", fallback_status: "No Fallback Available", continuity_capability: "Process Stops" });
    expect(quickStartChecks(db, "fn")[7]).toBe(true);
    expect(db.fallbacks).toHaveLength(0);
  });
  it("scheduled tests and superseded or risk approvals do not evidence completion", () => {
    const db = emptyDb();
    db.functions.push({ id: "fn" });
    db.tests.push({ id: "t", target_type: "functions", target_id: "fn", result: "Scheduled" });
    db.approvals.push({ id: "a", target_type: "functions", target_id: "fn", decision: "Approved", superseded_on: "2026-11-23" });
    expect(quickStartChecks(db, "fn")[10]).toBe(false);
    expect(quickStartChecks(db, "fn")[13]).toBe(false);
    db.approvals = [{ id: "r", target_type: "functions", target_id: "fn", decision: "Approved", role: "Risk acceptance" }];
    expect(quickStartChecks(db, "fn")[13]).toBe(false);
  });
  it("never mutates editable demo records, wizard state or audit", () => {
    const db = demoDb();
    const before = JSON.stringify(db);
    quickStartChecks(db);
    expect(JSON.stringify(db)).toBe(before);
    expect(db.mode).toBe("demo");
  });
});