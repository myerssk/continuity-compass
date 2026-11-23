import { QueryClient } from "@tanstack/react-query";
import { createRouter, isRedirect } from "@tanstack/react-router";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

const auth = vi.hoisted(() => ({ user: null as null | { id: string; email: string } }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: async () => ({ data: { user: auth.user } }),
      getSession: async () => ({ data: { session: auth.user ? { user: auth.user } : null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }),
  },
}));
vi.mock("@/integrations/lovable", () => ({ lovable: { auth: { signInWithOAuth: vi.fn() } } }));
vi.mock("@tanstack/react-router", async (original) => {
  const actual = await original<typeof import("@tanstack/react-router")>();
  return { ...actual, useNavigate: () => vi.fn(), useLocation: () => ({ pathname: location.pathname, search: {} }),
    Link: ({ to, params, children, activeOptions: _a, ...props }: { to: string; params?: Record<string, string>; children: ReactNode; activeOptions?: unknown }) => <a href={to.replace(/\$(\w+)/g, (_, k: string) => params?.[k] ?? "")} {...props}>{children}</a> };
});
vi.mock("@/components/bcp/DataControls", () => ({ DemoBanner: () => null, SidebarDataControls: () => null, useDataActions: () => ({ setOpen: vi.fn(), dialog: null }) }));

import { routeTree } from "@/routeTree.gen";
import { Route as Gate } from "@/routes/_authenticated/route";
import { Route as Home } from "@/routes/index";
import { Route as SignIn } from "@/routes/sign-in";
import { Route as SignUp } from "@/routes/sign-up";
import { AppShell } from "@/components/bcp/AppShell";
import { HelpCenter } from "@/components/bcp/HelpCenter";
import { QuickStart } from "@/components/bcp/QuickStart";
import { QuickStartPresentation, SLIDES } from "@/components/account/QuickStartPresentation";
import { closeOnboarding, maybeStartOnboarding, onboardingState, restartOnboarding, type OnboardingProfileStore } from "@/lib/account/onboarding";
import { sectionForPath } from "@/lib/sections";
import { getDb, loadDemoData } from "@/lib/bcp/store";
import { validateSignUp } from "@/lib/account/validation";

/** In-memory stand-in for the per-user profiles table. */
function memoryStore(): OnboardingProfileStore & { rows: Map<string, { onboarding_completed_at: string | null; onboarding_outcome: string | null }> } {
  const rows = new Map<string, { onboarding_completed_at: string | null; onboarding_outcome: string | null }>();
  return {
    rows,
    get: async (id) => rows.get(id) ?? null,
    complete: async (id, outcome) => { rows.set(id, { onboarding_completed_at: new Date().toISOString(), onboarding_outcome: outcome }); },
    reset: async (id) => { rows.set(id, { onboarding_completed_at: null, onboarding_outcome: null }); },
  };
}
const newUser = (s: ReturnType<typeof memoryStore>, id: string) => s.rows.set(id, { onboarding_completed_at: null, onboarding_outcome: null });
const comp = (r: unknown) => (r as { options: { component: () => ReactNode } }).options.component;

beforeEach(() => { closeOnboarding(); auth.user = null; });
afterEach(cleanup);

describe("Public and authentication routes", () => {
  it("routes public pages outside the sign-in gate and app pages inside it", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
    for (const [path, id] of [["/", "/"], ["/sign-in", "/sign-in"], ["/sign-up", "/sign-up"], ["/forgot-password", "/forgot-password"], ["/reset-password", "/reset-password"], ["/dashboard", "/_authenticated/dashboard"], ["/build", "/_authenticated/build"], ["/functions", "/_authenticated/$type/"], ["/account", "/_authenticated/account"]] as const) {
      expect(router.matchRoutes(path).at(-1)?.routeId).toBe(id);
    }
  });
  it("public home renders while signed out without exposing plan records", () => {
    loadDemoData();
    const Comp = comp(Home);
    render(<Comp />);
    expect(screen.getByRole("heading", { level: 1 })).toBeDefined();
    expect(screen.getAllByRole("link", { name: /Sign In/ }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: /Create Account|Get Started/ }).length).toBeGreaterThan(0);
    expect(screen.getByText("Fallback Intelligence")).toBeDefined();
    expect(screen.getByText(/Planned · not connected/)).toBeDefined();
    const fn = String(getDb().functions[0]?.name);
    expect(document.body.textContent).not.toContain(fn);
  });
  it("Sign In and Create Account render their forms", () => {
    vi.spyOn(SignIn, "useSearch").mockReturnValue({} as never);
    const In = comp(SignIn); const { unmount } = render(<In />);
    expect(screen.getByLabelText("Email")).toBeDefined(); expect(screen.getByRole("link", { name: "Forgot password?" })).toBeDefined();
    unmount();
    const Up = comp(SignUp); render(<Up />);
    for (const l of ["First name", "Last name", "Email", "Password", "Confirm password"]) expect(screen.getByLabelText(l)).toBeDefined();
  });
  it("sign-up rejects mismatched passwords", () => {
    expect(validateSignUp({ first: "A", last: "B", email: "a@b.co", password: "longenough", confirm: "different1" })).toBe("Passwords do not match.");
    expect(validateSignUp({ first: "A", last: "B", email: "a@b.co", password: "longenough", confirm: "longenough" })).toBeNull();
  });
  it("protected routes redirect signed-out visitors to Sign In", async () => {
    const beforeLoad = (Gate.options as { beforeLoad: (a: unknown) => Promise<unknown> }).beforeLoad;
    const err = await beforeLoad({ location: { href: "/dashboard" } }).catch((e: unknown) => e);
    expect(isRedirect(err)).toBe(true);
    expect((err as { options: { to: string } }).options.to).toBe("/sign-in");
  });
  it("authenticated users enter the app", async () => {
    auth.user = { id: "u1", email: "u1@example.com" };
    const beforeLoad = (Gate.options as { beforeLoad: (a: unknown) => Promise<{ user: { id: string } }> }).beforeLoad;
    expect((await beforeLoad({ location: { href: "/dashboard" } })).user.id).toBe("u1");
  });
});

describe("90-second Quick Start onboarding", () => {
  it("shows on a new user's first sign-in; Skip records it and it does not return", async () => {
    const s = memoryStore(); newUser(s, "alice");
    expect(await maybeStartOnboarding(s, "alice")).toBe(true);
    render(<QuickStartPresentation userId="alice" store={s} />);
    expect(screen.getByRole("dialog")).toBeDefined();
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Skip" })); });
    expect(s.rows.get("alice")?.onboarding_outcome).toBe("skipped");
    closeOnboarding();
    expect(await maybeStartOnboarding(s, "alice")).toBe(false);
    expect(onboardingState().open).toBe(false);
  });
  it("Finish after Back/Next records completion and does not return", async () => {
    const s = memoryStore(); newUser(s, "bob");
    await maybeStartOnboarding(s, "bob");
    render(<QuickStartPresentation userId="bob" store={s} />);
    expect(screen.getByRole("button", { name: /Back/ })).toHaveProperty("disabled", true);
    for (let i = 1; i < SLIDES.length; i++) fireEvent.click(screen.getByRole("button", { name: /Next/ }));
    expect(screen.getByRole("progressbar", { name: "Presentation progress" }).getAttribute("aria-valuenow")).toBe(String(SLIDES.length));
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Finish" })); });
    expect(s.rows.get("bob")?.onboarding_outcome).toBe("finished");
    expect(await maybeStartOnboarding(s, "bob")).toBe(false);
  });
  it("another new user still gets their own first-use onboarding", async () => {
    const s = memoryStore(); newUser(s, "alice"); newUser(s, "carol");
    await s.complete("alice", "finished");
    expect(await maybeStartOnboarding(s, "alice")).toBe(false);
    expect(await maybeStartOnboarding(s, "carol")).toBe(true);
  });
  it("Help and Quick Start Manual replay it without changing records or the user's onboarding state", async () => {
    loadDemoData();
    const s = memoryStore(); newUser(s, "dana"); await s.complete("dana", "skipped");
    const profileBefore = JSON.stringify(s.rows.get("dana"));
    const dbBefore = JSON.stringify(getDb()); const lsBefore = JSON.stringify({ ...localStorage });
    const { unmount } = render(<><HelpCenter /><QuickStartPresentation userId="dana" store={s} /></>);
    fireEvent.click(screen.getByRole("button", { name: "Replay 90-Second Quick Start" }));
    expect(onboardingState()).toEqual({ open: true, mode: "replay" });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Skip" })); });
    unmount();
    render(<QuickStart />);
    expect(screen.getByRole("button", { name: "Replay 90-Second Quick Start" })).toBeDefined();
    expect(JSON.stringify(s.rows.get("dana"))).toBe(profileBefore);
    expect(JSON.stringify(getDb())).toBe(dbBefore);
    expect(JSON.stringify({ ...localStorage })).toBe(lsBefore);
  });
  it("restart onboarding clears only that user's flag", async () => {
    const s = memoryStore(); newUser(s, "e"); newUser(s, "f");
    await s.complete("e", "finished"); await s.complete("f", "finished");
    await restartOnboarding(s, "e");
    expect(onboardingState().mode).toBe("first-use");
    expect(s.rows.get("e")?.onboarding_completed_at).toBeNull();
    expect(s.rows.get("f")?.onboarding_completed_at).not.toBeNull();
  });
});

describe("Section theme and app navigation", () => {
  it.each([["/dashboard", "overview"], ["/build", "overview"], ["/functions", "impact"], ["/components/x", "impact"], ["/fallbacks", "resilience"], ["/emergency", "resilience"], ["/tests", "assurance"], ["/audit", "assurance"], ["/help/fallbacks", "help"], ["/quick-start", "help"]])("%s belongs to %s", (path, section) => {
    expect(sectionForPath(path)).toBe(section);
  });
  it("shell renders section identity, desktop/mobile nav to Build and Dashboard, and an account menu", () => {
    history.pushState({}, "", "/fallbacks");
    render(<AppShell account={{ name: "Ada Lovelace", email: "ada@example.com", onSignOut: vi.fn() }}><p>Page</p></AppShell>);
    expect(screen.getByTestId("workspace").getAttribute("data-section")).toBe("resilience");
    for (const name of ["Main navigation", "Mobile navigation"]) {
      const nav = within(screen.getByRole("navigation", { name }));
      expect(nav.getByRole("link", { name: "Dashboard" }).getAttribute("href")).toBe("/dashboard");
      expect(nav.getByRole("link", { name: "Build My BCP/DRP" }).getAttribute("href")).toBe("/build");
    }
    expect(document.querySelector('[data-section="assurance"]')).not.toBeNull();
    expect(screen.getByRole("button", { name: "Account menu" })).toBeDefined();
  });
});