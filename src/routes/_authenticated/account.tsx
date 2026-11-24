import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { PageHeader, Panel } from "@/components/bcp/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { fetchProfile, PLANNED_ROLES, profileOnboardingStore, updateProfileName } from "@/lib/account/profile";
import { restartOnboarding } from "@/lib/account/onboarding";
import { ReplayOnboardingButton } from "@/components/account/ReplayOnboardingButton";
import { createWorkspace, getSelectedWorkspaceId, listMyWorkspaces, setSelectedWorkspaceId } from "@/lib/account/workspaces";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({ meta: [{ title: "Account & Security — Continuity Compass" }, { name: "description", content: "Manage your Continuity Compass profile, password and onboarding preferences." }, { property: "og:title", content: "Account & Security — Continuity Compass" }, { property: "og:description", content: "Your profile, password and onboarding settings." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Account,
});

function Account() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const { data: profile } = useQuery({ queryKey: ["profile", user.id], queryFn: () => fetchProfile(user.id) });
  const { data: roles = [] } = useQuery({ queryKey: ["roles", user.id], queryFn: async () => (await supabase.from("user_roles").select("role").eq("user_id", user.id)).data?.map((r) => r.role) ?? [] });
  const { data: memberships = [] } = useQuery({ queryKey: ["workspaces", user.id], queryFn: listMyWorkspaces });
  const [workspaceName, setWorkspaceName] = useState("");
  const [first, setFirst] = useState(""); const [last, setLast] = useState("");
  useEffect(() => { if (profile) { setFirst(profile.first_name); setLast(profile.last_name); } }, [profile]);
  const [cur, setCur] = useState(""); const [pw, setPw] = useState(""); const [confirm, setConfirm] = useState("");

  async function saveName(e: FormEvent) {
    e.preventDefault();
    try { await updateProfileName(user.id, first.trim(), last.trim()); await qc.invalidateQueries({ queryKey: ["profile", user.id] }); toast.success("Profile updated"); }
    catch (err) { toast.error((err as Error).message); }
  }
  async function changePw(e: FormEvent) {
    e.preventDefault();
    if (pw.length < 8) { toast.error("Use at least 8 characters."); return; }
    if (pw !== confirm) { toast.error("Passwords do not match."); return; }
    const { error } = await supabase.auth.updateUser({ password: pw, current_password: cur } as Parameters<typeof supabase.auth.updateUser>[0]);
    if (error) { toast.error(error.message); return; }
    setCur(""); setPw(""); setConfirm(""); toast.success("Password changed");
  }
  async function addWorkspace(e: FormEvent) {
    e.preventDefault();
    try { const w = await createWorkspace(workspaceName, user.id); setSelectedWorkspaceId(user.id, w.id); setWorkspaceName(""); await qc.invalidateQueries({ queryKey: ["workspaces", user.id] }); toast.success("Workspace created"); window.location.reload(); }
    catch (err) { toast.error((err as Error).message); }
  }
  async function restart() {
    await restartOnboarding(profileOnboardingStore, user.id);
    await qc.invalidateQueries({ queryKey: ["profile", user.id] });
  }
  const onboarded = profile?.onboarding_completed_at;
  return (
    <>
      <PageHeader title="Account & Security">Your sign-in identity is kept separate from BCP/DRP records.</PageHeader>
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Profile">
          <form onSubmit={saveName} className="grid gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5"><Label htmlFor="first">First name</Label><Input id="first" value={first} onChange={(e) => setFirst(e.target.value)} /></div>
              <div className="grid gap-1.5"><Label htmlFor="last">Last name</Label><Input id="last" value={last} onChange={(e) => setLast(e.target.value)} /></div>
            </div>
            <div className="grid gap-1.5"><Label htmlFor="em">Email</Label><Input id="em" value={user.email ?? ""} readOnly disabled /></div>
            <p className="text-xs text-muted-foreground">Your name is recorded in Audit History for changes you make.</p>
            <Button type="submit" className="justify-self-start">Save profile</Button>
          </form>
        </Panel>
        <Panel title="Change password">
          <form onSubmit={changePw} className="grid gap-4">
            <div className="grid gap-1.5"><Label htmlFor="cur">Current password</Label><Input id="cur" type="password" autoComplete="current-password" value={cur} onChange={(e) => setCur(e.target.value)} /></div>
            <div className="grid gap-1.5"><Label htmlFor="npw">New password</Label><Input id="npw" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} /></div>
            <div className="grid gap-1.5"><Label htmlFor="cpw">Confirm new password</Label><Input id="cpw" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} /></div>
            <Button type="submit" className="justify-self-start">Change password</Button>
          </form>
        </Panel>
        <Panel title="90-Second Quick Start">
          <p className="text-sm">{onboarded ? `You ${profile?.onboarding_outcome === "skipped" ? "skipped" : "finished"} it on ${new Date(onboarded).toLocaleDateString()}.` : "Not yet completed — it will show on your next visit."}</p>
          <div className="mt-3 flex flex-wrap gap-2"><ReplayOnboardingButton /><Button variant="ghost" size="sm" onClick={restart}>Restart onboarding</Button></div>
          <p className="mt-2 text-xs text-muted-foreground">Replaying or restarting never changes plan records.</p>
        </Panel>
        <Panel title="Workspaces">
          <p className="text-sm text-muted-foreground">Workspaces are the security boundary for shared BCP/DRP data. They are separate from Business Impact Organizations.</p>
          <div className="mt-3 space-y-2">{memberships.map((m) => <button key={m.workspace_id} onClick={() => { setSelectedWorkspaceId(user.id, m.workspace_id); window.location.reload(); }} className="flex w-full items-center justify-between rounded border border-border px-3 py-2 text-left text-sm"><span>{m.workspaces?.name ?? m.workspace_id}</span><span className="text-xs text-muted-foreground">{m.role}{getSelectedWorkspaceId(user.id) === m.workspace_id ? " · Active" : ""}</span></button>)}</div>
          <form onSubmit={addWorkspace} className="mt-4 flex gap-2"><Input aria-label="New workspace name" placeholder="New workspace name" value={workspaceName} onChange={(e) => setWorkspaceName(e.target.value)} /><Button type="submit">Create</Button></form>
        </Panel>
        <Panel title="Workspace roles">
          <p className="text-sm">Workspace roles are enforced by database row-level security for cloud continuity data. Global role assignments below are retained for compatibility and administration.</p>
          <ul className="mt-3 divide-y divide-border text-sm">{PLANNED_ROLES.map(([key, label, text]) => <li key={key} className="flex justify-between gap-3 py-2"><span><b>{label}</b> — <span className="text-muted-foreground">{text}</span></span>{roles.includes(key) && <span className="text-xs font-semibold text-teal">Assigned</span>}</li>)}</ul>
        </Panel>
      </div>
    </>
  );
}