import { ServiceNowApi } from "./servicenow-api.server";
import { resolveServiceNowCredentials } from "./servicenow-credentials.server";

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
