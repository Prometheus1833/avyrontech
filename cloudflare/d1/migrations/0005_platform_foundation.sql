-- 0005_platform_foundation.sql — account lifecycle, durable leads and email audit
PRAGMA foreign_keys = ON;

ALTER TABLE users ADD COLUMN must_change_password INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN disabled_at INTEGER;
ALTER TABLE users ADD COLUMN last_login_at INTEGER;

ALTER TABLE leads ADD COLUMN business TEXT;
ALTER TABLE leads ADD COLUMN website TEXT;
ALTER TABLE leads ADD COLUMN language TEXT NOT NULL DEFAULT 'ro';
ALTER TABLE leads ADD COLUMN attachments_json TEXT;
ALTER TABLE leads ADD COLUMN delivery_status TEXT NOT NULL DEFAULT 'pending'
  CHECK (delivery_status IN ('pending','sent','failed'));
ALTER TABLE leads ADD COLUMN delivery_error TEXT;
ALTER TABLE leads ADD COLUMN updated_at INTEGER;

CREATE INDEX IF NOT EXISTS idx_users_disabled ON users(disabled_at);
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_delivery ON leads(delivery_status, created_at);

CREATE TABLE IF NOT EXISTS example_requests (
  id              TEXT PRIMARY KEY,
  email           TEXT NOT NULL,
  phone           TEXT NOT NULL,
  source_slug     TEXT NOT NULL,
  source_category TEXT,
  source_name     TEXT,
  user_agent      TEXT,
  status          TEXT NOT NULL DEFAULT 'new'
                  CHECK (status IN ('new','contacted','completed','spam')),
  delivery_status TEXT NOT NULL DEFAULT 'pending'
                  CHECK (delivery_status IN ('pending','sent','failed')),
  created_at      INTEGER NOT NULL,
  updated_at      INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_example_requests_created ON example_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_example_requests_status ON example_requests(status, created_at);

CREATE TABLE IF NOT EXISTS email_delivery_log (
  id          TEXT PRIMARY KEY,
  kind        TEXT NOT NULL,
  entity_id   TEXT,
  recipient   TEXT NOT NULL,
  provider    TEXT NOT NULL DEFAULT 'smtp',
  status      TEXT NOT NULL CHECK (status IN ('sent','failed')),
  error       TEXT,
  created_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_email_delivery_entity ON email_delivery_log(kind, entity_id, created_at);

PRAGMA optimize;
