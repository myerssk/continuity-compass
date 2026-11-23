import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader, Panel } from "@/components/bcp/ui";
import { AuditTable } from "@/components/bcp/AuditTable";
import { useDb } from "@/lib/bcp/store";

export const Route = createFileRoute("/_authenticated/audit")({
  head: () => ({ meta: [{ title: "Audit History — Continuity Compass" }, { name: "description", content: "Chronological audit trail of every plan change." }, { property: "og:title", content: "Audit History — Continuity Compass" }, { property: "og:description", content: "Audit trail of BCP/DRP changes." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: AuditPage,
});

function AuditPage() {
  const db = useDb();
  const [q, setQ] = useState("");
  const rows = db.audit_log.filter((a) => (a.summary + a.user + a.table).toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <PageHeader eyebrow="Assurance" title="Audit History" actions={<input placeholder="Filter…" value={q} onChange={(e) => setQ(e.target.value)} className="rounded border border-input bg-card px-3 py-1.5 text-sm" />} />
      <Panel><AuditTable rows={rows} db={db} /></Panel>
    </>
  );
}