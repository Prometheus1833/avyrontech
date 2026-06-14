-- 0001_init.sql — schemă inițială D1
-- Aplicare: bunx wrangler d1 migrations apply avyron-db --remote

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS domain_cache (
  domain      TEXT PRIMARY KEY,
  tld         TEXT NOT NULL,
  status      TEXT NOT NULL CHECK (status IN ('available','registered','unknown')),
  source      TEXT,
  checked_at  INTEGER NOT NULL,
  expires_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_domain_cache_expires ON domain_cache(expires_at);

CREATE TABLE IF NOT EXISTS rate_limits (
  key         TEXT PRIMARY KEY,
  count       INTEGER NOT NULL DEFAULT 0,
  window_end  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON rate_limits(window_end);

CREATE TABLE IF NOT EXISTS edge_hits (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  path        TEXT NOT NULL,
  country     TEXT,
  ua_class    TEXT,
  ts          INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_edge_hits_ts ON edge_hits(ts);
CREATE INDEX IF NOT EXISTS idx_edge_hits_path ON edge_hits(path);
