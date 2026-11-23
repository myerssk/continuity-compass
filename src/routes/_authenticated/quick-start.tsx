import { createFileRoute } from "@tanstack/react-router";
import { QuickStart } from "@/components/bcp/QuickStart";

export const Route = createFileRoute("/_authenticated/quick-start")({
  head: () => ({ meta: [
    { title: "Quick Start Manual — Continuity Compass" },
    { name: "description", content: "Fifteen practical steps to create and review your first BCP/DRP, with linked actions and read-only setup progress." },
    { property: "og:title", content: "Quick Start Manual — Continuity Compass" },
    { property: "og:description", content: "Create a basic, reviewable continuity plan using guided creation and existing records." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: QuickStart,
});