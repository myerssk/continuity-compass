import { describe, it, expect, vi } from "vitest";
import { verifyWorkspaceServiceNow } from "./servicenow-verification.server";
const workspaceId = "12345678-1234-1234-1234-123456789abc";
const instance = "https://example.service-now.com";
const prefix = "SERVICENOW_12345678123412341234123456789ABC_";
const env = { [prefix+"INSTANCE"]: instance, [prefix+"CLIENT_ID"]: "mock-client", [prefix+"CLIENT_SECRET"]: "mock-secret" };
const input = { workspaceId, instance, role: "administrator", status: "configured" };
describe("workspace verification", () => {
  it("uses canonical credentials for OAuth and CMDB verification", async () => {
    const transport = vi.fn<typeof fetch>().mockResolvedValueOnce(new Response(JSON.stringify({access_token:"mock-token"}))).mockResolvedValueOnce(new Response(JSON.stringify({result:[]})));
    await expect(verifyWorkspaceServiceNow(input, env, transport)).resolves.toEqual({verified:true});
    expect(transport).toHaveBeenCalledTimes(2);
  });
  it("rejects unauthorized and disabled connections before network access", async () => {
    const transport = vi.fn<typeof fetch>();
    await expect(verifyWorkspaceServiceNow({...input,role:"viewer"},env,transport)).rejects.toThrow("Not authorized");
    await expect(verifyWorkspaceServiceNow({...input,status:"disabled"},env,transport)).rejects.toThrow("disabled");
    expect(transport).not.toHaveBeenCalled();
  });
  it("rejects mismatched credential origins before network access", async () => {
    const transport = vi.fn<typeof fetch>();
    await expect(verifyWorkspaceServiceNow({...input,instance:"https://other.service-now.com"},env,transport)).rejects.toThrow("mismatch");
    expect(transport).not.toHaveBeenCalled();
  });
});
