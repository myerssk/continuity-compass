/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, CheckCircle2, ChevronRight, Pencil, Trash2, XCircle } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { FixAction } from "@/components/bcp/FixAction";
import { checkAction } from "@/lib/bcp/actions";
import { Button } from "@/components/ui/button";
import { AuditTable } from "@/components/bcp/AuditTable";
import { EntityForm } from "@/components/bcp/EntityForm";
import { RecordTable } from "@/components/bcp/RecordTable";
import { FieldValue, Meter, PageHeader, Panel, Pill, RecLink, tdCls, thCls } from "@/components/bcp/ui";
import { WarningList } from "@/components/bcp/WarningList";
import { DispositionActions } from "@/components/bcp/Disposition";
import { COVERAGE_LABEL, assessmentFor, fallbackCoverage } from "@/lib/bcp/rules";
import { type Db, type Rec, type TableName, isTable, tableDef } from "@/lib/bcp/schema";
import { fallbackReadiness, componentsOfFunction, computeWarnings, functionReadiness, functionsUsingComponent, isFallbackValidated, primaryDependencies, upstreamOf, warningsFor } from "@/lib/bcp/rules";
import { deleteRec, titleOf, updateRec, useDb } from "@/lib/bcp/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/$type/$id")({
  validateSearch: (s: Record<string, unknown>): { tab?: string | undefined } => ({ tab: typeof s.tab === "string" ? s.tab : undefined }),
  beforeLoad: ({ params }) => { if (!isTable(params.type)) throw notFound(); },
  head: ({ params }) => {
    const l = isTable(params.type) ? tableDef(params.type).singular : "Record";
    return { meta: [{ title: `${l} detail — Continuity Compass` }, { name: "description", content: `${l} detail with recovery, fallbacks, tests and history.` }, { property: "og:title", content: `${l} detail — Continuity Compass` }, { property: "og:description", content: `${l} detail.` }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] };
  },
  component: DetailPage,
});

const LEVEL_TABS = ["Overview", "Processes", "Dependencies", "Fallbacks", "Recovery", "Runbooks", "Tests", "Evidence", "Gaps", "History"];

function DetailPage() {
  const { type, id } = Route.useParams();
  const db = useDb();
  const nav = useNavigate();
  const search = Route.useSearch();
  const [tab, setTabState] = useState(search.tab ?? "Overview");
  useEffect(() => { if (search.tab) setTabState(search.tab); }, [search.tab, id]);
  const setTab = (t: string) => { setTabState(t); nav({ to: "/$type/$id", params: { type, id }, search: { tab: t === "Overview" ? undefined : t }, replace: true }); };
  if (!isTable(type)) return null;
  const table = type as TableName;
  const def = tableDef(table);
  const rec = db[table].find((r) => r.id === id);
  if (!rec) return <Panel><p className="text-sm text-muted-foreground">This record no longer exists. <Link to="/$type" params={{ type }} className="text-teal underline">Back to {def.label}</Link></p></Panel>;

  const isLevel = table === "functions" || table === "processes" || table === "components";
  const tabs = isLevel ? LEVEL_TABS
    : table === "fallbacks" ? ["Overview", "Chain", "Dependencies", "Tests", "Evidence", "Gaps", "History"]
    : table === "runbooks" ? ["Overview", "Steps", "History"] : ["Overview", "History"];
  const target = { target_type: table, target_id: id };
  const attached = (t: "fallbacks" | "strategies" | "runbooks" | "tests" | "evidence" | "gaps" | "approvals") => db[t].filter((r) => r.target_type === table && r.target_id === id);
  const warnings = warningsFor(db, table, id, computeWarnings(db));

  const content: Record<string, () => ReactNode> = {
    Overview: () => <Overview db={db} table={table} rec={rec} warnings={warnings} approvals={attached("approvals")} target={target} />,
    Processes: () => <ProcessesTab db={db} table={table} rec={rec} />,
    Dependencies: () => <DependenciesTab db={db} table={table} rec={rec} />,
    Fallbacks: () => <Panel title="Fallbacks & chains">{(() => { const as = assessmentFor(db, table, id); const cov = ["functions", "processes", "components"].includes(table) ? fallbackCoverage(db, table, id) : null; return cov && <div className="mb-4 rounded border border-border bg-muted/30 p-3 text-sm"><span className="font-semibold text-primary">Fallback coverage:</span> {COVERAGE_LABEL[cov]}{as?.fallback_status === "No Fallback Available" && !attached("fallbacks").length && <DispositionActions assessmentId={as.id} />}</div>; })()}<FallbackTree db={db} rows={attached("fallbacks")} /><div className="mt-4" /><RecordTable table="fallbacks" rows={attached("fallbacks")} defaults={target} emptyText="No fallback defined." extra={{ label: "Readiness", render: (f) => <Meter value={fallbackReadiness(db, f).score} /> }} /></Panel>,
    Recovery: () => <Panel title="Recovery strategies"><RecordTable table="strategies" rows={attached("strategies")} defaults={target} /></Panel>,
    Runbooks: () => <Panel title="Runbooks"><RecordTable table="runbooks" rows={attached("runbooks")} defaults={target} /></Panel>,
    Tests: () => <Panel title="Tests & exercises"><RecordTable table="tests" rows={attached("tests")} defaults={target} /></Panel>,
    Evidence: () => <Panel title="Evidence"><RecordTable table="evidence" rows={attached("evidence")} defaults={target} /></Panel>,
    Gaps: () => <Panel title="Gaps & corrective actions"><RecordTable table="gaps" rows={attached("gaps")} defaults={target} /></Panel>,
    Chain: () => <ChainTab db={db} rec={rec} />,
    Steps: () => <StepsTab db={db} rec={rec} />,
    History: () => <Panel title="Audit history"><AuditTable db={db} rows={db.audit_log.filter((a) => a.record_id === id || (a.table !== table && db[a.table]?.find((r: Rec) => r.id === a.record_id && (r.target_id === id || r.runbook_id === id || r.process_id === id || r.fallback_id === id || r.function_id === id))))} /></Panel>,
  };
  const count: Record<string, number | undefined> = {
    Fallbacks: attached("fallbacks").length, Recovery: attached("strategies").length, Runbooks: attached("runbooks").length,
    Tests: attached("tests").length, Evidence: attached("evidence").length, Gaps: attached("gaps").filter((g) => g.status !== "Closed").length,
    Processes: table === "functions" ? db.processes.filter((p) => p.function_id === id).length : undefined,
    Steps: table === "runbooks" ? db.runbook_steps.filter((s) => s.runbook_id === id).length : undefined,
  };

  return (
    <>
      <div className="mb-2 flex items-center gap-1 text-xs text-muted-foreground">
        <Link to="/$type" params={{ type }} className="hover:text-teal">{def.label}</Link><ChevronRight className="h-3 w-3" /><span>{titleOf(table, rec)}</span>
      </div>
      <PageHeader eyebrow={def.level ? `Level ${def.level} · ${def.singular}` : def.singular} title={<>{rec.code && <span className="num mr-2 text-base text-muted-foreground">{rec.code}</span>}{titleOf(table, rec)}</>}
        actions={<>
          <EntityForm table={table} record={rec} trigger={<Button variant="outline"><Pencil className="h-4 w-4" />Edit</Button>} />
          <Button variant="outline" className="text-destructive" onClick={() => { if (confirm(`Delete this ${def.singular}?`)) { deleteRec(table, id); nav({ to: "/$type", params: { type } }); } }}><Trash2 className="h-4 w-4" />Delete</Button>
        </>}>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {["criticality", "approval_status", "status", "type", "result", "decision", "severity"].filter((k) => rec[k]).map((k) => <Pill key={k} value={rec[k]} />)}
          {warnings.length > 0 && <Pill value={`${warnings.length} warning${warnings.length > 1 ? "s" : ""}`} tone="warn" />}
        </div>
      </PageHeader>
      <div className="mb-4 flex gap-0.5 overflow-x-auto border-b border-border">
        {tabs.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={cn("-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm", tab === t ? "border-orange font-semibold text-primary" : "border-transparent text-muted-foreground hover:text-primary")}>
            {t}{count[t] ? <span className="num ml-1.5 rounded bg-muted px-1 text-[10px]">{count[t]}</span> : null}
          </button>
        ))}
      </div>
      {(content[tabs.includes(tab) ? tab : "Overview"] ?? content.Overview!)()}
    </>
  );
}

function Overview({ db, table, rec, warnings, approvals, target }: { db: Db; table: TableName; rec: Rec; warnings: any[]; approvals: Rec[]; target: any }) {
  const def = tableDef(table);
  const readiness = table === "functions" ? functionReadiness(db, rec) : table === "fallbacks" ? fallbackReadiness(db, rec) : null;
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Panel title="Details" className="lg:col-span-2">
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
          {def.fields.filter((f) => f.key !== "target_id").map((f) => (
            <div key={f.key} className={f.type === "textarea" ? "sm:col-span-2" : ""}>
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{f.label}</dt>
              <dd className="mt-0.5 text-sm"><FieldValue db={db} field={f} rec={rec} /></dd>
            </div>
          ))}
        </dl>
      </Panel>
      <div className="space-y-4">
        {readiness && (
          <Panel title={table === "fallbacks" ? "Fallback readiness" : "Recovery readiness"}>
            <Meter value={readiness.score} />
            <ul className="mt-3 space-y-1">{readiness.checks.map((c) => <li key={c.label} className="flex items-center gap-2 text-sm">{c.ok ? <CheckCircle2 className="h-4 w-4 shrink-0 text-success" /> : <XCircle className="h-4 w-4 shrink-0 text-destructive" />}<span className="flex-1">{c.label}</span>{!c.ok && table === "functions" && <FixAction size="xs" fix={checkAction(db, rec, c.label)} />}</li>)}</ul>
          </Panel>
        )}
        <Panel title="Warnings"><WarningList db={db} warnings={warnings} /></Panel>
        {["functions", "processes", "components", "fallbacks", "runbooks"].includes(table) && (
          <Panel title="Approvals"><RecordTable table="approvals" rows={approvals} defaults={target} addLabel="Request approval" /></Panel>
        )}
      </div>
    </div>
  );
}

function ProcessesTab({ db, table, rec }: { db: Db; table: TableName; rec: Rec }) {
  if (table === "functions") return <Panel title="Level 2 processes (by recovery sequence)"><RecordTable table="processes" rows={db.processes.filter((p) => p.function_id === rec.id)} defaults={{ function_id: rec.id }} sortKey="recovery_sequence" /></Panel>;
  if (table === "processes") return <Panel title={<>Sibling processes in <RecLink db={db} table="functions" id={rec.function_id} /></>}><RecordTable noAdd table="processes" rows={db.processes.filter((p) => p.function_id === rec.function_id)} sortKey="recovery_sequence" /></Panel>;
  const links = db.process_components.filter((l) => l.component_id === rec.id);
  return (
    <Panel title="Processes supported by this component">
      <table className="w-full"><thead className="bg-muted/60"><tr>{["Process", "Business function", "Criticality", "Business RTO", "Technical RTO"].map((h) => <th key={h} className={thCls}>{h}</th>)}</tr></thead>
        <tbody>{links.map((l) => { const p = db.processes.find((x) => x.id === l.process_id); const f = db.functions.find((x) => x.id === p?.function_id); const bad = f && rec.tech_rto_h != null && f.rto_h != null && rec.tech_rto_h > f.rto_h; return (
          <tr key={l.id} className="border-t border-border"><td className={tdCls}><RecLink db={db} table="processes" id={p?.id} /></td><td className={tdCls}><RecLink db={db} table="functions" id={f?.id} /></td><td className={tdCls}><Pill value={f?.criticality} /></td><td className={`${tdCls} num`}>{f?.rto_h ?? "—"}h</td><td className={cn(tdCls, "num", bad && "font-semibold text-destructive")}>{rec.tech_rto_h ?? "—"}h{bad && " ⚠"}</td></tr>); })}
          {!links.length && <tr><td colSpan={5} className="py-6 text-center text-sm text-muted-foreground">Not linked to any process. Link it from a process's Dependencies tab.</td></tr>}
        </tbody></table>
    </Panel>
  );
}

function DependenciesTab({ db, table, rec }: { db: Db; table: TableName; rec: Rec }) {
  if (table === "functions") {
    const comps = componentsOfFunction(db, rec.id);
    return (
      <Panel title="Supporting components (via processes)">
        <table className="w-full"><thead className="bg-muted/60"><tr>{["Component", "Type", "Technical owner", "Technical RTO vs Business RTO", "Technical RPO", "Failover"].map((h) => <th key={h} className={thCls}>{h}</th>)}</tr></thead>
          <tbody>{comps.map((c) => { const bad = c.tech_rto_h != null && rec.rto_h != null && c.tech_rto_h > rec.rto_h; return (
            <tr key={c.id} className="border-t border-border"><td className={tdCls}><RecLink db={db} table="components" id={c.id} /></td><td className={tdCls}><Pill value={c.type} tone="navy" /></td><td className={tdCls}>{c.technical_owner}</td>
              <td className={cn(tdCls, "num", bad && "font-semibold text-destructive")}>{c.tech_rto_h ?? <span className="text-orange">not set</span>}h / {rec.rto_h ?? "?"}h {bad && <Pill value="Exceeds" tone="bad" />}</td><td className={`${tdCls} num`}>{c.tech_rpo_h ?? "—"}</td><td className={tdCls}>{c.failover_method}</td></tr>); })}
            {!comps.length && <tr><td colSpan={6} className="py-6 text-center text-sm text-muted-foreground">No components linked to this function's processes.</td></tr>}
          </tbody></table>
      </Panel>
    );
  }
  if (table === "processes") return <Panel title="Components this process depends on"><RecordTable table="process_components" rows={db.process_components.filter((l) => l.process_id === rec.id)} defaults={{ process_id: rec.id }} addLabel="Link component" extra={{ label: "Technical RTO", render: (l) => <span className="num">{db.components.find((c) => c.id === l.component_id)?.tech_rto_h ?? "—"}h</span> }} /></Panel>;
  if (table === "fallbacks") {
    const primary = primaryDependencies(db, rec.target_type, rec.target_id);
    return (
      <Panel title="Components this fallback relies on">
        <RecordTable table="fallback_dependencies" rows={db.fallback_dependencies.filter((d) => d.fallback_id === rec.id)} defaults={{ fallback_id: rec.id }} addLabel="Add dependency"
          extra={{ label: "Shared with primary path?", render: (d) => { const shared = [d.component_id, ...upstreamOf(db, d.component_id)].filter((x) => primary.has(x)); return shared.length ? <Pill value={`Shared: ${shared.map((x) => db.components.find((c) => c.id === x)?.name).join(", ")}`} tone="bad" /> : <Pill value="Independent" tone="good" />; } }} />
      </Panel>
    );
  }
  const upstream = [...upstreamOf(db, rec.id)];
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Panel title="Depends on (direct)"><RecordTable table="component_dependencies" rows={db.component_dependencies.filter((d) => d.component_id === rec.id)} defaults={{ component_id: rec.id }} addLabel="Add dependency" /></Panel>
      <Panel title="Dependency map">
        <div className="text-xs font-semibold uppercase text-muted-foreground">Transitive upstream</div>
        <div className="mt-1 flex flex-wrap gap-1.5">{upstream.length ? upstream.map((u) => <RecLink key={u} db={db} table="components" id={u} />) : <span className="text-sm text-muted-foreground">None</span>}</div>
        <div className="mt-4 text-xs font-semibold uppercase text-muted-foreground">Depended on by</div>
        <div className="mt-1 flex flex-wrap gap-2">{db.component_dependencies.filter((d) => d.depends_on_id === rec.id).map((d) => <RecLink key={d.id} db={db} table="components" id={d.component_id} />)}</div>
        <div className="mt-4 text-xs font-semibold uppercase text-muted-foreground">Business functions impacted</div>
        <div className="mt-1 flex flex-wrap gap-2">{functionsUsingComponent(db, rec.id).map((f) => <RecLink key={f.id} db={db} table="functions" id={f.id} />)}</div>
      </Panel>
    </div>
  );
}

function FallbackTree({ db, rows }: { db: Db; rows: Rec[] }) {
  const ids = new Set(rows.map((r) => r.id));
  const roots = rows.filter((r) => !r.parent_id || !ids.has(r.parent_id));
  const node = (f: Rec, depth: number): ReactNode => (
    <div key={f.id}>
      <div className="flex items-center gap-2 py-1" style={{ paddingLeft: depth * 24 }}>
        <span className="num grid h-5 w-5 place-items-center rounded-full bg-primary text-[10px] text-primary-foreground">{depth + 1}</span>
        <RecLink db={db} table="fallbacks" id={f.id} />{f.status !== "Validated" && <Pill value={f.status} />}
        {isFallbackValidated(f) ? <Pill value="Validated" tone="good" /> : <Pill value="Unvalidated" tone="warn" />}
        <span className="num text-xs text-muted-foreground">{f.capacity_pct ?? "?"}% capacity · max {f.max_duration_h ?? "?"}h</span>
      </div>
      {rows.filter((c) => c.parent_id === f.id).map((c) => node(c, depth + 1))}
    </div>
  );
  if (!rows.length) return null;
  return <div className="rounded border border-dashed border-teal/40 bg-accent/30 p-3"><div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-teal">Activation chain</div>{roots.map((r) => node(r, 0))}</div>;
}

function ChainTab({ db, rec }: { db: Db; rec: Rec }) {
  const siblings = db.fallbacks.filter((f) => f.target_type === rec.target_type && f.target_id === rec.target_id);
  const primary = [...primaryDependencies(db, rec.target_type, rec.target_id)];
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Panel title={<>Chain for <RecLink db={db} table={rec.target_type} id={rec.target_id} /></>}><FallbackTree db={db} rows={siblings} />
        <div className="mt-3"><EntityForm table="fallbacks" defaults={{ target_type: rec.target_type, target_id: rec.target_id, parent_id: rec.id }} trigger={<Button size="sm" variant="teal">Add next fallback in chain</Button>} /></div></Panel>
      <Panel title="Primary path dependencies"><div className="flex flex-wrap gap-2">{primary.map((p) => <RecLink key={p} db={db} table="components" id={p} />)}</div></Panel>
    </div>
  );
}

function StepsTab({ db, rec }: { db: Db; rec: Rec }) {
  const steps = db.runbook_steps.filter((s) => s.runbook_id === rec.id).sort((a, b) => a.step_no - b.step_no);
  const move = (i: number, d: number) => { const a = steps[i], b = steps[i + d]; if (!a || !b) return; updateRec("runbook_steps", a.id, { step_no: b.step_no }); updateRec("runbook_steps", b.id, { step_no: a.step_no }); };
  const total = steps.reduce((s, x) => s + Number(x.est_minutes || 0), 0);
  return (
    <Panel title={<>Ordered steps <span className="num ml-2 text-xs font-normal text-muted-foreground">total est. {Math.floor(total / 60)}h {total % 60}m</span></>}>
      <RecordTable table="runbook_steps" rows={steps} defaults={{ runbook_id: rec.id, step_no: (steps.at(-1)?.step_no ?? 0) + 1 }} hideKeys={[]} sortKey="step_no"
        extra={{ label: "Order", render: (s) => { const i = steps.findIndex((x) => x.id === s.id); return <span className="flex gap-0.5"><Button size="icon" variant="ghost" className="h-6 w-6" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up"><ArrowUp className="h-3 w-3" /></Button><Button size="icon" variant="ghost" className="h-6 w-6" disabled={i === steps.length - 1} onClick={() => move(i, 1)} aria-label="Move down"><ArrowDown className="h-3 w-3" /></Button></span>; } }} />
    </Panel>
  );
}