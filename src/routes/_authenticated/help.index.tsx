import { createFileRoute } from "@tanstack/react-router";
import { HelpCenter } from "@/components/bcp/HelpCenter";

export const Route = createFileRoute("/_authenticated/help/")({
  head: () => ({ meta: [
    { title: "User Manual & Help Center — Continuity Compass" },
    { name: "description", content: "Search the Continuity Compass user manual: guided planning, recovery objectives, fallbacks, testing, governance, and standalone operation." },
    { property: "og:title", content: "User Manual & Help Center — Continuity Compass" },
    { property: "og:description", content: "Practical help for business continuity and disaster recovery planning in Continuity Compass." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: HelpHome,
});
function HelpHome() { return <HelpCenter />; }