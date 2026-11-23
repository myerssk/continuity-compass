import { useSyncExternalStore } from "react";

/**
 * First-use "90-second Quick Start" state. Completion is stored per user on their profile
 * (never in BCP/DRP records or a global flag); opening/closing the presentation never touches plan data.
 */
export type OnboardingOutcome = "finished" | "skipped";
export interface OnboardingProfile { onboarding_completed_at: string | null; onboarding_outcome?: string | null }
export interface OnboardingProfileStore {
  get(userId: string): Promise<OnboardingProfile | null>;
  complete(userId: string, outcome: OnboardingOutcome): Promise<void>;
  reset(userId: string): Promise<void>;
}

/** Auto-show only while this user's profile has no completion/skip recorded. */
export function needsOnboarding(profile: OnboardingProfile | null | undefined): boolean {
  return !!profile && !profile.onboarding_completed_at;
}

export type OnboardingMode = "first-use" | "replay";
let state: { open: boolean; mode: OnboardingMode } = { open: false, mode: "replay" };
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());

export function openOnboarding(mode: OnboardingMode = "replay") { state = { open: true, mode }; emit(); }
export function closeOnboarding() { state = { ...state, open: false }; emit(); }
export const onboardingState = () => state;
export function useOnboardingState() {
  return useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => state, () => state);
}

/** Called once a user is signed in: opens the first-use presentation if that user has not seen it. */
export async function maybeStartOnboarding(store: OnboardingProfileStore, userId: string): Promise<boolean> {
  const show = needsOnboarding(await store.get(userId));
  if (show) openOnboarding("first-use");
  return show;
}

/** Skip or Finish. Only a first-use run records the outcome; a voluntary replay changes nothing. */
export async function endOnboarding(store: OnboardingProfileStore, userId: string | undefined, outcome: OnboardingOutcome) {
  const { mode } = state;
  closeOnboarding();
  if (mode === "first-use" && userId) await store.complete(userId, outcome);
}

/** Help/Profile "restart onboarding": clears only this user's onboarding flag, then replays. */
export async function restartOnboarding(store: OnboardingProfileStore, userId: string) {
  await store.reset(userId);
  openOnboarding("first-use");
}