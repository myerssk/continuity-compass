import { Link } from "@tanstack/react-router";
import { Check, FlaskConical, Lock, Plus } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import type { TableName } from "@/lib/bcp/schema";
import { recordCount, useDb } from "@/lib/bcp/store";
import { cn } from "@/lib/utils";
import { useDataActions } from "./DataControls";
import { EntityForm } from "./EntityForm";
import { PageHeader, Panel } from "./ui";
import { NextBestAction } from "./NextBestAction";

interface Step { n: number; table: TableName; title: string; text: string; needs?: string; ready: boolean; done: boolean; defaults?: Record<string, string> }

/** Empty-state dashboard: zero counts and a prerequisite-ordered setup path. */
export function GettingStarted() {
  const db = useDb();
  const { setOpen, dialog } = useDataActions();
  const org = db.organizations[0];
  const plan = db.plans[0];
  const steps: Step[] = [
    { n: 1, table: "organizations", title: "Create Organization", text: "The legal entity or business unit the plan covers.", ready: true, done: db.organizations.length > 0 },
    { n: 2, table: "plans", title: "Create Plan", text: "A versioned BCP/DRP plan with owner and review date.", needs: "an organization", ready: !!org, done: db.plans.length > 0, ...(org ? { defaults: { organization_id: org.id } } : {}) },
    { n: 3, table: "functions", title: "Add Business Function", text: "Level 1: owner, criticality, MTPD, business RTO/RPO.", needs: "a plan", ready: !!plan, done: db.functions.length > 0, ...(plan ? { defaults: { plan_id: plan.id } } : {}) },
    { n: 4, table: "processes", title: "Add Business Process", text: "Level 2: inputs, outputs, workaround, recovery sequence.", needs: "a business function", ready: db.functions.length > 0, done: db.processes.length > 0 },
    { n: 5, table: "components", title: "Add Supporting Component", text: "Level 3: application, infrastructure, vendor… with technical RTO/RPO.", needs: "a business function", ready: db.functions.length > 0, done: db.components.length > 0 },
    { n: 6, table: "fallbacks", title: "Add Fallback", text: "Primary and chained fallbacks with activation criteria and capacity.", needs: "a function, process or component", ready: db.functions.length > 0, done: db.fallbacks.length > 0 },
  ];
  const counts: [string, number][] = [["Organizations", db.organizations.length], ["Plans", db.plans.length], ["Functions", db.functions.length], ["Processes", db.processes.length], ["Components", db.components.length], ["Fallbacks", db.fallbacks.length], ["Runbooks", db.runbooks.length], ["Tests", db.tests.length], ["Gaps", db.gaps.length]];
  const next = steps.find((s) => !s.done && s.ready);

  return (
    <>
      <PageHeader eyebrow="Getting started" title="Readiness Dashboard"
        actions={<><Button variant="outline" onClick={() => setOpen("demo")}><FlaskConical className="h-4 w-4 text-orange" />Load demo data</Button>{recordCount(db) > 0 && <Button variant="outline" onClick={() => setOpen("clear")}>Clear all data</Button>}{dialog}</>}>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Readiness is <b>not yet assessed</b>. Build your plan in the order below; warnings and scores appear once business functions and their processes exist.</p>
      </PageHeader>

      <NextBestAction />
      <Button asChild variant="outline" className="mb-4"><Link to="/quick-start"><Check />Quick Start Manual</Link></Button>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-9">
        {counts.map(([l, v]) => (
          <div key={l} className="rounded-md border border-border bg-card px-3 py-2"><div className="truncate text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{l}</div><div className="num text-2xl text-primary">{v}</div></div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel title="Or set up records manually" className="lg:col-span-2">
          <ol className="space-y-2">
            {steps.map((s) => (
              <li key={s.n} className={cn("flex flex-wrap items-center gap-3 rounded border p-3", s === next ? "border-teal bg-accent/40" : "border-border", !s.ready && "opacity-60")}>
                <span className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-semibold", s.done ? "bg-success text-primary-foreground" : s.ready ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>{s.done ? <Check className="h-4 w-4" /> : s.n}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-primary">{s.title}{s.done && <span className="ml-2 text-xs font-normal text-success">done</span>}</div>
                  <div className="text-xs text-muted-foreground">{s.ready ? s.text : <span className="inline-flex items-center gap-1"><Lock className="h-3 w-3" />Requires {s.needs} first</span>}</div>
                </div>
                {s.ready ? (
                  <EntityForm table={s.table} defaults={s.defaults} trigger={<Button size="sm" variant={s === next ? "teal" : "outline"}><Plus className="h-3.5 w-3.5" />{s.title}</Button>} />
                ) : <Button size="sm" variant="outline" disabled>{s.title}</Button>}
              </li>
            ))}
          </ol>
        </Panel>
        <div className="space-y-4">
          <Panel title="Status">
            <dl className="space-y-2 text-sm">
              {([["Overall readiness", "Not yet assessed"], ["Warnings", "None — nothing to check yet"], ["Fallback readiness", "Not yet assessed"], ["Open gaps", "0"]] as [string, ReactNode][]).map(([k, v]) => <div key={k} className="flex justify-between gap-2"><dt className="text-muted-foreground">{k}</dt><dd className="text-right font-medium">{v}</dd></div>)}
            </dl>
          </Panel>
          <Panel title="Just evaluating?">
            <p className="text-sm text-muted-foreground">Load a fictional training dataset to explore every dashboard and warning. It is clearly labelled as demo data and can be cleared at any time.</p>
            <Button className="mt-3" variant="orange" onClick={() => setOpen("demo")}><FlaskConical className="h-4 w-4" />Load demo data</Button>
            <div className="mt-3 text-xs text-muted-foreground">Or browse the empty registers: <Link to="/$type" params={{ type: "functions" }} className="text-teal underline">Business Functions</Link>, <Link to="/$type" params={{ type: "fallbacks" }} className="text-teal underline">Fallbacks</Link>.</div>
          </Panel>
        </div>
      </div>
    </>
  );
}