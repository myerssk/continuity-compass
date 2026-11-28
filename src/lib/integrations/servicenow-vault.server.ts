import { serviceNowOrigin, type ServiceNowCredentials } from "./servicenow-api.server";
function bytes(value: string) { return Uint8Array.from(atob(value), c => c.charCodeAt(0)); }
function encode(value: Uint8Array) { return btoa(Array.from(value, c => String.fromCharCode(c)).join("")); }
async function key() {
  const raw = bytes(process.env.SERVICENOW_VAULT_KEY ?? "");
  if (raw.length !== 32) throw new Error("ServiceNow credential vault is not configured.");
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}
function binding(workspaceId: string, instance: string) {
  return new TextEncoder().encode(workspaceId + ":" + serviceNowOrigin(instance));
}
export async function sealServiceNowCredentials(workspaceId: string, credentials: ServiceNowCredentials) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify({ clientId: credentials.clientId, clientSecret: credentials.clientSecret }));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: binding(workspaceId, credentials.instance) }, await key(), plaintext);
  return { ciphertext: encode(new Uint8Array(encrypted)), iv: encode(iv) };
}
export async function openServiceNowCredentials(workspaceId: string, instance: string, sealed: { ciphertext: string; iv: string }): Promise<ServiceNowCredentials> {
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv: bytes(sealed.iv), additionalData: binding(workspaceId, instance) }, await key(), bytes(sealed.ciphertext));
  const value = JSON.parse(new TextDecoder().decode(decrypted));
  if (typeof value.clientId !== "string" || typeof value.clientSecret !== "string" || !value.clientId || !value.clientSecret) throw new Error("Invalid stored credentials.");
  return { instance: serviceNowOrigin(instance), clientId: value.clientId, clientSecret: value.clientSecret };
}
