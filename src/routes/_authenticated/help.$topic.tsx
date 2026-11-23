import { createFileRoute, notFound } from "@tanstack/react-router";
import { HelpCenter } from "@/components/bcp/HelpCenter";
import { manualTopic } from "@/lib/bcp/manual";

export const Route = createFileRoute("/_authenticated/help/$topic")({
  beforeLoad: ({ params }) => { if (!manualTopic(params.topic)) throw notFound(); },
  head: ({ params }) => {
    const topic = manualTopic(params.topic);
    const title = `${topic?.title ?? "Help topic unavailable"} — Continuity Compass User Manual`;
    const description = topic?.summary ?? "Browse the Continuity Compass user manual for planning and recovery guidance.";
    return { meta: [{ title }, { name: "description", content: description }, { property: "og:title", content: title }, { property: "og:description", content: description }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] };
  },
  component: HelpTopic,
});
function HelpTopic() { const { topic } = Route.useParams(); return <HelpCenter key={topic} topicId={topic} />; }