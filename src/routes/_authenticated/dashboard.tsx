import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Meter, PageHeader, Panel, Pill, RecLink, tdCls, thCls } from "@/components/bcp/ui";
import { WarningList } from "@/components/bcp/WarningList";
import { overallReadiness, fallbackReadiness, computeWarnings, fallbacksFor, functionReadiness, isFallbackValidated, missingObjectives, processesOf, WARNING_LABEL, type WarningKind } from "@/lib/bcp/rules";
import { useDb } from "@/lib/bcp/store";
import { useDataActions } from "@/components/bcp/DataControls";
import { GettingStarted } from "@/components/bcp/GettingStarted";
import { NextBestAction } from "@/components/bcp/NextBestAction";
import { Button } from "@/components/ui/button";
import { EntityForm } from "@/components/bcp/EntityForm";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { FixAction } from "@/components/bcp/FixAction";
import { checkAction, missingAction } from "@/lib/bcp/actions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Readiness Dashboard — Continuity Compass BCP/DRP" }, { name: "description", content: "Recovery readiness, objectives, runbooks, testing, gaps and fallback readiness at a glance." }, { property: "og:title", content: "Readiness Dashboard — Continuity Compass BCP/DRP" }, { property: "og:description", content: "Business continuity readiness at a glance." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Dashboard,
});

function Stat({ label, value, sub, tone = "navy", link }: { label: string; value: ReactNode; sub?: ReactNode; tone?: "navy" | "teal" | "orange" | "bad"; link?: ReactNode }) {
  const c = { navy: "border-t-primary", teal: "border-t-teal", orange: "border-t-orange", bad: "border-t-destructive" }[tone];
  return <div className={cn("relative rounded-md border border-t-4 border-border bg-card p-4", link && "transition-colors hover:bg-accent/40", c)}>{link}<div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div><div className="num mt-1 text-3xl font-medium text-primary">{value}</div>{sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}</div>;
}
function Bars({ data }: { data: { label: string; value: number; tone?: string | undefined }[] }) {
  const sum = data.reduce((s, d) => s + d.value, 0);
  if (!sum) return <p className="py-2 text-sm text-muted-foreground">No records yet.</p>;
  const total = sum;
  return (
    <div>
      <div className="flex h-3 overflow-hidden rounded-full bg-muted">{data.map((d) => <div key={d.label} className={d.tone} style={{ width: `${(d.value / total) * 100}%` }} />)}</div>
      <ul className="mt-3 grid grid-cols-2 gap-1.5 text-sm">{data.map((d) => <li key={d.label} className="flex items-center gap-2"><span className={cn("h-2.5 w-2.5 rounded-sm", d.tone)} />{d.label}<span className="num ml-auto">{d.value}</span></li>)}</ul>
    </div>
  );
}

function Dashboard() {
  const db = useDb();
  const warnings = computeWarnings(db);
  const readiness = db.functions.map((f) => ({ f, r: functionReadiness(db, f) })).sort((a, b) => a.r.score - b.r.score);
  const avg = overallReadiness(db);
  const { setOpen, dialog } = useDataActions();
  if (!db.functions.length) return <GettingStarted />;
  const missing = missingObjectives(db);
  const cnt = (rows: { [k: string]: unknown }[], k: string, v: string) => rows.filter((r) => r[k] === v).length;
  const openGaps = db.gaps.filter((g) => g.status !== "Closed");
  const activeFb = db.fallbacks.filter((f) => f.status !== "Retired");
  const validated = activeFb.filter((f) => isFallbackValidated(f)).length;
  const crit = db.functions.filter((f) => f.criticality === "Critical" || f.criticality === "High");
  const covered = crit.filter((f) => fallbacksFor(db, "functions", f.id).length || processesOf(db, f.id).some((p) => fallbacksFor(db, "processes", p.id).length)).length;

  return (
    <>
      <PageHeader eyebrow={db.plans[0]?.name ?? "No plan yet"} title={<>Readiness Dashboard{db.mode === "demo" && <span className="ml-3 rounded border border-orange bg-orange/10 px-2 py-0.5 align-middle text-xs font-semibold uppercase tracking-wider text-orange">Demo Data</span>}</>} actions={<>{db.mode !== "demo" && <Button variant="outline" onClick={() => setOpen("demo")}>Load demo data</Button>}<Button variant="outline" onClick={() => setOpen("clear")}>{db.mode === "demo" ? "Exit demo / clear data" : "Clear all data"}</Button>{dialog}</>}><p className="mt-1 text-sm text-muted-foreground">{db.organizations[0]?.name ?? "No organization"} · {db.functions.length} functions · {db.processes.length} processes · {db.components.length} components</p></PageHeader>
      <NextBestAction />
      {(!db.processes.length || !db.components.length || !db.fallbacks.length) && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-md border border-teal/40 bg-accent/40 px-4 py-3 text-sm">
          <span className="font-semibold text-primary">Continue setup:</span>
          {!db.processes.length && <EntityForm table="processes" trigger={<Button size="sm" variant="teal"><Plus className="h-3.5 w-3.5" />Add Business Process</Button>} />}
          {!db.components.length && <EntityForm table="components" trigger={<Button size="sm" variant="outline"><Plus className="h-3.5 w-3.5" />Add Supporting Component</Button>} />}
          {!db.fallbacks.length && <EntityForm table="fallbacks" trigger={<Button size="sm" variant="outline"><Plus className="h-3.5 w-3.5" />Add Fallback</Button>} />}
          <span className="text-xs text-muted-foreground">Readiness is assessed once a function has processes.</span>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Overall readiness" value={avg === null ? "—" : `${avg}%`} sub={avg === null ? "Not yet assessed — add processes to a function" : "average across assessed functions"} tone="teal" />
        <Stat label="Active warnings" value={warnings.length} sub={`${warnings.filter((w) => w.severity === "high").length} high severity`} tone="bad" link={<Link to="/warnings" aria-label="View warnings" className="absolute inset-0 rounded-md" />} />
        <Stat label="Missing objectives" value={missing.length} sub="items without RTO/RPO/MTPD" tone="orange" link={<a href="#missing-objectives" aria-label="View missing objectives" className="absolute inset-0 rounded-md" />} />
        <Stat label="Open gaps" value={openGaps.length} sub={`${openGaps.filter((g) => g.due_date && g.due_date < new Date().toISOString().slice(0, 10)).length} overdue`} tone="orange" link={<Link to="/$type" params={{ type: "gaps" }} aria-label="View gaps" className="absolute inset-0 rounded-md" />} />
        <Stat label="Fallback readiness" value={activeFb.length ? `${Math.round((validated / activeFb.length) * 100)}%` : "—"} sub={activeFb.length ? `${validated}/${activeFb.length} validated · ${covered}/${crit.length} critical covered` : "Not yet assessed — no fallbacks recorded"} link={<Link to="/$type" params={{ type: "fallbacks" }} aria-label="View fallbacks" className="absolute inset-0 rounded-md" />} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel title="Readiness by business function" className="lg:col-span-2">
          <table className="w-full"><thead className="bg-muted/60"><tr>{["Function", "Criticality", "RTO", "Readiness", "Failing checks"].map((h) => <th key={h} className={thCls}>{h}</th>)}</tr></thead>
            <tbody>{readiness.map(({ f, r }) => (
              <tr key={f.id} className="border-t border-border"><td className={tdCls}><RecLink db={db} table="functions" id={f.id} /></td><td className={tdCls}><Pill value={f.criticality} /></td><td className={`${tdCls} num`}>{f.rto_h ?? "—"}h</td><td className={`${tdCls} w-44`}>{r.assessed ? <Meter value={r.score} /> : <span className="text-xs text-muted-foreground">Not yet assessed</span>}</td>
                <td className={`${tdCls} text-xs text-muted-foreground`}>{r.assessed ? (r.checks.some((c) => !c.ok) ? <ul className="space-y-1">{r.checks.filter((c) => !c.ok).map((c) => <li key={c.label} className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5"><span>{c.label}</span><FixAction size="xs" fix={checkAction(db, f, c.label)} /></li>)}</ul> : "—") : <span className="flex flex-wrap items-center gap-2">Add at least one process to assess<FixAction size="xs" fix={{ label: "Add process", table: "functions", id: f.id, tab: "Processes" }} /></span>}</td></tr>))}
            </tbody></table>
        </Panel>
        <Panel title="Warnings by type" action={<Link to="/warnings" className="text-xs text-teal hover:underline">View all</Link>}>
          <ul className="space-y-2">{(Object.keys(WARNING_LABEL) as WarningKind[]).map((k) => { const n = warnings.filter((w) => w.kind === k).length; return <li key={k} className="flex items-center justify-between text-sm"><span>{WARNING_LABEL[k]}</span><Pill value={n} tone={n ? "bad" : "good"} /></li>; })}</ul>
          <div className="mt-4"><WarningList db={db} warnings={warnings.filter((w) => w.severity === "high").slice(0, 4)} /></div>
        </Panel>

        <Panel title="Fallback readiness">
          <Bars data={["Validated", "Ready", "Draft", "Retired"].map((s, i) => ({ label: s, value: cnt(db.fallbacks, "status", s), tone: ["bg-success", "bg-teal", "bg-muted-foreground/40", "bg-border"][i] }))} />
          <div className="mt-4 space-y-1 text-sm">
            <div className="flex justify-between"><span>Tested & passed ≤ 12 months</span><span className="num">{validated}</span></div>
            <div className="flex justify-between"><span>Unvalidated</span><span className="num text-orange">{activeFb.length - validated}</span></div>
            <div className="flex justify-between"><span>Chained (secondary) fallbacks</span><span className="num">{activeFb.filter((f) => f.parent_id).length}</span></div>
            <div className="flex justify-between"><span>Average readiness score</span><span className="num">{activeFb.length ? `${Math.round(activeFb.reduce((s, f) => s + fallbackReadiness(db, f).score, 0) / activeFb.length)}%` : "Not yet assessed"}</span></div>
          </div>
          <ul className="mt-4 space-y-2 border-t border-border pt-3">{[...activeFb].sort((a, b) => fallbackReadiness(db, a).score - fallbackReadiness(db, b).score).map((f) => <li key={f.id} className="grid grid-cols-[1fr_7rem] items-center gap-2 text-sm"><RecLink db={db} table="fallbacks" id={f.id} /><Meter value={fallbackReadiness(db, f).score} /></li>)}</ul>
        </Panel>
        <Panel title="Runbook status"><Bars data={["Approved", "In Review", "Draft", "Outdated"].map((s, i) => ({ label: s, value: cnt(db.runbooks, "status", s), tone: ["bg-success", "bg-warning", "bg-muted-foreground/40", "bg-destructive"][i] }))} /></Panel>
        <Panel title="Testing status"><Bars data={["Pass", "Partial", "Fail", "Scheduled"].map((s, i) => ({ label: s, value: cnt(db.tests, "result", s), tone: ["bg-success", "bg-warning", "bg-destructive", "bg-teal"][i] }))} /></Panel>

        <Panel title="Missing recovery objectives" className="scroll-mt-4 lg:col-span-2" id="missing-objectives">
          <div className="overflow-x-auto"><table className="w-full"><thead className="bg-muted/60"><tr>{["Item", "Level", "Missing", "Action"].map((h) => <th key={h} className={cn(thCls, h === "Level" && "hidden sm:table-cell")}>{h}</th>)}</tr></thead>
            <tbody>{missing.map((m) => <tr key={m.id} className="border-t border-border"><td className={tdCls}><RecLink db={db} table={m.table} id={m.id} /></td><td className={cn(tdCls, "hidden sm:table-cell")}>{{ functions: "L1 Function", processes: "L2 Process", components: "L3 Component" }[m.table as string]}</td><td className={tdCls}><span className="flex gap-1">{m.missing.map((x) => <Pill key={x} value={x} tone="warn" />)}</span></td><td className={`${tdCls} whitespace-nowrap`}><FixAction size="xs" fix={missingAction(m)} /></td></tr>)}
              {!missing.length && <tr><td colSpan={4} className="py-4 text-center text-sm text-muted-foreground">All objectives defined.</td></tr>}</tbody></table></div>
        </Panel>
        <Panel title="Open gaps" action={<Link to="/$type" params={{ type: "gaps" }} className="text-xs text-teal hover:underline">Manage</Link>}>
          <ul className="space-y-2">{openGaps.map((g) => <li key={g.id} className="flex items-start justify-between gap-2 text-sm"><div><RecLink db={db} table="gaps" id={g.id} /><div className="text-xs text-muted-foreground">{g.owner} · due <span className="num">{g.due_date}</span></div></div><Pill value={g.severity} /></li>)}{!openGaps.length && <li className="text-sm text-muted-foreground">No open gaps.</li>}</ul>
        </Panel>
      </div>
    </>
  );
}