import { createFileRoute, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/bcp/AppShell";
import { QuickStartPresentation } from "@/components/account/QuickStartPresentation";
import { displayName, fetchProfile, profileOnboardingStore } from "@/lib/account/profile";
import { maybeStartOnboarding } from "@/lib/account/onboarding";
import { importDb, setAuditUser, setCommitHook, setStorageScope } from "@/lib/bcp/store";
import { getSelectedWorkspaceId, listMyWorkspaces, setSelectedWorkspaceId } from "@/lib/account/workspaces";
import { loadWorkspaceBcpState, saveWorkspaceBcpState } from "@/lib/bcp/cloud-state";
import { appendWorkspaceAudit } from "@/lib/integrations/servicenow";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/sign-in", search: { redirect: location.href } });
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const nav = useNavigate();
  const { data: profile } = useQuery({ queryKey: ["profile", user.id], queryFn: () => fetchProfile(user.id) });
  const name = displayName(profile, user.email);
  const { data: memberships = [] } = useQuery({ queryKey: ["workspaces", user.id], queryFn: listMyWorkspaces });
  const selectedWorkspaceId = getSelectedWorkspaceId(user.id);
  const activeMembership = memberships.find((m) => m.workspace_id === selectedWorkspaceId) ?? memberships[0];
  const activeWorkspaceId = activeMembership?.workspace_id ?? null;
  useEffect(() => {
    setAuditUser(user.email ? `${name} <${user.email}>` : name);
    setStorageScope(activeWorkspaceId ? `workspace:${activeWorkspaceId}` : `user:${user.id}`);
    if (activeWorkspaceId && activeWorkspaceId !== selectedWorkspaceId) setSelectedWorkspaceId(user.id, activeWorkspaceId);
  }, [name, user.email, user.id, activeWorkspaceId, selectedWorkspaceId]);
  useEffect(() => {
    setCommitHook(null);
    if (!activeWorkspaceId) return;
    let cancelled = false;
    let revision = 0;
    let hydrated = false;
    void loadWorkspaceBcpState(activeWorkspaceId).then((cloud) => {
      if (cancelled) return;
      revision = cloud?.revision ?? 0;
      if (cloud?.state) importDb(cloud.state);
      hydrated = true;
      setCommitHook(async (next, entry) => {
        if (!hydrated || cancelled) return;
        const saved = await saveWorkspaceBcpState(activeWorkspaceId, next, user.id, revision);
        revision = saved.revision;
        if (entry) await appendWorkspaceAudit(activeWorkspaceId, user.id, entry.action, entry.table, entry.record_id, entry.summary, { local_audit_id: entry.id });
      });
    });
    return () => {
      cancelled = true;
      setCommitHook(null);
    };
  }, [activeWorkspaceId, user.id]);
  const checked = useRef<string | null>(null);
  useEffect(() => {
    if (!profile || checked.current === user.id) return;
    checked.current = user.id;
    void maybeStartOnboarding(profileOnboardingStore, user.id);
  }, [profile, user.id]);
  async function signOut() {
    await qc.cancelQueries(); qc.clear();
    setAuditUser(null);
    setCommitHook(null);
    setStorageScope(null);
    await supabase.auth.signOut();
    nav({ to: "/sign-in", replace: true });
  }
  const store = {
    ...profileOnboardingStore,
    complete: async (id: string, o: "finished" | "skipped") => { await profileOnboardingStore.complete(id, o); void qc.invalidateQueries({ queryKey: ["profile", id] }); },
  };
  return (
    <AppShell account={{ name, email: user.email ?? "", onSignOut: signOut }}>
      <Outlet />
      <QuickStartPresentation userId={user.id} store={store} />
    </AppShell>
  );
}