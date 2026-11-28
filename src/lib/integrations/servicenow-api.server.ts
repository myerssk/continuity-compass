// Server-only transport. Credentials must be supplied by a trusted server secret provider.
export type ServiceNowCredentials = { instance: string; clientId: string; clientSecret: string };
export function serviceNowOrigin(instance: string): string {
  const u = new URL(instance);
  if (u.protocol !== "https:" || !/^[a-z0-9-]+\.service-now\.com$/i.test(u.hostname) || u.port || u.username || u.password || u.pathname !== "/" || u.search || u.hash) throw new Error("Use an approved HTTPS ServiceNow instance origin.");
  return u.origin;
}
export class ServiceNowApi {
  private token: string | null = null;
  private origin: string;
  constructor(private credentials: ServiceNowCredentials, private transport: typeof fetch = fetch) {
    this.origin = serviceNowOrigin(credentials.instance);
  }
  private async request(path: string, init: RequestInit) {
    const response = await this.transport(this.origin + path, { ...init, redirect: "error", signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error("ServiceNow request failed (HTTP " + response.status + ")");
    return response.json();
  }
  async authenticate() {
    const result = await this.request("/oauth_token.do", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "client_credentials", client_id: this.credentials.clientId, client_secret: this.credentials.clientSecret }) });
    if (typeof result.access_token !== "string" || !result.access_token) throw new Error("ServiceNow did not return an access token.");
    this.token = result.access_token;
  }
  async readPage(table: string, fields: string[], offset = 0) {
    if (!/^[a-z][a-z0-9_]*$/.test(table) || !fields.length || fields.some(f => !/^[a-z][a-z0-9_]*$/.test(f)) || !Number.isSafeInteger(offset) || offset < 0) throw new Error("Invalid table, field or offset.");
    if (!this.token) await this.authenticate();
    const query = new URLSearchParams({ sysparm_fields: [...new Set(["sys_id", ...fields])].join(","), sysparm_limit: "100", sysparm_offset: String(offset), sysparm_query: "ORDERBYsys_id", sysparm_exclude_reference_link: "true" });
    const result = await this.request("/api/now/table/" + table + "?" + query, { headers: { Authorization: "Bearer " + this.token, Accept: "application/json" } });
    if (!Array.isArray(result.result)) throw new Error("Invalid ServiceNow Table API response.");
    return result.result as Record<string, unknown>[];
  }
  async updateRecord(table: string, sysId: string, fields: Record<string, unknown>, allowedTables: readonly string[], allowedFields: readonly string[]) {
    if (!allowedTables.includes(table) || !/^[a-z][a-z0-9_]*$/.test(table) || !/^[a-f0-9]{32}$/i.test(sysId)) throw new Error("Unapproved table or invalid record identifier.");
    const keys = Object.keys(fields);
    if (!keys.length || keys.some(key => key === "sys_id" || !allowedFields.includes(key) || !/^[a-z][a-z0-9_]*$/.test(key))) throw new Error("Unapproved export field.");
    if (!this.token) await this.authenticate();
    const result = await this.request("/api/now/table/" + table + "/" + sysId, { method: "PATCH", headers: { Authorization: "Bearer " + this.token, Accept: "application/json", "Content-Type": "application/json" }, body: JSON.stringify(fields) });
    if (!result.result || result.result.sys_id !== sysId) throw new Error("Invalid ServiceNow update response.");
    return result.result as Record<string, unknown>;
  }
  async verify() { await this.readPage("cmdb_ci", ["sys_id"], 0); }
}
