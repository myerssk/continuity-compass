import { createFileRoute, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/bcp/AppShell";
import { QuickStartPresentation } from "@/components/account/QuickStartPresentation";
import { displayName, fetchProfile, profileOnboardingStore } from "@/lib/account/profile";
import { maybeStartOnboarding } from "@/lib/account/onboarding";
import { setAuditUser } from "@/lib/bcp/store";

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
  useEffect(() => { setAuditUser(user.email ? `${name} <${user.email}>` : name); }, [name, user.email]);
  const checked = useRef<string | null>(null);
  useEffect(() => {
    if (!profile || checked.current === user.id) return;
    checked.current = user.id;
    void maybeStartOnboarding(profileOnboardingStore, user.id);
  }, [profile, user.id]);
  async function signOut() {
    await qc.cancelQueries(); qc.clear();
    setAuditUser(null);
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