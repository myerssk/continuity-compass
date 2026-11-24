ALTER TABLE public.servicenow_connections
  ADD COLUMN IF NOT EXISTS oauth_client_configured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS verified_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS capabilities jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS last_error text;

CREATE TABLE IF NOT EXISTS public.servicenow_field_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  compass_entity text NOT NULL,
  compass_field text NOT NULL,
  servicenow_table text NOT NULL,
  servicenow_field text NOT NULL,
  direction text NOT NULL CHECK (direction IN ('import','export','bidirectional')),
  enabled boolean NOT NULL DEFAULT true,
  transform_rule jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id,compass_entity,compass_field,servicenow_table,servicenow_field)
);
ALTER TABLE public.servicenow_field_mappings ENABLE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.servicenow_field_mappings TO authenticated;
CREATE POLICY "Members read ServiceNow field mappings" ON public.servicenow_field_mappings FOR SELECT TO authenticated USING (public.is_workspace_member(workspace_id));
CREATE POLICY "Coordinators manage ServiceNow field mappings" ON public.servicenow_field_mappings FOR ALL TO authenticated USING (public.has_workspace_role(workspace_id,ARRAY['administrator','bcp_coordinator']::public.app_role[])) WITH CHECK (public.has_workspace_role(workspace_id,ARRAY['administrator','bcp_coordinator']::public.app_role[]));
