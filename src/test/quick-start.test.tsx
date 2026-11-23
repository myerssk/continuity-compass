import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

vi.mock("@tanstack/react-router", async (original) => {
  const actual = await original<typeof import("@tanstack/react-router")>();
  return { ...actual, useLocation: () => ({ pathname: "/quick-start", search: {} }), Link: ({ to, params, children, activeOptions: _activeOptions, ...props }: { to: string; params?: Record<string, string>; children: ReactNode; activeOptions?: unknown }) => <a href={to.replace(/\$(\w+)/g, (_, key: string) => params?.[key] ?? "")} {...props}>{children}</a> };
});
vi.mock("@/components/bcp/DataControls", () => ({ DemoBanner: () => null, SidebarDataControls: () => null, useDataActions: () => ({ setOpen: vi.fn(), dialog: null }) }));
import { QuickStart } from "@/components/bcp/QuickStart";
import { HelpCenter } from "@/components/bcp/HelpCenter";
import { AppShell } from "@/components/bcp/AppShell";
import { getDb, loadDemoData } from "@/lib/bcp/store";
import { routeTree } from "@/routeTree.gen";
afterEach(cleanup);

describe("Separate Quick Start", () => {
  it("matches Quick Start and preserves full manual and wizard routes", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
    for (const [path, id] of [["/quick-start", "/_authenticated/quick-start"], ["/help", "/_authenticated/help/"], ["/help/fallbacks", "/_authenticated/help/$topic"], ["/build", "/_authenticated/build"]]) {
      expect(router.matchRoutes(path ?? "").at(-1)?.routeId).toBe(id);
    }
  });
  it("desktop and mobile navigation both reach Quick Start", () => {
    render(<AppShell><p>Current page</p></AppShell>);
    for (const name of ["Main navigation", "Mobile navigation"]) expect(within(screen.getByRole("navigation", { name })).getByRole("link", { name: "Quick Start" }).getAttribute("href")).toBe("/quick-start");
  });
  it("full manual links to the separate guide without removing topics", () => {
    render(<HelpCenter />);
    expect(screen.getByRole("link", { name: "Quick Start Manual" }).getAttribute("href")).toBe("/quick-start");
    expect(within(screen.getByRole("navigation", { name: "User manual topics" })).getAllByRole("link")).toHaveLength(22);
  });
  it("core actions and deep links match real application destinations", () => {
    render(<QuickStart />);
    for (const href of ["/build", "/help", "/organizations", "/plans", "/functions", "/processes", "/components", "/fallbacks", "/strategies", "/runbooks", "/tests", "/evidence", "/gaps", "/approvals", "/warnings", "/help/recovery-objectives", "/help/fallbacks"]) expect(screen.getAllByRole("link").some((link) => link.getAttribute("href") === href)).toBe(true);
    expect(screen.getByRole("progressbar", { name: "Record-backed setup progress" })).toBeDefined();
  });
  it("reading and selecting a checklist function does not write demo or progress data", () => {
    loadDemoData();
    const before = JSON.stringify(getDb());
    const stored = { ...localStorage };
    render(<QuickStart />);
    const fn = getDb().functions.at(-1);
    if (!fn) throw new Error("Demo function missing");
    fireEvent.change(screen.getByRole("combobox", { name: "Business function" }), { target: { value: fn.id } });
    expect(JSON.stringify(getDb())).toBe(before);
    expect({ ...localStorage }).toEqual(stored);
  });
});