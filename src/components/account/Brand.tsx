import { Compass } from "lucide-react";
export function BrandMark() {
  return <span className="flex items-center gap-2">
    <span className="grid h-8 w-8 place-items-center rounded bg-sidebar-primary text-sidebar-primary-foreground"><Compass className="h-4 w-4" aria-hidden /></span>
    <span><span className="block text-sm font-semibold">Continuity Compass</span><span className="block text-[10px] uppercase tracking-widest text-sidebar-primary">BCP · DRP</span></span>
  </span>;
}