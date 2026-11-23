/* eslint-disable @typescript-eslint/no-explicit-any */
import { Link2, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Pill, RecLink } from "@/components/bcp/ui";
import { biaIssues, techRtoConflicts } from "@/lib/bcp/rules";
import { TABLES, type WizardState } from "@/lib/bcp/schema";
import { updateRec, useDb } from "@/lib/bcp/store";
import {
  addComponent, addProcess, clearDraft, createGap, gapExists, linkComponent, needsTechObjectives, saveBia, saveFunction,
  saveOrganization, savePlan, scope, setDraft, setProcessUsesTech, setStage, unlinkComponent,
} from "@/lib/bcp/wizard";
import { Area, Callout, Q, Sel, StageNav, Text, inputCls, useDraft } from "./kit";

const pick = (r: any, keys: string[]) => Object.fromEntries(keys.map((k) => [k, r?.[k] ?? ""]));

export function OrganizationStage({ w }: { w: WizardState }) {
  const db = useDb();
  const cur = scope(db, w).org;
  const [v, set] = useDraft("organization", cur ? pick(cur, ["name", "industry", "region"]) : { mode: db.organizations.length ? "existing" : "new", existing: db.organizations[0]?.id ?? "", name: "", industry: "", region: "" });
  const useExisting = !cur && v.mode === "existing" && db.organizations.length > 0;
  return (
    <>
      {!cur && db.organizations.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2"><input type="radio" checked={v.mode === "existing"} onChange={() => set("mode", "existing")} />Use an organization already recorded</label>
          <label className="flex items-center gap-2"><input type="radio" checked={v.mode !== "existing"} onChange={() => set("mode", "new")} />Add a new organization</label>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {useExisting ? (
          <Q label="Which organization is this plan for?" wide><select aria-label="existing" className={inputCls} value={v.existing} onChange={(e) => set("existing", e.target.value)}>{db.organizations.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select></Q>
        ) : (
          <>
            <Q label="What is the organization or business unit called?" required wide help="The legal entity, division or site the continuity plan covers."><Text v={v} k="name" set={set} placeholder="e.g. Northwind Retail Ltd" /></Q>
            <Q label="What industry is it in?"><Text v={v} k="industry" set={set} /></Q>
            <Q label="Where does it operate?"><Text v={v} k="region" set={set} placeholder="Country / region" /></Q>
          </>
        )}
      </div>
      <StageNav stage="organization" canContinue={useExisting ? !!v.existing : !!String(v.name ?? "").trim()} onContinue={() => { if (useExisting) saveOrganization({ name: "" }, v.existing); else saveOrganization({ name: v.name.trim(), industry: v.industry, region: v.region }); }} />
    </>
  );
}

export function PlanStage({ w }: { w: WizardState }) {
  const db = useDb();
  const cur = scope(db, w).plan;
  const plans = db.plans.filter((p) => p.organization_id === w.organization_id);
  const [v, set] = useDraft("plan", cur ? pick(cur, ["name", "owner", "review_date"]) : { mode: plans.length ? "existing" : "new", existing: plans[0]?.id ?? "", name: "", owner: "", review_date: "" });
  const useExisting = !cur && v.mode === "existing" && plans.length > 0;
  return (
    <>
      {!cur && plans.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2"><input type="radio" checked={v.mode === "existing"} onChange={() => set("mode", "existing")} />Add to an existing plan</label>
          <label className="flex items-center gap-2"><input type="radio" checked={v.mode !== "existing"} onChange={() => set("mode", "new")} />Start a new plan</label>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {useExisting ? (
          <Q label="Which plan should this be added to?" wide><select aria-label="existing" className={inputCls} value={v.existing} onChange={(e) => set("existing", e.target.value)}>{plans.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select></Q>
        ) : (
          <>
            <Q label="What should the plan be called?" required wide><Text v={v} k="name" set={set} placeholder="e.g. 2027 Business Continuity & DR Plan" /></Q>
            <Q label="Who coordinates the plan?" role="BCP Coordinator" help="The person who keeps the plan current and runs exercises."><Text v={v} k="owner" set={set} /></Q>
            <Q label="When should it next be reviewed?" help="Most plans are reviewed at least yearly."><Text v={v} k="review_date" set={set} type="date" /></Q>
          </>
        )}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">New plans start as <b>Draft</b> (version 0.1). They are only approved through the approval step.</p>
      <StageNav stage="plan" canContinue={useExisting ? !!v.existing : !!String(v.name ?? "").trim()} onContinue={() => { if (useExisting) savePlan({}, v.existing); else savePlan({ name: v.name.trim(), owner: v.owner, review_date: v.review_date }); }} />
    </>
  );
}

export function FunctionStage({ w }: { w: WizardState }) {
  const db = useDb();
  const cur = scope(db, w).fn;
  const [v, set] = useDraft("function", pick(cur, ["name", "code", "owner", "department"]));
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Q label="Which business capability do you want to protect?" required wide help="A Business Function is something the organization must keep doing, e.g. “Customer payments” or “Order fulfilment”."><Text v={v} k="name" set={set} /></Q>
        <Q label="Who is accountable for it?" role="Business Owner"><Text v={v} k="owner" set={set} /></Q>
        <Q label="Which department runs it?"><Text v={v} k="department" set={set} /></Q>
        <Q label="Reference code (optional)"><Text v={v} k="code" set={set} placeholder="e.g. BF-01" /></Q>
      </div>
      <StageNav stage="function" canContinue={!!String(v.name ?? "").trim()} onContinue={() => { saveFunction({ name: v.name.trim(), owner: v.owner, department: v.department, code: v.code }); }} />
    </>
  );
}

export function BiaStage({ w }: { w: WizardState }) {
  const db = useDb();
  const fn = scope(db, w).fn!;
  const [v, set] = useDraft("bia", pick(fn, ["criticality", "description", "mtpd_h", "rto_h", "rpo_h", "operating_hours", "peak_periods"]));
  const issues = biaIssues(v);
  const vals = { ...v, criticality: v.criticality || "High" };
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Q label={`How critical is ${fn.name}?`} role="Business Owner" help="Critical = harm within hours (safety, legal, major revenue). High = serious within a day. Medium/Low = can wait days."><Sel v={vals} k="criticality" set={set} options={["Critical", "High", "Medium", "Low"]} /></Q>
        <Q label="When does it operate?" help="e.g. 24×7, or Mon–Fri 08:00–18:00."><Text v={v} k="operating_hours" set={set} /></Q>
        <Q label="What happens if it stops? Who is affected, and how quickly does it get worse?" wide help="Impact context: customers, revenue, legal/regulatory, safety, reputation."><Area v={v} k="description" set={set} /></Q>
        <Q label="MTPD — after how many hours would an outage become unacceptable?" help="Maximum Tolerable Period of Disruption: beyond this point the damage is severe or irreversible."><Text v={v} k="mtpd_h" set={set} type="number" placeholder="hours" /></Q>
        <Q label="Business RTO — how quickly must it be working again?" help="Recovery Time Objective: target time to resume, normally shorter than MTPD."><Text v={v} k="rto_h" set={set} type="number" placeholder="hours" /></Q>
        <Q label="Business RPO — how much recent data could you afford to lose?" help="Recovery Point Objective: e.g. 1 = up to one hour of transactions may need re-entering."><Text v={v} k="rpo_h" set={set} type="number" placeholder="hours" /></Q>
        <Q label="Are there peak periods when an outage would hurt most?" help="e.g. month-end, holiday season, payroll day."><Text v={v} k="peak_periods" set={set} /></Q>
      </div>
      {issues.length > 0 && <div className="mt-4"><Callout tone="warn" title="Please check these values (they are saved exactly as you entered them)"><ul className="mt-1 list-disc pl-4">{issues.map((i) => <li key={i}>{i}</li>)}</ul></Callout></div>}
      <StageNav stage="bia" hint={[v.mtpd_h, v.rto_h, v.rpo_h].some((x) => x === "" || x === undefined || x === null) ? "MTPD, RTO and RPO are needed to complete this step — you can continue and come back." : undefined}
        onContinue={() => { saveBia({ criticality: vals.criticality, description: v.description, mtpd_h: v.mtpd_h, rto_h: v.rto_h, rpo_h: v.rpo_h, operating_hours: v.operating_hours, peak_periods: v.peak_periods }); }} />
    </>
  );
}

const PROC_BLANK = { name: "", owner: "", inputs: "", outputs: "", manual_workaround: "", recovery_sequence: "", rto_h: "", rpo_h: "", uses_tech: "yes" };
export function ProcessesStage({ w }: { w: WizardState }) {
  const db = useDb();
  const { fn, procs } = scope(db, w);
  const [v, set] = useDraft("processes", PROC_BLANK);
  const [open, setOpen] = useState(procs.length === 0);
  const tooSlow = v.rto_h !== "" && fn?.rto_h != null && Number(v.rto_h) > Number(fn.rto_h);
  const add = () => {
    if (!String(v.name).trim()) { toast.error("Give the process a name"); return; }
    const { uses_tech, ...rest } = v; addProcess({ ...rest, name: v.name.trim() }, uses_tech === "yes");
    toast.success("Process added"); setOpen(false);
  };
  return (
    <>
      {procs.length > 0 && (
        <ul className="mb-4 divide-y divide-border rounded-md border border-border">
          {[...procs].sort((a, b) => (a.recovery_sequence ?? 99) - (b.recovery_sequence ?? 99)).map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-3 px-3 py-2 text-sm">
              <span className="num grid h-6 w-6 place-items-center rounded-full bg-primary text-[11px] text-primary-foreground">{p.recovery_sequence ?? "?"}</span>
              <RecLink db={db} table="processes" id={p.id} /><span className="text-muted-foreground">{p.owner || "no owner"}</span>
              <span className="num text-xs">RTO {p.rto_h ?? "—"}h · RPO {p.rpo_h ?? "—"}h</span>
              {fn?.rto_h != null && p.rto_h != null && Number(p.rto_h) > Number(fn.rto_h) && <Pill value={`Exceeds function RTO ${fn.rto_h}h`} tone="warn" />}
              <span className="ml-auto text-xs text-muted-foreground">{p.uses_technology === "No" ? "No technology dependency" : "Uses technology / suppliers"}</span>
            </li>
          ))}
        </ul>
      )}
      {open ? (
        <div className="rounded-md border border-teal/40 bg-accent/20 p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Q label="What is the process called?" required role="Process Owner" help="A step or activity that makes the function work, e.g. “Take customer orders”."><Text v={v} k="name" set={set} /></Q>
            <Q label="Who runs it day to day?" role="Process Owner"><Text v={v} k="owner" set={set} /></Q>
            <Q label="What does it need to start? (inputs)"><Area v={v} k="inputs" set={set} /></Q>
            <Q label="What does it produce? (outputs)"><Area v={v} k="outputs" set={set} /></Q>
            <Q label="If systems were down, how could staff do this by hand?" wide help="Manual workaround — you can describe a full fallback later."><Area v={v} k="manual_workaround" set={set} /></Q>
            <Q label="In which order should it be recovered?" help="1 = first."><Text v={v} k="recovery_sequence" set={set} type="number" /></Q>
            <div className="grid grid-cols-2 gap-3">
              <Q label="Process RTO (h)" help="Must normally be ≤ the function RTO."><Text v={v} k="rto_h" set={set} type="number" /></Q>
              <Q label="Process RPO (h)"><Text v={v} k="rpo_h" set={set} type="number" /></Q>
            </div>
            <Q group label="Does this process depend on technology, systems, suppliers, a site or data?" wide>
              <div className="flex gap-4 text-sm">{[["yes", "Yes — I'll list them next"], ["no", "No, it is fully manual"]].map(([k, l]) => <label key={k} className="flex items-center gap-2"><input type="radio" checked={v.uses_tech === k} onChange={() => set("uses_tech", k)} />{l}</label>)}</div>
            </Q>
          </div>
          {tooSlow && <div className="mt-3"><Callout tone="warn">This process RTO ({v.rto_h}h) is longer than the function’s Business RTO ({fn!.rto_h}h). It will be saved as entered — review one of them.</Callout></div>}
          <div className="mt-3 flex gap-2"><Button variant="teal" onClick={add}><Plus />Add process</Button>{procs.length > 0 && <Button variant="outline" onClick={() => { clearDraft("processes"); setOpen(false); }}>Cancel</Button>}</div>
        </div>
      ) : <Button variant="outline" onClick={() => setOpen(true)}><Plus />Add another process</Button>}
      <StageNav stage="processes" canContinue={procs.length > 0} hint={!procs.length ? "Add at least one process" : undefined} />
    </>
  );
}

const COMP_TYPES = TABLES.components.fields.find((f) => f.key === "type")!.options as readonly string[];
const COMP_BLANK = { type: "Application", name: "", technical_owner: "", hosting: "", location: "", tech_rto_h: "", tech_rpo_h: "", backup_method: "", failover: "" };
export function ComponentsStage({ w }: { w: WizardState }) {
  const db = useDb();
  const { procs, fn } = scope(db, w);
  return (
    <>
      <p className="mb-4 text-sm text-muted-foreground">For each process, list the applications, infrastructure, databases, interfaces, facilities, vendors and data it relies on. Technical RTO/RPO are compared automatically with the process and business requirements.</p>
      <div className="space-y-4">{procs.map((p) => <ProcessDeps key={p.id} w={w} p={p} fnRto={fn?.rto_h} />)}</div>
      <StageNav stage="components" canContinue={procs.length > 0} hint="Processes with no listed dependency must be marked “fully manual”." />
    </>
  );
}

function ProcessDeps({ w, p }: { w: WizardState; p: any; fnRto: any }) {
  const db = useDb();
  const key = `components:${p.id}`;
  const [v, set] = useDraft(key, COMP_BLANK);
  const [adding, setAdding] = useState(false);
  const [link, setLink] = useState("");
  const linked = db.process_components.filter((l) => l.process_id === p.id).map((l) => db.components.find((c) => c.id === l.component_id)).filter(Boolean) as any[];
  const others = db.components.filter((c) => !linked.some((l) => l.id === c.id));
  const manual = p.uses_technology === "No" && !linked.length;
  const tech = needsTechObjectives(v.type);
  const add = () => {
    if (!String(v.name).trim()) { toast.error("Name the dependency"); return; }
    addComponent(p.id, { ...v, name: v.name.trim() }); setDraft(key, COMP_BLANK); clearDraft(key); setAdding(false); toast.success("Dependency added and linked");
  };
  return (
    <section className="rounded-md border border-border">
      <header className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/40 px-3 py-2"><span className="text-sm font-semibold text-primary">{p.name}</span><span className="num text-xs text-muted-foreground">Process RTO {p.rto_h ?? "—"}h</span></header>
      <div className="space-y-3 p-3">
        {manual ? (
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">Marked as fully manual — no technology dependency.<Button size="sm" variant="outline" onClick={() => setProcessUsesTech(p.id, true)}>It does depend on something</Button></div>
        ) : (
          <>
            {linked.map((c) => <LinkedComponent key={c.id} c={c} processId={p.id} />)}
            {!linked.length && !adding && <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">Nothing linked yet.<Button size="sm" variant="ghost" onClick={() => setProcessUsesTech(p.id, false)}>Mark as fully manual</Button></div>}
            {adding ? (
              <div className="rounded-md border border-teal/40 bg-accent/20 p-3">
                <div className="grid gap-3 sm:grid-cols-3">
                  <Q label="What kind of dependency?" role="Technical Owner"><Sel v={v} k="type" set={set} options={COMP_TYPES} /></Q>
                  <Q label="Name" required><Text v={v} k="name" set={set} placeholder={v.type === "Vendor" ? "e.g. Courier partner" : v.type === "Facility" ? "e.g. Main warehouse" : "e.g. Order management system"} /></Q>
                  <Q label={v.type === "Vendor" ? "Vendor contact / account manager" : "Technical owner"}><Text v={v} k="technical_owner" set={set} /></Q>
                  <Q label={v.type === "Facility" ? "Address" : v.type === "Vendor" ? "Contract / SLA reference" : "Hosting (e.g. cloud, on-prem DC)"}><Text v={v} k="hosting" set={set} /></Q>
                  {tech || v.type === "Data" ? <>
                    <Q label="Technical RTO (h)" help="How fast IT can realistically restore it."><Text v={v} k="tech_rto_h" set={set} type="number" /></Q>
                    <Q label="Technical RPO (h)" help="Max data loss given current backups/replication."><Text v={v} k="tech_rpo_h" set={set} type="number" /></Q>
                    <Q label="How is it backed up?"><Text v={v} k="backup_method" set={set} /></Q>
                    <Q label="Is there failover / standby?"><Text v={v} k="failover" set={set} /></Q>
                  </> : <Q label={v.type === "Vendor" ? "Vendor's committed recovery time (h)" : "Time to restore or relocate (h)"}><Text v={v} k="tech_rto_h" set={set} type="number" /></Q>}
                </div>
                {v.tech_rto_h !== "" && p.rto_h != null && Number(v.tech_rto_h) > Number(p.rto_h) && <div className="mt-3"><Callout tone="warn">Technical RTO {v.tech_rto_h}h is longer than this process needs ({p.rto_h}h). You can still save it — you’ll be offered options next.</Callout></div>}
                <div className="mt-3 flex gap-2"><Button size="sm" variant="teal" onClick={add}><Plus />Add &amp; link</Button><Button size="sm" variant="outline" onClick={() => setAdding(false)}>Cancel</Button></div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => setAdding(true)}><Plus />Add dependency</Button>
                {others.length > 0 && <><select aria-label="link existing" className={`${inputCls} w-auto`} value={link} onChange={(e) => setLink(e.target.value)}><option value="">Link an existing one…</option>{others.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.type})</option>)}</select><Button size="sm" variant="outline" disabled={!link} onClick={() => { linkComponent(p.id, link); setLink(""); }}><Link2 />Link</Button></>}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

function LinkedComponent({ c, processId }: { c: any; processId: string }) {
  const db = useDb();
  const conflicts = techRtoConflicts(db, c.id);
  const [edit, setEdit] = useState<string | null>(null);
  return (
    <div className="rounded border border-border p-2.5 text-sm">
      <div className="flex flex-wrap items-center gap-2"><Pill value={c.type} tone="neutral" /><RecLink db={db} table="components" id={c.id} /><span className="text-xs text-muted-foreground">{c.technical_owner || "no owner"}</span><span className="num text-xs">Tech RTO {c.tech_rto_h ?? "—"}h · RPO {c.tech_rpo_h ?? "—"}h</span>
        <Button size="sm" variant="ghost" className="ml-auto h-7" aria-label="Unlink" onClick={() => unlinkComponent(processId, c.id)}><Trash2 className="h-3.5 w-3.5" />Unlink</Button></div>
      {conflicts.length > 0 && (
        <div className="mt-2"><Callout tone="bad" title="Technical RTO exceeds the requirement">
          <ul className="list-disc pl-4">{conflicts.map((x) => <li key={x.id}>{x.technical}h vs {x.level} “{x.name}” RTO {x.required}h</li>)}</ul>
          <p className="mt-1 text-xs text-muted-foreground">Neither value has been changed. Choose how to handle it:</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {gapExists(db, "components", c.id, "Technical RTO exceeds business requirement") ? <Pill value="Gap logged" tone="good" /> :
              <Button size="sm" variant="orange" onClick={() => { createGap("components", c.id, "Technical RTO exceeds business requirement", "High", conflicts.map((x) => `${c.name} Technical RTO ${x.technical}h vs ${x.level} ${x.name} RTO ${x.required}h`).join("\n"), "Improve recovery capability or agree a revised requirement"); toast.success("Gap created"); }}>Create Gap</Button>}
            <Button size="sm" variant="outline" onClick={() => setEdit(String(c.tech_rto_h ?? ""))}>Review Technical RTO</Button>
            <Button size="sm" variant="outline" onClick={() => setStage("bia")}>Review Business Requirement</Button>
          </div>
          {edit !== null && <div className="mt-2 flex items-center gap-2"><input aria-label="Technical RTO" type="number" className={`${inputCls} w-28`} value={edit} onChange={(e) => setEdit(e.target.value)} /><span className="text-xs">hours</span><Button size="sm" variant="teal" onClick={() => { updateRec("components", c.id, { tech_rto_h: edit === "" ? null : Number(edit) }); setEdit(null); }}>Save</Button><Button size="sm" variant="ghost" onClick={() => setEdit(null)}>Cancel</Button></div>}
        </Callout></div>
      )}
    </div>
  );
}