BEGIN;
CREATE OR REPLACE FUNCTION public.guard_servicenow_verification()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF current_user IN ('authenticated','anon') THEN
    IF TG_OP = 'INSERT' THEN
      IF NEW.status NOT IN ('configured','not_configured','disabled') THEN RAISE EXCEPTION 'Server-controlled verification status'; END IF;
    ELSE
      IF NEW.status NOT IN ('configured','not_configured','disabled') THEN RAISE EXCEPTION 'Server-controlled verification status'; END IF;
    END IF;
    NEW.verified_at := NULL;
    NEW.verified_by := NULL;
    NEW.oauth_client_configured := false;
    NEW.capabilities := '{}'::jsonb;
    NEW.last_error := NULL;
    IF TG_OP = 'UPDATE' THEN
      NEW.last_sync_at := OLD.last_sync_at;
      NEW.last_sync_status := OLD.last_sync_status;
      NEW.last_sync_summary := OLD.last_sync_summary;
    ELSE
      NEW.last_sync_at := NULL;
      NEW.last_sync_status := NULL;
      NEW.last_sync_summary := '{}'::jsonb;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER guard_servicenow_verification BEFORE INSERT OR UPDATE ON public.servicenow_connections
FOR EACH ROW EXECUTE FUNCTION public.guard_servicenow_verification();
COMMIT;
