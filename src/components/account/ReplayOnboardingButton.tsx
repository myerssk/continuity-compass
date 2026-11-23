import { PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { openOnboarding } from "@/lib/account/onboarding";

/** Voluntary replay: opens the presentation only; never changes plan data or the user's onboarding record. */
export function ReplayOnboardingButton({ className }: { className?: string }) {
  return <Button variant="outline" size="sm" className={className} onClick={() => openOnboarding("replay")}><PlayCircle aria-hidden />Replay 90-Second Quick Start</Button>;
}