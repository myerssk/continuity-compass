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
