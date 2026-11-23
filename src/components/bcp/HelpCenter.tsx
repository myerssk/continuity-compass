import { ReplayOnboardingButton } from "@/components/account/ReplayOnboardingButton";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, BookOpen, Compass, Search } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MANUAL_TOPICS, manualTopic, searchManual, type ManualSection } from "@/lib/bcp/manual";
import { useIsMobile } from "@/hooks/use-mobile";

function Section({ section, index }: { section: ManualSection; index: number }) {
  return (
    <section id={`section-${index + 1}`} className="scroll-mt-6 border-t border-border py-6 first:border-t-0 first:pt-0">
      <h2 className="mb-3 text-lg font-semibold text-primary">{section.heading}</h2>
      <div className="space-y-3 text-sm leading-7 text-foreground">
        {section.paragraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        {section.bullets && <ul className="list-disc space-y-2 pl-5 marker:text-teal">{section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>}
        {section.table && <div className="overflow-hidden rounded-md border border-border"><table className="w-full table-fixed text-left text-sm"><thead className="bg-muted"><tr>{section.table.headers.map((header, i) => <th key={header} scope="col" className={`px-3 py-2 font-semibold text-primary ${i === 0 ? "w-[34%]" : ""}`}>{header}</th>)}</tr></thead><tbody>{section.table.rows.map((row, i) => <tr key={i} className="border-t border-border bg-card">{row.map((cell, j) => <td key={j} className={`break-words px-3 py-3 align-top leading-6 ${j === 0 ? "font-medium text-primary" : ""}`}>{cell}</td>)}</tr>)}</tbody></table></div>}
        {section.note && <aside className="border-l-4 border-orange bg-orange/10 px-4 py-3 text-sm leading-6"><span className="font-semibold text-primary">Important: </span>{section.note}</aside>}
      </div>
    </section>
  );
}

export function HelpCenter({ topicId }: { topicId?: string }) {
  const isMobile = useIsMobile();
  const topic = topicId ? manualTopic(topicId) : undefined;
  const [query, setQuery] = useState("");
  const results = searchManual(query);
  const searching = query.trim().length > 0;
  const currentIndex = MANUAL_TOPICS.findIndex((item) => item.id === topicId);
  const next = currentIndex >= 0 ? MANUAL_TOPICS[currentIndex + 1] : undefined;
  return (
    <>
      <header className="mb-6 border-b border-border pb-5">
        <div className="mb-4 flex flex-wrap gap-2"><ReplayOnboardingButton /><Button asChild variant="outline" size="sm"><Link to="/quick-start">Quick Start Manual<ArrowRight /></Link></Button></div>
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-teal"><BookOpen className="h-4 w-4" aria-hidden="true" />Continuity Compass · Help Center</div>
        {topic ? <><Button asChild variant="link" size="sm" className="mb-2 px-0"><Link to="/help"><ArrowLeft />User Manual</Link></Button><h1 className="text-2xl font-semibold text-primary">{topic.title}</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{topic.summary}</p></> : <><h1 className="text-2xl font-semibold text-primary">User Manual</h1><p className="mt-2 text-sm text-muted-foreground">Plan, maintain, and review your business continuity and disaster recovery work.</p></>}
        <label className="relative mt-5 block max-w-2xl"><span className="sr-only">Search the user manual</span><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" aria-hidden="true" /><input type="search" placeholder="Search the user manual…" value={query} onChange={(event) => setQuery(event.target.value)} className="h-10 w-full rounded-md border border-input bg-card pl-10 pr-3 text-sm outline-none focus:border-teal focus:ring-2 focus:ring-ring/30" /></label>
      </header>
      <div className="grid min-w-0 gap-8 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <nav aria-label="User manual topics" className="min-w-0">
          <details open={!isMobile} className="lg:sticky lg:top-4">
            <summary className="mb-3 cursor-pointer text-sm font-semibold text-primary">Table of contents</summary>
            <div className="grid gap-0.5 sm:grid-cols-2 lg:grid-cols-1">
              {MANUAL_TOPICS.map((item) => <Link key={item.id} to="/help/$topic" params={{ topic: item.id }} aria-current={item.id === topicId ? "page" : undefined} className={`rounded border-l-2 px-2.5 py-1.5 text-[13px] leading-5 transition-colors ${item.id === topicId ? "border-teal bg-accent font-semibold text-primary" : "border-transparent text-muted-foreground hover:bg-muted hover:text-primary"}`}>{item.title}</Link>)}
            </div>
          </details>
        </nav>
        <div className="min-w-0">
          {searching ? <section aria-label="Manual search results"><h2 className="mb-4 text-lg font-semibold text-primary" aria-live="polite">{results.length} {results.length === 1 ? "topic" : "topics"} found</h2>{results.length ? <TopicCards topics={results} /> : <div className="border-l-2 border-orange px-4 py-3"><p className="font-medium text-primary">No matching topics</p><p className="mt-1 text-sm text-muted-foreground">Try a recovery term such as RTO, fallback, or approval.</p><Button variant="outline" size="sm" className="mt-3" onClick={() => setQuery("")}>Clear search</Button></div>}</section>
            : topic ? <article aria-label={topic.title} className="max-w-4xl"><nav aria-label="On this page" className="mb-6 border-b border-border pb-4"><h2 className="mb-2 text-xs font-semibold uppercase text-teal">On this page</h2><ul className="flex flex-wrap gap-x-5 gap-y-2">{topic.sections.map((section, index) => <li key={section.heading}><a href={`#section-${index + 1}`} className="text-sm text-primary underline-offset-4 hover:underline">{section.heading}</a></li>)}</ul></nav>{topic.sections.map((section, index) => <Section key={section.heading} section={section} index={index} />)}<footer className="flex flex-wrap justify-between gap-3 border-t border-border pt-4"><Button asChild variant="outline"><Link to="/help"><ArrowLeft />All topics</Link></Button>{next && <Button asChild variant="outline" className="h-auto min-h-9 whitespace-normal text-left"><Link to="/help/$topic" params={{ topic: next.id }}>{next.title}<ArrowRight /></Link></Button>}</footer></article>
              : <>
                <section className="mb-7 border-b border-border pb-6" aria-labelledby="quick-start-heading"><h2 id="quick-start-heading" className="text-lg font-semibold text-primary">Quick Start</h2><ol className="my-4 grid gap-3 text-sm sm:grid-cols-3">{["Set up your organization, plan, and business function.", "Define recovery objectives, dependencies, and fallbacks.", "Review the runbook, test, capture evidence, and obtain approval."].map((text, index) => <li key={text} className="flex items-start gap-2.5"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent text-xs font-semibold text-teal">{index + 1}</span><span className="leading-6">{text}</span></li>)}</ol><div className="flex flex-wrap gap-2"><Button asChild variant="teal"><Link to="/build"><Compass />Build My BCP/DRP</Link></Button><Button asChild variant="outline"><Link to="/help/$topic" params={{ topic: "getting-started" }}>Getting Started<ArrowRight /></Link></Button><Button asChild variant="ghost"><Link to="/help/$topic" params={{ topic: "glossary" }}>Glossary index</Link></Button></div></section>
                <section aria-labelledby="browse-heading"><h2 id="browse-heading" className="mb-4 text-lg font-semibold text-primary">Browse the manual</h2><TopicCards topics={MANUAL_TOPICS} /></section>
              </>}
        </div>
      </div>
    </>
  );
}

function TopicCards({ topics }: { topics: typeof MANUAL_TOPICS }) {
  return <div className="grid gap-3 xl:grid-cols-2">{topics.map((topic) => <Link key={topic.id} to="/help/$topic" params={{ topic: topic.id }} className="group flex min-w-0 items-start justify-between gap-3 rounded-md border border-border bg-card p-4 transition-colors hover:border-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><div className="min-w-0"><h3 className="text-sm font-semibold leading-6 text-primary">{topic.title}</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">{topic.summary}</p></div><ArrowRight className="mt-1 h-4 w-4 shrink-0 text-teal" aria-hidden="true" /></Link>)}</div>;
}