import { createFileRoute } from "@tanstack/react-router";
import { PublicShell } from "@/components/account/PublicShell";

export const Route = createFileRoute("/terms")({
  head: () => ({ meta: [{ title: "Terms (Placeholder) — Continuity Compass" }, { name: "description", content: "Placeholder page: the Continuity Compass terms document has not been written or approved." }, { property: "og:title", content: "Terms (Placeholder) — Continuity Compass" }, { property: "og:description", content: "Placeholder page: the Continuity Compass terms document has not been written or approved." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: () => (
    <PublicShell>
      <main className="mx-auto max-w-3xl px-4 py-14 md:px-8">
        <span className="rounded bg-orange/15 px-2 py-1 text-xs font-semibold uppercase tracking-wider text-orange">Placeholder — not approved legal content</span>
        <h1 className="mt-4 text-3xl font-semibold text-primary">Terms</h1>
        <p className="mt-4 text-sm leading-7">This page is a placeholder. No terms text has been drafted or approved for Continuity Compass yet. Your organization's legal or privacy team must supply the real document before production use.</p>
      </main>
    </PublicShell>
  ),
});