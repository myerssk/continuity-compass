import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useSessionUser } from "@/lib/account/use-session";
import { BrandMark } from "./Brand";

export function PublicShell({ children }: { children: ReactNode }) {
  const { user } = useSessionUser();
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="bg-sidebar text-sidebar-accent-foreground">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 md:px-8">
          <Link to="/" aria-label="Continuity Compass home"><BrandMark /></Link>
          <nav aria-label="Account" className="flex items-center gap-2">
            {user ? <Button asChild variant="teal" size="sm"><Link to="/dashboard">Open Dashboard</Link></Button> : <>
              <Button asChild variant="ghost" size="sm" className="text-sidebar-accent-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"><Link to="/sign-in">Sign In</Link></Button>
              <Button asChild variant="orange" size="sm"><Link to="/sign-up">Create Account</Link></Button>
            </>}
          </nav>
        </div>
      </header>
      <div className="flex-1">{children}</div>
      <footer className="border-t border-border bg-card">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-5 text-xs text-muted-foreground md:px-8">
          <span>© Continuity Compass · Standalone BCP/DRP planning</span>
          <nav aria-label="Legal" className="flex gap-4"><Link to="/privacy" className="hover:text-primary">Privacy (placeholder)</Link><Link to="/terms" className="hover:text-primary">Terms (placeholder)</Link></nav>
        </div>
      </footer>
    </div>
  );
}

/** Centered themed card for sign-in, sign-up and password pages. */
export function AuthCard({ title, subtitle, children, footer }: { title: string; subtitle?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <PublicShell>
      <main className="grid place-items-center px-4 py-12" style={{ background: "var(--gradient-hero)" }}>
        <div className="w-full max-w-md overflow-hidden rounded-lg border border-border bg-card shadow-xl">
          <div className="h-1 bg-teal" />
          <div className="p-6 sm:p-8">
            <h1 className="text-2xl font-semibold text-primary">{title}</h1>
            {subtitle && <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>}
            <div className="mt-6">{children}</div>
          </div>
          {footer && <div className="border-t border-border bg-muted/50 px-6 py-4 text-sm sm:px-8">{footer}</div>}
        </div>
      </main>
    </PublicShell>
  );
}