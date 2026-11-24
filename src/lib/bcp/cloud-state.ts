import { supabase } from "@/integrations/supabase/client";
import type { Db } from "@/lib/bcp/schema";

export type CloudBcpState = {
  workspace_id: string;
  state: Db;
  revision: number;
  updated_by: string;
  updated_at: string;
};

export async function loadWorkspaceBcpState(workspaceId: string): Promise<CloudBcpState | null> {
  const { data, error } = await supabase
    .from("workspace_bcp_state")
    .select("workspace_id, state, revision, updated_by, updated_at")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (error) throw error;
  return data ? ({ ...data, state: data.state as Db } as CloudBcpState) : null;
}

export async function saveWorkspaceBcpState(
  workspaceId: string,
  state: Db,
  userId: string,
  expectedRevision: number,
): Promise<CloudBcpState> {
  const nextRevision = expectedRevision + 1;
  const payload = {
    workspace_id: workspaceId,
    state,
    revision: nextRevision,
    updated_by: userId,
    updated_at: new Date().toISOString(),
  };

  if (expectedRevision === 0) {
    const { data, error } = await supabase.from("workspace_bcp_state").insert(payload).select().single();
    if (error) throw error;
    return { ...data, state: data.state as Db } as CloudBcpState;
  }

  const { data, error } = await supabase
    .from("workspace_bcp_state")
    .update(payload)
    .eq("workspace_id", workspaceId)
    .eq("revision", expectedRevision)
    .select()
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Workspace data changed since it was loaded. Reload before saving.");
  return { ...data, state: data.state as Db } as CloudBcpState;
}
