/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { type Rec, type TableName, type TargetType, tableDef } from "@/lib/bcp/schema";
import { createRec, getDb, titleOf, updateRec, useDb } from "@/lib/bcp/store";
import { OBJECTIVE_HELP, OBJECTIVE_KEYS } from "@/lib/bcp/actions";
import { HelpLink } from "./HelpLink";
import { helpTopicForPath } from "@/lib/bcp/manual";

const inputCls = "w-full rounded border border-input bg-card px-2.5 py-1.5 text-sm outline-none focus:border-teal focus:ring-2 focus:ring-ring/30";

/** `focus` = edit only these fields of an existing record (e.g. the missing objectives), highlighted with inline help; other fields are untouched. */
export function EntityForm({ table, record, defaults, trigger, onSaved, focus, autoOpen, onClose }: { table: TableName; record?: Rec | undefined; defaults?: Record<string, any> | undefined; trigger?: ReactNode; onSaved?: ((r: Rec) => void) | undefined; focus?: string[] | undefined; autoOpen?: boolean | undefined; onClose?: (() => void) | undefined }) {
  const db = useDb();
  const def = tableDef(table);
  const [open, setOpen] = useState(false);
  const [vals, setVals] = useState<Record<string, any>>({});
  const set = (k: string, v: any) => setVals((s) => ({ ...s, [k]: v }));
  const fixed = new Set(Object.keys(defaults ?? {}));

  const focusMode = !!(record && focus?.length);
  const objectiveGroup = new Set(OBJECTIVE_KEYS[table] ?? []);
  const isObjectives = focusMode && focus!.every((k) => objectiveGroup.has(k));
  // In focus mode for objectives, show the whole objective group so related values are visible, but highlight the missing ones.
  const shownKeys = focusMode ? (isObjectives ? [...objectiveGroup] : focus!) : null;
  const onOpen = (o: boolean) => {
    if (o) setVals(record ? { ...record } : { ...Object.fromEntries(def.fields.map((f) => [f.key, f.type === "select" || f.type === "target" ? f.options?.[0] ?? "" : ""])), ...defaults });
    setOpen(o);
    if (!o) onClose?.();
  };
  useEffect(() => { if (autoOpen && record) onOpen(true); }, [autoOpen, record?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const save = () => {
    if (focusMode) {
      const patch = Object.fromEntries(shownKeys!.map((k) => { const f = def.fields.find((x) => x.key === k); const v = vals[k]; return [k, f?.type === "number" ? (v === "" || v === undefined || v === null ? null : Number(v)) : v ?? ""]; }));
      const bad = shownKeys!.filter((k) => def.fields.find((x) => x.key === k)?.type === "number" && patch[k] !== null && (isNaN(patch[k]) || patch[k] < 0));
      if (bad.length) { toast.error("Enter hours as a number of 0 or more"); return; }
      updateRec(table, record!.id, patch);
      toast.success(isObjectives ? "Recovery objectives updated" : `${def.singular} updated`);
      onSaved?.({ ...record!, ...patch }); onOpen(false); return;
    }
    const missing = def.fields.filter((f) => f.required && (vals[f.key] === "" || vals[f.key] === undefined));
    if (missing.length) { toast.error(`Required: ${missing.map((m) => m.label).join(", ")}`); return; }
    const clean = Object.fromEntries(def.fields.map((f) => [f.key, f.type === "number" ? (vals[f.key] === "" || vals[f.key] === undefined ? null : Number(vals[f.key])) : vals[f.key] ?? ""]));
    if (record) { updateRec(table, record.id, clean); toast.success(`${def.singular} updated`); onSaved?.({ ...record, ...clean }); }
    else { const r = createRec(table, clean); toast.success(`${def.singular} created`); onSaved?.(r); }
    onOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle className="text-primary">{focusMode ? `${isObjectives ? "Recovery objectives" : `Edit ${def.singular}`} — ${titleOf(table, getDb()[table].find((r) => r.id === record!.id) ?? record!)}` : record ? `Edit ${def.singular}` : `New ${def.singular}`}</DialogTitle></DialogHeader>
        <div><HelpLink topic={isObjectives ? "recovery-objectives" : helpTopicForPath(`/${table}`) ?? "getting-started"} label={isObjectives ? "Recovery objectives guide" : "Learn more"} /></div>
        {focusMode && <p className="-mt-2 text-xs text-muted-foreground">{focus!.some((k) => record![k] === "" || record![k] == null) ? "Highlighted fields need a value." : "Review the highlighted value against the linked requirement; change it only if it is wrong."} Only the fields shown here are changed; enter the values your organization has agreed — nothing is filled in for you.</p>}
        <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
          {def.fields.map((f) => {
            if (f.key === "target_id") return null;
            if (shownKeys && !shownKeys.includes(f.key)) return null;
            const hot = focusMode && focus!.includes(f.key);
            const wide = f.type === "textarea" || f.type === "target";
            const locked = fixed.has(f.key) && !record;
            let control: ReactNode;
            if (f.type === "target") {
              const tt = (vals.target_type || f.options?.[0]) as TargetType;
              control = (
                <div className="grid grid-cols-[10rem_1fr] gap-2">
                  <select disabled={locked} className={inputCls} value={tt} onChange={(e) => { set("target_type", e.target.value); set("target_id", ""); }}>
                    {f.options!.map((o) => <option key={o} value={o}>{tableDef(o as TableName).singular}</option>)}
                  </select>
                  <select disabled={locked} className={inputCls} value={vals.target_id ?? ""} onChange={(e) => set("target_id", e.target.value)}>
                    <option value="">Select…</option>
                    {db[tt].map((r) => <option key={r.id} value={r.id}>{titleOf(tt, r)}</option>)}
                  </select>
                </div>
              );
            } else if (f.type === "ref") {
              control = (
                <select disabled={locked} className={inputCls} value={vals[f.key] ?? ""} onChange={(e) => set(f.key, e.target.value)}>
                  <option value="">{f.required ? "Select…" : "(none)"}</option>
                  {db[f.ref!].filter((r) => r.id !== record?.id).map((r) => <option key={r.id} value={r.id}>{titleOf(f.ref!, r)}</option>)}
                </select>
              );
            } else if (f.type === "select") {
              control = <select className={inputCls} value={vals[f.key] ?? ""} onChange={(e) => set(f.key, e.target.value)}>{f.options!.map((o) => <option key={o}>{o}</option>)}</select>;
            } else if (f.type === "textarea") {
              control = <textarea rows={2} className={inputCls} value={vals[f.key] ?? ""} onChange={(e) => set(f.key, e.target.value)} />;
            } else {
              control = <input autoFocus={hot && f.key === focus![0]} aria-invalid={hot && (vals[f.key] === "" || vals[f.key] == null) ? true : undefined} type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"} min={f.type === "number" && focusMode ? 0 : undefined} step="any" className={`${inputCls} ${hot ? "border-orange ring-2 ring-orange/30" : ""}`} value={vals[f.key] ?? ""} onChange={(e) => set(f.key, e.target.value)} />;
            }
            return (
              <label key={f.key} className={wide || focusMode ? "sm:col-span-2" : ""}>
                <span className="mb-1 block text-xs font-medium text-muted-foreground">{f.label}{f.required && <span className="text-orange"> *</span>}{hot && <span className="ml-1.5 rounded bg-orange/10 px-1 text-[10px] font-semibold uppercase text-orange">{record![f.key] === "" || record![f.key] == null ? "Missing" : "Review"}</span>}</span>
                {control}
                {f.type === "ref" && f.required && !db[f.ref!].length && <span className="mt-0.5 block text-[11px] font-medium text-orange">No {tableDef(f.ref!).singular.toLowerCase()} exists yet — create one first (see the Dashboard setup steps).</span>}
                {f.type === "target" && !db[(vals.target_type || f.options?.[0]) as TargetType].length && <span className="mt-0.5 block text-[11px] font-medium text-orange">No {tableDef((vals.target_type || f.options?.[0]) as TableName).singular.toLowerCase()} exists yet — pick another type or create one first.</span>}
                {OBJECTIVE_HELP[f.key] && (objectiveGroup.has(f.key)) ? <span className="mt-0.5 block text-[11px] text-muted-foreground">{OBJECTIVE_HELP[f.key]}</span> : f.hint && <span className="mt-0.5 block text-[11px] text-muted-foreground">{f.hint}</span>}
              </label>
            );
          })}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpen(false)}>Cancel</Button>
          <Button variant="teal" onClick={save}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}