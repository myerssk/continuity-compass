import type { ServiceNowApi } from "./servicenow-api.server";
export type ImportMapping = { compass_entity: string; compass_field: string; servicenow_table: string; servicenow_field: string; direction: string; enabled: boolean };
export type ImportedReference = { table: string; sysId: string; entity: string; fields: Record<string, unknown> };
export async function previewServiceNowImport(api: Pick<ServiceNowApi, "readPage">, mappings: ImportMapping[], allowedTables: readonly string[], maxPages = 10) {
  if (!Number.isInteger(maxPages) || maxPages < 1 || maxPages > 100) throw new Error("Invalid page limit");
  const active = mappings.filter(m => m.enabled && ["import", "bidirectional"].includes(m.direction));
  const tables = [...new Set(active.map(m => m.servicenow_table))];
  if (tables.some(t => !allowedTables.includes(t))) throw new Error("Mapping references an unapproved table");
  const records: ImportedReference[] = [];
  const truncated: string[] = [];
  for (const table of tables) {
    const group = active.filter(m => m.servicenow_table === table);
    const entities = [...new Set(group.map(m => m.compass_entity))];
    for (let page = 0; page < maxPages; page++) {
      const rows = await api.readPage(table, group.map(m => m.servicenow_field), page * 100);
      for (const row of rows) {
        if (typeof row.sys_id !== "string" || !row.sys_id) throw new Error("Missing ServiceNow record identifier");
        for (const entity of entities) {
          const fields = Object.fromEntries(group.filter(m => m.compass_entity === entity).map(m => [m.compass_field, row[m.servicenow_field] ?? null]));
          records.push({ table, sysId: row.sys_id, entity, fields });
        }
      }
      if (rows.length < 100) break;
      if (page === maxPages - 1) truncated.push(table);
    }
  }
  return { records, truncated, complete: truncated.length === 0 };
}
