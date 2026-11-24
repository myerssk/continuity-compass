import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader, Panel } from "@/components/bcp/ui";
import { canManageIntegrations, getMyWorkspaceRole, getSelectedWorkspaceId } from "@/lib/account/workspaces";
import { getServiceNowConnection, listServiceNowSyncRuns, requestServiceNowSync, saveServiceNowConnection, type ServiceNowMode, type SyncDirection } from "@/lib/integrations/servicenow";

export const Route = createFileRoute("/_authenticated/integrations")({ component: IntegrationsPage });

function IntegrationsPage() {
  const { user } = Route.useRouteContext();
  const workspaceId = getSelectedWorkspaceId(user.id);
  const qc = useQueryClient();
  const { data: role = null } = useQuery({ queryKey: ["workspace-role", workspaceId, user.id], queryFn: () => getMyWorkspaceRole(workspaceId!, user.id), enabled: !!workspaceId });
  const mayManage = canManageIntegrations(role);
  const { data: connection } = useQuery({ queryKey: ["servicenow", workspaceId], queryFn: () => getServiceNowConnection(workspaceId!), enabled: !!workspaceId });
  const [url, setUrl] = useState(connection?.instance_url ?? "");
  const { data: runs = [] } = useQuery({ queryKey: ["servicenow-runs", workspaceId], queryFn: () => listServiceNowSyncRuns(workspaceId!), enabled: !!workspaceId });
  const [mode, setMode] = useState<ServiceNowMode>((connection?.mode as ServiceNowMode) ?? "itsm_cmdb");
  const [direction, setDirection] = useState<SyncDirection>("import");
  async function save() {
    if (!workspaceId) return toast.error("Select or create a workspace first.");
    try { await saveServiceNowConnection(workspaceId, user.id, url, mode); await qc.invalidateQueries({ queryKey: ["servicenow", workspaceId] }); toast.success("ServiceNow configuration saved"); }
    catch (err) { toast.error((err as Error).message); }
  }
  async function previewSync() { if (!workspaceId) return toast.error("Select or create a workspace first."); try { await requestServiceNowSync(workspaceId, user.id, direction, true); await qc.invalidateQueries({ queryKey: ["servicenow-runs", workspaceId] }); toast.success("Synchronization preview queued"); } catch (err) { toast.error((err as Error).message); } }
  async function liveSync() { if (!workspaceId || !window.confirm("Run a live ServiceNow synchronization? Use Preview first and verify the connection before proceeding.")) return; try { await requestServiceNowSync(workspaceId, user.id, direction, false); await qc.invalidateQueries({ queryKey: ["servicenow-runs", workspaceId] }); toast.success("Live synchronization queued"); } catch (err) { toast.error((err as Error).message); } }
  return <><PageHeader eyebrow="Integration" title="ServiceNow" /><div className="space-y-4">
    <Panel title="Standalone first"><p className="text-sm text-muted-foreground">Continuity Compass remains fully functional without ServiceNow. When enabled, ServiceNow can supply CMDB/CI relationships, technical ownership, ITSM records and—where licensed—BCM records. Continuity Compass retains guided planning, fallback intelligence, readiness, validation and human approval.</p></Panel>
    <Panel title="Connection"><div className="mb-3 text-xs text-muted-foreground">Workspace role: {role ?? "none"}. Only Administrators and BCP Coordinators can configure or run integrations.</div><div className="space-y-3"><Input aria-label="ServiceNow instance URL" placeholder="https://your-instance.service-now.com" value={url} onChange={(e)=>setUrl(e.target.value)} />
      <select className="w-full rounded border border-input bg-card px-3 py-2 text-sm" value={mode} onChange={(e)=>setMode(e.target.value as ServiceNowMode)}><option value="itsm_cmdb">ITSM + CMDB (no BCM)</option><option value="bcm_cmdb_itsm">BCM + CMDB + ITSM</option></select>
      <div className="text-xs text-muted-foreground">Authentication: OAuth with a dedicated least-privilege ServiceNow integration identity. Credentials are not stored in browser state.</div>
      <Button onClick={save} disabled={!mayManage}>Save configuration</Button></div></Panel>
    <Panel title="Synchronization"><div className="space-y-3"><select className="w-full rounded border border-input bg-card px-3 py-2 text-sm" value={direction} onChange={(e)=>setDirection(e.target.value as SyncDirection)}><option value="import">Import ServiceNow reference data</option><option value="export">Export approved Compass data</option><option value="bidirectional">Bidirectional synchronization</option></select><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={previewSync} disabled={!mayManage}>Preview / dry run</Button><Button onClick={liveSync} disabled={!mayManage || connection?.status !== "verified"}>Run live sync</Button></div><p className="text-xs text-muted-foreground">Live synchronization is blocked until the connection is verified. Preview creates an auditable run request without applying external changes.</p>{runs.length > 0 && <div className="text-xs"><b>Recent runs:</b>{runs.slice(0,5).map((r)=><div key={r.id} className="mt-1">{new Date(r.created_at).toLocaleString()} · {r.dry_run ? "Preview" : "Live"} · {r.direction} · {r.status}</div>)}</div>}</div></Panel>
    <Panel title="Synchronization ownership"><div className="grid gap-2 text-sm"><p><b>ServiceNow authoritative:</b> CIs, technical relationships/owners, ITSM records, and configured BCM records.</p><p><b>Continuity Compass authoritative:</b> guided workflow, fallback chains/capacity/duration/data impact/reconciliation, readiness, gap intelligence and validation evidence.</p><p><b>Offline behavior:</b> retain the last successfully synchronized reference data and Emergency Package; ServiceNow availability must never be required to execute the continuity plan.</p></div></Panel>
  </div></>;
}
