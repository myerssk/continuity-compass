import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { AuthCard } from "@/components/account/PublicShell";
import { SocialButtons } from "@/components/account/SocialButtons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { safeRedirect, useSessionUser } from "@/lib/account/use-session";

export const Route = createFileRoute("/sign-in")({
  validateSearch: (s: Record<string, unknown>): { redirect?: string } => (typeof s.redirect === "string" ? { redirect: s.redirect } : {}),
  head: () => ({ meta: [{ title: "Sign In — Continuity Compass" }, { name: "description", content: "Sign in to your Continuity Compass BCP/DRP workspace." }, { property: "og:title", content: "Sign In — Continuity Compass" }, { property: "og:description", content: "Sign in to your Continuity Compass BCP/DRP workspace." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: SignIn,
});

function SignIn() {
  const { redirect } = Route.useSearch();
  const nav = useNavigate();
  const { user } = useSessionUser();
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [busy, setBusy] = useState(false);
  const done = () => nav({ to: safeRedirect(redirect), replace: true });
  useEffect(() => { if (user) done(); }, [user]); // eslint-disable-line react-hooks/exhaustive-deps
  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    done();
  }
  return (
    <AuthCard title="Sign in" subtitle="Welcome back to your continuity workspace." footer={<>New to Continuity Compass? <Link to="/sign-up" className="font-medium text-teal hover:underline">Create an account</Link></>}>
      <SocialButtons onDone={done} />
      <form onSubmit={submit} className="grid gap-4">
        <div className="grid gap-1.5"><Label htmlFor="email">Email</Label><Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div className="grid gap-1.5"><div className="flex justify-between"><Label htmlFor="password">Password</Label><Link to="/forgot-password" className="text-xs text-teal hover:underline">Forgot password?</Link></div><Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
        <Button type="submit" disabled={busy}>{busy ? "Signing in…" : "Sign In"}</Button>
      </form>
    </AuthCard>
  );
}