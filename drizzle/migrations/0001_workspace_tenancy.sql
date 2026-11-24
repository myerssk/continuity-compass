-- Continuity Compass workspace tenancy foundation.
-- Workspaces are security tenants and are intentionally separate from BCP domain "organizations".
CREATE TABLE public.workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.workspace_members (
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'viewer',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, user_id)
);

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.workspaces TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_members TO authenticated;
GRANT ALL ON public.workspaces, public.workspace_members TO service_role;

CREATE OR REPLACE FUNCTION public.is_workspace_member(_workspace_id uuid, _user_id uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = _workspace_id AND user_id = _user_id
  )
$$;

CREATE OR REPLACE FUNCTION public.has_workspace_role(_workspace_id uuid, _roles public.app_role[], _user_id uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = _workspace_id AND user_id = _user_id AND role = ANY(_roles)
  )
$$;

CREATE POLICY "Members read workspaces" ON public.workspaces
FOR SELECT TO authenticated USING (public.is_workspace_member(id));

CREATE POLICY "Users create workspaces" ON public.workspaces
FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());

CREATE POLICY "Admins update workspaces" ON public.workspaces
FOR UPDATE TO authenticated
USING (public.has_workspace_role(id, ARRAY['administrator']::public.app_role[]))
WITH CHECK (public.has_workspace_role(id, ARRAY['administrator']::public.app_role[]));

CREATE POLICY "Members read memberships" ON public.workspace_members
FOR SELECT TO authenticated USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Admins add memberships" ON public.workspace_members
FOR INSERT TO authenticated
WITH CHECK (public.has_workspace_role(workspace_id, ARRAY['administrator']::public.app_role[]));

CREATE POLICY "Admins update memberships" ON public.workspace_members
FOR UPDATE TO authenticated
USING (public.has_workspace_role(workspace_id, ARRAY['administrator']::public.app_role[]))
WITH CHECK (public.has_workspace_role(workspace_id, ARRAY['administrator']::public.app_role[]));

CREATE POLICY "Admins remove memberships" ON public.workspace_members
FOR DELETE TO authenticated
USING (public.has_workspace_role(workspace_id, ARRAY['administrator']::public.app_role[]));

-- Creating a workspace automatically makes its creator the administrator.
CREATE OR REPLACE FUNCTION public.add_workspace_creator() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'administrator')
  ON CONFLICT (workspace_id, user_id) DO NOTHING;
  RETURN NEW;
END $$;
CREATE TRIGGER on_workspace_created
AFTER INSERT ON public.workspaces
FOR EACH ROW EXECUTE FUNCTION public.add_workspace_creator();
