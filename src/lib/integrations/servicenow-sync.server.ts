import type { ServiceNowApi } from "./servicenow-api.server";
import { previewServiceNowImport, type ImportMapping } from "./servicenow-import.server";
import { executeServiceNowExport, type ExportRecord } from "./servicenow-export.server";

export async function executeServiceNowSync(api: Pick<ServiceNowApi, "readPage" | "updateRecord">, input: {
  direction: "import" | "export" | "bidirectional";
  dryRun: boolean;
  mappings: ImportMapping[];
  importTables: readonly string[];
  exportPolicy: Readonly<Record<string, readonly string[]>>;
  exports: ExportRecord[];
  persistImport: (records: Awaited<ReturnType<typeof previewServiceNowImport>>["records"]) => Promise<void>;
}) {
  const importing = input.direction !== "export";
  const exporting = input.direction !== "import";
  const imported = importing ? await previewServiceNowImport(api, input.mappings, input.importTables) : null;
  const preview = exporting ? await executeServiceNowExport(api, input.exports, input.exportPolicy, true) : null;
  if (imported && !imported.complete) return { status: "partial" as const, imported, exported: preview };
  if (input.dryRun) return { status: "succeeded" as const, imported, exported: preview };
  if (imported) await input.persistImport(imported.records);
  const exported = exporting ? await executeServiceNowExport(api, input.exports, input.exportPolicy, false) : null;
  const status = exported?.status === "failed" ? (imported ? "partial" : "failed") : exported?.status === "partial" ? "partial" : "succeeded";
  return { status, imported, exported };
}
