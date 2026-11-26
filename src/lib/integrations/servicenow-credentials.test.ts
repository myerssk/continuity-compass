import { describe, expect, it } from "vitest";
import { resolveServiceNowCredentials } from "./servicenow-credentials.server";
const id = "12345678-1234-1234-1234-123456789abc";
const prefix = "SERVICENOW_12345678123412341234123456789ABC_";
const env = { [prefix + "INSTANCE"]: "https://example.service-now.com", [prefix + "CLIENT_ID"]: "mock-id", [prefix + "CLIENT_SECRET"]: "mock-secret" };
describe("workspace ServiceNow credentials", () => {
  it("resolves only the configured workspace and origin", () => {
    expect(resolveServiceNowCredentials(id, "https://example.service-now.com/", env)).toEqual({ instance: "https://example.service-now.com", clientId: "mock-id", clientSecret: "mock-secret" });
  });
  it("rejects cross-workspace access", () => {
    expect(() => resolveServiceNowCredentials("22345678-1234-1234-1234-123456789abc", "https://example.service-now.com", env)).toThrow("not configured");
  });
  it("rejects a changed instance and invalid workspace", () => {
    expect(() => resolveServiceNowCredentials(id, "https://other.service-now.com", env)).toThrow("mismatch");
    expect(() => resolveServiceNowCredentials("invalid", "https://example.service-now.com", env)).toThrow("Invalid workspace");
  });
});
