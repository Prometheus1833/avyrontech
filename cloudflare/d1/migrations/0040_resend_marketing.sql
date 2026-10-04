-- 0040_resend_marketing.sql — Resend is isolated to consented bulk marketing;
-- Cloudflare Email Service remains the transactional/essential delivery path.
PRAGMA foreign_keys = ON;

ALTER TABLE newsletter_subscribers ADD COLUMN resend_contact_id TEXT;
ALTER TABLE newsletter_subscribers ADD COLUMN resend_synced_at INTEGER;
ALTER TABLE newsletter_subscribers ADD COLUMN resend_sync_error TEXT;

ALTER TABLE newsletter_campaigns ADD COLUMN provider TEXT NOT NULL DEFAULT 'resend' CHECK (provider = 'resend');
ALTER TABLE newsletter_campaigns ADD COLUMN provider_broadcast_id TEXT;
ALTER TABLE newsletter_campaigns ADD COLUMN provider_status TEXT NOT NULL DEFAULT 'local_draft'
  CHECK (provider_status IN ('local_draft','provider_draft','queued','scheduled','sent','failed'));
ALTER TABLE newsletter_campaigns ADD COLUMN scheduled_at INTEGER;
ALTER TABLE newsletter_campaigns ADD COLUMN sent_at INTEGER;
ALTER TABLE newsletter_campaigns ADD COLUMN provider_error TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_newsletter_campaigns_provider_broadcast
  ON newsletter_campaigns(provider_broadcast_id) WHERE provider_broadcast_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_resend_sync
  ON newsletter_subscribers(status, resend_synced_at, updated_at);

CREATE TABLE IF NOT EXISTS newsletter_provider_events (
  id             TEXT PRIMARY KEY,
  provider       TEXT NOT NULL CHECK (provider = 'resend'),
  event_type     TEXT NOT NULL,
  email          TEXT,
  campaign_id    TEXT REFERENCES newsletter_campaigns(id) ON DELETE SET NULL,
  payload_json   TEXT NOT NULL CHECK (json_valid(payload_json)),
  created_at     INTEGER NOT NULL,
  processed_at   INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_newsletter_provider_events_type_created
  ON newsletter_provider_events(event_type, created_at DESC);

PRAGMA optimize;
