/* eslint-disable @typescript-eslint/no-explicit-any */
import { Link, useLocation } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { type TableName, tableDef } from "@/lib/bcp/schema";
import { titleOf } from "@/lib/bcp/store";
import type { Db } from "@/lib/bcp/schema";
import { helpTopicForPath } from "@/lib/bcp/manual";
import { HelpLink } from "./HelpLink";

const TONE: Record<string, string> = {
  good: "bg-success/12 text-success border-success/30",
  warn: "bg-warning/15 text-orange border-warning/40",
  bad: "bg-destructive/10 text-destructive border-destructive/30",
  info: "bg-accent text-accent-foreground border-teal/30",
  neutral: "bg-muted text-muted-foreground border-border",
  navy: "bg-primary/10 text-primary border-primary/20",
};
const VALUE_TONE: Record<string, keyof typeof TONE> = {
  Approved: "good", Validated: "good", Pass: "good", Closed: "good", Ready: "info",
  "In Review": "warn", "In Progress": "warn", Partial: "warn", Pending: "warn", Scheduled: "info", Draft: "neutral", "Not tested": "neutral",
  Rejected: "bad", Fail: "bad", Outdated: "bad", Open: "bad", Retired: "neutral", Withdrawn: "neutral", "Withdrawn — Superseded by Fallback Development": "neutral", "Risk Accepted — Superseded by Fallback Development": "neutral",
  Critical: "bad", High: "warn", Medium: "info", Low: "neutral",
};
export function Pill({ value, tone }: { value: ReactNode; tone?: keyof typeof TONE }) {
  if (value === "" || value === null || value === undefined) return <span className="text-muted-foreground">—</span>;
  const t = tone ?? VALUE_TONE[String(value)] ?? "navy";
  return <span className={cn("inline-flex items-center whitespace-nowrap rounded border px-1.5 py-0.5 text-[11px] font-medium", TONE[t] ?? TONE.navy)}>{value}</span>;
}

export function RecLink({ db, table, id }: { db: Db; table: TableName; id?: string | undefined }) {
  if (!id) return <span className="text-muted-foreground">—</span>;
  const r = db[table].find((x) => x.id === id);
  if (!r) return <span className="text-muted-foreground">(missing)</span>;
  if (tableDef(table).hidden) return <span>{titleOf(table, r)}</span>;
  return <Link to="/$type/$id" params={{ type: table, id }} className="font-medium text-primary hover:text-teal hover:underline">{titleOf(table, r)}</Link>;
}

export function FieldValue({ db, field, rec }: { db: Db; field: any; rec: any }) {
  const v = rec[field.key];
  if (field.type === "ref") return <RecLink db={db} table={field.ref} id={v} />;
  if (field.type === "target") return <span className="inline-flex flex-wrap items-center gap-1.5"><Pill value={tableDef(v as TableName)?.singular ?? v} tone="neutral" /><RecLink db={db} table={v} id={rec.target_id} /></span>;
  if (field.type === "select") return <Pill value={v} />;
  if (field.type === "number") return v === "" || v === null || v === undefined ? <span className="text-orange">not set</span> : <span className="num">{v}</span>;
  if (!v) return <span className="text-muted-foreground">—</span>;
  return <span className="whitespace-pre-wrap">{String(v)}</span>;
}

export function PageHeader({ eyebrow, title, actions, children }: { eyebrow?: ReactNode; title: ReactNode; actions?: ReactNode; children?: ReactNode }) {
  const location = useLocation();
  const helpTopic = helpTopicForPath(location.pathname, typeof location.search.tab === "string" ? location.search.tab : undefined);
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-4">
      <div>
        {eyebrow && <div className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-teal">{eyebrow}</div>}
        <h1 className="text-2xl font-semibold tracking-tight text-primary">{title}</h1>
        {children}
      </div>
      {(actions || helpTopic) && <div className="flex flex-wrap gap-2">{helpTopic && <HelpLink topic={helpTopic} />}{actions}</div>}
    </div>
  );
}

export function Panel({ title, action, children, className, id }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={cn("min-w-0 rounded-md border border-border bg-card shadow-[0_1px_2px_color-mix(in_oklab,var(--primary)_8%,transparent)]", className)}>
      {title && <header className="flex items-center justify-between border-b border-border px-4 py-2.5"><h2 className="text-sm font-semibold text-primary">{title}</h2>{action}</header>}
      <div className="overflow-x-auto p-4">{children}</div>
    </section>
  );
}

export function Meter({ value }: { value: number }) {
  const tone = value >= 80 ? "bg-success" : value >= 50 ? "bg-warning" : "bg-destructive";
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-full min-w-16 overflow-hidden rounded-full bg-muted"><div className={cn("h-full rounded-full", tone)} style={{ width: `${value}%` }} /></div>
      <span className="num w-9 text-right text-xs">{value}%</span>
    </div>
  );
}

export const thCls = "px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground";
export const tdCls = "px-3 py-2 align-top text-sm";