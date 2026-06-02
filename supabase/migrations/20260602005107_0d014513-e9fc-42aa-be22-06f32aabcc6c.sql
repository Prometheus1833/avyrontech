-- Domain checks cache retention: keep 90 days
CREATE OR REPLACE FUNCTION public.cleanup_old_domain_checks()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.domain_checks
  WHERE created_at < now() - interval '90 days';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_old_domain_checks() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_domain_checks() TO service_role;

-- Schedule daily cleanup via pg_cron if available
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('domain_checks_retention_daily')
      WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'domain_checks_retention_daily');
    PERFORM cron.schedule(
      'domain_checks_retention_daily',
      '17 3 * * *',
      $cron$ SELECT public.cleanup_old_domain_checks(); $cron$
    );
  END IF;
END$$;

-- Helpful index for date-range filtering and ordering
CREATE INDEX IF NOT EXISTS idx_domain_checks_created_at ON public.domain_checks (created_at DESC);