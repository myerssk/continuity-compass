import type { Db } from "./schema";

// Generic, fictional sample data. IDs are stable so links survive reloads.
export function seedDb(): Db {
  const fn = (id: string, code: string, name: string, owner: string, department: string, criticality: string, mtpd_h: number | null, rto_h: number | null, rpo_h: number | null, operating_hours: string, peak_periods: string, approval_status: string, description: string) =>
    ({ id, plan_id: "pl1", code, name, owner, department, criticality, mtpd_h, rto_h, rpo_h, operating_hours, peak_periods, approval_status, description });
  const pr = (id: string, function_id: string, code: string, name: string, owner: string, recovery_sequence: number, rto_h: number | null, rpo_h: number | null, inputs: string, outputs: string, manual_workaround: string) =>
    ({ id, function_id, code, name, owner, recovery_sequence, rto_h, rpo_h, inputs, outputs, manual_workaround });
  const co = (id: string, name: string, type: string, technical_owner: string, hosting: string, location: string, tech_rto_h: number | null, tech_rpo_h: number | null, backup_method: string, failover_method: string) =>
    ({ id, name, type, technical_owner, hosting, location, tech_rto_h, tech_rpo_h, backup_method, failover_method });

  return {
    organizations: [{ id: "org1", name: "Sample Organization", industry: "Financial services (generic)", region: "Multi-region" }],
    plans: [{ id: "pl1", organization_id: "org1", name: "Enterprise BCP / DRP 2026", version: "2.1", owner: "Head of Resilience", status: "In Review", review_date: "2027-03-31" }],
    functions: [
      fn("bf1", "BF-01", "Customer Payments", "Director of Payments Operations", "Operations", "Critical", 8, 4, 0.25, "24x7", "Month-end, public holidays", "Approved", "Receive, validate and settle outgoing and incoming customer payments."),
      fn("bf2", "BF-02", "Order Fulfilment", "Head of Fulfilment", "Supply Chain", "Critical", 24, 8, 1, "Mon–Sat 06:00–22:00", "Q4 seasonal peak", "In Review", "Pick, pack and dispatch customer orders."),
      fn("bf3", "BF-03", "Customer Contact Centre", "Customer Service Manager", "Customer Service", "High", 24, 12, 4, "Mon–Fri 08:00–20:00", "Campaign launches", "Approved", "Handle inbound customer calls, chat and email."),
      fn("bf4", "BF-04", "Payroll", "Payroll Manager", "Human Resources", "High", 72, 48, 24, "Mon–Fri business hours", "Last 5 working days of month", "Approved", "Calculate and pay employee salaries."),
      fn("bf5", "BF-05", "Financial Reporting", "Financial Controller", "Finance", "Medium", 120, null, 24, "Business hours", "Quarter close", "Draft", "Produce statutory and management reports."),
      fn("bf6", "BF-06", "IT Service Desk", "Service Desk Lead", "IT", "Medium", 48, 24, 8, "24x5", "Major releases", "Approved", "First-line support for staff."),
    ],
    processes: [
      pr("bp1", "bf1", "BP-01.1", "Payment intake & validation", "Payments Team Lead", 1, 2, 0.25, "Payment instructions, customer master data", "Validated payment queue", "Accept instructions via secure email and validate on paper checklist"),
      pr("bp2", "bf1", "BP-01.2", "Clearing & settlement", "Settlement Supervisor", 2, 4, 0.25, "Validated payment queue", "Settlement files, confirmations", "Submit high-value payments via clearing-house web portal"),
      pr("bp3", "bf1", "BP-01.3", "Reconciliation", "Reconciliation Analyst", 3, 8, 1, "Bank statements, settlement files", "Reconciled ledger", "Spreadsheet reconciliation against statements"),
      pr("bp4", "bf2", "BP-02.1", "Order allocation", "Warehouse Planner", 1, 4, 1, "Customer orders, stock levels", "Pick lists", "Print pick lists from last export"),
      pr("bp5", "bf2", "BP-02.2", "Dispatch & carrier booking", "Dispatch Supervisor", 2, 8, 2, "Packed orders", "Shipping labels, manifests", "Carrier phone booking with handwritten manifests"),
      pr("bp6", "bf3", "BP-03.1", "Inbound call handling", "Contact Centre Supervisor", 1, 4, 4, "Customer calls", "Resolved cases", "Divert calls to mobile overflow team"),
      pr("bp7", "bf3", "BP-03.2", "Case management", "Contact Centre Supervisor", 2, 12, 4, "Customer contacts", "Case records", "Log cases on shared tracker"),
      pr("bp8", "bf4", "BP-04.1", "Payroll calculation", "Payroll Analyst", 1, 24, 24, "Timesheets, HR changes", "Payroll run", "Repeat prior month payroll with adjustments"),
      pr("bp9", "bf4", "BP-04.2", "Salary payment submission", "Payroll Manager", 2, 48, 24, "Approved payroll run", "Bank payment file", "Upload payment file via bank portal"),
      pr("bp10", "bf5", "BP-05.1", "Month-end close", "Financial Controller", 1, null, null, "Ledger", "Trial balance", ""),
      pr("bp11", "bf6", "BP-06.1", "Incident logging & triage", "Service Desk Lead", 1, 8, 8, "Calls, emails", "Tickets", "Shared mailbox and spreadsheet log"),
    ],
    components: [
      co("sc1", "Payments Hub", "Application", "Payments Platform Owner", "Private cloud", "Primary DC", 2, 0.25, "Continuous replication", "Automated to secondary DC"),
      co("sc2", "Core Ledger Database", "Database", "DBA Team", "On-premises", "Primary DC", 6, 0.25, "Log shipping every 15 min", "Manual promote of standby"),
      co("sc3", "Clearing House Gateway", "Interface", "Integration Team", "Vendor managed", "External", 2, 0, "N/A", "Secondary connection line"),
      co("sc4", "Warehouse Management System", "Application", "Logistics IT", "SaaS", "Vendor region A", 12, 1, "Vendor nightly backup", "Vendor DR region"),
      co("sc5", "Carrier Booking API", "Vendor", "Logistics IT", "Vendor managed", "External", 4, 2, "N/A", "Alternate carrier"),
      co("sc6", "Contact Centre Telephony", "Infrastructure", "Network Team", "Cloud", "Multi-region", 1, null, "Config export weekly", "Geo-redundant"),
      co("sc7", "CRM Platform", "Application", "CRM Product Owner", "SaaS", "Vendor region B", 8, 4, "Vendor daily backup", "Vendor DR"),
      co("sc8", "Payroll Application", "Application", "HR Systems", "SaaS", "Vendor region A", 24, 24, "Vendor daily backup", "Vendor DR"),
      co("sc9", "Primary Data Centre", "Facility", "Facilities Manager", "Owned", "Site 1", 0, null, "N/A", "Secondary data centre"),
      co("sc10", "Identity & Access Service", "Infrastructure", "Security Engineering", "Hybrid", "Primary DC + cloud", 2, 1, "Directory snapshots hourly", "Cloud replica"),
      co("sc11", "Corporate Network / WAN", "Infrastructure", "Network Team", "Owned", "All sites", 1, null, "Config backup", "Dual carriers"),
      co("sc12", "Customer Master Data", "Data", "Data Governance Lead", "Core Ledger Database", "Primary DC", null, 0.25, "With core ledger", "With core ledger"),
      co("sc14", "Bank Online Portal", "Vendor", "Treasury Operations", "Vendor managed", "External (internet)", 1, 0, "N/A", "Vendor DR"),
      co("sc15", "Alternate Carrier Portal", "Vendor", "Logistics IT", "Vendor managed", "External (internet)", 2, 2, "N/A", "None"),
      co("sc16", "Mobile Device Fleet", "Infrastructure", "End-User Computing", "Managed devices", "Distributed", 4, null, "MDM profiles", "Spare pool"),
      co("sc13", "Service Desk Tool", "Application", "IT Tools Team", "SaaS", "Vendor region B", 8, 8, "Vendor backup", "Vendor DR"),
    ],
    process_components: [
      ["bp1", "sc1"], ["bp1", "sc12"], ["bp1", "sc10"], ["bp2", "sc1"], ["bp2", "sc3"], ["bp2", "sc2"], ["bp3", "sc2"],
      ["bp4", "sc4"], ["bp5", "sc4"], ["bp5", "sc5"], ["bp6", "sc6"], ["bp6", "sc7"], ["bp7", "sc7"], ["bp7", "sc10"],
      ["bp8", "sc8"], ["bp9", "sc8"], ["bp9", "sc3"], ["bp10", "sc2"], ["bp11", "sc13"], ["bp11", "sc10"],
    ].map(([process_id, component_id], i) => ({ id: `pc${i + 1}`, process_id, component_id })),
    component_dependencies: [
      ["sc1", "sc2"], ["sc1", "sc10"], ["sc1", "sc9"], ["sc2", "sc9"], ["sc12", "sc2"], ["sc3", "sc11"], ["sc10", "sc9"], ["sc6", "sc11"],
    ].map(([component_id, depends_on_id], i) => ({ id: `cd${i + 1}`, component_id, depends_on_id })),
    fallbacks: [
      { id: "fb1", target_type: "processes", target_id: "bp2", parent_id: "", name: "Clearing-house web portal submission", fallback_type: "Alternate system", activation_criteria: "Payments Hub unavailable > 30 min during cut-off window", owner: "Settlement Supervisor", alternate_owner: "Payments Team Lead", capacity_pct: 30, max_duration_h: 24, data_rpo_impact: "Payments entered manually; no automated duplicate check", reconciliation: "Re-key portal submissions into Payments Hub after recovery, flag as manual", return_to_normal: "Freeze portal, reconcile, resume hub processing", last_tested: "2026-06-12", test_result: "Pass", evidence_ref: "EV-001", status: "Validated" },
      { id: "fb2", target_type: "processes", target_id: "bp2", parent_id: "fb1", name: "Prioritised high-value payments by phone", fallback_type: "Manual workaround", activation_criteria: "Portal also unavailable", owner: "Director of Payments Operations", alternate_owner: "Settlement Supervisor", capacity_pct: 5, max_duration_h: 8, data_rpo_impact: "Only top-priority payments processed", reconciliation: "Paper log reconciled next business day", return_to_normal: "Revert to portal or hub", last_tested: "", test_result: "Not tested", evidence_ref: "", status: "Draft" },
      { id: "fb3", target_type: "functions", target_id: "bf3", parent_id: "", name: "Overflow team on mobile devices", fallback_type: "Degraded service", activation_criteria: "Telephony platform outage > 15 min", owner: "Customer Service Manager", alternate_owner: "Contact Centre Supervisor", capacity_pct: 40, max_duration_h: 72, data_rpo_impact: "Cases logged later; call recordings lost", reconciliation: "Transfer tracker entries into CRM", return_to_normal: "Re-route numbers to primary platform", last_tested: "2025-04-03", test_result: "Pass", evidence_ref: "EV-003", status: "Ready" },
      { id: "fb4", target_type: "components", target_id: "sc2", parent_id: "", name: "Standby ledger database (same DC)", fallback_type: "Alternate system", activation_criteria: "Primary DB node failure", owner: "DBA Team", alternate_owner: "Infrastructure On-call", capacity_pct: 100, max_duration_h: 720, data_rpo_impact: "Up to 15 min of transactions", reconciliation: "Replay logs where available", return_to_normal: "Rebuild primary, switch back in maintenance window", last_tested: "2026-02-20", test_result: "Partial", evidence_ref: "EV-004", status: "Ready" },
      { id: "fb5", target_type: "processes", target_id: "bp9", parent_id: "", name: "Bank portal salary upload", fallback_type: "Alternate system", activation_criteria: "Payroll interface to bank unavailable on pay day -2", owner: "Payroll Manager", alternate_owner: "Financial Controller", capacity_pct: 100, max_duration_h: 48, data_rpo_impact: "None", reconciliation: "Match portal confirmation to payroll register", return_to_normal: "Resume automated file transfer", last_tested: "2026-09-30", test_result: "Pass", evidence_ref: "EV-005", status: "Validated" },
      { id: "fb6", target_type: "processes", target_id: "bp11", parent_id: "", name: "Shared mailbox ticket log", fallback_type: "Manual workaround", activation_criteria: "Service desk tool unavailable > 1h", owner: "Service Desk Lead", alternate_owner: "IT Ops Manager", capacity_pct: 60, max_duration_h: 48, data_rpo_impact: "No SLA tracking", reconciliation: "Bulk import spreadsheet", return_to_normal: "Import and close log", last_tested: "2026-08-14", test_result: "Pass", evidence_ref: "", status: "Validated" },
      { id: "fb7", target_type: "components", target_id: "sc5", parent_id: "", name: "Alternate carrier web booking", fallback_type: "Alternate vendor", activation_criteria: "Carrier API down > 2h on dispatch day", owner: "Dispatch Supervisor", alternate_owner: "Head of Fulfilment", capacity_pct: 50, max_duration_h: 72, data_rpo_impact: "Tracking numbers captured manually", reconciliation: "Upload manifests into WMS", return_to_normal: "Resume API bookings and close manual manifests", last_tested: "2026-07-22", test_result: "Fail", evidence_ref: "", status: "Draft" },
      { id: "fb8", target_type: "functions", target_id: "bf6", parent_id: "", name: "Outsourced service desk overflow", fallback_type: "Alternate vendor", activation_criteria: "Retired after insourcing", owner: "Service Desk Lead", alternate_owner: "", capacity_pct: 80, max_duration_h: 168, data_rpo_impact: "", reconciliation: "", return_to_normal: "", last_tested: "2024-03-01", test_result: "Pass", evidence_ref: "", status: "Retired" },
    ],
    fallback_dependencies: [
      { id: "fd1", fallback_id: "fb1", component_id: "sc11" },
      { id: "fd2", fallback_id: "fb4", component_id: "sc9" },
      { id: "fd4", fallback_id: "fb6", component_id: "sc10" },
      { id: "fd5", fallback_id: "fb5", component_id: "sc14" },
      { id: "fd6", fallback_id: "fb7", component_id: "sc15" },
      { id: "fd7", fallback_id: "fb3", component_id: "sc16" },
    ],
    strategies: [
      { id: "rs1", target_type: "functions", target_id: "bf1", name: "Warm standby in secondary DC", strategy_type: "Warm standby", est_recovery_h: 3, status: "Approved", description: "Replicated payments stack in secondary data centre with documented failover." },
      { id: "rs2", target_type: "components", target_id: "sc2", name: "Cross-site database replication", strategy_type: "Warm standby", est_recovery_h: 6, status: "In Review", description: "Extend log shipping to secondary data centre." },
      { id: "rs3", target_type: "functions", target_id: "bf3", name: "Work-from-home relocation", strategy_type: "Relocation", est_recovery_h: 4, status: "Approved", description: "Agents relocate to home working using cloud telephony." },
      { id: "rs4", target_type: "functions", target_id: "bf4", name: "Vendor DR with manual payment backup", strategy_type: "Outsource", est_recovery_h: 24, status: "Approved", description: "Rely on vendor DR; bank portal as fallback." },
    ],
    runbooks: [
      { id: "rb1", target_type: "functions", target_id: "bf1", name: "Payments failover to secondary DC", owner: "Payments Platform Owner", version: "3.0", status: "Approved", last_reviewed: "2026-05-10" },
      { id: "rb2", target_type: "components", target_id: "sc2", name: "Promote standby ledger database", owner: "DBA Team", version: "1.4", status: "In Review", last_reviewed: "2025-10-02" },
      { id: "rb3", target_type: "functions", target_id: "bf3", name: "Contact centre relocation", owner: "Customer Service Manager", version: "2.0", status: "Approved", last_reviewed: "2026-01-15" },
      { id: "rb4", target_type: "functions", target_id: "bf2", name: "Warehouse system outage procedure", owner: "Head of Fulfilment", version: "0.3", status: "Draft", last_reviewed: "" },
      { id: "rb5", target_type: "functions", target_id: "bf4", name: "Payroll contingency run", owner: "Payroll Manager", version: "1.1", status: "Outdated", last_reviewed: "2024-11-01" },
    ],
    runbook_steps: [
      ["rb1", "Declare incident and convene recovery team", "Incident Manager", 15],
      ["rb1", "Confirm replication state at secondary DC", "Payments Platform Owner", 20],
      ["rb1", "Promote secondary payments stack", "Infrastructure On-call", 45],
      ["rb1", "Redirect clearing-house connection", "Integration Team", 30],
      ["rb1", "Smoke-test payment submission", "Payments Team Lead", 30],
      ["rb1", "Communicate service restoration", "Communications Lead", 10],
      ["rb2", "Verify primary is down and fenced", "DBA Team", 10],
      ["rb2", "Apply outstanding logs to standby", "DBA Team", 30],
      ["rb2", "Promote standby and update connection strings", "DBA Team", 30],
      ["rb3", "Activate call diversion plan", "Network Team", 15],
      ["rb3", "Notify agents to log in remotely", "Contact Centre Supervisor", 20],
      ["rb4", "Export latest open orders", "Warehouse Planner", 30],
    ].map(([runbook_id, title, role, est], i) => ({ id: `st${i + 1}`, runbook_id, step_no: i + 1, title, role, est_minutes: est, instructions: "" }))
      .map((s, _i, arr) => ({ ...s, step_no: arr.filter((x) => x.runbook_id === s.runbook_id).indexOf(s) + 1 })),
    tests: [
      { id: "ts1", target_type: "functions", target_id: "bf1", name: "Payments DR failover exercise", test_type: "Failover", scheduled_date: "2026-06-12", executed_date: "2026-06-12", result: "Pass", achieved_rto_h: 3.5, findings: "Clearing connection took longer than planned." },
      { id: "ts2", target_type: "components", target_id: "sc2", name: "Standby DB promotion test", test_type: "Failover", scheduled_date: "2026-02-20", executed_date: "2026-02-20", result: "Partial", achieved_rto_h: 7, findings: "Manual promotion exceeded target; standby shares primary DC." },
      { id: "ts3", target_type: "functions", target_id: "bf3", name: "Contact centre relocation tabletop", test_type: "Tabletop", scheduled_date: "2025-04-03", executed_date: "2025-04-03", result: "Pass", achieved_rto_h: null, findings: "" },
      { id: "ts4", target_type: "functions", target_id: "bf2", name: "Warehouse outage walkthrough", test_type: "Walkthrough", scheduled_date: "2026-12-08", executed_date: "", result: "Scheduled", achieved_rto_h: null, findings: "" },
      { id: "ts5", target_type: "fallbacks", target_id: "fb5", name: "Bank portal upload drill", test_type: "Simulation", scheduled_date: "2026-09-30", executed_date: "2026-09-30", result: "Pass", achieved_rto_h: 2, findings: "" },
      { id: "ts6", target_type: "functions", target_id: "bf4", name: "Payroll contingency simulation", test_type: "Simulation", scheduled_date: "2026-10-15", executed_date: "2026-10-15", result: "Fail", achieved_rto_h: 60, findings: "Runbook outdated; contact list wrong." },
    ],
    evidence: [
      { id: "ev1", target_type: "fallbacks", target_id: "fb1", title: "Portal submission test report", evidence_type: "Test report", reference: "DMS/BCP/EV-001", captured_date: "2026-06-12", captured_by: "Settlement Supervisor" },
      { id: "ev2", target_type: "functions", target_id: "bf1", title: "DR exercise sign-off", evidence_type: "Sign-off", reference: "DMS/BCP/EV-002", captured_date: "2026-06-14", captured_by: "Head of Resilience" },
      { id: "ev3", target_type: "fallbacks", target_id: "fb3", title: "Overflow team tabletop notes", evidence_type: "Other", reference: "DMS/BCP/EV-003", captured_date: "2025-04-03", captured_by: "Customer Service Manager" },
      { id: "ev5", target_type: "fallbacks", target_id: "fb5", title: "Bank portal drill confirmation", evidence_type: "Screenshot", reference: "DMS/BCP/EV-005", captured_date: "2026-09-30", captured_by: "Payroll Manager" },
      { id: "ev4", target_type: "components", target_id: "sc2", title: "DB promotion logs", evidence_type: "Log extract", reference: "DMS/BCP/EV-004", captured_date: "2026-02-20", captured_by: "DBA Team" },
    ],
    gaps: [
      { id: "gp1", target_type: "components", target_id: "sc2", title: "Ledger DB RTO exceeds payments RTO", severity: "Critical", description: "Technical RTO 6h vs business RTO 4h.", corrective_action: "Implement automated cross-site failover.", owner: "DBA Team", due_date: "2027-01-31", status: "In Progress" },
      { id: "gp2", target_type: "functions", target_id: "bf2", title: "No fallback for order fulfilment", severity: "High", description: "Critical function relies solely on WMS vendor DR.", corrective_action: "Define manual pick-list fallback and test it.", owner: "Head of Fulfilment", due_date: "2026-12-15", status: "Open" },
      { id: "gp3", target_type: "functions", target_id: "bf4", title: "Payroll runbook outdated", severity: "High", description: "Failed simulation in October.", corrective_action: "Rewrite runbook and re-test.", owner: "Payroll Manager", due_date: "2026-12-01", status: "Open" },
      { id: "gp4", target_type: "functions", target_id: "bf5", title: "Financial reporting RTO not set", severity: "Medium", description: "Business RTO missing.", corrective_action: "Complete BIA interview.", owner: "Financial Controller", due_date: "2026-12-20", status: "Open" },
      { id: "gp6", target_type: "fallbacks", target_id: "fb7", title: "Alternate carrier booking failed test", severity: "High", description: "Portal credentials expired during July test.", corrective_action: "Set up credential rotation and re-test.", owner: "Dispatch Supervisor", due_date: "2026-10-31", status: "Open" },
      { id: "gp5", target_type: "functions", target_id: "bf3", title: "Telephony RPO undefined", severity: "Low", description: "", corrective_action: "Agree config backup RPO.", owner: "Network Team", due_date: "2026-08-01", status: "Closed" },
    ],
    fallback_assessments: [],
    approvals: [
      { id: "ap1", target_type: "functions", target_id: "bf1", approver: "Chief Operating Officer", role: "Executive sponsor", decision: "Approved", decided_on: "2026-06-20", comments: "Approved after DR exercise." },
      { id: "ap2", target_type: "functions", target_id: "bf2", approver: "Chief Operating Officer", role: "Executive sponsor", decision: "Pending", decided_on: "", comments: "" },
      { id: "ap4", target_type: "runbooks", target_id: "rb5", approver: "HR Director", role: "Function executive", decision: "Rejected", decided_on: "2026-10-20", comments: "Contact list outdated; resubmit." },
      { id: "ap5", target_type: "fallbacks", target_id: "fb1", approver: "Head of Resilience", role: "BCM lead", decision: "Approved", decided_on: "2026-06-20", comments: "" },
      { id: "ap3", target_type: "functions", target_id: "bf5", approver: "Chief Financial Officer", role: "Function executive", decision: "Pending", decided_on: "", comments: "" },
    ],
    audit_log: [
      { id: "au0", table: "plans", record_id: "pl1", action: "create", at: "2026-01-05T09:00:00Z", user: "Head of Resilience", summary: "Imported plan baseline" },
    ],
  } as Db;
}

/** Clean environment: every table present and empty. Used for first-time use and "Clear all data". */
export function emptyDb(): Db {
  const tables = Object.keys(seedDb()).filter((k) => k !== "mode");
  return { ...Object.fromEntries(tables.map((t) => [t, []])), mode: "empty" } as unknown as Db;
}
/** Fictional training dataset, only loaded on explicit request. */
export function demoDb(): Db {
  return { ...seedDb(), mode: "demo" };
}