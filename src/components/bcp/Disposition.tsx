import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { effectiveDisposition } from "@/lib/bcp/rules";
import { useDb } from "@/lib/bcp/store";
import { acceptRisk, createGapForAssessment, developFallback, markNotApplicable } from "@/lib/bcp/wizard";
import { Pill, RecLink } from "./ui";

const inputCls = "w-full rounded border border-input bg-card px-2.5 py-1.5 text-sm outline-none focus:border-teal focus:ring-2 focus:ring-ring/30";

/** BCP Coordinator disposition for a documented "no fallback — process stops" answer. Every action is an explicit choice. */
export function DispositionActions({ assessmentId, inWizard = false }: { assessmentId: string; inWizard?: boolean }) {
  const db = useDb();
  const nav = useNavigate();
  const a = db.fallback_assessments.find((x) => x.id === assessmentId);
  const [mode, setMode] = useState<null | "accept" | "na">(null);
  const [owner, setOwner] = useState("");
  const [why, setWhy] = useState("");
  if (!a) return null;
  const d = effectiveDisposition(db, a);
  const tone = d === "Not Yet Addressed" || d === "Risk Acceptance Rejected" ? "bad" : d === "Not Applicable" || d === "Risk Accepted" ? "neutral" : "warn";
  const reset = () => { setMode(null); setOwner(""); setWhy(""); };
  return (
    <div className="mt-2 space-y-2 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <Pill value="No Fallback Available" tone="bad" /><Pill value="Process Stops" tone="bad" /><Pill value={d} tone={tone} />
        {a.gap_id && <span className="text-xs">Gap: <RecLink db={db} table="gaps" id={a.gap_id} /></span>}
        {a.approval_id && <span className="text-xs">Approval: <RecLink db={db} table="approvals" id={a.approval_id} /></span>}
        {a.rationale && <span className="text-xs text-muted-foreground">“{a.rationale}”{a.disposition_owner ? ` — ${a.disposition_owner}` : ""}</span>}
      </div>
      {d !== "Risk Accepted" && d !== "Not Applicable" && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Disposition (BCP Coordinator)">
          <span className="self-center text-[10px] font-semibold uppercase tracking-wider text-orange">BCP Coordinator:</span>
          {!a.gap_id && <Button size="sm" variant="orange" onClick={() => { createGapForAssessment(a.id); toast.success("Gap created and linked"); }}>Create Gap</Button>}
          {d !== "Risk Acceptance Pending" && <Button size="sm" variant="outline" onClick={() => setMode("accept")}>Accept Risk</Button>}
          <Button size="sm" variant="outline" onClick={() => { developFallback(a.id); if (!inWizard) nav({ to: "/build" }); }}>Develop Fallback</Button>
          <Button size="sm" variant="outline" onClick={() => setMode("na")}>Mark Not Applicable</Button>
        </div>
      )}
      {mode && (
        <div className="space-y-2 rounded border border-border bg-muted/40 p-2.5">
          <div className="text-xs font-semibold text-primary">{mode === "accept" ? "Accept risk — goes to an approver as Pending; capability is not marked ready." : "Mark not applicable — explain why no fallback is needed."}</div>
          <input aria-label="Disposition owner" className={inputCls} placeholder={mode === "accept" ? "Risk owner / approver (required)" : "Your name (optional)"} value={owner} onChange={(e) => setOwner(e.target.value)} />
          <textarea aria-label="Rationale" rows={2} className={inputCls} placeholder="Rationale (required)" value={why} onChange={(e) => setWhy(e.target.value)} />
          <div className="flex gap-2">
            <Button size="sm" variant="teal" disabled={!why.trim() || (mode === "accept" && !owner.trim())}
              onClick={() => { if (mode === "accept") { acceptRisk(a.id, owner, why); toast.success("Risk acceptance submitted — pending approval"); } else { markNotApplicable(a.id, why, owner); toast.success("Marked not applicable"); } reset(); }}>
              {mode === "accept" ? "Submit risk acceptance" : "Save not applicable"}</Button>
            <Button size="sm" variant="ghost" onClick={reset}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  );
}