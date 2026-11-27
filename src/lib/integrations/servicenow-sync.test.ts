import { describe, expect, it, vi } from "vitest";
import { executeServiceNowSync } from "./servicenow-sync.server";
function setup() {
  const api = { readPage: vi.fn().mockResolvedValue([{ sys_id: "ci1", name: "Server" }]), updateRecord: vi.fn().mockResolvedValue({}) };
  const input = { direction: "bidirectional" as const, dryRun: true, mappings: [{ compass_entity: "component", compass_field: "name", servicenow_table: "cmdb_ci", servicenow_field: "name", direction: "import", enabled: true }], importTables: ["cmdb_ci"], exportPolicy: { incident: ["short_description"] }, exports: [{ table: "incident", sysId: "a".repeat(32), fields: { short_description: "Recovery" } }], persistImport: vi.fn().mockResolvedValue(undefined) };
  return { api, input };
}
describe("ServiceNow synchronization", () => {
  it("never persists or writes in preview", async () => {
    const { api, input } = setup();
    expect((await executeServiceNowSync(api, input)).status).toBe("succeeded");
    expect(input.persistImport).not.toHaveBeenCalled();
    expect(api.updateRecord).not.toHaveBeenCalled();
  });
  it("executes validated imports and exports", async () => {
    const { api, input } = setup();
    expect((await executeServiceNowSync(api, { ...input, dryRun: false })).status).toBe("succeeded");
    expect(input.persistImport).toHaveBeenCalledTimes(1);
    expect(api.updateRecord).toHaveBeenCalledTimes(1);
  });
  it("rejects invalid exports before persisting imports", async () => {
    const { api, input } = setup();
    await expect(executeServiceNowSync(api, { ...input, dryRun: false, exportPolicy: {} })).rejects.toThrow();
    expect(input.persistImport).not.toHaveBeenCalled();
    expect(api.updateRecord).not.toHaveBeenCalled();
  });
  it("reports partial execution when export fails after import", async () => {
    const { api, input } = setup();
    api.updateRecord.mockRejectedValue(new Error("Unavailable"));
    expect((await executeServiceNowSync(api, { ...input, dryRun: false })).status).toBe("partial");
  });
});
