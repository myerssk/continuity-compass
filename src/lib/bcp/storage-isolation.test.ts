import { beforeEach, describe, expect, it } from "vitest";
import { emptyDb } from "./seed";
import { getDb, getStorageScope, importDb, reloadFromStorage, setStorageScope } from "./store";

describe("BCP storage isolation", () => {
  beforeEach(() => {
    localStorage.clear();
    setStorageScope(null);
    reloadFromStorage();
  });

  it("isolates records between authenticated scopes in the same browser", () => {
    setStorageScope("user:alpha");
    importDb({ ...emptyDb(), mode: "user", organizations: [{ id: "org_a", name: "Alpha" }] });
    expect(getDb().organizations).toHaveLength(1);

    setStorageScope("user:beta");
    expect(getDb().organizations).toHaveLength(0);
    importDb({ ...emptyDb(), mode: "user", organizations: [{ id: "org_b", name: "Beta" }] });

    setStorageScope("user:alpha");
    expect(getDb().organizations.map((r) => r.name)).toEqual(["Alpha"]);
  });

  it("does not silently import the legacy shared storage key", () => {
    localStorage.setItem("bcp-prototype-db-v2", JSON.stringify({ ...emptyDb(), mode: "user", organizations: [{ id: "legacy", name: "Legacy Shared" }] }));
    setStorageScope("user:new");
    expect(getDb().organizations).toHaveLength(0);
  });

  it("resets to anonymous scope on sign-out boundary", () => {
    setStorageScope("user:alpha");
    expect(getStorageScope()).toBe("user:alpha");
    setStorageScope(null);
    expect(getStorageScope()).toBe("anonymous");
  });
});
