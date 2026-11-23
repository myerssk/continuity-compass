import { AlertTriangle, CheckCircle2 } from "lucide-react";
import type { Db } from "@/lib/bcp/schema";
import { WARNING_LABEL, type Warning } from "@/lib/bcp/rules";
import { RecLink } from "./ui";
import { DispositionActions } from "./Disposition";
import { FixAction } from "./FixAction";
import { warningAction } from "@/lib/bcp/actions";

export function WarningList({ db, warnings }: { db: Db; warnings: Warning[] }) {
  if (!warnings.length) return <div className="flex items-center gap-2 rounded border border-success/30 bg-success/10 px-3 py-2 text-sm text-success"><CheckCircle2 className="h-4 w-4" />No warnings.</div>;
  return (
    <ul className="space-y-1.5">
      {warnings.map((w, i) => (
        <li key={i} className={`flex items-start gap-2.5 rounded border-l-4 bg-card px-3 py-2 text-sm shadow-sm ${w.severity === "high" ? "border-l-destructive" : "border-l-orange"}`}>
          <AlertTriangle className={`mt-0.5 h-4 w-4 shrink-0 ${w.severity === "high" ? "text-destructive" : "text-orange"}`} />
          <div className="min-w-0 flex-1">
            <div className="float-right ml-2"><FixAction size="xs" fix={warningAction(w)} /></div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{WARNING_LABEL[w.kind]}</div>
            <div>{w.message} · <RecLink db={db} table={w.table} id={w.id} /></div>
            {w.assessmentId && <DispositionActions assessmentId={w.assessmentId} />}
          </div>
        </li>
      ))}
    </ul>
  );
}