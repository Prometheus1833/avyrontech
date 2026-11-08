-- Widen the existing source constraint without changing any historical record.
-- D1 applies each migration atomically. public_domain_checks has no dependent FKs/triggers.
CREATE TABLE public_domain_checks_registrar (
  id TEXT PRIMARY KEY,
  domain TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('available','registered','unknown')),
  source TEXT NOT NULL CHECK(source IN ('iana-rdap','cloudflare-doh','unavailable','openprovider')),
  language TEXT NOT NULL DEFAULT 'ro' CHECK(language IN ('ro','en')),
  surface TEXT NOT NULL DEFAULT 'landing' CHECK(length(surface) BETWEEN 1 AND 40),
  created_at INTEGER NOT NULL
);
INSERT INTO public_domain_checks_registrar(id,domain,status,source,language,surface,created_at)
SELECT id,domain,status,source,language,surface,created_at FROM public_domain_checks;
DROP TABLE public_domain_checks;
ALTER TABLE public_domain_checks_registrar RENAME TO public_domain_checks;
CREATE INDEX idx_public_domain_checks_created ON public_domain_checks(created_at DESC,id);
CREATE INDEX idx_public_domain_checks_domain ON public_domain_checks(domain,created_at DESC);
