-- Public funnel results that must remain visible in AVYRON OS.
-- No IP address, cookie identifier or contact detail is stored for domain checks.

CREATE TABLE IF NOT EXISTS public_domain_checks (
  id         TEXT PRIMARY KEY,
  domain     TEXT NOT NULL,
  status     TEXT NOT NULL CHECK(status IN ('available','registered','unknown')),
  source     TEXT NOT NULL CHECK(source IN ('iana-rdap','cloudflare-doh','unavailable')),
  language   TEXT NOT NULL DEFAULT 'ro' CHECK(language IN ('ro','en')),
  surface    TEXT NOT NULL DEFAULT 'landing' CHECK(length(surface) BETWEEN 1 AND 40),
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_public_domain_checks_created
  ON public_domain_checks(created_at DESC, id);

CREATE INDEX IF NOT EXISTS idx_public_domain_checks_domain
  ON public_domain_checks(domain, created_at DESC);

PRAGMA optimize;
