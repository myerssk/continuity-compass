import { supabase } from "@/integrations/supabase/client";

export type ServiceNowMode = "itsm_cmdb" | "bcm_cmdb_itsm";
export type ServiceNowConnection = {
  workspace_id: string; instance_url: string; mode: ServiceNowMode;
  status: "not_configured" | "configured" | "verified" | "error" | "disabled";
  auth_method: string; last_sync_at: string | null; last_sync_status: string | null;
  last_sync_summary: Record<string, unknown>;
};

export async function getServiceNowConnection(workspaceId: string) {
  const { data, error } = await supabase.from("servicenow_connections").select("*").eq("workspace_id", workspaceId).maybeSingle();
  if (error) throw error;
  return data as ServiceNowConnection | null;
}

export async function saveServiceNowConnection(workspaceId: string, userId: string, instanceUrl: string, mode: ServiceNowMode) {
  const url = new URL(instanceUrl);
  if (url.protocol !== "https:") throw new Error("ServiceNow instance must use HTTPS.");
  const payload = { workspace_id: workspaceId, instance_url: url.origin, mode, status: "configured", auth_method: "oauth", created_by: userId, updated_by: userId, updated_at: new Date().toISOString() };
  const { data, error } = await supabase.from("servicenow_connections").upsert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function appendWorkspaceAudit(workspaceId: string, userId: string, action: string, entityType: string, entityId: string | null, summary: string, metadata: Record<string, unknown> = {}) {
  const { error } = await supabase.from("workspace_audit_events").insert({ workspace_id: workspaceId, actor_user_id: userId, action, entity_type: entityType, entity_id: entityId, summary, metadata });
  if (error) throw error;
}

export type SyncDirection = "import" | "export" | "bidirectional";
export type ServiceNowSyncRun = { id: string; workspace_id: string; direction: SyncDirection; dry_run: boolean; status: string; requested_by: string; started_at: string | null; completed_at: string | null; summary: Record<string, unknown>; error_message: string | null; created_at: string };

export async function listServiceNowSyncRuns(workspaceId: string) {
  const { data, error } = await supabase.from("servicenow_sync_runs").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(20);
  if (error) throw error;
  return (data ?? []) as ServiceNowSyncRun[];
}

export async function requestServiceNowSync(workspaceId: string, userId: string, direction: SyncDirection, dryRun = true) {
  const connection = await getServiceNowConnection(workspaceId);
  if (!connection || connection.status === "disabled") throw new Error("Configure and enable ServiceNow before requesting synchronization.");
  if (!dryRun && connection.status !== "verified") throw new Error("A verified ServiceNow connection is required before a live synchronization.");
  const { data, error } = await supabase.from("servicenow_sync_runs").insert({ workspace_id: workspaceId, direction, dry_run: dryRun, status: "queued", requested_by: userId }).select().single();
  if (error) throw error;
  await appendWorkspaceAudit(workspaceId, userId, dryRun ? "sync_preview_requested" : "sync_requested", "servicenow", data.id, `${dryRun ? "Preview" : "Live"} ServiceNow ${direction} synchronization requested`);
  return data as ServiceNowSyncRun;
}

export type WorkspaceAuditEvent = { id: string; workspace_id: string; actor_user_id: string; action: string; entity_type: string; entity_id: string | null; summary: string; metadata: Record<string, unknown>; occurred_at: string };
export async function listWorkspaceAuditEvents(workspaceId: string) {
  const { data, error } = await supabase.from("workspace_audit_events").select("*").eq("workspace_id", workspaceId).order("occurred_at", { ascending: false }).limit(500);
  if (error) throw error;
  return (data ?? []) as WorkspaceAuditEvent[];
}
