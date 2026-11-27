import { describe, expect, it, vi } from "vitest";
import { previewServiceNowImport } from "./servicenow-import.server";
const mapping = { compass_entity: "component", compass_field: "name", servicenow_table: "cmdb_ci", servicenow_field: "name", direction: "import", enabled: true };
describe("ServiceNow import preview", () => {
  it("maps approved references without writes", async () => {
    const readPage = vi.fn().mockResolvedValue([{ sys_id: "ci1", name: "Server" }]);
    const result = await previewServiceNowImport({ readPage }, [mapping], ["cmdb_ci"]);
    expect(result).toEqual({ records: [{ table: "cmdb_ci", sysId: "ci1", entity: "component", fields: { name: "Server" } }], truncated: [], complete: true });
  });
  it("rejects unapproved tables before network access", async () => {
    const readPage = vi.fn();
    await expect(previewServiceNowImport({ readPage }, [mapping], [])).rejects.toThrow("unapproved");
    expect(readPage).not.toHaveBeenCalled();
  });
  it("flags bounded incomplete imports", async () => {
    const readPage = vi.fn().mockResolvedValue(Array.from({ length: 100 }, (_, i) => ({ sys_id: String(i) })));
    const result = await previewServiceNowImport({ readPage }, [mapping], ["cmdb_ci"], 1);
    expect(result.complete).toBe(false);
    expect(result.truncated).toEqual(["cmdb_ci"]);
  });
  it("ignores disabled and export-only mappings", async () => {
    const readPage = vi.fn();
    expect((await previewServiceNowImport({ readPage }, [{ ...mapping, enabled: false }, { ...mapping, direction: "export" }], [])).records).toEqual([]);
    expect(readPage).not.toHaveBeenCalled();
  });
});
