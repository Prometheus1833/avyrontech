-- Trigger-only functions: revoke from public/anon/authenticated
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tg_set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- Admin maintenance only
REVOKE ALL ON FUNCTION public.cleanup_old_domain_checks() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_domain_checks() TO service_role;

-- update_updated_at_column was missing search_path
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;