import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { AuthCard } from "@/components/account/PublicShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Forgot Password — Continuity Compass" }, { name: "description", content: "Request a password reset link for your Continuity Compass account." }, { property: "og:title", content: "Forgot Password — Continuity Compass" }, { property: "og:description", content: "Request a password reset link for your Continuity Compass account." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Forgot,
});

function Forgot() {
  const [email, setEmail] = useState(""); const [sent, setSent] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + "/reset-password" });
    if (error) { toast.error(error.message); return; }
    setSent(true);
  }
  return (
    <AuthCard title="Reset your password" subtitle="We'll email you a secure link." footer={<Link to="/sign-in" className="font-medium text-teal hover:underline">Back to sign in</Link>}>
      {sent ? <p className="text-sm">If an account exists for <b>{email}</b>, a reset link is on its way.</p> :
        <form onSubmit={submit} className="grid gap-4"><div className="grid gap-1.5"><Label htmlFor="email">Email</Label><Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div><Button type="submit">Send reset link</Button></form>}
    </AuthCard>
  );
}