import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDb } from "@/lib/bcp/store";
import { nextBestAction, setStage, startWizard } from "@/lib/bcp/wizard";

/** Dashboard card: the most important incomplete item, with a Continue button into the right wizard stage. */
export function NextBestAction() {
  const db = useDb();
  const nav = useNavigate();
  const a = nextBestAction(db);
  const go = () => {
    if (a?.resume) setStage(a.stage);
    else if (a) startWizard(a.functionId, a.stage);
    nav({ to: "/build" });
  };
  return (
    <div className="mb-4 flex flex-wrap items-center gap-4 rounded-md border border-teal/50 bg-gradient-to-r from-primary to-primary/90 p-4 text-primary-foreground">
      <div className="grid h-10 w-10 place-items-center rounded bg-teal text-teal-foreground"><Compass className="h-5 w-5" /></div>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-teal">Next best action</div>
        <div className="text-base font-semibold">{a ? a.title : "Every function has been through the guided workflow"}</div>
        <div className="text-sm opacity-80">{a ? a.reason : "Use Build My BCP/DRP to add another business function."}</div>
      </div>
      <Button variant="orange" size="lg" onClick={a ? go : () => nav({ to: "/build" })}>{a ? a.cta : "Build My BCP/DRP"}<ArrowRight /></Button>
    </div>
  );
}