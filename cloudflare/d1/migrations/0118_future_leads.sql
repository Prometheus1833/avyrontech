-- A scheduled follow-on for the native CRM lead, not a second client registry.
CREATE TABLE future_leads (
  lead_id TEXT PRIMARY KEY REFERENCES leads(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK(length(title) BETWEEN 1 AND 180),
  contact_on TEXT NOT NULL CHECK(length(contact_on)=10 AND contact_on GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  requirements TEXT NOT NULL DEFAULT '' CHECK(length(requirements)<=500),
  project_kind TEXT NOT NULL,
  client_id TEXT REFERENCES clients(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK(status IN('scheduled','contacted','converted','archived')),
  revision INTEGER NOT NULL DEFAULT 1 CHECK(revision>0),
  schedule_version INTEGER NOT NULL DEFAULT 1 CHECK(schedule_version>0),
  scheduled_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX idx_future_leads_due ON future_leads(status,contact_on,lead_id);
CREATE TABLE future_lead_events (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL REFERENCES future_leads(lead_id) ON DELETE CASCADE,
  revision INTEGER NOT NULL,
  actor_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE(lead_id,revision)
);
CREATE TABLE future_lead_notices (
  notification_id TEXT PRIMARY KEY REFERENCES operation_notifications(id) ON DELETE CASCADE,
  lead_id TEXT NOT NULL REFERENCES future_leads(lead_id) ON DELETE CASCADE,
  schedule_version INTEGER NOT NULL,
  days_before INTEGER NOT NULL CHECK(days_before IN(10,5,1)),
  recipient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(lead_id,schedule_version,days_before,recipient_id)
);
CREATE INDEX idx_future_lead_notices_lead ON future_lead_notices(lead_id,schedule_version);
