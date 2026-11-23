/** Bundled, read-only help content. Never imports the application store. */
export interface ManualSection {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
  table?: { headers: string[]; rows: string[][] };
  note?: string;
}
export interface ManualTopic {
  id: string;
  title: string;
  summary: string;
  keywords: string[];
  sections: ManualSection[];
}

export const MANUAL_TOPICS: ManualTopic[] = [
  {
    id: "getting-started", title: "Getting Started", summary: "Create your first plan or maintain existing records.", keywords: ["quick start", "standalone", "empty", "local", "sequence", "backup"],
    sections: [
      { heading: "Quick Start", bullets: ["Open Build My BCP/DRP and start with your organization and plan.", "Identify one business function, its owner, and its recovery requirements.", "Add the processes and dependencies that deliver it, then assess fallbacks.", "Document restoration, review the draft runbook, and plan a test.", "Record actual test results and evidence, address gaps, and obtain a human approval.", "Return to the Dashboard to review readiness and the next action."] },
      { heading: "Recommended operating sequence", paragraphs: ["Organization → Plan → Business Function → BIA/Recovery Objectives → Business Processes → Supporting Components/Dependencies → Fallbacks → Recovery Strategy → Runbook → Test → Evidence → Gaps/Corrective Actions → Approval → Dashboard/Readiness.", "You can revisit earlier records as you learn more. Start with one capability rather than trying to complete the entire organization at once."] },
      { heading: "Two ways to work, one set of records", table: { headers: ["Way to work", "Use it for"], rows: [["Build My BCP/DRP", "Guided questions that create, update, and link ordinary application records."], ["Dashboard, registers, and detail pages", "Direct maintenance: correct a field, add a dependency, record a test, or review an approval."]] }, note: "The guided workflow and registers use the same records. There is no separate wizard-only plan; select an existing function to continue its work rather than creating a duplicate." },
      { heading: "Standalone Mode and your data", paragraphs: ["Continuity Compass operates standalone using the current browser’s local dataset. The manual is bundled with the application and needs no ServiceNow or other external service. Fresh use starts empty, not with fictional records.", "Local browser persistence is not a shared team repository or a backup. Use the available data backup download before destructive actions and keep emergency exports in a secure location. Clearing browser storage or moving to another browser may make your local records unavailable."], note: "Bundled help remains available wherever the standalone application is available. This does not mean the hosted application has an installed offline cache or can be opened without a network connection." },
    ],
  },
  {
    id: "build", title: "Build My BCP/DRP", summary: "The twelve guided stages, contributors, saving, and resume behavior.", keywords: ["wizard", "progress", "back", "continue", "save", "resume", "owner"],
    sections: [
      { heading: "What to provide at each stage", table: { headers: ["Stage", "Contributor and information"], rows: [
        ["1 · Organization", "BCP Coordinator: choose or create the organization covered by the plan."],
        ["2 · Plan", "BCP Coordinator: plan name, owner, scope/context, and review date."],
        ["3 · Business Function", "Business Owner: name the capability/service, owner, and business context."],
        ["4 · BIA & Recovery Objectives", "Business Owner: criticality, impacts, MTPD, Business RTO/RPO, operating hours, and peak periods."],
        ["5 · Business Processes", "Process Owner: inputs, outputs, owner, recovery order, workaround, and whether technology is used."],
        ["6 · Supporting Components", "Technical Owner: link systems, infrastructure, databases, interfaces, sites, vendors, and data; provide technical targets, hosting, and backup/failover details where relevant."],
        ["7 · Fallbacks", "Process/Technical Owner: decide whether work can continue; document an alternate capability or save a process-stops assessment."],
        ["8 · Recovery Strategy", "Technical Owner / BCP Coordinator: how normal service will be restored and the expected recovery time."],
        ["9 · Runbook", "BCP Coordinator: generate a draft, review/edit ordered instructions and responsible roles, and explicitly confirm review."],
        ["10 · Test Plan", "BCP Coordinator: choose a test type, target, schedule, and expected evidence. A planned test is not a passed test."],
        ["11 · Gaps/Validation", "BCP Coordinator: review missing objectives, warnings, runbook/test/evidence coverage, and create corrective actions where needed."],
        ["12 · Approval/Review", "Approver: review the summary and submit a Pending approval for a person’s decision."],
      ] } },
      { heading: "Back, Continue, Save & Exit, and resume", bullets: ["Back revisits the previous stage; Continue moves on when the required stage information has been saved.", "Save & Exit returns to the Dashboard while retaining saved records and local draft/progress information.", "Resume Workflow / Continue returns to unfinished work. Refreshing in the same browser retains progress and partial drafts.", "The stepper shows completed stages and progress. Completion means the information/decision has been supplied, not that the plan is approved or recovery has been proven.", "Restart workflow ends the current guided session; already saved register records remain. Select an existing function when continuing its plan."], note: "Contributor labels guide who should provide information. They are not authenticated roles or access-control guarantees in this prototype." },
      { heading: "Conditional questions and conflicting values", paragraphs: ["Technology questions depend on the process’s technology answer. Multiple components may be linked, and fallbacks may include a secondary alternate. If work would stop, save that assessment without inventing a fallback; a gap is optional and can be created later.", "BIA and technical recovery conflicts generate warnings. Review the technical target, the business requirement, or create a gap. The workflow never silently adjusts your recovery values to hide a conflict."], note: "Generated runbooks remain Draft / Review Required. Planning tests, completing the wizard, or accepting risk never automatically validates a fallback or approves a plan." },
    ],
  },
  {
    id: "dashboard", title: "Dashboard & Next Best Action", summary: "Understand readiness, missing information, and targeted correction actions.", keywords: ["overall readiness", "active warnings", "missing objectives", "open gaps", "score", "next best action"],
    sections: [
      { heading: "Reading the Dashboard", table: { headers: ["Indicator", "Meaning"], rows: [
        ["Overall Readiness", "Average of assessable Business Function scores. An empty environment, or one without enough process information, shows Not yet assessed."],
        ["Active Warnings", "Current recovery-target, missing/unvalidated fallback, process-stops, and shared-dependency conditions."],
        ["Missing Objectives", "Records missing Business MTPD/RTO/RPO, process RTO/RPO, or Technical RTO/RPO."],
        ["Open Gaps", "Corrective actions not yet closed; their ownership and severity still matter."],
        ["Fallback Readiness", "Documentation, ownership, capacity, dependencies, independence, recent testing, and evidence checks for real fallbacks; also review how many are validated."],
        ["Runbook / Testing status", "Distribution of recorded runbook statuses and test results; Scheduled does not mean Pass."],
        ["Next Best Action", "An important incomplete guided stage or unresolved continuity risk, with a route to continue/review it."],
      ] } },
      { heading: "Readiness by Business Function", bullets: ["Checks include business objectives, component technical objectives, Technical RTO alignment, a validated fallback, a recovery strategy, an approved runbook, a recent passed test, no open Critical/High gaps, and function approval.", "A function is assessable once it has a process. The percentage is a planning indicator, not certification that recovery will succeed.", "An answered ‘process stops’ assessment completes the fallback question but does not improve fallback capability. Accepted risk and Not Applicable also do not fabricate readiness."] },
      { heading: "Correct information where it is missing", paragraphs: ["Use Provide RTO, Provide RTO/RPO, or Provide Tech RPO to open the exact record’s recovery objectives. Enter agreed values in hours; the focused form changes only the fields it shows, preserving unrelated information.", "Warning and failed-check actions open the affected record, relevant tab, or field for review. After Save, Dashboard counts, readiness, and warnings recalculate from the current dataset. A warning disappears only when its underlying condition or an applicable explicit disposition changes."], note: "Example: entering a missing Business RTO removes that missing-field condition, but may expose a genuine technical recovery conflict. This is useful information, not a reason to weaken the business requirement." },
    ],
  },
  {
    id: "organizations-plans", title: "Organizations & Plans", summary: "Set the scope, ownership, and review context for your continuity work.", keywords: ["organization", "plan", "scope", "review date", "CRUD"],
    sections: [
      { heading: "Create the foundation", paragraphs: ["Create an Organization first, then a Plan linked to it. Use meaningful names, a responsible owner, a clear scope, and a review date. A Business Function links to a plan so the hierarchy has a defined home."] },
      { heading: "Maintain existing records", bullets: ["Use the navigation register to search, open a record, or choose New / Edit.", "Use the detail page to review its fields and History; related level records provide tabs for processes, dependencies, fallbacks, recovery, runbooks, tests, evidence, and gaps.", "Review linked records before deleting anything. Local deletion is not an archival process; keep a backup where required.", "Plan status and review information should reflect an actual organizational decision, not merely completed data entry."] },
    ],
  },
  {
    id: "functions", title: "L1 Business Functions", summary: "WHAT business capability or service must continue or recover.", keywords: ["L1", "business service", "capability", "criticality", "owner", "hierarchy"],
    sections: [
      { heading: "Describe the business outcome", paragraphs: ["A Business Function is the capability/service to protect, such as receiving customer orders or producing financial reports. Give it a name/code, link its plan, identify an owner, and describe the impact of disruption.", "Record criticality, MTPD, Business RTO/RPO, operating hours, peak periods, and approval status. These requirements guide the supporting processes and technology."] },
      { heading: "Use the detail tabs", bullets: ["Processes describes HOW the function is delivered.", "Dependencies shows WHAT it relies on; Fallbacks records alternate ways to continue.", "Recovery, Runbooks, Tests, Evidence, and Gaps connect preparation to proof and improvement.", "Overview shows readiness checks and targeted actions; History records changes."] },
    ],
  },
  {
    id: "recovery-objectives", title: "Business Impact Analysis / Recovery Objectives", summary: "MTPD, Business RTO/RPO, and Technical RTO/RPO in practical terms.", keywords: ["BIA", "MTPD", "RTO", "RPO", "hours", "data loss", "recovery requirements"],
    sections: [
      { heading: "Definitions and units", table: { headers: ["Term", "Meaning"], rows: [
        ["MTPD", "Maximum Tolerable Period of Disruption: the longest disruption before impact becomes unacceptable."],
        ["Business RTO", "Target time to restore the Business Function/business service."],
        ["Business RPO", "Maximum acceptable business data loss expressed in time."],
        ["Technical RTO", "Target recovery time for a supporting technology component."],
        ["Technical RPO", "Target recovery point / data loss for a supporting technology component."],
      ] } },
      { heading: "Business requirements lead", paragraphs: ["BIA identifies disruption impacts and establishes business recovery requirements. Technical targets should support those requirements, with time allowed for dependencies and business validation. A target is a requirement, not proof of achieved recovery.", "Enter objective values in hours. RTO should leave a safe margin before MTPD. RPO describes lost data, not outage duration; assess it with the Business Owner and data owner."] },
      { heading: "Example and conflict handling", paragraphs: ["Example: MTPD 24h, Business RTO 8h, and Business RPO 1h mean the service should return within 8 hours, with no more than 1 hour of lost business data, before disruption becomes unacceptable at 24 hours. These are illustrative values, not defaults.", "A supporting component with Technical RTO 12h cannot meet that 8h business target without another solution. Review the technical recovery approach, review the agreed business requirement with its owner, or create a gap. Do not change a requirement merely to suppress a warning.", "The guided workflow also checks linked process RTOs and warns about inconsistent BIA values. Current automated alignment rules compare RTO; they do not certify that all RPO or recovery-sequence requirements are satisfied."], note: "Missing is not zero. A deliberately agreed RPO of 0 hours means no acceptable data loss; leaving a field blank means it has not been supplied." },
    ],
  },
  {
    id: "processes", title: "L2 Business Processes", summary: "HOW the function is performed, including sequence and workarounds.", keywords: ["L2", "inputs", "outputs", "manual workaround", "recovery sequence"],
    sections: [
      { heading: "Describe the work", paragraphs: ["Link each process to its Business Function. Name its owner, inputs, outputs, process RTO/RPO, manual workaround, and recovery sequence. Use the sequence to describe which work must be restored first.", "In the guided workflow, say whether the process uses technology. If yes, link each relevant component; multiple processes can use the same component rather than duplicating it."] },
      { heading: "Workarounds need an assessment", paragraphs: ["A short manual-workaround description is useful context but is not a fully assessed central fallback. Record the actual alternate capability, activation, capacity, duration, data handling, dependencies, and test results in Fallbacks. If the process stops, persist the negative assessment and explicitly decide how to address its risk."] },
    ],
  },
  {
    id: "components", title: "L3 Supporting Components & Dependencies", summary: "WHAT each process depends on and how technical recovery supports it.", keywords: ["L3", "application", "infrastructure", "database", "interface", "facility", "vendor", "data", "technical RTO", "technical RPO"],
    sections: [
      { heading: "Capture each dependency", paragraphs: ["Components include applications, infrastructure, databases, interfaces, facilities, vendors, and data. Record the technical owner, hosting/location, Technical RTO/RPO, and backup/failover details as applicable.", "Link components to the processes that use them. Record component-to-component dependencies, such as an application depending on a database or network, so hidden shared dependencies can be examined."] },
      { heading: "Review linked recovery targets", bullets: ["Use Provide Tech RTO/RPO for missing information and Review RTO conflict for a target that exceeds its linked requirement.", "The guided component stage compares Technical RTO with linked process and Business Function RTOs. It offers Create Gap, Review Technical RTO, and Review Business Requirement.", "Changing a link can affect multiple functions’ warnings/readiness. Review all users of a shared component.", "Do not assume a separate server or vendor is independent if it still relies on the same facility, network, identity, or data path."] },
    ],
  },
  {
    id: "fallbacks", title: "Fallbacks", summary: "Alternate capability, chains, validation, and process-stops governance.", keywords: ["fallback", "alternate", "chain", "common mode", "risk acceptance", "process stops", "no fallback", "superseded"],
    sections: [
      { heading: "What a fallback is", paragraphs: ["A fallback is the alternate way to continue or restore a function, process, component, data flow, facility, or vendor-supported activity when the normal method is unavailable. It should be approved for use through your governance process; entering a Draft record does not grant that approval.", "Link the central Fallback record to the exact Business Function, Process, or Component it protects. An alternate may operate at reduced capacity or for a limited time. Restoration strategy explains how normal service returns; fallback explains how you keep going meanwhile."] },
      { heading: "Fields to document", table: { headers: ["Field", "What to supply"], rows: [
        ["Activation criteria", "The failure/threshold and decision that trigger use of the alternate."],
        ["Owner / alternate owner", "Who activates and manages it, and who substitutes if unavailable."],
        ["Capacity % / maximum duration", "How much normal demand it can handle, and for how many hours."],
        ["Dependencies", "The components, sites, vendors, data, and access the alternate needs."],
        ["Data / RPO impact", "Expected data loss, delay, duplicate capture, and integrity risks."],
        ["Reconciliation / return-to-normal", "How alternate records are reconciled and normal work resumes safely."],
        ["Last tested / result / evidence / status", "Actual execution date, outcome, supporting references, and current governance status."],
      ] } },
      { heading: "Chains and common-mode dependencies", paragraphs: ["Model Primary → Fallback A → Fallback B by linking a secondary fallback to its parent fallback. Describe when A is insufficient or unavailable and B is activated; check each alternate’s owners, capacity, duration, and dependencies.", "A fallback is weak if it depends on the same failed resource as the primary method. The common-mode warning compares recorded dependencies, including upstream component dependencies. Resolve it by establishing a genuinely independent path or explicitly managing the remaining risk, not just renaming the dependency."] },
      { heading: "Documentation is not validation", paragraphs: ["A newly developed fallback stays Draft / Unvalidated until there is a real test result. The current validation check requires Pass and a last-tested date within 365 days. The separate fallback readiness score also checks evidence, ownership, activation, capacity/duration, data handling, reconciliation, dependencies, and independence.", "Attach traceable evidence and review status with the responsible person. A high documentation score or status label alone does not prove recovery; a test record marked Scheduled does not validate the fallback."], note: "Current validation uses the fallback’s recorded Pass/date, not an automatic synchronization from a separate test record. After a test, record the actual fallback result and date as well as the test/evidence." },
      { heading: "No fallback available — process stops", paragraphs: ["If work cannot continue, choose ‘No, it would stop’. This saves No Fallback Available / Process Stops, initially Not Yet Addressed, even without a formal gap. It completes the assessment question but remains a continuity risk; it never creates a fictitious alternate or improves readiness."], table: { headers: ["BCP Coordinator action", "Effect"], rows: [
        ["Create Gap", "Creates/links an ordinary corrective-action record and records Gap Opened. The original process-stops assessment remains."],
        ["Accept Risk", "Requires a disposition owner/approver and rationale. Creates a Pending risk-acceptance approval for a human decision."],
        ["Develop Fallback", "Reopens the guided Fallback stage for the exact item. Saving a real fallback supersedes the active no-fallback condition and retains history."],
        ["Mark Not Applicable", "Requires rationale and an explicit save. Removes the unresolved fallback warning for that disposition, without inventing capability or validation."],
      ] } },
      { heading: "Pending, approved, and superseded risk acceptance", paragraphs: ["Pending means Review Required, not approved acceptance. An explicit human Approved decision records Risk Accepted; Rejected leaves a risk to address. Even approved acceptance acknowledges exposure—it does not make the recovery capability validated or ready.", "If a real fallback is later saved for the assessed item, its related Pending risk approval is withdrawn and marked superseded by fallback development, so it is no longer actionable. A previously Approved acceptance keeps its historical decision but is marked superseded. Original assessment and disposition history are preserved.", "The new fallback still requires testing. Developing it must not be confused with approving it, passing a test, closing a gap, or granting risk acceptance."] },
    ],
  },
  {
    id: "strategies", title: "Recovery Strategies", summary: "Choose how normal service will be restored, separate from temporary fallback.", keywords: ["restoration", "backup restore", "warm standby", "cold standby", "active active", "relocation"],
    sections: [
      { heading: "Temporary continuation versus restoration", paragraphs: ["A fallback keeps work going when the normal method is unavailable. A recovery strategy restores the normal service or establishes its replacement. Document both when needed; one is not a substitute for the other.", "Link the strategy to its protected record and record its type, description, estimated recovery hours, and review status. Available strategy choices include Active-active, Warm standby, Cold standby, Backup & restore, Relocation, Outsource, and Accept risk."] },
      { heading: "Make the strategy executable", paragraphs: ["Explain the resources, dependencies, order, data recovery approach, and decision criteria. Compare expected restoration time with the business requirement and reflect the approach in ordered runbook steps.", "Selecting an Accept risk strategy is not the controlled no-fallback risk-acceptance approval. Use the assessment’s Accept Risk action and a human decision for that governance process."] },
    ],
  },
  {
    id: "runbooks", title: "Runbooks", summary: "WHAT EXACTLY responders execute, with review and approval.", keywords: ["runbook", "recovery procedure", "steps", "draft", "review", "approved", "failback"],
    sections: [
      { heading: "Purpose and structure", paragraphs: ["A runbook turns a strategy into precise, ordered recovery/continuation instructions. Record a target, name, owner, version, review date, and status. The Steps tab stores step number, title, responsible role, estimated minutes, and instructions; use the ordering controls to adjust the sequence.", "The current record has a compact header and ordered steps, not a dedicated field for every procedure section below. Put detailed operational content into the relevant step instructions and link supporting evidence, tests, and approvals to the appropriate target."] },
      { heading: "Expected operational content", bullets: ["Purpose/scope, owner and intended approver, activation criteria, and escalation contacts.", "Preconditions, dependencies, recovery objectives, required access, tools, and safe break-glass procedures. Never put passwords or private keys in the runbook.", "Notifications, fallback activation, backup/restore, failover or alternate operation, and ordered technical recovery.", "Technical validation, data integrity/reconciliation, business validation and acceptance.", "Failback / return-to-normal, evidence capture, last test/date/result, and lessons learned."] },
      { heading: "Draft → In Review → Approved", paragraphs: ["The guided workflow generates a deterministic draft structure from known owners, dependencies, fallbacks, and strategy. Review every instruction, role, assumption, and sequence before treating it as usable.", "Explicitly confirm draft review in the wizard, then use human review/approval governance. Generated content never auto-approves. Approval records and runbook status are separate recorded information; keep them consistent with actual decisions.", "An outdated procedure needs review and an updated version. Completing the wizard or recording a planned test does not make the runbook Approved."], note: "The prototype does not execute recovery steps or verify that required tools/access will be available during an outage. Prove the procedure through a controlled exercise." },
    ],
  },
  {
    id: "tests", title: "Tests & Exercises", summary: "Plan, execute, and record proof of recovery—not just a schedule.", keywords: ["test", "tabletop", "restore", "vendor", "application recovery", "end-to-end DR", "failover", "Pass", "Partial", "Fail"],
    sections: [
      { heading: "Choose a relevant test", table: { headers: ["Type", "Typical purpose"], rows: [
        ["Tabletop", "Discuss scenario, decisions, roles, sequence, and escalation."], ["Restore", "Prove backup restoration and data integrity."], ["Failover / Failback", "Exercise alternate operation and return to normal where applicable."], ["Fallback / manual workaround", "Measure alternate capacity, duration, data handling, and reconciliation."], ["Vendor", "Check the supplier’s continuity response and dependencies."], ["Application recovery", "Prove service restoration and technical/business validation."], ["End-to-end DR", "Exercise the complete dependency chain through business acceptance."],
      ] } },
      { heading: "Scheduled, Pass, Partial, Fail", bullets: ["Scheduled: planned, not yet proof of execution or success.", "Pass: actual objectives achieved, with recorded date, achieved RTO, findings, and supporting evidence.", "Partial: some criteria were met, with remaining limitations or actions clearly recorded.", "Fail: criteria were not met; record what failed and corrective action needed.", "A failed/partial result may lead to a Gap. Create and link it explicitly; do not assume the app automatically opens or closes corrective actions."] },
      { heading: "Expected evidence and follow-through", paragraphs: ["Before testing, define success criteria, safe scope, expected evidence, and the target function/process/component/fallback. After execution, record the actual date, result, achieved RTO, findings, and evidence references.", "Recent passed testing contributes to readiness according to current checks. A planned test does not validate a fallback; update its real test date/result and attach evidence after execution. Do not mark Pass merely to remove a warning."] },
    ],
  },
  {
    id: "evidence", title: "Evidence", summary: "Traceable records of tests, decisions, contracts, and sign-off.", keywords: ["attachment", "reference", "link", "screenshot", "log extract", "traceability", "captured"],
    sections: [
      { heading: "Capture proof against the correct target", paragraphs: ["Create an Evidence item linked to the relevant record. Give it a clear title, type, reference/link, captured date, and captured-by person. Types include test reports, screenshots, log extracts, sign-off, contracts, and other evidence.", "The current prototype stores evidence metadata and references/links, not uploaded binary files or a managed document repository. Store the actual file securely and use a durable reference. An external link may be unavailable during an outage."] },
      { heading: "Keep a reviewable chain", bullets: ["Connect evidence to the tested/approved item so reviewers can trace the claim to its proof.", "Record what the evidence demonstrates and any limits in related test findings or runbook instructions.", "For fallbacks, a reference or linked Evidence item meets the evidence-presence check; it does not itself prove the document is accurate, accessible, or approved.", "Prepare essential offline copies separately. Emergency JSON export does not download referenced evidence files."] },
    ],
  },
  {
    id: "gaps", title: "Gaps & Corrective Actions", summary: "Own, prioritize, and resolve continuity shortcomings.", keywords: ["gap", "action owner", "due date", "severity", "closure", "validation"],
    sections: [
      { heading: "Create an accountable action", paragraphs: ["Link a Gap to the affected record. Supply a title, severity, description, corrective action, owner, and due date. Open means work is outstanding; In Progress means action is underway; Closed should reflect verified completion.", "Create Gap from a warning or no-fallback disposition when appropriate. A linked gap documents treatment but does not create an alternate recovery capability or erase the original process-stops assessment."] },
      { heading: "Validate before closure", paragraphs: ["Confirm the fix with the responsible owner, a suitable retest, and evidence before selecting Closed. The current prototype records the chosen status; it does not enforce a separate closure-validation gate.", "Open Critical/High gaps affect function readiness. Closing a gap does not remove an RTO or dependency warning if the underlying records still show the conflict. Update the actual condition and retain evidence/history."] },
    ],
  },
  {
    id: "approvals", title: "Approvals", summary: "Human decisions, risk acceptance, and superseded history.", keywords: ["approval", "approver", "Pending", "Approved", "Rejected", "Withdrawn", "risk acceptance", "superseded"],
    sections: [
      { heading: "Record a person’s decision", paragraphs: ["An Approval links to a target and records the approver, role, decision, decision date, and comments. Pending means awaiting review; Approved and Rejected record an explicit human decision. Withdrawn means the request is no longer open for approval.", "The wizard submits a Pending approval; it does not automatically approve any plan, function, runbook, or fallback. Contributor/approver fields are local prototype records, not authenticated signatures or enforced separation of duties."] },
      { heading: "Risk acceptance requires rationale and review", paragraphs: ["Use Accept Risk on the no-fallback assessment to supply its disposition owner/approver and rationale. The linked approval remains Pending / Review Required until a person decides. Approved acceptance records accepted exposure, not validated continuity.", "If a real fallback is developed for that exact item, a related Pending risk acceptance becomes Withdrawn and superseded; it cannot remain an actionable decision request. A previously Approved decision stays in history but is marked superseded by fallback development.", "Superseded risk approvals are historical records, not current requests to accept a condition that has changed. The new fallback is still unvalidated, and unrelated approvals remain unchanged."] },
      { heading: "Keep statuses consistent", paragraphs: ["Review the target’s own approval/status fields as well as its Approval records. Do not assume that an ordinary approval automatically changes every related record or guarantees a passed test. Preserve a clear decision trail with comments and evidence."] },
    ],
  },
  {
    id: "warnings", title: "Warnings", summary: "What the current checks mean and how to correct the underlying condition.", keywords: ["warning", "technical RTO", "common dependency", "unvalidated", "critical", "process stops"],
    sections: [
      { heading: "Key warning rules", table: { headers: ["Warning", "Why it matters / corrective action"], rows: [
        ["Technical RTO exceeds Business RTO", "A linked component’s target exceeds the Business Function’s recovery requirement. Review the technical recovery approach, agreed business requirement, or create a gap. The guided stage also compares process RTOs."],
        ["Critical item lacks fallback / not assessed", "A Critical/High function lacks recorded function/process fallback coverage and an applicable assessment. Assess how it can continue; save a real fallback or an explicit process-stops assessment."],
        ["No fallback available — process stops", "The question was answered, but work cannot continue. Review Create Gap, Accept Risk, Develop Fallback, or Mark Not Applicable. Gap Opened and Risk Acceptance Pending remain unresolved exposure."],
        ["Fallback not validated", "No qualifying recent Pass/date on the fallback. Plan and execute a suitable test, record the actual fallback result/date, and retain evidence. Documentation alone is insufficient."],
        ["Primary and fallback share a dependency", "Both recorded paths rely on a common resource, including upstream dependencies. Review dependencies and establish an independent alternate or manage the exposure explicitly."],
      ] } },
      { heading: "Use the warning’s action", paragraphs: ["Review RTO conflict opens the affected technical value; Assess fallback / Review risk opens the relevant item; Plan / record test opens fallback testing; Review dependencies opens its dependency context.", "Saving corrected data recalculates checks. Merely viewing a warning, editing unrelated fields, creating a test schedule, or opening a gap does not correct the failure condition. An explicit applicable risk/N/A disposition can change warning visibility without making recovery ready."], note: "Checks evaluate the relationships and information recorded in Compass. They are not an exhaustive dependency discovery, compliance audit, or guarantee of recoverability." },
    ],
  },
  {
    id: "audit", title: "Audit History", summary: "Review original answers, edits, and later governance changes.", keywords: ["audit", "history", "old new", "trace", "changes"],
    sections: [
      { heading: "Review changes", paragraphs: ["Audit History lists recorded creates, updates, and deletes with timestamp, user label, affected record, and summary. Use its filter or a record’s History tab to inspect relevant changes. Field edits include old → new values where recorded.", "The original no-fallback answer and later gap, acceptance, N/A, or fallback-development changes retain a history trail. Superseding a risk approval preserves its historical decision rather than silently deleting it."] },
      { heading: "Limits of local history", paragraphs: ["History is part of the current local dataset, not an immutable external compliance archive. Clear All Data removes it with the rest of that dataset. Without authentication, a recorded user/role label is not independent identity proof; preserve backups and apply your organization’s recordkeeping controls."] },
    ],
  },
  {
    id: "emergency", title: "Emergency Package", summary: "Prepare critical continuity information outside the application’s failure domain.", keywords: ["offline", "export", "JSON", "print", "PDF", "network", "identity", "cloud", "contacts"],
    sections: [
      { heading: "Why a separate package matters", paragraphs: ["The continuity application, cloud region, network, or identity provider can itself fail. Responders need critical plans, contact roles, recovery sequence, runbooks, fallback instructions, and essential dependency information without relying on the unavailable system.", "Prepare the package before an incident, keep it current, store it securely in a genuinely independent location, and test whether responders can access and use it."] },
      { heading: "Implemented today", bullets: ["Select the Business Functions to include; Critical/High functions are selected initially. No functions means an empty package.", "Print pack opens the browser print dialog; save as PDF if your browser/device provides that option.", "Export JSON snapshot downloads the selected functions, their processes/components and fallbacks, attached strategies, ordered runbooks/steps, and snapshot timestamp/source information.", "The page shows owners/alternate contact roles and recovery sequence based on current records. A role/name is not necessarily a complete phone/email call tree—verify actual contact information separately."] },
      { heading: "Concepts and current limits", paragraphs: ["Scheduled generation, distribution, encrypted offline storage, cryptographic signing, and tested break-glass access are intended operational concepts, not implemented managed services. The downloaded JSON is a plain snapshot, not a digitally signed package.", "The current JSON uses the first organization/plan for its header; verify scope carefully when selecting functions across plans. It is not a full-dataset backup, does not include every approval/gap/test/audit record or external evidence file, and has no package-import workflow.", "Keep separately secured essential evidence and contact details where needed. An export does not make the hosted Compass application itself offline-capable, and the app does not guarantee that an external reference will work during an outage."], note: "Review the exported content and printed/PDF pack before relying on it. Never include secrets or credentials; manage emergency access through your approved secure procedures." },
    ],
  },
  {
    id: "demo", title: "Demo / Training Data", summary: "Practice safely with fictional, editable data and understand destructive controls.", keywords: ["Load Demo Data", "Clear All Data", "Start Fresh", "training", "fictional", "backup"],
    sections: [
      { heading: "Optional training only", paragraphs: ["Fresh use starts empty. Load Demo Data explicitly loads fictional training information after confirmation; Demo Data / Training Mode remains visible so it cannot be mistaken for live organizational information.", "Demo records are editable. Practice correcting missing RTO/RPO values, reviewing warnings, recording test results, and watching readiness change. Edits persist in the current demo dataset; the application does not automatically reload the original demo after you edit it."] },
      { heading: "Replacing or clearing the dataset", paragraphs: ["Load Demo Data replaces the current local dataset only after the replacement confirmation. Download the offered backup first if you need to retain entered work.", "Clear All Data / Start Fresh is destructive: it deletes the current local dataset, including plans, progress, and history, and returns to a clean environment. It requires confirmation; clearing locally entered data includes the stronger DELETE confirmation. This is not an undo action."], note: "Never use Load Demo Data or Clear All Data casually in a browser holding real work. Check the mode label and keep a secure backup before confirming replacement/deletion." },
    ],
  },
  {
    id: "glossary", title: "Definitions & Glossary", summary: "An indexed reference for recovery and governance terminology.", keywords: ["MTPD", "RTO", "RPO", "BIA", "BCP", "DRP", "L1", "L2", "L3", "runbook", "fallback", "glossary"],
    sections: [
      { heading: "Glossary index · A–D", table: { headers: ["Term", "Definition"], rows: [["Approval", "A recorded human review decision, not automated endorsement."], ["BCP", "Business Continuity Plan: how essential business capabilities continue during disruption."], ["BIA", "Business Impact Analysis: evaluates disruption impact and establishes recovery requirements."], ["Business RPO", "Maximum acceptable business data loss, expressed in time."], ["Business RTO", "Target time to restore the Business Function/business service."], ["Common-mode dependency", "A resource shared by primary and alternate paths that can fail both."], ["DRP", "Disaster Recovery Plan: how supporting services and technology are restored."], ["Draft", "Prepared information requiring review; not an approved or validated capability."]] } },
      { heading: "Glossary index · E–M", table: { headers: ["Term", "Definition"], rows: [["Evidence", "Traceable proof of execution, findings, or a decision."], ["Failback", "Controlled return from alternate operation to the normal path."], ["Failover", "Switch to an alternate service/path after disruption."], ["Fallback", "Alternate way to continue/restore when the normal method is unavailable."], ["Gap", "A documented shortcoming with corrective action and accountable ownership."], ["L1 Business Function", "WHAT business capability/service must continue or recover."], ["L2 Business Process", "HOW that function is performed."], ["L3 Supporting Component", "WHAT the process depends on: application, infrastructure, database, interface, facility, vendor, data, etc."], ["MTPD", "Maximum Tolerable Period of Disruption: longest disruption before unacceptable impact."]] } },
      { heading: "Glossary index · N–V", table: { headers: ["Term", "Definition"], rows: [["Next Best Action", "A suggested route to important unfinished information or an unresolved risk."], ["Not yet assessed", "Insufficient records to present a meaningful readiness assessment."], ["Reconciliation", "Resolving alternate/normal data differences, duplicates, and missing transactions."], ["Recovery strategy", "The approach to restoring normal service."], ["Risk acceptance", "A human decision to accept documented exposure; pending is not accepted."], ["Runbook / Recovery Procedure", "WHAT EXACTLY is executed to continue/recover, in ordered instructions."], ["Superseded", "A historical decision/condition replaced by later circumstances, retained for traceability."], ["Technical RPO", "Target recovery point/data loss for a supporting technology component."], ["Technical RTO", "Target recovery time for a supporting technology component."], ["Validation", "Recorded proof against criteria; documentation or a scheduled test alone is not proof."]] } },
    ],
  },
  {
    id: "faq", title: "Troubleshooting / FAQ", summary: "Common questions about saving, warnings, readiness, and local data.", keywords: ["troubleshooting", "FAQ", "refresh", "lost", "save", "missing", "not assessed", "duplicate"],
    sections: [
      { heading: "Why is readiness Not yet assessed?", paragraphs: ["No assessable Business Function exists yet. Add a function and its process through Build My BCP/DRP or the registers. Empty data is not scored as poor readiness."] },
      { heading: "Why is a warning still visible after I create a gap?", paragraphs: ["A gap documents work to do; it does not repair a technical recovery target, create an independent fallback, or prove a test passed. Correct the underlying condition, or save an applicable explicit risk disposition, and review the recalculated result."] },
      { heading: "Why does a process-stops answer count as completed but still show risk?", paragraphs: ["The assessment question has been answered. The capability is still unavailable during failure. Review its disposition instead of repeatedly answering the same question; it must not count as validated fallback readiness."] },
      { heading: "Why is my fallback unvalidated after planning a test?", paragraphs: ["Scheduled is not executed. Record the actual Pass/date on the fallback after a successful test within the current 365-day window and attach evidence. Also record the separate test outcome; neither the wizard nor risk acceptance auto-validates it."] },
      { heading: "Where is my data after changing browser or device?", paragraphs: ["This prototype persists locally in the current browser. Another browser/device does not automatically share it. Clearing site data, private browsing, or local-storage restrictions may remove or prevent persistence. Keep secure backups; there is no currently connected cloud synchronization service."] },
      { heading: "Can I resume or edit without duplicating records?", paragraphs: ["Yes. Resume the existing guided workflow or choose an existing function in the builder. Direct register edits and wizard edits affect the same underlying records. Saved records remain when a guided session ends."] },
      { heading: "Why can’t I create a dependent record yet?", paragraphs: ["Create its prerequisite first—Organization before Plan, Plan before Business Function, Function before Process. Then choose the linked parent/target in the form. Use Dashboard setup actions or the guided path for an ordered start."] },
      { heading: "Does reading help change my plan or progress?", paragraphs: ["No. Searching and opening manual topics is read-only and does not change application records, readiness, wizard progress, approvals, or audit history."] },
    ],
  },
  {
    id: "integrations", title: "Future / Optional Integrations", summary: "Standalone operation, with ServiceNow and Google Cloud as optional future enhancements.", keywords: ["ServiceNow", "service now", "CMDB", "CI", "Change", "Incident", "BCM", "Google Cloud", "Gemini", "Vertex AI", "Document AI", "OCR", "Cloud Storage", "Text-to-Speech"],
    sections: [
      { heading: "Standalone first", paragraphs: ["Continuity Compass is fully standalone. No ServiceNow or Google Cloud connector is currently implemented/active in this prototype. Its manual, guided workflow, registers, rules, and local persistence do not require these services."] },
      { heading: "ServiceNow · optional / future", paragraphs: ["Potential uses include importing CMDB/CI relationships, connecting Change and Incident context, coordinating operational tasks, and optional BCM synchronization. These are architectural intentions, not current live data connections.", "ServiceNow should enhance Compass, never be required for Compass to operate. Any future connector would need explicit configuration, scoped access, mapping, conflict handling, and governance; it must not silently overwrite continuity records."] },
      { heading: "Google Cloud · planned / optional", table: { headers: ["Capability", "Potential use—not currently connected"], rows: [["Gemini / Vertex AI", "Assisted document analysis and draft suggestions for human review."], ["Document AI OCR", "Extract text from scanned continuity documents."], ["Cloud Storage", "Optional managed document/evidence storage."], ["Text-to-Speech", "Optional spoken access to continuity instructions."]] }, note: "There is no active cloud analysis, OCR, managed file store, or speech service here. Future assistance must not auto-approve generated content or make external availability a prerequisite for standalone continuity planning." },
    ],
  },
];

export function manualTopic(id: string) { return MANUAL_TOPICS.find((topic) => topic.id === id); }
export function searchManual(query: string): ManualTopic[] {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return MANUAL_TOPICS.filter((topic) => {
    const text = [topic.title, topic.summary, ...topic.keywords, JSON.stringify(topic.sections)].join(" ").toLowerCase();
    return terms.every((term) => text.includes(term));
  });
}

export function helpTopicForPath(path: string, tab?: string): string | undefined {
  if (path.startsWith("/help")) return undefined;
  const tabs: Record<string, string> = { Processes: "processes", Dependencies: "components", Fallbacks: "fallbacks", Recovery: "strategies", Runbooks: "runbooks", Tests: "tests", Evidence: "evidence", Gaps: "gaps", History: "audit", Chain: "fallbacks", Steps: "runbooks" };
  if (tab && tabs[tab]) return tabs[tab];
  const segment = path.split("/").filter(Boolean)[0] ?? "";
  const map: Record<string, string> = {
    "": "dashboard", dashboard: "dashboard", build: "build", warnings: "warnings", emergency: "emergency", audit: "audit",
    organizations: "organizations-plans", plans: "organizations-plans", functions: "functions", processes: "processes",
    components: "components", fallbacks: "fallbacks", fallback_assessments: "fallbacks", strategies: "strategies",
    runbooks: "runbooks", tests: "tests", evidence: "evidence", gaps: "gaps", approvals: "approvals",
  };
  return map[segment];
}