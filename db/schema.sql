-- Continuum BCP/DRP relational schema (PostgreSQL; SQLite-compatible types).
-- Mirrors src/lib/bcp/schema.ts. Polymorphic attachments use (target_type, target_id).
CREATE TABLE organizations (id TEXT PRIMARY KEY, name TEXT NOT NULL, industry TEXT, region TEXT);
CREATE TABLE plans (id TEXT PRIMARY KEY, organization_id TEXT NOT NULL REFERENCES organizations(id), name TEXT NOT NULL, version TEXT, owner TEXT, status TEXT, review_date DATE);
CREATE TABLE functions (id TEXT PRIMARY KEY, plan_id TEXT NOT NULL REFERENCES plans(id), code TEXT, name TEXT NOT NULL, owner TEXT, department TEXT,
  criticality TEXT NOT NULL CHECK (criticality IN ('Critical','High','Medium','Low')), mtpd_h REAL, rto_h REAL, rpo_h REAL,
  operating_hours TEXT, peak_periods TEXT, approval_status TEXT, description TEXT);
CREATE TABLE processes (id TEXT PRIMARY KEY, function_id TEXT NOT NULL REFERENCES functions(id) ON DELETE CASCADE, code TEXT, name TEXT NOT NULL, owner TEXT,
  recovery_sequence INTEGER, rto_h REAL, rpo_h REAL, inputs TEXT, outputs TEXT, manual_workaround TEXT, uses_technology TEXT);
CREATE TABLE components (id TEXT PRIMARY KEY, name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('Application','Infrastructure','Database','Interface','Facility','Vendor','Data')),
  technical_owner TEXT, hosting TEXT, location TEXT, tech_rto_h REAL, tech_rpo_h REAL, backup_method TEXT, failover_method TEXT);
CREATE TABLE process_components (id TEXT PRIMARY KEY, process_id TEXT NOT NULL REFERENCES processes(id) ON DELETE CASCADE, component_id TEXT NOT NULL REFERENCES components(id) ON DELETE CASCADE, UNIQUE (process_id, component_id));
CREATE TABLE component_dependencies (id TEXT PRIMARY KEY, component_id TEXT NOT NULL REFERENCES components(id) ON DELETE CASCADE, depends_on_id TEXT NOT NULL REFERENCES components(id) ON DELETE CASCADE, UNIQUE (component_id, depends_on_id));
CREATE TABLE fallbacks (id TEXT PRIMARY KEY, target_type TEXT NOT NULL CHECK (target_type IN ('functions','processes','components')), target_id TEXT NOT NULL,
  parent_id TEXT REFERENCES fallbacks(id), name TEXT NOT NULL, fallback_type TEXT, activation_criteria TEXT, owner TEXT, alternate_owner TEXT,
  capacity_pct REAL, max_duration_h REAL, data_rpo_impact TEXT, reconciliation TEXT, return_to_normal TEXT, last_tested DATE, test_result TEXT, evidence_ref TEXT, status TEXT);
CREATE TABLE fallback_dependencies (id TEXT PRIMARY KEY, fallback_id TEXT NOT NULL REFERENCES fallbacks(id) ON DELETE CASCADE, component_id TEXT NOT NULL REFERENCES components(id));
CREATE TABLE strategies (id TEXT PRIMARY KEY, target_type TEXT NOT NULL, target_id TEXT NOT NULL, name TEXT NOT NULL, strategy_type TEXT, est_recovery_h REAL, status TEXT, description TEXT);
CREATE TABLE runbooks (id TEXT PRIMARY KEY, target_type TEXT NOT NULL, target_id TEXT NOT NULL, name TEXT NOT NULL, owner TEXT, version TEXT, status TEXT, origin TEXT, last_reviewed DATE);
CREATE TABLE runbook_steps (id TEXT PRIMARY KEY, runbook_id TEXT NOT NULL REFERENCES runbooks(id) ON DELETE CASCADE, step_no INTEGER NOT NULL, title TEXT NOT NULL, role TEXT, est_minutes INTEGER, instructions TEXT);
CREATE TABLE tests (id TEXT PRIMARY KEY, target_type TEXT NOT NULL, target_id TEXT NOT NULL, name TEXT NOT NULL, test_type TEXT, scheduled_date DATE, executed_date DATE, result TEXT, achieved_rto_h REAL, findings TEXT, expected_evidence TEXT);
CREATE TABLE evidence (id TEXT PRIMARY KEY, target_type TEXT NOT NULL, target_id TEXT NOT NULL, title TEXT NOT NULL, evidence_type TEXT, reference TEXT, captured_date DATE, captured_by TEXT);
CREATE TABLE gaps (id TEXT PRIMARY KEY, target_type TEXT NOT NULL, target_id TEXT NOT NULL, title TEXT NOT NULL, severity TEXT, description TEXT, corrective_action TEXT, owner TEXT, due_date DATE, status TEXT);
CREATE TABLE approvals (id TEXT PRIMARY KEY, target_type TEXT NOT NULL, target_id TEXT NOT NULL, approver TEXT NOT NULL, role TEXT, decision TEXT, lifecycle TEXT, superseded_reason TEXT, superseded_on DATE, decided_on DATE, comments TEXT);
-- A documented 'no fallback' answer and its risk disposition. Never implies an alternate capability exists.
CREATE TABLE fallback_assessments (id TEXT PRIMARY KEY, target_type TEXT NOT NULL CHECK (target_type IN ('functions','processes','components')), target_id TEXT NOT NULL, fallback_status TEXT NOT NULL, continuity_capability TEXT, risk_disposition TEXT, gap_id TEXT REFERENCES gaps(id), approval_id TEXT REFERENCES approvals(id), disposition_owner TEXT, rationale TEXT, assessed_on DATE, disposition_on DATE);
CREATE TABLE audit_log (id TEXT PRIMARY KEY, "table" TEXT NOT NULL, record_id TEXT NOT NULL, action TEXT NOT NULL, at TIMESTAMP NOT NULL, "user" TEXT, summary TEXT);
CREATE INDEX idx_attach ON fallbacks(target_type, target_id);

-- Guided workflow progress (pointers into the tables above + unsaved form drafts as JSON).
CREATE TABLE wizard_progress (id TEXT PRIMARY KEY, stage TEXT NOT NULL, organization_id TEXT, plan_id TEXT, function_id TEXT, strategy_id TEXT, runbook_id TEXT, test_id TEXT, approval_id TEXT, answers_json TEXT, no_tech_json TEXT, validation_reviewed INTEGER, drafts_json TEXT, focus_key TEXT, started_at TIMESTAMP, updated_at TIMESTAMP);