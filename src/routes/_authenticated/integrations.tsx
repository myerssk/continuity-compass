import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader, Panel } from "@/components/bcp/ui";
import { getSelectedWorkspaceId } from "@/lib/account/workspaces";
import { getServiceNowConnection, saveServiceNowConnection, type ServiceNowMode } from "@/lib/integrations/servicenow";

export const Route = createFileRoute("/_authenticated/integrations")({ component: IntegrationsPage });

function IntegrationsPage() {
  const { user } = Route.useRouteContext();
  const workspaceId = getSelectedWorkspaceId(user.id);
  const qc = useQueryClient();
  const { data: connection } = useQuery({ queryKey: ["servicenow", workspaceId], queryFn: () => getServiceNowConnection(workspaceId!), enabled: !!workspaceId });
  const [url, setUrl] = useState(connection?.instance_url ?? "");
  const [mode, setMode] = useState<ServiceNowMode>((connection?.mode as ServiceNowMode) ?? "itsm_cmdb");
  async function save() {
    if (!workspaceId) return toast.error("Select or create a workspace first.");
    try { await saveServiceNowConnection(workspaceId, user.id, url, mode); await qc.invalidateQueries({ queryKey: ["servicenow", workspaceId] }); toast.success("ServiceNow configuration saved"); }
    catch (err) { toast.error((err as Error).message); }
  }
  return <><PageHeader eyebrow="Integration" title="ServiceNow" /><div className="space-y-4">
    <Panel title="Standalone first"><p className="text-sm text-muted-foreground">Continuity Compass remains fully functional without ServiceNow. When enabled, ServiceNow can supply CMDB/CI relationships, technical ownership, ITSM records and—where licensed—BCM records. Continuity Compass retains guided planning, fallback intelligence, readiness, validation and human approval.</p></Panel>
    <Panel title="Connection"><div className="space-y-3"><Input aria-label="ServiceNow instance URL" placeholder="https://your-instance.service-now.com" value={url} onChange={(e)=>setUrl(e.target.value)} />
      <select className="w-full rounded border border-input bg-card px-3 py-2 text-sm" value={mode} onChange={(e)=>setMode(e.target.value as ServiceNowMode)}><option value="itsm_cmdb">ITSM + CMDB (no BCM)</option><option value="bcm_cmdb_itsm">BCM + CMDB + ITSM</option></select>
      <div className="text-xs text-muted-foreground">Authentication: OAuth with a dedicated least-privilege ServiceNow integration identity. Credentials are not stored in browser state.</div>
      <Button onClick={save}>Save configuration</Button></div></Panel>
    <Panel title="Synchronization ownership"><div className="grid gap-2 text-sm"><p><b>ServiceNow authoritative:</b> CIs, technical relationships/owners, ITSM records, and configured BCM records.</p><p><b>Continuity Compass authoritative:</b> guided workflow, fallback chains/capacity/duration/data impact/reconciliation, readiness, gap intelligence and validation evidence.</p><p><b>Offline behavior:</b> retain the last successfully synchronized reference data and Emergency Package; ServiceNow availability must never be required to execute the continuity plan.</p></div></Panel>
  </div></>;
}
