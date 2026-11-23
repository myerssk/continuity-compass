/** Navigation section identity: one colour per sidebar group (red stays reserved for real risk). */
export type Section = "overview" | "impact" | "resilience" | "assurance" | "help";

export const SECTION_LABEL: Record<Section, string> = {
  overview: "Overview", impact: "Business Impact", resilience: "Resilience", assurance: "Assurance", help: "Help",
};
/** CSS custom property (defined in styles.css) carrying each section's accent colour. */
export const SECTION_VAR: Record<Section, string> = {
  overview: "var(--section-overview)", impact: "var(--section-impact)", resilience: "var(--section-resilience)",
  assurance: "var(--section-assurance)", help: "var(--section-help)",
};

const BY_SEGMENT: Record<string, Section> = {
  dashboard: "overview", build: "overview", warnings: "overview", account: "overview",
  organizations: "impact", plans: "impact", functions: "impact", processes: "impact", components: "impact",
  fallbacks: "resilience", fallback_assessments: "resilience", strategies: "resilience", runbooks: "resilience", emergency: "resilience",
  tests: "assurance", evidence: "assurance", gaps: "assurance", approvals: "assurance", audit: "assurance",
  help: "help", "quick-start": "help",
};

export function sectionForPath(pathname: string): Section {
  const segment = pathname.split("/").filter(Boolean)[0] ?? "dashboard";
  return BY_SEGMENT[segment] ?? "overview";
}