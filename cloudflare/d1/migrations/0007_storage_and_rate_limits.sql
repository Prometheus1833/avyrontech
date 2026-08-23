-- 0007_storage_and_rate_limits.sql — exact rate windows and storage integrity
PRAGMA foreign_keys = ON;

-- KV is eventually consistent and is therefore reserved for configuration and
-- cache. Security counters live in D1, where one UPSERT increments atomically.
CREATE TABLE IF NOT EXISTS rate_limit_counters (
  scope_key   TEXT NOT NULL,
  window_start INTEGER NOT NULL,
  count       INTEGER NOT NULL DEFAULT 1 CHECK (count > 0),
  expires_at  INTEGER NOT NULL,
  PRIMARY KEY (scope_key, window_start)
);
CREATE INDEX IF NOT EXISTS idx_rate_limit_expires
  ON rate_limit_counters(expires_at);

CREATE UNIQUE INDEX IF NOT EXISTS uq_project_media_r2_key
  ON project_media(r2_key);

PRAGMA optimize;
