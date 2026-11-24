import { supabase } from "@/integrations/supabase/client";

export type WorkspaceRole = "administrator" | "bcp_coordinator" | "contributor" | "approver" | "viewer";
export type Workspace = { id: string; name: string; created_by: string; created_at: string; updated_at: string };
export type WorkspaceMembership = { workspace_id: string; user_id: string; role: WorkspaceRole; created_at: string };

export async function listMyWorkspaces() {
  const { data, error } = await supabase
    .from("workspace_members")
    .select("workspace_id, role, created_at, workspaces(id, name, created_by, created_at, updated_at)")
    .order("created_at");
  if (error) throw error;
  return data ?? [];
}

export async function createWorkspace(name: string, userId: string) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Workspace name is required.");
  const { data, error } = await supabase
    .from("workspaces")
    .insert({ name: trimmed, created_by: userId })
    .select()
    .single();
  if (error) throw error;
  return data as Workspace;
}

const keyFor = (userId: string) => `continuity-compass:selected-workspace:${userId}`;
export function getSelectedWorkspaceId(userId: string) {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(keyFor(userId));
}
export function setSelectedWorkspaceId(userId: string, workspaceId: string | null) {
  if (typeof window === "undefined") return;
  if (workspaceId) localStorage.setItem(keyFor(userId), workspaceId);
  else localStorage.removeItem(keyFor(userId));
}
