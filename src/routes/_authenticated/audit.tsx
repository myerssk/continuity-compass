import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { PageHeader, Panel, Pill, tdCls, thCls } from "@/components/bcp/ui";
import { getSelectedWorkspaceId } from "@/lib/account/workspaces";
import { listWorkspaceAuditEvents } from "@/lib/integrations/servicenow";

export const Route = createFileRoute("/_authenticated/audit")({
  head: () => ({ meta: [{ title: "Audit History — Continuity Compass" }, { name: "description", content: "Authoritative workspace audit trail of continuity plan changes." }] }),
  component: AuditPage,
});

function AuditPage() {
  const { user } = Route.useRouteContext();
  const workspaceId = getSelectedWorkspaceId(user.id);
  const [q, setQ] = useState("");
  const { data: events = [], isLoading, error } = useQuery({ queryKey: ["workspace-audit", workspaceId], queryFn: () => listWorkspaceAuditEvents(workspaceId!), enabled: !!workspaceId });
  const rows = events.filter((a) => (a.summary + a.action + a.entity_type + a.actor_user_id).toLowerCase().includes(q.toLowerCase()));
  return <><PageHeader eyebrow="Assurance" title="Audit History" actions={<input placeholder="Filter…" value={q} onChange={(e)=>setQ(e.target.value)} className="rounded border border-input bg-card px-3 py-1.5 text-sm" />}>
    <p className="mt-1 text-sm text-muted-foreground">Cloud-authoritative, append-only workspace history attributed to authenticated user IDs.</p>
  </PageHeader><Panel>
    {!workspaceId ? <p className="text-sm text-muted-foreground">Select or create a workspace to view its audit history.</p> :
     isLoading ? <p className="text-sm text-muted-foreground">Loading audit history…</p> :
     error ? <p className="text-sm text-destructive">Audit history could not be loaded: {(error as Error).message}</p> :
     <table className="w-full"><thead className="bg-muted/60"><tr>{["When","Actor","Action","Entity","Change"].map(h=><th key={h} className={thCls}>{h}</th>)}</tr></thead><tbody>
       {!rows.length && <tr><td colSpan={5} className="py-6 text-center text-sm text-muted-foreground">No authoritative workspace audit events yet.</td></tr>}
       {rows.map(a=><tr key={a.id} className="border-t border-border"><td className={`${tdCls} num whitespace-nowrap text-xs`}>{new Date(a.occurred_at).toLocaleString()}</td><td className={tdCls}>{a.actor_user_id}</td><td className={tdCls}><Pill value={a.action} /></td><td className={tdCls}>{a.entity_type}{a.entity_id ? ` · ${a.entity_id}` : ""}</td><td className={tdCls}>{a.summary}</td></tr>)}
     </tbody></table>}
  </Panel></>;
}
