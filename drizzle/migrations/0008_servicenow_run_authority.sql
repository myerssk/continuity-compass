BEGIN;
DROP POLICY IF EXISTS "Coordinators update ServiceNow sync" ON public.servicenow_sync_runs;
REVOKE UPDATE, INSERT ON public.servicenow_sync_runs FROM authenticated;
GRANT INSERT (workspace_id, direction, dry_run, requested_by) ON public.servicenow_sync_runs TO authenticated;
DROP POLICY IF EXISTS "Coordinators request ServiceNow sync" ON public.servicenow_sync_runs;
CREATE POLICY "Coordinators request queued ServiceNow sync" ON public.servicenow_sync_runs
FOR INSERT TO authenticated WITH CHECK (
  requested_by = auth.uid()
  AND public.has_workspace_role(workspace_id, ARRAY['administrator','bcp_coordinator']::public.app_role[])
  AND status = 'queued' AND started_at IS NULL AND completed_at IS NULL
  AND summary = '{}'::jsonb AND error_message IS NULL
);
GRANT SELECT, INSERT, UPDATE ON public.servicenow_sync_runs TO service_role;
COMMIT;
