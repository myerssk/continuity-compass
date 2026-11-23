import { Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowLeft, ArrowRight, BookOpen, ClipboardCheck, Compass, Gauge, GitBranch, LifeBuoy, Network, Timer, Workflow, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SECTION_LABEL, SECTION_VAR, type Section } from "@/lib/sections";
import { endOnboarding, useOnboardingState, type OnboardingProfileStore } from "@/lib/account/onboarding";

type Slide = { title: string; section: Section; icon: typeof Compass; points: ReactNode[]; topic?: string; visual?: ReactNode };

const Chip = ({ children }: { children: ReactNode }) => <span className="rounded border border-border bg-card px-2 py-1 text-xs font-medium text-primary">{children}</span>;

export const SLIDES: Slide[] = [
  { title: "Welcome to Continuity Compass", section: "overview", icon: Compass, topic: "getting-started",
    points: ["Plan, validate, test and maintain business continuity and disaster recovery.", "Everything you enter stays in this standalone workspace."] },
  { title: "Two ways to work", section: "overview", icon: Workflow, topic: "build",
    points: [<><b>Build My BCP/DRP</b> — guided, step by step.</>, <><b>Dashboard & registers</b> — direct editing.</>, "Both use the same records — nothing is duplicated."] },
  { title: "The core hierarchy", section: "impact", icon: Network, topic: "functions",
    points: [], visual: <ol className="grid gap-2 sm:grid-cols-3">{[["L1 Function", "WHAT must continue"], ["L2 Process", "HOW it is done"], ["L3 Component", "WHAT it depends on"]].map(([a, b], i) => <li key={a} className="rounded-md border border-border bg-card p-3"><div className="num text-xs text-muted-foreground">{i + 1}</div><div className="font-semibold text-primary">{a}</div><div className="text-sm">{b}</div></li>)}</ol> },
  { title: "Recovery objectives", section: "impact", icon: Timer, topic: "recovery-objectives",
    points: [<><b>MTPD</b> — longest outage before unacceptable harm.</>, <><b>Business RTO / RPO</b> — how fast back, how much data loss is tolerable.</>, <><b>Technical RTO / RPO</b> — what each component can actually deliver.</>] },
  { title: "Fallbacks", section: "resilience", icon: GitBranch, topic: "fallbacks",
    points: ["An approved alternate way to keep going.", "Chain them: Primary → Fallback A → Fallback B.", <>"No fallback — process stops" is a <b>governed risk</b>, never hidden.</>],
    visual: <div className="flex flex-wrap items-center gap-2"><Chip>Primary</Chip><ArrowRight className="h-4 w-4" aria-hidden /><Chip>Fallback A</Chip><ArrowRight className="h-4 w-4" aria-hidden /><Chip>Fallback B</Chip></div> },
  { title: "Recovery execution", section: "resilience", icon: LifeBuoy, topic: "runbooks",
    points: [<><b>Recovery Strategy</b> — how normal service is restored.</>, <><b>Runbook</b> — the exact ordered steps to execute.</>, "Generated runbooks stay Draft until a person reviews them."] },
  { title: "Assurance", section: "assurance", icon: ClipboardCheck, topic: "tests",
    points: ["Tests prove it works; Evidence records the proof.", "Gaps track what must be fixed.", "Approvals and risk acceptances are always human decisions."] },
  { title: "Dashboard", section: "overview", icon: Gauge, topic: "dashboard",
    points: [<><AlertTriangle className="inline h-4 w-4 text-destructive" aria-hidden /> Warnings flag real conflicts and missing coverage.</>, "Readiness scores only what you've assessed.", "Next Best Action points to the most important fix."] },
  { title: "Get started", section: "help", icon: BookOpen,
    points: ["Start fresh with Build My BCP/DRP.", "Then follow the Quick Start Manual; dig deeper in the full User Manual."] },
];

/** Concise, user-paced orientation (~90 seconds). No timer; Skip available from the first screen. */
export function QuickStartPresentation({ userId, store }: { userId: string | undefined; store: OnboardingProfileStore }) {
  const { open } = useOnboardingState();
  const [i, setI] = useState(0);
  useEffect(() => { if (open) setI(0); }, [open]);
  const slide = SLIDES[i]!;
  const last = i === SLIDES.length - 1;
  const end = (outcome: "finished" | "skipped") => { void endOnboarding(store, userId, outcome); };
  const Icon = slide.icon;
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) end("skipped"); }}>
      <DialogContent className="max-w-2xl gap-0 overflow-hidden p-0 [&>button:last-child]:hidden" style={{ ["--section" as string]: SECTION_VAR[slide.section] }} data-section={slide.section}>
        <div className="h-1.5 bg-section" />
        <div className="flex items-center justify-between px-6 pt-4">
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-section">90-Second Quick Start · {SECTION_LABEL[slide.section]}</span>
          <Button variant="ghost" size="sm" onClick={() => end("skipped")}><X aria-hidden />Skip</Button>
        </div>
        <div className="px-6 pb-6 pt-3">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-section/15 text-section"><Icon className="h-6 w-6" aria-hidden /></div>
            <DialogTitle className="text-xl text-primary">{slide.title}</DialogTitle>
          </div>
          <DialogDescription className="sr-only">Screen {i + 1} of {SLIDES.length}</DialogDescription>
          {slide.visual && <div className="mt-5">{slide.visual}</div>}
          {slide.points.length > 0 && <ul className="mt-5 space-y-2.5 text-[15px] leading-6">{slide.points.map((p, k) => <li key={k} className="flex gap-2.5"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-section" /><span>{p}</span></li>)}</ul>}
          {last && <div className="mt-5 flex flex-wrap gap-2">
            <Button asChild variant="teal"><Link to="/build" onClick={() => end("finished")}><Compass />Build My BCP/DRP</Link></Button>
            <Button asChild variant="outline"><Link to="/quick-start" onClick={() => end("finished")}>Quick Start Manual</Link></Button>
            <Button asChild variant="outline"><Link to="/help" onClick={() => end("finished")}><BookOpen />User Manual</Link></Button>
          </div>}
          {slide.topic && <Button asChild variant="link" size="sm" className="mt-3 px-0"><Link to="/help/$topic" params={{ topic: slide.topic }} onClick={() => end("skipped")}>Learn more<span className="sr-only"> about {slide.title}</span></Link></Button>}
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-border bg-muted/50 px-6 py-3">
          <div className="flex items-center gap-1.5" role="progressbar" aria-label="Presentation progress" aria-valuemin={1} aria-valuemax={SLIDES.length} aria-valuenow={i + 1}>
            {SLIDES.map((s, k) => <span key={s.title} className={cn("h-1.5 rounded-full transition-all", k === i ? "w-5 bg-section" : k < i ? "w-1.5 bg-primary/50" : "w-1.5 bg-border")} />)}
            <span className="num ml-2 text-xs text-muted-foreground">{i + 1}/{SLIDES.length}</span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={i === 0} onClick={() => setI(i - 1)}><ArrowLeft aria-hidden />Back</Button>
            {last ? <Button size="sm" onClick={() => end("finished")}>Finish</Button> : <Button size="sm" onClick={() => setI(i + 1)}>Next<ArrowRight aria-hidden /></Button>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}