import { createFileRoute } from "@tanstack/react-router";
import { CloudOff, Download, Printer, ShieldOff, Unplug, WifiOff } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Meter, PageHeader, Panel, Pill, RecLink, tdCls, thCls } from "@/components/bcp/ui";
import { componentsOfFunction, fallbackReadiness, fallbacksFor, functionReadiness, processesOf } from "@/lib/bcp/rules";
import type { Db, Rec, TableName } from "@/lib/bcp/schema";
import { adapter, useDb } from "@/lib/bcp/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/emergency")({
  head: () => ({ meta: [{ title: "Offline Emergency Package — Continuity Compass" }, { name: "description", content: "What is exported for use when the application, cloud, identity or network is unavailable." }, { property: "og:title", content: "Offline Emergency Package — Continuity Compass" }, { property: "og:description", content: "Offline emergency recovery package." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: EmergencyPage,
});

const SCENARIOS = [
  { key: "app", label: "Application down", icon: ShieldOff, note: "Continuity Compass itself is unavailable. Responders use the printed / PDF pack and the signed JSON snapshot." },
  { key: "cloud", label: "Cloud region lost", icon: CloudOff, note: "Pack is stored on encrypted USB and at the alternate site; no cloud lookup required." },
  { key: "identity", label: "Identity provider down", icon: Unplug, note: "Pack contains break-glass contact roles and no dependency on SSO to open." },
  { key: "network", label: "Network unavailable", icon: WifiOff, note: "Printed call tree and runbooks; all steps readable without connectivity." },
] as const;

function buildPackage(db: Db, fnIds: string[]) {
  const attached = (t: "runbooks" | "strategies", tt: TableName, id: string) => db[t].filter((r) => r.target_type === tt && r.target_id === id);
  return {
    generated_at: new Date().toISOString(),
    plan: db.plans[0],
    organization: db.organizations[0],
    source_store: adapter.name,
    functions: db.functions.filter((f) => fnIds.includes(f.id)).map((f): Rec => {
      const procs = processesOf(db, f.id).sort((a, b) => a.recovery_sequence - b.recovery_sequence);
      const comps = componentsOfFunction(db, f.id);
      const items: [TableName, Rec][] = [["functions", f], ...procs.map((p) => ["processes", p] as [TableName, Rec]), ...comps.map((c) => ["components", c] as [TableName, Rec])];
      return {
        ...f,
        readiness_pct: functionReadiness(db, f).score,
        processes: procs.map((p) => ({ ...p, fallbacks: fallbacksFor(db, "processes", p.id) })),
        components: comps.map((c) => ({ ...c, fallbacks: fallbacksFor(db, "components", c.id) })),
        fallbacks: fallbacksFor(db, "functions", f.id),
        strategies: items.flatMap(([t, r]) => attached("strategies", t, r.id)),
        runbooks: items.flatMap(([t, r]) => attached("runbooks", t, r.id)).map((rb) => ({ ...rb, steps: db.runbook_steps.filter((s) => s.runbook_id === rb.id).sort((a, b) => a.step_no - b.step_no) })),
      };
    }),
  };
}

function EmergencyPage() {
  const db = useDb();
  const [picked, setSelected] = useState<string[] | null>(null);
  // Default (until the user ticks boxes): every Critical/High function in the current dataset.
  const selected = picked ?? db.functions.filter((f) => f.criticality === "Critical" || f.criticality === "High").map((f) => f.id);
  const [scenario, setScenario] = useState<(typeof SCENARIOS)[number]["key"]>("app");
  const pkg = buildPackage(db, selected);
  const toggle = (id: string) => setSelected(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  const contacts = [...new Set(pkg.functions.flatMap((f) => [f.owner, ...f.processes.map((p: Rec) => p.owner), ...[...f.fallbacks, ...f.processes.flatMap((p: Rec) => p.fallbacks), ...f.components.flatMap((c: Rec) => c.fallbacks)].flatMap((fb: Rec) => [fb.owner, fb.alternate_owner])]).filter(Boolean))];
  const allFallbacks = pkg.functions.flatMap((f) => [...f.fallbacks, ...f.processes.flatMap((p: Rec) => p.fallbacks), ...f.components.flatMap((c: Rec) => c.fallbacks)]) as Rec[];
  const steps = pkg.functions.reduce((n, f) => n + f.runbooks.reduce((m: number, r: Rec) => m + r.steps.length, 0), 0);

  const download = () => {
    const blob = new Blob([JSON.stringify(pkg, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `emergency-package-${new Date().toISOString().slice(0, 10)}.json`; a.click(); URL.revokeObjectURL(a.href);
  };

  return (
    <>
      <PageHeader eyebrow="Resilience" title="Offline Emergency Package"
        actions={<><Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4" />Print pack</Button><Button variant="orange" onClick={download} disabled={!selected.length}><Download className="h-4 w-4" />Export JSON snapshot</Button></>}>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Concept: a self-contained package generated on a schedule and stored offline, so recovery teams can act when this application, the cloud, identity or the network is unavailable.</p>
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {SCENARIOS.map((s) => (
          <button key={s.key} onClick={() => setScenario(s.key)} className={cn("rounded-md border bg-card p-4 text-left transition-colors", scenario === s.key ? "border-orange shadow-[inset_0_3px_0_var(--orange)]" : "border-border hover:border-teal")}>
            <s.icon className={cn("h-5 w-5", scenario === s.key ? "text-orange" : "text-teal")} />
            <div className="mt-2 text-sm font-semibold text-primary">{s.label}</div>
            <div className="mt-1 text-xs text-muted-foreground">{s.note}</div>
          </button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel title="Functions in package">
          {!db.functions.length && <p className="text-sm text-muted-foreground">No business functions yet — the package will be empty until you add some.</p>}
          <ul className="space-y-1.5">{db.functions.map((f) => (
            <li key={f.id}><label className="flex cursor-pointer items-center gap-2 text-sm"><input type="checkbox" checked={selected.includes(f.id)} onChange={() => toggle(f.id)} className="accent-[var(--teal)]" />{f.name}<span className="ml-auto"><Pill value={f.criticality} /></span></label></li>
          ))}</ul>
        </Panel>
        <Panel title="Package contents" className="lg:col-span-2">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[["Functions", pkg.functions.length], ["Fallbacks", allFallbacks.length], ["Runbook steps", steps], ["Contact roles", contacts.length]].map(([l, v]) => (
              <div key={l} className="rounded border border-border p-3"><div className="text-[11px] uppercase tracking-wider text-muted-foreground">{l}</div><div className="num text-2xl text-primary">{v}</div></div>
            ))}
          </div>
          <ul className="mt-4 grid gap-1.5 text-sm sm:grid-cols-2">
            {["Recovery objectives (MTPD, RTO, RPO) per function & process", "Recovery sequence and manual workarounds", "Fallback chains with activation criteria & capacity", "Reconciliation and return-to-normal instructions", "Ordered runbook steps with responsible roles", "Contact / call-tree roles incl. alternates", "Component technical RTO/RPO, backup & failover", "Snapshot timestamp and source store for integrity"].map((x) => <li key={x} className="flex gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal" />{x}</li>)}
          </ul>
        </Panel>
      </div>

      <div className="mt-4 space-y-4">
        {pkg.functions.map((f) => (
          <Panel key={f.id} title={<><span className="num mr-2 text-muted-foreground">{f.code}</span>{f.name}</>} action={<div className="w-40"><Meter value={f.readiness_pct} /></div>}>
            <div className="mb-3 flex flex-wrap gap-4 text-sm"><span>Owner: <b>{f.owner}</b></span><span className="num">MTPD {f.mtpd_h ?? "—"}h · RTO {f.rto_h ?? "—"}h · RPO {f.rpo_h ?? "—"}h</span><span>Peak: {f.peak_periods}</span></div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div>
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-teal">Recovery sequence & workarounds</div>
                <table className="w-full"><tbody>{f.processes.map((p: Rec) => <tr key={p.id} className="border-t border-border"><td className={`${tdCls} num w-8`}>{p.recovery_sequence}</td><td className={tdCls}><b>{p.name}</b><div className="text-xs text-muted-foreground">{p.manual_workaround || "No workaround documented"}</div></td></tr>)}</tbody></table>
                <div className="mb-1 mt-3 text-[11px] font-semibold uppercase tracking-wider text-teal">Fallbacks</div>
                {[...f.fallbacks, ...f.processes.flatMap((p: Rec) => p.fallbacks), ...f.components.flatMap((c: Rec) => c.fallbacks)].map((fb: Rec) => (
                  <div key={fb.id} className="mb-2 rounded border border-border p-2 text-sm">
                    <div className="flex items-center gap-2"><RecLink db={db} table="fallbacks" id={fb.id} />{fb.parent_id && <Pill value="secondary" tone="neutral" />}<span className="ml-auto w-28"><Meter value={fallbackReadiness(db, fb).score} /></span></div>
                    <div className="mt-1 text-xs text-muted-foreground"><b>Activate when:</b> {fb.activation_criteria} · <b>Owner:</b> {fb.owner} / {fb.alternate_owner || "—"} · <span className="num">{fb.capacity_pct}% for max {fb.max_duration_h}h</span></div>
                  </div>
                ))}
                {!f.fallbacks.length && !f.processes.some((p: Rec) => p.fallbacks.length) && <div className="text-sm text-destructive">No fallback — this function cannot operate offline.</div>}
              </div>
              <div>
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-teal">Runbooks</div>
                {f.runbooks.map((rb: Rec) => (
                  <div key={rb.id} className="mb-2"><div className="flex items-center gap-2 text-sm font-medium"><RecLink db={db} table="runbooks" id={rb.id} /><Pill value={rb.status} /></div>
                    <ol className="ml-5 mt-1 list-decimal text-xs text-muted-foreground">{rb.steps.map((s: Rec) => <li key={s.id}>{s.title} — <i>{s.role}</i></li>)}</ol></div>
                ))}
                {!f.runbooks.length && <div className="text-sm text-orange">No runbook documented.</div>}
              </div>
            </div>
          </Panel>
        ))}
      </div>

      <Panel title="Contact roles (call tree)" className="mt-4">
        <table className="w-full"><thead className="bg-muted/60"><tr><th className={thCls}>#</th><th className={thCls}>Role</th></tr></thead>
          <tbody>{contacts.map((c, i) => <tr key={c} className="border-t border-border"><td className={`${tdCls} num w-10`}>{i + 1}</td><td className={tdCls}>{c}</td></tr>)}</tbody></table>
      </Panel>
    </>
  );
}