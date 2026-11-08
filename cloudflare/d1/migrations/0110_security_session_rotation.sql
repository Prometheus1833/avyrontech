-- Stable session IDs keep existing access JWTs valid. Refresh secrets rotate
-- independently, with a bounded grace period for concurrent browser tabs.
ALTER TABLE sessions ADD COLUMN refresh_token_hash TEXT;
ALTER TABLE sessions ADD COLUMN previous_refresh_token_hash TEXT;
ALTER TABLE sessions ADD COLUMN previous_refresh_expires_at INTEGER;
ALTER TABLE sessions ADD COLUMN refresh_rotated_at INTEGER;
ALTER TABLE sessions ADD COLUMN legacy_refresh_expires_at INTEGER;
CREATE UNIQUE INDEX idx_sessions_refresh_token ON sessions(refresh_token_hash) WHERE refresh_token_hash IS NOT NULL;
CREATE INDEX idx_sessions_previous_refresh ON sessions(previous_refresh_token_hash) WHERE previous_refresh_token_hash IS NOT NULL;
