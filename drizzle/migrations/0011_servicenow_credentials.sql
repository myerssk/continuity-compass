BEGIN;
CREATE TABLE public.servicenow_credentials (
  workspace_id uuid PRIMARY KEY REFERENCES public.workspaces(id) ON DELETE CASCADE,
  instance_url text NOT NULL,
  ciphertext text NOT NULL,
  iv text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.servicenow_credentials ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.servicenow_credentials FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.servicenow_credentials TO service_role;
COMMIT;
