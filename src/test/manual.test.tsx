import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return { ...actual, useLocation: () => ({ pathname: "/warnings", search: {} }), Link: ({ to, params, children, activeOptions: _activeOptions, ...props }: { to: string; params?: Record<string, string>; children: ReactNode; activeOptions?: unknown }) => {
    const href = to.replace(/\$(\w+)/g, (_, key: string) => params?.[key] ?? "");
    return <a href={href} {...props}>{children}</a>;
  } };
});
vi.mock("@/components/bcp/DataControls", () => ({ DemoBanner: () => null, SidebarDataControls: () => null }));

import { HelpCenter } from "@/components/bcp/HelpCenter";
import { AppShell } from "@/components/bcp/AppShell";
import { PageHeader } from "@/components/bcp/ui";
import { getDb } from "@/lib/bcp/store";
import { routeTree } from "@/routeTree.gen";

afterEach(cleanup);

describe("In-application manual", () => {
  it.each([["/help", "/_authenticated/help/"], ["/help/fallbacks", "/_authenticated/help/$topic"], ["/build", "/_authenticated/build"], ["/dashboard", "/_authenticated/dashboard"], ["/", "/"]])("matches %s without replacing existing routes", (path, routeId) => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
    expect(router.matchRoutes(path).at(-1)?.routeId).toBe(routeId);
  });
  it("renders the manual route view and exposes topic deep links", () => {
    render(<HelpCenter />);
    expect(screen.getByRole("searchbox", { name: "Search the user manual" })).toBeDefined();
    const nav = screen.getByRole("navigation", { name: "User manual topics" });
    expect(within(nav).getByRole("link", { name: "Fallbacks" }).getAttribute("href")).toBe("/help/fallbacks");
  });
  it("main, mobile, and header navigation reach the manual", () => {
    render(<AppShell><p>Current page</p></AppShell>);
    for (const name of ["Main navigation", "Mobile navigation"]) {
      expect(within(screen.getByRole("navigation", { name })).getByRole("link", { name: "User Manual" }).getAttribute("href")).toBe("/help");
    }
    expect(screen.getByRole("link", { name: "Help & User Manual" }).getAttribute("href")).toBe("/help");
  });
  it("contextual warning help links to the warnings topic", () => {
    render(<PageHeader title="Warnings" />);
    expect(screen.getByRole("link", { name: "Learn more" }).getAttribute("href")).toBe("/help/warnings");
  });
  it("reading and searching does not modify records, progress, audit, or persisted data", () => {
    const before = JSON.stringify(getDb());
    const storageBefore = { ...localStorage };
    const { unmount } = render(<HelpCenter />);
    for (const query of ["RTO", "RPO", "MTPD", "fallback", "runbook", "ServiceNow"]) {
      fireEvent.change(screen.getByRole("searchbox", { name: "Search the user manual" }), { target: { value: query } });
      expect(within(screen.getByRole("region", { name: "Manual search results" })).getAllByRole("link").length).toBeGreaterThan(0);
    }
    unmount();
    render(<HelpCenter topicId="fallbacks" />);
    expect(screen.getByRole("article", { name: "Fallbacks" })).toBeDefined();
    expect(JSON.stringify(getDb())).toBe(before);
    expect({ ...localStorage }).toEqual(storageBefore);
  });
});