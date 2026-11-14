CREATE TABLE IF NOT EXISTS site_content (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  draft TEXT NOT NULL CHECK (json_valid(draft)),
  published TEXT NOT NULL CHECK (json_valid(published)),
  revision INTEGER NOT NULL DEFAULT 1,
  published_revision INTEGER NOT NULL DEFAULT 1,
  published_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  data TEXT NOT NULL CHECK (json_valid(data))
);
CREATE TABLE IF NOT EXISTS owners (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL COLLATE NOCASE UNIQUE,
  language TEXT NOT NULL CHECK (language IN ('ro', 'en')),
  email_allowed INTEGER NOT NULL CHECK (email_allowed IN (0, 1))
);
CREATE TABLE IF NOT EXISTS pets (
  id INTEGER PRIMARY KEY,
  owner_id INTEGER NOT NULL REFERENCES owners(id),
  name TEXT NOT NULL,
  species TEXT NOT NULL CHECK (species IN ('dog', 'cat', 'other'))
);
CREATE INDEX IF NOT EXISTS pets_owner ON pets(owner_id);
CREATE TABLE IF NOT EXISTS reminders (
  id INTEGER PRIMARY KEY,
  pet_id INTEGER NOT NULL REFERENCES pets(id),
  kind TEXT NOT NULL CHECK (kind IN ('vaccine', 'parasites', 'checkup')),
  due_on TEXT NOT NULL,
  lead_days INTEGER NOT NULL CHECK (lead_days BETWEEN 0 AND 90),
  send_on TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'done', 'cancelled')),
  revision INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS reminders_queue ON reminders(status, send_on);
CREATE TABLE IF NOT EXISTS delivery_events (
  id INTEGER PRIMARY KEY,
  reminder_id INTEGER NOT NULL REFERENCES reminders(id),
  revision INTEGER NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  simulated_on TEXT NOT NULL,
  send_time TEXT NOT NULL,
  pet_snapshot TEXT NOT NULL,
  kind_snapshot TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind = 'simulated'),
  provider_message_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (reminder_id, revision)
);
