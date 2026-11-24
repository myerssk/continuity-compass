CREATE TABLE public.servicenow_sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  direction text NOT NULL CHECK (direction IN ('import','export','bidirectional')),
  dry_run boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','succeeded','partial','failed','cancelled')),
  requested_by uuid NOT NULL REFERENCES auth.users(id),
  started_at timestamptz,
  completed_at timestamptz,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.servicenow_sync_runs ENABLE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE ON public.servicenow_sync_runs TO authenticated;
CREATE POLICY "Members read ServiceNow sync runs" ON public.servicenow_sync_runs FOR SELECT TO authenticated USING (public.is_workspace_member(workspace_id));
CREATE POLICY "Coordinators request ServiceNow sync" ON public.servicenow_sync_runs FOR INSERT TO authenticated WITH CHECK (requested_by=auth.uid() AND public.has_workspace_role(workspace_id,ARRAY['administrator','bcp_coordinator']::public.app_role[]));
CREATE POLICY "Coordinators update ServiceNow sync" ON public.servicenow_sync_runs FOR UPDATE TO authenticated USING (requested_by=auth.uid() AND public.has_workspace_role(workspace_id,ARRAY['administrator','bcp_coordinator']::public.app_role[])) WITH CHECK (requested_by=auth.uid() AND public.has_workspace_role(workspace_id,ARRAY['administrator','bcp_coordinator']::public.app_role[]));
