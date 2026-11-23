import { describe, expect, it } from "vitest";
import { seedDb } from "./seed";
import { computeWarnings, isFallbackValidated } from "./rules";

const today = new Date("2026-11-19");

describe("BCP warning rules", () => {
  it("flags a component whose technical RTO exceeds a supported function's business RTO", () => {
    const w = computeWarnings(seedDb(), today).filter((x) => x.kind === "rto_exceeds");
    expect(w.some((x) => x.id === "sc2" && x.message.includes("Customer Payments"))).toBe(true);
  });
  it("flags critical functions without any fallback", () => {
    const w = computeWarnings(seedDb(), today).filter((x) => x.kind === "no_fallback");
    expect(w.map((x) => x.id)).toContain("bf2");
    expect(w.map((x) => x.id)).not.toContain("bf1");
  });
  it("treats fallbacks as unvalidated unless passed within 365 days", () => {
    expect(isFallbackValidated({ id: "x", test_result: "Pass", last_tested: "2026-06-12" }, today)).toBe(true);
    expect(isFallbackValidated({ id: "x", test_result: "Pass", last_tested: "2025-04-03" }, today)).toBe(false);
    expect(isFallbackValidated({ id: "x", test_result: "Partial", last_tested: "2026-10-01" }, today)).toBe(false);
  });
  it("flags a fallback that shares a dependency with the primary path", () => {
    const w = computeWarnings(seedDb(), today).filter((x) => x.kind === "common_dependency");
    expect(w.map((x) => x.id)).toContain("fb4"); // standby DB in same data centre
    expect(w.map((x) => x.id)).not.toContain("fb5");
  });
});

import { fallbackReadiness } from "./rules";
describe("Fallback readiness", () => {
  it("scores a fully documented, validated, independent fallback at 100%", () => {
    const db = seedDb();
    expect(fallbackReadiness(db, db.fallbacks.find((f) => f.id === "fb5")!, today).score).toBe(100);
  });
  it("loses the independence check when a dependency is shared with the primary path", () => {
    const db = seedDb();
    const r = fallbackReadiness(db, db.fallbacks.find((f) => f.id === "fb4")!, today);
    expect(r.checks.find((c) => c.label.startsWith("No common-mode"))?.ok).toBe(false);
  });
});

import { emptyDb, demoDb } from "./seed";
import { missingObjectives, overallReadiness, functionReadiness } from "./rules";
describe("Empty environment", () => {
  it("starts with zero records in every table", () => {
    const db = emptyDb();
    for (const [k, v] of Object.entries(db)) if (k !== "mode") expect(v).toEqual([]);
    expect(db.mode).toBe("empty");
  });
  it("produces no warnings, no missing objectives and no readiness score", () => {
    const db = emptyDb();
    expect(computeWarnings(db, today)).toEqual([]);
    expect(missingObjectives(db)).toEqual([]);
    expect(overallReadiness(db, today)).toBeNull();
  });
  it("does not assess a function that has no processes yet", () => {
    const db = emptyDb();
    db.functions.push({ id: "f", name: "New", criticality: "Critical" });
    expect(functionReadiness(db, db.functions[0]!, today).assessed).toBe(false);
    expect(overallReadiness(db, today)).toBeNull();
  });
  it("demo dataset is labelled as demo", () => {
    expect(demoDb().mode).toBe("demo");
    expect(demoDb().functions.length).toBeGreaterThan(0);
  });
});