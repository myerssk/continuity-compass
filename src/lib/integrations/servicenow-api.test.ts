import { describe, expect, it, vi } from "vitest";
import { ServiceNowApi, serviceNowOrigin } from "./servicenow-api.server";

const credentials = { instance: "https://example.service-now.com", clientId: "test-client", clientSecret: "test-secret" };
describe("ServiceNow transport", () => {
  it("rejects untrusted origins and embedded credentials", () => {
    for (const url of ["http://example.service-now.com", "https://localhost", "https://example.service-now.com.evil.test", "https://user:pass@example.service-now.com", "https://example.service-now.com/path"]) {
      expect(() => serviceNowOrigin(url)).toThrow();
    }
  });
  it("obtains OAuth token and reads bounded CMDB pages", async () => {
    const transport = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "mock-token" })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ result: [{ sys_id: "ci-1", name: "Server" }] })));
    const api = new ServiceNowApi(credentials, transport);
    expect(await api.readPage("cmdb_ci", ["name"], 100)).toEqual([{ sys_id: "ci-1", name: "Server" }]);
    expect(String(transport.mock.calls[0][0])).toContain("/oauth_token.do");
    expect(String(transport.mock.calls[1][0])).toContain("sysparm_offset=100");
    expect(transport.mock.calls[1][1]?.headers).toMatchObject({ Authorization: "Bearer mock-token" });
    expect(transport.mock.calls[1][1]?.redirect).toBe("error");
  });
  it("rejects unauthorized requests without exposing response secrets", async () => {
    const transport = vi.fn<typeof fetch>().mockResolvedValue(new Response("sensitive", { status: 401 }));
    await expect(new ServiceNowApi(credentials, transport).verify()).rejects.toThrow("HTTP 401");
  });
  it("rejects malformed table names before network access", async () => {
    const transport = vi.fn<typeof fetch>();
    await expect(new ServiceNowApi(credentials, transport).readPage("../users", ["name"])).rejects.toThrow();
    expect(transport).not.toHaveBeenCalled();
  });
});
