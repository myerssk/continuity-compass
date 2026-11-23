import { useNavigate } from "@tanstack/react-router";
import { Database, FlaskConical, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { clearAllData, exportBackup, loadDemoData, recordCount, useDb } from "@/lib/bcp/store";
import { cn } from "@/lib/utils";

type Kind = "demo" | "clear" | null;

/** Load Demo / Clear All with explicit confirmation; offers a backup before anything is replaced. */
export function useDataActions() {
  const [open, setOpen] = useState<Kind>(null);
  return { open, setOpen, dialog: <DataDialog kind={open} onClose={() => setOpen(null)} /> };
}

function DataDialog({ kind, onClose }: { kind: Kind; onClose: () => void }) {
  const db = useDb();
  const nav = useNavigate();
  const [typed, setTyped] = useState("");
  const n = recordCount(db);
  const userData = db.mode === "user" && n > 0;
  const close = () => { setTyped(""); onClose(); };
  const confirmClear = !userData || typed.trim().toUpperCase() === "DELETE";
  return (
    <AlertDialog open={kind !== null} onOpenChange={(o) => { if (!o) close(); }}>
      <AlertDialogContent>
        {kind === "demo" && (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-primary"><FlaskConical className="h-5 w-5 text-orange" />Load demo / training data?</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-2 text-sm">
                  <p>This loads a <b>fictional</b> sample organization with functions, processes, components, fallbacks, runbooks, tests, gaps and approvals for training and evaluation. It is not real organizational information, and the app will be labelled <b>Demo Data · Training Mode</b> while it is loaded.</p>
                  {n > 0 ? (
                    <p className={cn("rounded border p-2", userData ? "border-destructive/40 bg-destructive/10 text-destructive" : "border-border bg-muted")}>
                      {userData ? <>You have <b>{n} records you entered yourself</b>. Loading demo data will <b>replace them</b>. Download a backup first if you want to keep them.</> : <>The current {n} demo records will be reset to the original training set.</>}
                    </p>
                  ) : <p>Your environment is currently empty, so nothing will be overwritten.</p>}
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2">
              {n > 0 && <Button variant="outline" onClick={exportBackup}>Download backup</Button>}
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <Button variant="orange" onClick={() => { loadDemoData(); toast.success("Demo data loaded — Training Mode"); close(); nav({ to: "/dashboard" }); }}>{userData ? "Replace with demo data" : "Load demo data"}</Button>
            </AlertDialogFooter>
          </>
        )}
        {kind === "clear" && (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-destructive"><Trash2 className="h-5 w-5" />Clear all data and start fresh?</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-2 text-sm">
                  <p>This permanently deletes <b>all {n} records</b> stored in this browser — organizations, plans, functions, processes, components, fallbacks, runbooks, tests, evidence, gaps, approvals and audit history{db.mode === "demo" ? " (currently demo data)" : ""}. It cannot be undone.</p>
                  {userData && (
                    <label className="block">
                      <span className="text-foreground">These include data you entered. Type <b>DELETE</b> to confirm:</span>
                      <input autoFocus value={typed} onChange={(e) => setTyped(e.target.value)} className="mt-1 w-full rounded border border-input bg-card px-2 py-1.5 text-foreground" />
                    </label>
                  )}
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2">
              {n > 0 && <Button variant="outline" onClick={exportBackup}>Download backup</Button>}
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <Button variant="destructive" disabled={!confirmClear} onClick={() => { clearAllData(); toast.success("All data cleared — clean environment"); close(); nav({ to: "/dashboard" }); }}>Delete everything</Button>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function SidebarDataControls() {
  const db = useDb();
  const { setOpen, dialog } = useDataActions();
  const empty = recordCount(db) === 0;
  return (
    <div className="m-3 space-y-1.5 border-t border-sidebar-border pt-3">
      <div className="flex items-center gap-1.5 px-1 pb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-sidebar-foreground/50"><Database className="h-3 w-3" />Data · {db.mode === "demo" ? "Demo" : empty ? "Empty" : "Your data"}</div>
      <button onClick={() => setOpen("demo")} className="flex w-full items-center gap-2 rounded border border-sidebar-border px-3 py-1.5 text-xs hover:bg-sidebar-accent"><FlaskConical className="h-3.5 w-3.5 text-orange" />Load demo data</button>
      <button onClick={() => setOpen("clear")} disabled={empty} className="flex w-full items-center gap-2 rounded border border-sidebar-border px-3 py-1.5 text-xs hover:bg-sidebar-accent disabled:cursor-not-allowed disabled:opacity-40"><Trash2 className="h-3.5 w-3.5" />Clear all data</button>
      {dialog}
    </div>
  );
}

export function DemoBanner() {
  const db = useDb();
  const { setOpen, dialog } = useDataActions();
  if (db.mode !== "demo") return null;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-orange/40 bg-orange px-4 py-2 text-sm text-orange-foreground md:px-8 print:border print:bg-transparent print:text-foreground">
      <FlaskConical className="h-4 w-4" />
      <b className="uppercase tracking-wider">Demo Data · Training Mode</b>
      <span className="opacity-90">All records are fictional and for training only — not real organizational information.</span>
      <button onClick={() => setOpen("clear")} className="ml-auto rounded border border-orange-foreground/60 px-2.5 py-0.5 text-xs font-semibold hover:bg-orange-foreground/15 print:hidden">Exit demo · start with a clean environment</button>
      {dialog}
    </div>
  );
}