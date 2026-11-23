import { supabase } from "@/integrations/supabase/client";
import type { OnboardingProfileStore } from "./onboarding";

export interface Profile { id: string; first_name: string; last_name: string; onboarding_completed_at: string | null; onboarding_outcome: string | null }

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from("profiles").select("id, first_name, last_name, onboarding_completed_at, onboarding_outcome").eq("id", userId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateProfileName(userId: string, first_name: string, last_name: string) {
  const { error } = await supabase.from("profiles").update({ first_name, last_name, updated_at: new Date().toISOString() }).eq("id", userId);
  if (error) throw error;
}

/** Account-backed onboarding store: the flag lives on the signed-in user's own profile row. */
export const profileOnboardingStore: OnboardingProfileStore = {
  get: fetchProfile,
  async complete(userId, outcome) {
    const { error } = await supabase.from("profiles").update({ onboarding_completed_at: new Date().toISOString(), onboarding_outcome: outcome }).eq("id", userId);
    if (error) throw error;
  },
  async reset(userId) {
    const { error } = await supabase.from("profiles").update({ onboarding_completed_at: null, onboarding_outcome: null }).eq("id", userId);
    if (error) throw error;
  },
};

export const displayName = (p: Pick<Profile, "first_name" | "last_name"> | null | undefined, email?: string | null) =>
  [p?.first_name, p?.last_name].filter(Boolean).join(" ").trim() || email || "Signed-in user";

/** Planned role model — shown for transparency; access is NOT yet restricted by role. */
export const PLANNED_ROLES = [
  ["administrator", "Administrator", "Manage users, roles and settings"],
  ["bcp_coordinator", "BCP Coordinator", "Own plans, warnings and risk dispositions"],
  ["contributor", "Contributor / Owner", "Maintain assigned functions, processes and components"],
  ["approver", "Approver", "Decide approvals and risk acceptances"],
  ["viewer", "Viewer", "Read-only access"],
] as const;