-- 0039_newsletter_studio.sql — consent-first newsletter acquisition,
-- configurable on-site prompt and provider-neutral campaign drafts.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS newsletter_settings (
  id                     TEXT PRIMARY KEY CHECK (id = 'global'),
  enabled                INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0,1)),
  prompt_enabled         INTEGER NOT NULL DEFAULT 1 CHECK (prompt_enabled IN (0,1)),
  delay_seconds          INTEGER NOT NULL DEFAULT 45 CHECK (delay_seconds BETWEEN 10 AND 600),
  min_page_views         INTEGER NOT NULL DEFAULT 2 CHECK (min_page_views BETWEEN 1 AND 20),
  scroll_percent         INTEGER NOT NULL DEFAULT 45 CHECK (scroll_percent BETWEEN 10 AND 95),
  cooldown_days          INTEGER NOT NULL DEFAULT 30 CHECK (cooldown_days BETWEEN 1 AND 365),
  title_ro               TEXT NOT NULL DEFAULT 'Idei digitale, fără zgomot',
  title_en               TEXT NOT NULL DEFAULT 'Digital ideas, without the noise',
  body_ro                TEXT NOT NULL DEFAULT 'Primești rar analize AVYRON, exemple aplicate și idei care pot îmbunătăți o afacere.',
  body_en                TEXT NOT NULL DEFAULT 'Occasional AVYRON insights, practical examples and ideas that can improve a business.',
  cta_ro                 TEXT NOT NULL DEFAULT 'Vreau ideile AVYRON',
  cta_en                 TEXT NOT NULL DEFAULT 'Send me AVYRON insights',
  frequency_ro           TEXT NOT NULL DEFAULT 'Cel mult 1–2 emailuri pe lună. Te poți dezabona oricând.',
  frequency_en           TEXT NOT NULL DEFAULT 'At most 1–2 emails per month. Unsubscribe at any time.',
  consent_policy_version TEXT NOT NULL DEFAULT 'newsletter-2026-10-03',
  updated_by             TEXT REFERENCES users(id) ON DELETE SET NULL,
  updated_at             INTEGER NOT NULL
);

INSERT OR IGNORE INTO newsletter_settings (id, updated_at)
VALUES ('global', CAST(strftime('%s','now') AS INTEGER) * 1000);

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id                       TEXT PRIMARY KEY,
  email                    TEXT NOT NULL COLLATE NOCASE UNIQUE CHECK (length(email) BETWEEN 5 AND 254),
  name                     TEXT CHECK (name IS NULL OR length(name) <= 120),
  language                 TEXT NOT NULL DEFAULT 'ro' CHECK (language IN ('ro','en')),
  status                   TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','unsubscribed','suppressed')),
  source                   TEXT NOT NULL DEFAULT 'website' CHECK (length(source) BETWEEN 2 AND 80),
  interest                 TEXT CHECK (interest IS NULL OR length(interest) <= 80),
  consent_policy_version   TEXT NOT NULL,
  consent_evidence         TEXT NOT NULL CHECK (length(consent_evidence) BETWEEN 3 AND 1000),
  consent_ip_hash          TEXT,
  confirmation_token_hash  TEXT UNIQUE,
  confirmation_expires_at  INTEGER,
  requested_at             INTEGER NOT NULL,
  confirmed_at             INTEGER,
  unsubscribed_at          INTEGER,
  last_seen_at             INTEGER NOT NULL,
  updated_at               INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_status_updated
  ON newsletter_subscribers(status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_interest
  ON newsletter_subscribers(interest, status, updated_at DESC);

CREATE TABLE IF NOT EXISTS newsletter_events (
  id             TEXT PRIMARY KEY,
  subscriber_id  TEXT NOT NULL REFERENCES newsletter_subscribers(id) ON DELETE CASCADE,
  action         TEXT NOT NULL CHECK (action IN ('requested','confirmed','resubscribed','unsubscribed','admin_added','admin_updated','suppressed')),
  source         TEXT NOT NULL,
  actor_user_id  TEXT REFERENCES users(id) ON DELETE SET NULL,
  evidence_json  TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(evidence_json)),
  created_at     INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_newsletter_events_subscriber
  ON newsletter_events(subscriber_id, created_at DESC);

CREATE TABLE IF NOT EXISTS newsletter_campaigns (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL CHECK (length(name) BETWEEN 3 AND 120),
  language      TEXT NOT NULL DEFAULT 'ro' CHECK (language IN ('ro','en','all')),
  subject       TEXT NOT NULL CHECK (length(subject) BETWEEN 3 AND 160),
  preheader     TEXT NOT NULL DEFAULT '' CHECK (length(preheader) <= 220),
  content       TEXT NOT NULL CHECK (length(content) BETWEEN 10 AND 20000),
  status        TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','ready','archived')),
  segment_json  TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(segment_json)),
  created_by    TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  updated_by    TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_newsletter_campaigns_status_updated
  ON newsletter_campaigns(status, updated_at DESC);

PRAGMA optimize;
