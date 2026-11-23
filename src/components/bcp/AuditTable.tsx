import { Pill, RecLink, tdCls, thCls } from "./ui";
import { type AuditEntry, type Db, tableDef } from "@/lib/bcp/schema";

export function AuditTable({ rows, db }: { rows: AuditEntry[]; db: Db }) {
  return (
    <table className="w-full">
      <thead className="bg-muted/60"><tr>{["When", "User", "Action", "Record", "Change"].map((h) => <th key={h} className={thCls}>{h}</th>)}</tr></thead>
      <tbody>
        {rows.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-sm text-muted-foreground">No history yet — edits are recorded here.</td></tr>}
        {rows.map((a) => (
          <tr key={a.id} className="border-t border-border">
            <td className={`${tdCls} num whitespace-nowrap text-xs`}>{new Date(a.at).toLocaleString()}</td>
            <td className={tdCls}>{a.user}</td>
            <td className={tdCls}><Pill value={a.action} tone={a.action === "delete" ? "bad" : a.action === "create" ? "good" : "info"} /></td>
            <td className={tdCls}><span className="mr-1 text-xs text-muted-foreground">{tableDef(a.table)?.singular}</span>{a.action !== "delete" && <RecLink db={db} table={a.table} id={a.record_id} />}</td>
            <td className={tdCls}>{a.summary}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}