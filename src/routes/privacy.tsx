import { createFileRoute } from "@tanstack/react-router";
import { PublicShell } from "@/components/account/PublicShell";

export const Route = createFileRoute("/privacy")({
  head: () => ({ meta: [{ title: "Privacy (Placeholder) — Continuity Compass" }, { name: "description", content: "Placeholder page: the Continuity Compass privacy document has not been written or approved." }, { property: "og:title", content: "Privacy (Placeholder) — Continuity Compass" }, { property: "og:description", content: "Placeholder page: the Continuity Compass privacy document has not been written or approved." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: () => (
    <PublicShell>
      <main className="mx-auto max-w-3xl px-4 py-14 md:px-8">
        <span className="rounded bg-orange/15 px-2 py-1 text-xs font-semibold uppercase tracking-wider text-orange">Placeholder — not approved legal content</span>
        <h1 className="mt-4 text-3xl font-semibold text-primary">Privacy</h1>
        <p className="mt-4 text-sm leading-7">This page is a placeholder. No privacy text has been drafted or approved for Continuity Compass yet. Your organization's legal or privacy team must supply the real document before production use.</p>
      </main>
    </PublicShell>
  ),
});