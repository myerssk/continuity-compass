/* eslint-disable @typescript-eslint/no-explicit-any */
import { useNavigate } from "@tanstack/react-router";
import { AlertTriangle, ArrowLeft, ArrowRight, Info, Save } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import type { StageId } from "@/lib/bcp/schema";
import { useDb } from "@/lib/bcp/store";
import { type Role, STAGES, setDraft, setStage, stageIndex } from "@/lib/bcp/wizard";
import { cn } from "@/lib/utils";

export const inputCls = "w-full rounded border border-input bg-card px-2.5 py-1.5 text-sm outline-none focus:border-teal focus:ring-2 focus:ring-ring/30";

const ROLE_TONE: Record<Role, string> = {
  "Business Owner": "border-primary/30 bg-primary/10 text-primary",
  "Process Owner": "border-teal/40 bg-accent text-accent-foreground",
  "Technical Owner": "border-border bg-muted text-foreground",
  "BCP Coordinator": "border-orange/40 bg-orange/10 text-orange",
  Approver: "border-success/40 bg-success/10 text-success",
};
export function RoleTag({ role }: { role: Role }) {
  return <span className={cn("inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider", ROLE_TONE[role])}>{role}</span>;
}

/** A plain-language question with an optional inline explanation of the term and the intended contributor. */
export function Q({ label, help, role, children, wide, required, group }: { label: ReactNode; help?: ReactNode; role?: Role; children: ReactNode; wide?: boolean; required?: boolean; group?: boolean }) {
  const Tag = group ? "div" : "label";
  return (
    <Tag className={cn("block", wide && "sm:col-span-2")} {...(group ? { role: "group" } : {})}>
      <span className="mb-1 flex flex-wrap items-center gap-2 text-sm font-medium text-primary">{label}{required && <span className="text-orange">*</span>}{role && <RoleTag role={role} />}</span>
      {children}
      {help && <span className="mt-1 block text-xs text-muted-foreground">{help}</span>}
    </Tag>
  );
}
export function Text({ v, k, set, ...p }: { v: Record<string, any>; k: string; set: (k: string, x: any) => void; type?: string; placeholder?: string }) {
  return <input aria-label={k} className={inputCls} type={p.type ?? "text"} step="any" placeholder={p.placeholder} value={v[k] ?? ""} onChange={(e) => set(k, e.target.value)} />;
}
export function Area({ v, k, set, placeholder }: { v: Record<string, any>; k: string; set: (k: string, x: any) => void; placeholder?: string }) {
  return <textarea aria-label={k} rows={2} className={inputCls} placeholder={placeholder} value={v[k] ?? ""} onChange={(e) => set(k, e.target.value)} />;
}
export function Sel({ v, k, set, options }: { v: Record<string, any>; k: string; set: (k: string, x: any) => void; options: readonly string[] }) {
  return <select aria-label={k} className={inputCls} value={v[k] ?? ""} onChange={(e) => set(k, e.target.value)}>{options.map((o) => <option key={o}>{o}</option>)}</select>;
}

/** Form values persisted as a wizard draft on every change, so partial work survives refresh. */
export function useDraft(key: string, initial: Record<string, any>) {
  const db = useDb();
  const vals = db.wizard?.drafts[key] ?? initial;
  const set = (k: string, x: any) => setDraft(key, { ...vals, [k]: x });
  return [vals, set] as const;
}

export function Callout({ tone = "info", title, children }: { tone?: "info" | "warn" | "bad" | "good"; title?: ReactNode; children: ReactNode }) {
  const c = { info: "border-teal/40 bg-accent/40", warn: "border-warning/50 bg-warning/10", bad: "border-destructive/40 bg-destructive/5", good: "border-success/40 bg-success/10" }[tone];
  const Icon = tone === "info" || tone === "good" ? Info : AlertTriangle;
  return (
    <div className={cn("flex gap-2.5 rounded-md border p-3 text-sm", c)}>
      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", tone === "warn" ? "text-orange" : tone === "bad" ? "text-destructive" : tone === "good" ? "text-success" : "text-teal")} />
      <div className="min-w-0 flex-1">{title && <div className="font-semibold text-primary">{title}</div>}{children}</div>
    </div>
  );
}

export function DraftBadge() {
  return <span className="inline-flex items-center rounded border border-orange bg-orange/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-orange">Draft · Review required</span>;
}

/** Back / Save & Exit / Continue. `onContinue` returns false to stay on the stage. */
export function StageNav({ stage, onContinue, canContinue = true, continueLabel = "Continue", hint }: { stage: StageId; onContinue?: () => boolean | void; canContinue?: boolean; continueLabel?: string; hint?: ReactNode }) {
  const nav = useNavigate();
  const i = stageIndex(stage);
  const next = STAGES[i + 1]?.id;
  return (
    <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-border pt-4">
      <Button variant="outline" disabled={i === 0} onClick={() => setStage(STAGES[i - 1]!.id)}><ArrowLeft />Back</Button>
      <Button variant="ghost" onClick={() => nav({ to: "/dashboard" })}><Save />Save &amp; Exit</Button>
      <div className="ml-auto flex items-center gap-3">
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
        <Button variant="teal" disabled={!canContinue} onClick={() => { if (onContinue?.() === false) return; if (next) setStage(next); }}>{continueLabel}<ArrowRight /></Button>
      </div>
    </div>
  );
}