import { createFileRoute, notFound } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { EntityForm } from "@/components/bcp/EntityForm";
import { RecordTable } from "@/components/bcp/RecordTable";
import { Meter, PageHeader, Panel } from "@/components/bcp/ui";
import { fallbackReadiness } from "@/lib/bcp/rules";
import { type Rec, isTable, tableDef } from "@/lib/bcp/schema";
import { useDb } from "@/lib/bcp/store";

export const Route = createFileRoute("/_authenticated/$type/")({
  beforeLoad: ({ params }) => { if (!isTable(params.type) || tableDef(params.type).hidden) throw notFound(); },
  head: ({ params }) => {
    const l = isTable(params.type) ? tableDef(params.type).label : "Not found";
    return { meta: [{ title: `${l} — Continuity Compass` }, { name: "description", content: `Manage ${l.toLowerCase()} in the continuity plan.` }, { property: "og:title", content: `${l} — Continuity Compass` }, { property: "og:description", content: `Manage ${l.toLowerCase()}.` }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] };
  },
  component: ListPage,
});

function ListPage() {
  const { type } = Route.useParams();
  const db = useDb();
  const [q, setQ] = useState("");
  if (!isTable(type)) return null;
  const def = tableDef(type);
  const rows = db[type].filter((r) => !q || JSON.stringify(r).toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <PageHeader eyebrow={def.level ? `Level ${def.level}` : "Register"} title={def.label}
        actions={<>
          <input placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} className="rounded border border-input bg-card px-3 py-1.5 text-sm" />
          <EntityForm table={type} trigger={<Button variant="orange"><Plus className="h-4 w-4" />New {def.singular}</Button>} />
        </>}>
        <p className="mt-1 text-sm text-muted-foreground">{rows.length} of {db[type].length} records</p>
      </PageHeader>
      <Panel><RecordTable noAdd table={type} rows={rows} sortKey={type === "processes" ? "recovery_sequence" : undefined}
        {...(type === "fallbacks" ? { extra: { label: "Readiness", render: (f: Rec) => <div className="w-32"><Meter value={fallbackReadiness(db, f).score} /></div> } } : {})} /></Panel>
    </>
  );
}