import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/bcp/ui";
import { WarningList } from "@/components/bcp/WarningList";
import { computeWarnings, WARNING_LABEL, type WarningKind } from "@/lib/bcp/rules";
import { useDb } from "@/lib/bcp/store";

export const Route = createFileRoute("/_authenticated/warnings")({
  head: () => ({ meta: [{ title: "Warnings — Continuity Compass" }, { name: "description", content: "Automated recovery-objective, fallback and dependency warnings." }, { property: "og:title", content: "Warnings — Continuity Compass" }, { property: "og:description", content: "Automated BCP/DRP warnings." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: WarningsPage,
});

function WarningsPage() {
  const db = useDb();
  const all = computeWarnings(db);
  const [kind, setKind] = useState<WarningKind | "all">("all");
  const kinds = Object.keys(WARNING_LABEL) as WarningKind[];
  return (
    <>
      <PageHeader eyebrow="Overview" title="Warnings"><p className="mt-1 text-sm text-muted-foreground">{all.length} active warnings across the plan.</p></PageHeader>
      <div className="mb-4 flex flex-wrap gap-2">
        {(["all", ...kinds] as const).map((k) => (
          <button key={k} onClick={() => setKind(k)} className={`rounded-full border px-3 py-1 text-xs ${kind === k ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-accent"}`}>
            {k === "all" ? "All" : WARNING_LABEL[k]} <span className="num ml-1 opacity-70">{k === "all" ? all.length : all.filter((w) => w.kind === k).length}</span>
          </button>
        ))}
      </div>
      <WarningList db={db} warnings={kind === "all" ? all : all.filter((w) => w.kind === kind)} />
    </>
  );
}