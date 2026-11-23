import { describe, expect, it } from "vitest";
import { helpTopicForPath, manualTopic, searchManual } from "./manual";

describe("Manual discovery", () => {
  it.each(["RTO", "RPO", "MTPD"])("finds recovery objectives for %s", (term) => {
    expect(searchManual(term).map((topic) => topic.id)).toContain("recovery-objectives");
  });
  it.each([["fallback", "fallbacks"], ["runbook", "runbooks"], ["ServiceNow", "integrations"]])("finds %s", (term, id) => {
    expect(searchManual(term).map((topic) => topic.id)).toContain(id);
  });
  it("matches useful keywords and all terms rather than any one term", () => {
    expect(searchManual("Document AI OCR").map((topic) => topic.id)).toContain("integrations");
    expect(searchManual("RTO nonexistentword")).toHaveLength(0);
  });
  it.each([["/functions/f-1", "functions"], ["/fallbacks/f-1", "fallbacks"], ["/warnings", "warnings"], ["/runbooks/r-1", "runbooks"], ["/tests", "tests"], ["/approvals/a-1", "approvals"], ["/build", "build"]])("maps %s to the exact help topic", (path, id) => {
    const resolved = helpTopicForPath(path);
    expect(resolved).toBe(id);
    expect(manualTopic(id)?.id).toBe(id);
  });
  it("does not add recursive help to help pages", () => {
    expect(helpTopicForPath("/help/fallbacks")).toBeUndefined();
    expect(manualTopic("not-a-topic")).toBeUndefined();
  });
  it("uses the active detail tab for contextual help", () => {
    expect(helpTopicForPath("/functions/f-1", "Fallbacks")).toBe("fallbacks");
    expect(helpTopicForPath("/functions/f-1", "Runbooks")).toBe("runbooks");
    expect(helpTopicForPath("/components/c-1", "Tests")).toBe("tests");
  });
});