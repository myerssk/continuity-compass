-- Workspace-scoped cloud persistence for the current Continuity Compass domain model.
-- JSONB preserves the validated BCP model while the app transitions away from browser-only persistence.
CREATE TABLE public.workspace_bcp_state (
  workspace_id uuid PRIMARY KEY REFERENCES public.workspaces(id) ON DELETE CASCADE,
  state jsonb NOT NULL DEFAULT '{}'::jsonb,
  revision bigint NOT NULL DEFAULT 0,
  updated_by uuid NOT NULL REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.workspace_bcp_state ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.workspace_bcp_state TO authenticated;
GRANT ALL ON public.workspace_bcp_state TO service_role;

CREATE POLICY "Members read workspace BCP state" ON public.workspace_bcp_state
FOR SELECT TO authenticated
USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Contributors write workspace BCP state" ON public.workspace_bcp_state
FOR INSERT TO authenticated
WITH CHECK (
  updated_by = auth.uid()
  AND public.has_workspace_role(
    workspace_id,
    ARRAY['administrator','bcp_coordinator','contributor']::public.app_role[]
  )
);

CREATE POLICY "Contributors update workspace BCP state" ON public.workspace_bcp_state
FOR UPDATE TO authenticated
USING (
  public.has_workspace_role(
    workspace_id,
    ARRAY['administrator','bcp_coordinator','contributor']::public.app_role[]
  )
)
WITH CHECK (
  updated_by = auth.uid()
  AND public.has_workspace_role(
    workspace_id,
    ARRAY['administrator','bcp_coordinator','contributor']::public.app_role[]
  )
);
