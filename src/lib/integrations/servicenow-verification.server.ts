import { ServiceNowApi, serviceNowOrigin, type ServiceNowCredentials } from "./servicenow-api.server";

export function resolveServiceNowCredentials(workspaceId: string, instance: string, env: Record<string, string | undefined>): ServiceNowCredentials {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(workspaceId)) throw new Error("Invalid workspace.");
  const prefix = "SERVICENOW_" + workspaceId.replace(/-/g, "_").toUpperCase() + "_";
  const configured = env[prefix + "INSTANCE"];
  const clientId = env[prefix + "CLIENT_ID"];
  const clientSecret = env[prefix + "CLIENT_SECRET"];
  if (!configured || !clientId || !clientSecret) throw new Error("Workspace credentials are not configured.");
  if (serviceNowOrigin(configured) !== serviceNowOrigin(instance)) throw new Error("Workspace credential origin mismatch.");
  return { instance: configured, clientId, clientSecret };
}

export async function verifyWorkspaceServiceNow(input: { workspaceId: string; instance: string; role: string; status: string }, env: Record<string, string | undefined>, transport: typeof fetch = fetch): Promise<{ verified: true }> {
  if (!["administrator", "bcp_coordinator"].includes(input.role)) throw new Error("Not authorized to verify connections.");
  if (input.status === "disabled") throw new Error("Connection is disabled.");
  const credentials = resolveServiceNowCredentials(input.workspaceId, input.instance, env);
  try {
    await new ServiceNowApi(credentials, transport).verify();
  } catch {
    throw new Error("ServiceNow verification failed. Check administrator configuration and permissions.");
  }
  return { verified: true };
}
