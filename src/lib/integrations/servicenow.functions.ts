import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const verifyServiceNowConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ workspaceId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: member, error: memberError } = await supabase.from("workspace_members").select("role").eq("workspace_id", data.workspaceId).eq("user_id", userId).maybeSingle();
    if (memberError || !member || !["administrator", "bcp_coordinator"].includes(member.role)) throw new Error("Not authorized to verify connections.");
    const { data: connection, error } = await supabase.from("servicenow_connections").select("instance_url,status").eq("workspace_id", data.workspaceId).single();
    if (error || !connection) throw new Error("Configure ServiceNow first.");
    const { verifyWorkspaceServiceNow } = await import("./servicenow-verification.server");
    await verifyWorkspaceServiceNow({ workspaceId: data.workspaceId, instance: connection.instance_url, status: connection.status, role: member.role }, process.env);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: updated, error: updateError } = await supabaseAdmin.from("servicenow_connections").update({ status: "verified", verified_at: new Date().toISOString(), verified_by: userId, oauth_client_configured: true }).eq("workspace_id", data.workspaceId).eq("instance_url", connection.instance_url).eq("status", connection.status).select("workspace_id").maybeSingle();
    if (updateError || !updated) throw new Error("Connection configuration changed or verification could not be saved.");
    return { verified: true };
  });
