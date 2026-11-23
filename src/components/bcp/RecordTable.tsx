/* eslint-disable @typescript-eslint/no-explicit-any */
import { useNavigate } from "@tanstack/react-router";
import { Pencil, Plus, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { type Rec, type TableName, tableDef } from "@/lib/bcp/schema";
import { deleteRec, useDb } from "@/lib/bcp/store";
import { EntityForm } from "./EntityForm";
import { FieldValue, tdCls, thCls } from "./ui";

export function RecordTable({ table, rows, defaults, hideKeys = [], extra, emptyText, addLabel, sortKey, noAdd }: {
  table: TableName; rows: Rec[]; defaults?: Record<string, any>; hideKeys?: string[];
  extra?: { label: string; render: (r: Rec) => ReactNode }; emptyText?: string; addLabel?: string; sortKey?: string | undefined; noAdd?: boolean;
}) {
  const db = useDb();
  const nav = useNavigate();
  const def = tableDef(table);
  const hide = new Set([...hideKeys, ...Object.keys(defaults ?? {}).filter((k) => ["ref", "target", "text"].includes(def.fields.find((f) => f.key === k)?.type ?? "text"))]);
  const cols = def.fields.filter((f) => f.list && !hide.has(f.key));
  const sorted = sortKey ? [...rows].sort((a, b) => Number(a[sortKey] ?? 0) - Number(b[sortKey] ?? 0)) : rows;
  return (
    <div>
      {!noAdd && <div className="mb-2 flex justify-end">
        <EntityForm table={table} defaults={defaults} trigger={<Button size="sm" variant="teal"><Plus className="h-3.5 w-3.5" />{addLabel ?? `Add ${def.singular}`}</Button>} />
      </div>}
      <div className="overflow-x-auto rounded border border-border">
        <table className="w-full">
          <thead className="bg-muted/60"><tr>{cols.map((c) => <th key={c.key} className={thCls}>{c.label}</th>)}{extra && <th className={thCls}>{extra.label}</th>}<th className="w-20" /></tr></thead>
          <tbody>
            {sorted.length === 0 && <tr><td colSpan={cols.length + 2} className="px-3 py-6 text-center text-sm text-muted-foreground">{emptyText ?? "No records yet."}</td></tr>}
            {sorted.map((r) => (
              <tr key={r.id} className={`border-t border-border hover:bg-accent/40 ${def.hidden ? "" : "cursor-pointer"}`}
                onClick={(e) => { if (!def.hidden && !(e.target as HTMLElement).closest("a,button")) nav({ to: "/$type/$id", params: { type: table, id: r.id } }); }}>
                {cols.map((c) => <td key={c.key} className={tdCls}><FieldValue db={db} field={c} rec={r} /></td>)}
                {extra && <td className={tdCls}>{extra.render(r)}</td>}
                <td className="px-2 py-1.5 text-right whitespace-nowrap">
                  <EntityForm table={table} record={r} trigger={<Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-teal" aria-label="Edit"><Pencil className="h-3.5 w-3.5" />Edit</Button>} />
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" aria-label="Delete" onClick={() => { if (confirm(`Delete this ${def.singular}?`)) deleteRec(table, r.id); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}