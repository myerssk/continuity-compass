CREATE TABLE public.servicenow_connections (
  workspace_id uuid PRIMARY KEY REFERENCES public.workspaces(id) ON DELETE CASCADE,
  instance_url text NOT NULL,
  mode text NOT NULL DEFAULT 'itsm_cmdb' CHECK (mode IN ('itsm_cmdb','bcm_cmdb_itsm')),
  status text NOT NULL DEFAULT 'not_configured' CHECK (status IN ('not_configured','configured','verified','error','disabled')),
  auth_method text NOT NULL DEFAULT 'oauth',
  last_sync_at timestamptz,
  last_sync_status text,
  last_sync_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  updated_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.servicenow_sync_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  compass_type text NOT NULL,
  compass_id text NOT NULL,
  servicenow_table text NOT NULL,
  servicenow_sys_id text NOT NULL,
  sync_direction text NOT NULL DEFAULT 'import' CHECK (sync_direction IN ('import','export','bidirectional')),
  last_synced_at timestamptz,
  last_hash text,
  UNIQUE(workspace_id, compass_type, compass_id, servicenow_table, servicenow_sys_id)
);
CREATE TABLE public.workspace_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  actor_user_id uuid NOT NULL REFERENCES auth.users(id),
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  summary text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.servicenow_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servicenow_sync_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_audit_events ENABLE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.servicenow_connections,public.servicenow_sync_mappings TO authenticated;
GRANT SELECT,INSERT ON public.workspace_audit_events TO authenticated;
CREATE POLICY "Members read ServiceNow connection" ON public.servicenow_connections FOR SELECT TO authenticated USING (public.is_workspace_member(workspace_id));
CREATE POLICY "Admins manage ServiceNow connection" ON public.servicenow_connections FOR ALL TO authenticated USING (public.has_workspace_role(workspace_id,ARRAY['administrator','bcp_coordinator']::public.app_role[])) WITH CHECK (updated_by=auth.uid() AND public.has_workspace_role(workspace_id,ARRAY['administrator','bcp_coordinator']::public.app_role[]));
CREATE POLICY "Members read ServiceNow mappings" ON public.servicenow_sync_mappings FOR SELECT TO authenticated USING (public.is_workspace_member(workspace_id));
CREATE POLICY "Coordinators manage ServiceNow mappings" ON public.servicenow_sync_mappings FOR ALL TO authenticated USING (public.has_workspace_role(workspace_id,ARRAY['administrator','bcp_coordinator']::public.app_role[])) WITH CHECK (public.has_workspace_role(workspace_id,ARRAY['administrator','bcp_coordinator']::public.app_role[]));
CREATE POLICY "Members read workspace audit" ON public.workspace_audit_events FOR SELECT TO authenticated USING (public.is_workspace_member(workspace_id));
CREATE POLICY "Members append own workspace audit" ON public.workspace_audit_events FOR INSERT TO authenticated WITH CHECK (actor_user_id=auth.uid() AND public.is_workspace_member(workspace_id));
