import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { MailCheck } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { AuthCard } from "@/components/account/PublicShell";
import { SocialButtons } from "@/components/account/SocialButtons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { validateSignUp } from "@/lib/account/validation";

export const Route = createFileRoute("/sign-up")({
  head: () => ({ meta: [{ title: "Create Account — Continuity Compass" }, { name: "description", content: "Create your Continuity Compass account to start building your BCP/DRP." }, { property: "og:title", content: "Create Account — Continuity Compass" }, { property: "og:description", content: "Create your Continuity Compass account to start building your BCP/DRP." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: SignUp,
});

function SignUp() {
  const nav = useNavigate();
  const [f, setF] = useState({ first: "", last: "", email: "", password: "", confirm: "" });
  const [busy, setBusy] = useState(false); const [sent, setSent] = useState(false);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  async function submit(e: FormEvent) {
    e.preventDefault();
    const problem = validateSignUp(f); if (problem) { toast.error(problem); return; }
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({ email: f.email, password: f.password, options: { emailRedirectTo: window.location.origin + "/dashboard", data: { first_name: f.first.trim(), last_name: f.last.trim() } } });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    if (data.session) nav({ to: "/dashboard" }); else setSent(true);
  }
  if (sent) return <AuthCard title="Check your email" subtitle={<>We sent a confirmation link to <b>{f.email}</b>.</>} footer={<Link to="/sign-in" className="font-medium text-teal hover:underline">Back to sign in</Link>}><MailCheck className="h-10 w-10 text-teal" aria-hidden /><p className="mt-3 text-sm">Open the link to activate your account, then sign in. You'll see a short 90-second Quick Start the first time.</p></AuthCard>;
  return (
    <AuthCard title="Create your account" subtitle="Your account secures access. Organizations and plans are created inside the app." footer={<>Already have an account? <Link to="/sign-in" className="font-medium text-teal hover:underline">Sign in</Link></>}>
      <SocialButtons onDone={() => nav({ to: "/dashboard" })} />
      <form onSubmit={submit} className="grid gap-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5"><Label htmlFor="first">First name</Label><Input id="first" autoComplete="given-name" required value={f.first} onChange={set("first")} /></div>
          <div className="grid gap-1.5"><Label htmlFor="last">Last name</Label><Input id="last" autoComplete="family-name" required value={f.last} onChange={set("last")} /></div>
        </div>
        <div className="grid gap-1.5"><Label htmlFor="email">Email</Label><Input id="email" type="email" autoComplete="email" required value={f.email} onChange={set("email")} /></div>
        <div className="grid gap-1.5"><Label htmlFor="password">Password</Label><Input id="password" type="password" autoComplete="new-password" required minLength={8} value={f.password} onChange={set("password")} /></div>
        <div className="grid gap-1.5"><Label htmlFor="confirm">Confirm password</Label><Input id="confirm" type="password" autoComplete="new-password" required value={f.confirm} onChange={set("confirm")} /></div>
        <Button type="submit" variant="orange" disabled={busy}>{busy ? "Creating account…" : "Create Account"}</Button>
      </form>
    </AuthCard>
  );
}