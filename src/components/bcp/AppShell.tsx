import { Link, useLocation } from "@tanstack/react-router";
import { Activity, Compass, AlertTriangle, BookOpen, Boxes, Building2, CheckSquare, CircleHelp, ClipboardList, FileCheck2, FlaskConical, GitBranch, History, LayoutDashboard, LifeBuoy, Network, PackageOpen, ShieldCheck, Workflow, LogOut, UserRound, ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { DemoBanner, SidebarDataControls } from "./DataControls";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { SECTION_VAR, sectionForPath, type Section } from "@/lib/sections";
import { openOnboarding } from "@/lib/account/onboarding";
import type { CSSProperties } from "react";

const NAV: { group: string; section: Section; items: { to: string; type?: string; label: string; icon: typeof Activity }[] }[] = [
  { group: "Overview", section: "overview", items: [{ to: "/build", label: "Build My BCP/DRP", icon: Compass }, { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard }, { to: "/warnings", label: "Warnings", icon: AlertTriangle }] },
  { group: "Business Impact", section: "impact", items: [
    { to: "/$type", type: "organizations", label: "Organizations", icon: Building2 },
    { to: "/$type", type: "plans", label: "Plans", icon: ClipboardList },
    { to: "/$type", type: "functions", label: "L1 Business Functions", icon: Network },
    { to: "/$type", type: "processes", label: "L2 Processes", icon: Workflow },
    { to: "/$type", type: "components", label: "L3 Components", icon: Boxes },
  ] },
  { group: "Resilience", section: "resilience", items: [
    { to: "/$type", type: "fallbacks", label: "Fallbacks", icon: GitBranch },
    { to: "/$type", type: "strategies", label: "Recovery Strategies", icon: LifeBuoy },
    { to: "/$type", type: "runbooks", label: "Runbooks", icon: BookOpen },
    { to: "/emergency", label: "Emergency Package", icon: PackageOpen },
  ] },
  { group: "Assurance", section: "assurance", items: [
    { to: "/$type", type: "tests", label: "Tests & Exercises", icon: FlaskConical },
    { to: "/$type", type: "evidence", label: "Evidence", icon: FileCheck2 },
    { to: "/$type", type: "gaps", label: "Gaps & Actions", icon: CheckSquare },
    { to: "/$type", type: "approvals", label: "Approvals", icon: ShieldCheck },
    { to: "/audit", label: "Audit History", icon: History },
  ] },
  { group: "Help", section: "help", items: [{ to: "/quick-start", label: "Quick Start", icon: Compass }, { to: "/help", label: "User Manual", icon: BookOpen }] },
];

export type ShellAccount = { name: string; email: string; onSignOut: () => void };
const sectionStyle = (s: Section) => ({ ["--section"]: SECTION_VAR[s] }) as CSSProperties;

export function AppShell({ children, account }: { children: ReactNode; account?: ShellAccount }) {
  const { pathname } = useLocation();
  const section = sectionForPath(pathname);
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="print:hidden sticky top-0 hidden h-screen w-60 shrink-0 flex-col overflow-y-auto bg-sidebar text-sidebar-foreground md:flex">
        <div className="flex items-center gap-2 border-b border-sidebar-border px-4 py-4">
          <div className="grid h-8 w-8 place-items-center rounded bg-sidebar-primary text-sidebar-primary-foreground"><Compass className="h-4 w-4" /></div>
          <div><div className="text-sm font-semibold text-sidebar-accent-foreground">Continuity Compass</div><div className="text-[10px] uppercase tracking-widest text-sidebar-primary">BCP · DRP</div></div>
        </div>
        <nav aria-label="Main navigation" className="flex-1 space-y-4 px-2 py-4">
          {NAV.map((g) => (
            <div key={g.group} data-section={g.section} style={sectionStyle(g.section)}>
              <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-section">{g.group}</div>
              {g.items.map((it) => (
                <Link key={it.label} to={it.to} {...(it.type ? { params: { type: it.type } } : {})} 
                  className="flex items-center gap-2.5 rounded px-2 py-1.5 text-[13px] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[status=active]:bg-sidebar-accent data-[status=active]:text-sidebar-accent-foreground data-[status=active]:shadow-[inset_3px_0_0_var(--section)]">
                  <it.icon className="h-4 w-4 text-section" />{it.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <SidebarDataControls />
      </aside>
      <div className="min-w-0 flex-1" data-section={section} data-testid="workspace" style={sectionStyle(section)}>
        <div aria-hidden="true" className="h-1 bg-section print:hidden" />
        <nav aria-label="Mobile navigation" className="flex gap-1 overflow-x-auto border-b border-border bg-sidebar px-3 py-2 md:hidden print:hidden">
          {NAV.flatMap((g) => g.items.map((it) => ({ ...it, section: g.section }))).map((it) => (
            <Link key={it.label} style={sectionStyle(it.section)} to={it.to} {...(it.type ? { params: { type: it.type } } : {})} className="whitespace-nowrap rounded px-2 py-1 text-xs text-sidebar-foreground data-[status=active]:bg-sidebar-accent data-[status=active]:shadow-[inset_0_-2px_0_var(--section)]">{it.label}</Link>
          ))}
        </nav>
        <header className="print:hidden flex items-center justify-end border-b border-border px-4 py-1 md:px-8">
          <Button asChild variant="ghost" size="sm"><Link to="/quick-start"><Compass aria-hidden="true" />Quick Start</Link></Button>
          <Button asChild variant="ghost" size="sm"><Link to="/help" aria-label="Help & User Manual"><CircleHelp aria-hidden="true" />Help</Link></Button>
          {account && <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" size="sm" aria-label="Account menu"><UserRound aria-hidden="true" /><span className="hidden max-w-40 truncate sm:inline">{account.name}</span><ChevronDown aria-hidden="true" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuLabel><div className="truncate">{account.name}</div><div className="truncate text-xs font-normal text-muted-foreground">{account.email}</div></DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild><Link to="/account"><UserRound />Account & security</Link></DropdownMenuItem>
              <DropdownMenuItem onSelect={() => openOnboarding("replay")}><Compass />Replay 90-Second Quick Start</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={account.onSignOut}><LogOut />Sign out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>}
        </header>
        <DemoBanner />
        <main className="mx-auto max-w-[1400px] px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}