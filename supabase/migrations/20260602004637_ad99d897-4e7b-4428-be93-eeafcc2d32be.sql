
CREATE TABLE public.domain_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain text NOT NULL,
  tld text NOT NULL,
  name text NOT NULL,
  status text NOT NULL CHECK (status IN ('available','registered','unknown')),
  source text,
  user_agent text,
  ip_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.domain_checks TO anon, authenticated;
GRANT SELECT ON public.domain_checks TO authenticated;
GRANT ALL ON public.domain_checks TO service_role;

ALTER TABLE public.domain_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can log a domain check"
ON public.domain_checks
FOR INSERT
TO anon, authenticated
WITH CHECK (
  length(domain) BETWEEN 3 AND 100
  AND length(tld) BETWEEN 2 AND 20
  AND length(name) BETWEEN 2 AND 63
  AND (user_agent IS NULL OR length(user_agent) <= 500)
  AND (ip_hash IS NULL OR length(ip_hash) <= 128)
);

CREATE POLICY "Staff and admins view domain checks"
ON public.domain_checks
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'staff'::public.app_role)
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

CREATE INDEX domain_checks_domain_created_idx
  ON public.domain_checks (domain, created_at DESC);
CREATE INDEX domain_checks_created_idx
  ON public.domain_checks (created_at DESC);
