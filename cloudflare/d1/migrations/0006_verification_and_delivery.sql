-- 0006_verification_and_delivery.sql — verified signup and actionable SMTP failures
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS email_verifications (
  token       TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  INTEGER NOT NULL,
  expires_at  INTEGER NOT NULL,
  used_at     INTEGER
);
CREATE INDEX IF NOT EXISTS idx_email_verifications_user ON email_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_email_verifications_expires ON email_verifications(expires_at);

ALTER TABLE example_requests ADD COLUMN delivery_error TEXT;
CREATE INDEX IF NOT EXISTS idx_example_delivery ON example_requests(delivery_status, created_at);

PRAGMA optimize;
