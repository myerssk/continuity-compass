BEGIN;
CREATE TABLE public.servicenow_reference_snapshots (
  workspace_id uuid PRIMARY KEY REFERENCES public.workspaces(id) ON DELETE CASCADE,
  records jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(records) = 'array'),
  synchronized_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.servicenow_reference_snapshots ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.servicenow_reference_snapshots FROM anon, authenticated;
GRANT SELECT ON public.servicenow_reference_snapshots TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.servicenow_reference_snapshots TO service_role;
CREATE POLICY "Members read cached ServiceNow references" ON public.servicenow_reference_snapshots FOR SELECT TO authenticated USING (public.is_workspace_member(workspace_id));
COMMIT;
