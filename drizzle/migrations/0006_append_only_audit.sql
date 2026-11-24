CREATE OR REPLACE FUNCTION public.prevent_workspace_audit_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Workspace audit events are append-only'; END; $$;
DROP TRIGGER IF EXISTS workspace_audit_append_only ON public.workspace_audit_events;
CREATE TRIGGER workspace_audit_append_only BEFORE UPDATE OR DELETE ON public.workspace_audit_events
FOR EACH ROW EXECUTE FUNCTION public.prevent_workspace_audit_mutation();
REVOKE UPDATE, DELETE ON public.workspace_audit_events FROM authenticated;
