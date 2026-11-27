import type { ServiceNowApi } from "./servicenow-api.server";
export type ExportRecord = { table: string; sysId: string; fields: Record<string, unknown> };
export async function executeServiceNowExport(api: Pick<ServiceNowApi, "updateRecord">, records: ExportRecord[], policy: Readonly<Record<string, readonly string[]>>, dryRun = true) {
  if (records.length > 1000) throw new Error("Export batch exceeds limit.");
  const seen = new Set<string>();
  for (const record of records) {
    const allowed = Object.hasOwn(policy, record.table) ? policy[record.table] : undefined;
    const keys = Object.keys(record.fields);
    const identity = record.table + ":" + record.sysId.toLowerCase();
    if (!allowed || !/^[a-z][a-z0-9_]*$/.test(record.table) || !/^[a-f0-9]{32}$/i.test(record.sysId) || !keys.length || keys.some(key => key === "sys_id" || !/^[a-z][a-z0-9_]*$/.test(key) || !allowed.includes(key)) || seen.has(identity)) throw new Error("Invalid or duplicate export record.");
    seen.add(identity);
  }
  if (dryRun) return { status: "preview" as const, planned: records.length, updated: 0, failed: 0 };
  let updated = 0;
  for (const record of records) {
    try {
      await api.updateRecord(record.table, record.sysId, record.fields, Object.keys(policy), policy[record.table]);
      updated++;
    } catch {
      return { status: updated ? "partial" as const : "failed" as const, planned: records.length, updated, failed: 1 };
    }
  }
  return { status: "succeeded" as const, planned: records.length, updated, failed: 0 };
}
