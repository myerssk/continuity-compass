/* eslint-disable @typescript-eslint/no-explicit-any */
// Relational model mirrored 1:1 by db/schema.sql. Every table has an `id` text PK.
export type Rec = { id: string } & Record<string, any>;

export type TableName = "organizations" | "plans" | "functions" | "processes" | "components" | "process_components" | "component_dependencies" | "fallbacks" | "fallback_dependencies" | "strategies" | "runbooks" | "runbook_steps" | "tests" | "evidence" | "gaps" | "approvals" | "fallback_assessments";

export type FieldType = "text" | "textarea" | "number" | "select" | "date" | "ref" | "target";
export interface Field {
  key: string;
  label: string;
  type: FieldType;
  options?: readonly string[] | undefined;
  ref?: TableName | undefined;
  list?: boolean | undefined;
  required?: boolean | undefined;
  hint?: string | undefined;
}

export const TARGET_TYPES = ["functions", "processes", "components", "fallbacks"] as const;
export type TargetType = (typeof TARGET_TYPES)[number];

const CRIT = ["Critical", "High", "Medium", "Low"];
export const FB_ASSESS_STATUS = ["No Fallback Available", "Fallback Developed"];
export const RISK_DISPOSITIONS = ["Not Yet Addressed", "Gap Opened", "Risk Acceptance Pending", "Risk Accepted", "Not Applicable", "Superseded by Fallback"];
export const TEST_TYPES = ["Tabletop", "Walkthrough", "Simulation", "Failover", "Full interruption", "Restore", "Fallback / manual workaround", "Vendor", "Application recovery", "End-to-end DR"];
const APPROVAL = ["Draft", "In Review", "Approved", "Rejected"];

const target = (types: readonly TargetType[] = TARGET_TYPES): Field[] => [
  { key: "target_type", label: "Attached to (type)", type: "target", options: [...types], list: true, required: true },
  { key: "target_id", label: "Attached to", type: "text", required: true },
];

export const TABLES = {
  organizations: {
    label: "Organizations", singular: "Organization", title: "name",
    fields: [
      { key: "name", label: "Name", type: "text", list: true, required: true },
      { key: "industry", label: "Industry", type: "text", list: true },
      { key: "region", label: "Region", type: "text", list: true },
    ],
  },
  plans: {
    label: "Plans", singular: "Plan", title: "name",
    fields: [
      { key: "organization_id", label: "Organization", type: "ref", ref: "organizations", list: true, required: true },
      { key: "name", label: "Plan name", type: "text", list: true, required: true },
      { key: "version", label: "Version", type: "text", list: true },
      { key: "owner", label: "Plan owner", type: "text", list: true },
      { key: "status", label: "Status", type: "select", options: APPROVAL, list: true },
      { key: "review_date", label: "Next review", type: "date", list: true },
    ],
  },
  functions: {
    label: "Business Functions", singular: "Business Function", title: "name", level: 1,
    fields: [
      { key: "plan_id", label: "Plan", type: "ref", ref: "plans", required: true },
      { key: "code", label: "Code", type: "text", list: true },
      { key: "name", label: "Name", type: "text", list: true, required: true },
      { key: "owner", label: "Business owner", type: "text", list: true },
      { key: "department", label: "Department", type: "text" },
      { key: "criticality", label: "Criticality", type: "select", options: CRIT, list: true, required: true },
      { key: "mtpd_h", label: "MTPD (h)", type: "number", list: true, hint: "Maximum tolerable period of disruption" },
      { key: "rto_h", label: "Business RTO (h)", type: "number", list: true },
      { key: "rpo_h", label: "Business RPO (h)", type: "number", list: true },
      { key: "operating_hours", label: "Operating hours", type: "text" },
      { key: "peak_periods", label: "Peak periods", type: "text" },
      { key: "approval_status", label: "Approval status", type: "select", options: APPROVAL, list: true },
      { key: "description", label: "Description", type: "textarea" },
    ],
  },
  processes: {
    label: "Business Processes", singular: "Business Process", title: "name", level: 2,
    fields: [
      { key: "function_id", label: "Business function", type: "ref", ref: "functions", list: true, required: true },
      { key: "code", label: "Code", type: "text", list: true },
      { key: "name", label: "Name", type: "text", list: true, required: true },
      { key: "owner", label: "Process owner", type: "text", list: true },
      { key: "recovery_sequence", label: "Recovery sequence", type: "number", list: true },
      { key: "rto_h", label: "Process RTO (h)", type: "number", list: true },
      { key: "rpo_h", label: "Process RPO (h)", type: "number" },
      { key: "inputs", label: "Inputs", type: "textarea" },
      { key: "outputs", label: "Outputs", type: "textarea" },
      { key: "manual_workaround", label: "Manual workaround", type: "textarea" },
      { key: "uses_technology", label: "Depends on technology / suppliers", type: "select", options: ["Yes", "No"] },
    ],
  },
  components: {
    label: "Supporting Components", singular: "Supporting Component", title: "name", level: 3,
    fields: [
      { key: "name", label: "Name", type: "text", list: true, required: true },
      { key: "type", label: "Type", type: "select", options: ["Application", "Infrastructure", "Database", "Interface", "Facility", "Vendor", "Data"], list: true, required: true },
      { key: "technical_owner", label: "Technical owner", type: "text", list: true },
      { key: "hosting", label: "Hosting", type: "text", list: true },
      { key: "location", label: "Location", type: "text" },
      { key: "tech_rto_h", label: "Technical RTO (h)", type: "number", list: true },
      { key: "tech_rpo_h", label: "Technical RPO (h)", type: "number", list: true },
      { key: "backup_method", label: "Backup", type: "text" },
      { key: "failover_method", label: "Failover", type: "text" },
    ],
  },
  process_components: {
    label: "Process ↔ Component links", singular: "Dependency link", title: "id", hidden: true,
    fields: [
      { key: "process_id", label: "Process", type: "ref", ref: "processes", list: true, required: true },
      { key: "component_id", label: "Component", type: "ref", ref: "components", list: true, required: true },
    ],
  },
  component_dependencies: {
    label: "Component dependencies", singular: "Component dependency", title: "id", hidden: true,
    fields: [
      { key: "component_id", label: "Component", type: "ref", ref: "components", list: true, required: true },
      { key: "depends_on_id", label: "Depends on", type: "ref", ref: "components", list: true, required: true },
    ],
  },
  fallbacks: {
    label: "Fallbacks", singular: "Fallback", title: "name",
    fields: [
      ...target(["functions", "processes", "components"]),
      { key: "name", label: "Name", type: "text", list: true, required: true },
      { key: "parent_id", label: "Chain: activates after", type: "ref", ref: "fallbacks", hint: "Leave empty for a first-line fallback" },
      { key: "fallback_type", label: "Type", type: "select", options: ["Manual workaround", "Alternate system", "Alternate site", "Alternate vendor", "Degraded service"], list: true },
      { key: "activation_criteria", label: "Activation criteria", type: "textarea" },
      { key: "owner", label: "Owner", type: "text", list: true },
      { key: "alternate_owner", label: "Alternate owner", type: "text" },
      { key: "capacity_pct", label: "Capacity %", type: "number", list: true },
      { key: "max_duration_h", label: "Maximum duration (h)", type: "number" },
      { key: "data_rpo_impact", label: "Data / RPO impact", type: "textarea" },
      { key: "reconciliation", label: "Reconciliation", type: "textarea" },
      { key: "return_to_normal", label: "Return to normal", type: "textarea" },
      { key: "last_tested", label: "Last tested", type: "date", list: true },
      { key: "test_result", label: "Test result", type: "select", options: ["Not tested", "Pass", "Partial", "Fail"], list: true },
      { key: "evidence_ref", label: "Evidence reference", type: "text" },
      { key: "status", label: "Status", type: "select", options: ["Draft", "Ready", "Validated", "Retired"], list: true },
    ],
  },
  fallback_dependencies: {
    label: "Fallback dependencies", singular: "Fallback dependency", title: "id", hidden: true,
    fields: [
      { key: "fallback_id", label: "Fallback", type: "ref", ref: "fallbacks", list: true, required: true },
      { key: "component_id", label: "Depends on component", type: "ref", ref: "components", list: true, required: true },
    ],
  },
  strategies: {
    label: "Recovery Strategies", singular: "Recovery Strategy", title: "name",
    fields: [
      ...target(),
      { key: "name", label: "Name", type: "text", list: true, required: true },
      { key: "strategy_type", label: "Strategy type", type: "select", options: ["Active-active", "Warm standby", "Cold standby", "Backup & restore", "Relocation", "Outsource", "Accept risk"], list: true },
      { key: "est_recovery_h", label: "Estimated recovery (h)", type: "number", list: true },
      { key: "status", label: "Status", type: "select", options: APPROVAL, list: true },
      { key: "description", label: "Description", type: "textarea" },
    ],
  },
  runbooks: {
    label: "Runbooks", singular: "Runbook", title: "name",
    fields: [
      ...target(),
      { key: "name", label: "Name", type: "text", list: true, required: true },
      { key: "owner", label: "Owner", type: "text", list: true },
      { key: "version", label: "Version", type: "text", list: true },
      { key: "status", label: "Status", type: "select", options: ["Draft", "In Review", "Approved", "Outdated"], list: true },
      { key: "origin", label: "Origin", type: "select", options: ["Manual", "Generated draft — review required"], list: true, hint: "Generated drafts must be reviewed by a person; they are never auto-approved" },
      { key: "last_reviewed", label: "Last reviewed", type: "date", list: true },
    ],
  },
  runbook_steps: {
    label: "Runbook Steps", singular: "Runbook Step", title: "title", hidden: true,
    fields: [
      { key: "runbook_id", label: "Runbook", type: "ref", ref: "runbooks", required: true },
      { key: "step_no", label: "Step #", type: "number", list: true },
      { key: "title", label: "Title", type: "text", list: true, required: true },
      { key: "role", label: "Responsible role", type: "text", list: true },
      { key: "est_minutes", label: "Est. minutes", type: "number", list: true },
      { key: "instructions", label: "Instructions", type: "textarea" },
    ],
  },
  tests: {
    label: "Tests & Exercises", singular: "Test / Exercise", title: "name",
    fields: [
      ...target(),
      { key: "name", label: "Name", type: "text", list: true, required: true },
      { key: "test_type", label: "Type", type: "select", options: TEST_TYPES, list: true },
      { key: "scheduled_date", label: "Scheduled", type: "date", list: true },
      { key: "executed_date", label: "Executed", type: "date" },
      { key: "result", label: "Result", type: "select", options: ["Scheduled", "Pass", "Partial", "Fail"], list: true },
      { key: "achieved_rto_h", label: "Achieved RTO (h)", type: "number" },
      { key: "findings", label: "Findings", type: "textarea" },
      { key: "expected_evidence", label: "Expected evidence", type: "textarea", hint: "What must be captured to prove the test result" },
    ],
  },
  evidence: {
    label: "Evidence", singular: "Evidence item", title: "title",
    fields: [
      ...target(),
      { key: "title", label: "Title", type: "text", list: true, required: true },
      { key: "evidence_type", label: "Type", type: "select", options: ["Test report", "Screenshot", "Log extract", "Sign-off", "Contract", "Other"], list: true },
      { key: "reference", label: "Reference / link", type: "text" },
      { key: "captured_date", label: "Captured", type: "date", list: true },
      { key: "captured_by", label: "Captured by", type: "text", list: true },
    ],
  },
  gaps: {
    label: "Gaps & Corrective Actions", singular: "Gap", title: "title",
    fields: [
      ...target(),
      { key: "title", label: "Title", type: "text", list: true, required: true },
      { key: "severity", label: "Severity", type: "select", options: CRIT, list: true },
      { key: "description", label: "Description", type: "textarea" },
      { key: "corrective_action", label: "Corrective action", type: "textarea" },
      { key: "owner", label: "Action owner", type: "text", list: true },
      { key: "due_date", label: "Due", type: "date", list: true },
      { key: "status", label: "Status", type: "select", options: ["Open", "In Progress", "Closed"], list: true },
    ],
  },
  fallback_assessments: {
    label: "Fallback Assessments", singular: "Fallback Assessment", title: "fallback_status",
    fields: [
      ...target(["functions", "processes", "components"]),
      { key: "fallback_status", label: "Fallback status", type: "select", options: FB_ASSESS_STATUS, list: true, required: true },
      { key: "continuity_capability", label: "Continuity capability", type: "select", options: ["Process Stops", "Continues via Fallback"], list: true },
      { key: "risk_disposition", label: "Risk disposition", type: "select", options: RISK_DISPOSITIONS, list: true, hint: "Changed only by an explicit BCP Coordinator choice" },
      { key: "gap_id", label: "Linked gap", type: "ref", ref: "gaps" },
      { key: "approval_id", label: "Risk-acceptance approval", type: "ref", ref: "approvals" },
      { key: "disposition_owner", label: "Disposition owner / approver", type: "text", list: true },
      { key: "rationale", label: "Rationale", type: "textarea" },
      { key: "assessed_on", label: "Assessed on", type: "date", list: true },
      { key: "disposition_on", label: "Disposition on", type: "date" },
    ],
  },
  approvals: {
    label: "Approvals", singular: "Approval", title: "approver",
    fields: [
      ...target(),
      { key: "approver", label: "Approver", type: "text", list: true, required: true },
      { key: "role", label: "Role", type: "text", list: true },
      { key: "decision", label: "Decision", type: "select", options: ["Pending", "Approved", "Rejected", "Withdrawn"], list: true },
      { key: "lifecycle", label: "Lifecycle", type: "text", list: true },
      { key: "superseded_reason", label: "Superseded reason", type: "text" },
      { key: "superseded_on", label: "Superseded on", type: "date" },
      { key: "decided_on", label: "Decided on", type: "date", list: true },
      { key: "comments", label: "Comments", type: "textarea" },
    ],
  },
} as const satisfies Record<TableName, { label: string; singular: string; title: string; fields: Field[]; level?: number; hidden?: boolean }>;


export const tableNames = Object.keys(TABLES) as TableName[];
export const isTable = (t: string): t is TableName => t in TABLES;
export const tableDef = (t: TableName) =>
  TABLES[t] as { label: string; singular: string; title: string; fields: readonly Field[]; level?: number; hidden?: boolean };

export interface AuditEntry { id: string; table: TableName; record_id: string; action: "create" | "update" | "delete"; at: string; user: string; summary: string }
export type DataMode = "empty" | "user" | "demo";
export type StageId = "organization" | "plan" | "function" | "bia" | "processes" | "components" | "fallbacks" | "strategy" | "runbook" | "test" | "validation" | "approval";
/** Guided "Build My BCP/DRP" progress. Only holds pointers into the real tables plus unsaved form drafts (wizard_progress in db/schema.sql). */
export interface WizardState {
  stage: StageId;
  organization_id?: string | undefined; plan_id?: string | undefined; function_id?: string | undefined;
  strategy_id?: string | undefined; runbook_id?: string | undefined; test_id?: string | undefined; approval_id?: string | undefined;
  /** "table:id" -> can the business continue if this item is unavailable? */
  answers: Record<string, "yes" | "no">;
  /** legacy; the answer now lives on processes.uses_technology */
  no_tech: string[];
  validation_reviewed?: boolean | undefined;
  drafts: Record<string, Record<string, any>>;
  /** "table:id" of the item the user chose to develop a fallback for */
  focus_key?: string | undefined;
  started_at: string; updated_at: string;
}
export type Db = { [K in TableName]: Rec[] } & { audit_log: AuditEntry[]; mode?: DataMode; wizard?: WizardState | null };