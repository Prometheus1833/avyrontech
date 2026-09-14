-- Explicit account/client authorization; never infer financial access from email.
CREATE TABLE client_account_access (
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  granted_by TEXT NOT NULL REFERENCES users(id),
  created_at INTEGER NOT NULL,
  PRIMARY KEY(client_id,user_id)
);
CREATE INDEX idx_client_account_user ON client_account_access(user_id,client_id);

ALTER TABLE support_tickets ADD COLUMN description TEXT;
ALTER TABLE support_tickets ADD COLUMN priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('low','medium','high','urgent'));
ALTER TABLE support_tickets ADD COLUMN requester_user_id TEXT REFERENCES users(id);
ALTER TABLE support_tickets ADD COLUMN updated_at INTEGER;
ALTER TABLE support_tickets ADD COLUMN revision INTEGER NOT NULL DEFAULT 1;
CREATE TABLE support_messages (
  id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  author_id TEXT NOT NULL REFERENCES users(id),
  content TEXT NOT NULL CHECK(length(content) BETWEEN 1 AND 4000),
  is_staff_reply INTEGER NOT NULL CHECK(is_staff_reply IN (0,1)),
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_support_messages_ticket ON support_messages(ticket_id,created_at,id);
CREATE TABLE staff_announcements (
  id TEXT PRIMARY KEY,
  author_id TEXT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL CHECK(length(title) BETWEEN 1 AND 200),
  content TEXT NOT NULL CHECK(length(content) BETWEEN 1 AND 3000),
  priority TEXT NOT NULL CHECK(priority IN ('info','normal','important','critical')),
  created_at INTEGER NOT NULL,
  archived_at INTEGER
);
CREATE INDEX idx_staff_announcements_recent ON staff_announcements(archived_at,created_at DESC);
CREATE TABLE staff_chat_messages (
  id TEXT PRIMARY KEY,
  author_id TEXT NOT NULL REFERENCES users(id),
  recipient_id TEXT REFERENCES users(id),
  channel TEXT NOT NULL DEFAULT 'general' CHECK(channel IN ('general','dev','design','marketing','random')),
  content TEXT NOT NULL CHECK(length(content) BETWEEN 1 AND 4000),
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_staff_chat_recent ON staff_chat_messages(recipient_id,created_at DESC,id);
-- Shared delivery/onboarding/offboarding/SLA layer, attached to existing projects.
CREATE TABLE project_work_items (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK(kind IN ('task','deliverable','onboarding','offboarding','maintenance')),
  title TEXT NOT NULL CHECK(length(title) BETWEEN 1 AND 200),
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','in_progress','blocked','done','cancelled')),
  assignee_id TEXT REFERENCES users(id),
  due_at INTEGER,
  completed_at INTEGER,
  created_by TEXT NOT NULL REFERENCES users(id),
  revision INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX idx_project_work_due ON project_work_items(project_id,status,due_at);
CREATE TABLE internal_domain_checks (
  id TEXT PRIMARY KEY,
  domain TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('available','registered','unknown')),
  source TEXT NOT NULL,
  checked_by TEXT NOT NULL REFERENCES users(id),
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_internal_domain_checked ON internal_domain_checks(created_at DESC,id);
CREATE TABLE project_statistics (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  period_start INTEGER NOT NULL,
  period_end INTEGER NOT NULL CHECK(period_end>period_start),
  visits INTEGER CHECK(visits IS NULL OR visits>=0),
  unique_visitors INTEGER CHECK(unique_visitors IS NULL OR unique_visitors>=0),
  uptime_percent REAL CHECK(uptime_percent IS NULL OR uptime_percent BETWEEN 0 AND 100),
  avg_response_ms INTEGER CHECK(avg_response_ms IS NULL OR avg_response_ms>=0),
  source TEXT NOT NULL,
  recorded_by TEXT NOT NULL REFERENCES users(id),
  created_at INTEGER NOT NULL,
  UNIQUE(project_id,period_start,period_end,source)
);
CREATE INDEX idx_project_statistics_period ON project_statistics(project_id,period_end DESC);
