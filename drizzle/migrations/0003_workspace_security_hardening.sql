-- Permit a workspace creator to insert the workspace while preserving member-only reads.
-- The AFTER INSERT trigger creates the administrator membership.
DROP POLICY IF EXISTS "Users create workspaces" ON public.workspaces;
CREATE POLICY "Users create workspaces" ON public.workspaces
FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid());

-- Harden helper functions against direct invocation by anonymous users.
REVOKE ALL ON FUNCTION public.is_workspace_member(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_workspace_role(uuid, public.app_role[], uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_workspace_member(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_workspace_role(uuid, public.app_role[], uuid) TO authenticated, service_role;
