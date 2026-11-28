import { serviceNowOrigin, type ServiceNowCredentials } from "./servicenow-api.server";

export function resolveServiceNowCredentials(workspaceId: string, instance: string, env: Record<string, string | undefined> = process.env): ServiceNowCredentials {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(workspaceId)) throw new Error("Invalid workspace identifier.");
  const prefix = "SERVICENOW_" + workspaceId.replace(/-/g, "").toUpperCase() + "_";
  const origin = serviceNowOrigin(instance);
  const configured = env[prefix + "INSTANCE"];
  const clientId = env[prefix + "CLIENT_ID"];
  const clientSecret = env[prefix + "CLIENT_SECRET"];
  if (!configured || !clientId || !clientSecret) throw new Error("Workspace ServiceNow credentials are not configured.");
  if (serviceNowOrigin(configured) !== origin) throw new Error("ServiceNow credential instance mismatch.");
  return { instance: origin, clientId, clientSecret };
}
