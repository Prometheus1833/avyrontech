-- Schemă D1 inițială (referință completă; reflectă migrațiile aplicate).
-- Pentru aplicare, folosește fișierele din `migrations/`.

PRAGMA foreign_keys = ON;

-- Cache pentru verificări de domenii la edge (oglindă opțională a domain_checks
-- din Postgres, pentru latență minimă în Workers).
CREATE TABLE IF NOT EXISTS domain_cache (
  domain      TEXT PRIMARY KEY,
  tld         TEXT NOT NULL,
  status      TEXT NOT NULL CHECK (status IN ('available','registered','unknown')),
  source      TEXT,
  checked_at  INTEGER NOT NULL,           -- epoch ms
  expires_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_domain_cache_expires ON domain_cache(expires_at);

-- Rate limiting persistent (cross-isolate).
CREATE TABLE IF NOT EXISTS rate_limits (
  key         TEXT PRIMARY KEY,           -- ex: "ip:1.2.3.4:check-domain"
  count       INTEGER NOT NULL DEFAULT 0,
  window_end  INTEGER NOT NULL            -- epoch ms
);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON rate_limits(window_end);

-- Analytics ușoare la edge (page hits, fără PII).
CREATE TABLE IF NOT EXISTS edge_hits (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  path        TEXT NOT NULL,
  country     TEXT,
  ua_class    TEXT,                       -- "mobile" | "desktop" | "bot"
  ts          INTEGER NOT NULL            -- epoch ms
);
CREATE INDEX IF NOT EXISTS idx_edge_hits_ts ON edge_hits(ts);
CREATE INDEX IF NOT EXISTS idx_edge_hits_path ON edge_hits(path);
