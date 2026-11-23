import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { AuthCard } from "@/components/account/PublicShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Set New Password — Continuity Compass" }, { name: "description", content: "Choose a new password for your Continuity Compass account." }, { property: "og:title", content: "Set New Password — Continuity Compass" }, { property: "og:description", content: "Choose a new password for your Continuity Compass account." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Reset,
});

function Reset() {
  const nav = useNavigate();
  const [pw, setPw] = useState(""); const [confirm, setConfirm] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (pw.length < 8) { toast.error("Use at least 8 characters."); return; }
    if (pw !== confirm) { toast.error("Passwords do not match."); return; }
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) { toast.error(error.message); return; }
    toast.success("Password updated"); nav({ to: "/dashboard" });
  }
  return (
    <AuthCard title="Set a new password" subtitle="Open this page from the link in your reset email.">
      <form onSubmit={submit} className="grid gap-4">
        <div className="grid gap-1.5"><Label htmlFor="pw">New password</Label><Input id="pw" type="password" autoComplete="new-password" required value={pw} onChange={(e) => setPw(e.target.value)} /></div>
        <div className="grid gap-1.5"><Label htmlFor="confirm">Confirm new password</Label><Input id="confirm" type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} /></div>
        <Button type="submit">Update password</Button>
      </form>
    </AuthCard>
  );
}