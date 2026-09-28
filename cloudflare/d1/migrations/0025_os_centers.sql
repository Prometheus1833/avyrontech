-- Append-only operational extension. External execution is not implied by a registry record.
CREATE TABLE staff_dashboard_access (
 user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 department TEXT NOT NULL CHECK(department IN ('general','sales','developer','marketing','finance','support')),
 job_title TEXT NOT NULL DEFAULT '',
 read_json TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(read_json)),
 write_json TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(write_json)),
 revision INTEGER NOT NULL DEFAULT 1,
 updated_by TEXT NOT NULL REFERENCES users(id), updated_at INTEGER NOT NULL
);
CREATE TABLE os_center_records (
 id TEXT PRIMARY KEY,
 kind TEXT NOT NULL CHECK(kind IN ('domains','sla','vault','backup','security','profitability','newsletter')),
 title TEXT NOT NULL CHECK(length(title) BETWEEN 1 AND 200),
 description TEXT NOT NULL DEFAULT '',
 status TEXT NOT NULL CHECK(status IN ('draft','active','warning','resolved','archived','pending','subscribed','unsubscribed','recovery_requested')),
 client_id TEXT REFERENCES clients(id), project_id TEXT REFERENCES projects(id), assignee_id TEXT REFERENCES users(id),
 due_at INTEGER, data_json TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(data_json)),
 secret_reference TEXT, revision INTEGER NOT NULL DEFAULT 1,
 created_by TEXT NOT NULL REFERENCES users(id), created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
);
CREATE INDEX os_center_due ON os_center_records(kind,status,due_at);
CREATE UNIQUE INDEX os_newsletter_email ON os_center_records(lower(json_extract(data_json,'$.email'))) WHERE kind='newsletter';
CREATE TABLE community_comments (
 id TEXT PRIMARY KEY, path TEXT NOT NULL, author_id TEXT NOT NULL REFERENCES users(id),
 content TEXT NOT NULL CHECK(length(content) BETWEEN 1 AND 4000),
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','spam')),
 revision INTEGER NOT NULL DEFAULT 1, moderated_by TEXT REFERENCES users(id), moderated_at INTEGER,
 created_at INTEGER NOT NULL
);
CREATE INDEX community_comment_moderation ON community_comments(status,created_at DESC);
CREATE INDEX community_comment_page ON community_comments(path,status,created_at);
CREATE TABLE newsletter_consent_events (
 id TEXT PRIMARY KEY, subscriber_id TEXT NOT NULL REFERENCES os_center_records(id),
 action TEXT NOT NULL CHECK(action IN ('subscribed','unsubscribed','pending')),
 evidence TEXT NOT NULL, actor_id TEXT NOT NULL REFERENCES users(id), created_at INTEGER NOT NULL
);
CREATE TABLE os_briefing_preferences (
 user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 enabled INTEGER NOT NULL DEFAULT 1 CHECK(enabled IN (0,1)),
 lookahead_days INTEGER NOT NULL DEFAULT 7 CHECK(lookahead_days BETWEEN 1 AND 30),
 include_finance INTEGER NOT NULL DEFAULT 1 CHECK(include_finance IN (0,1)),
 updated_at INTEGER NOT NULL
);
CREATE TABLE os_health_observations (
 service TEXT PRIMARY KEY, status TEXT NOT NULL CHECK(status IN ('ok','warning','error','unknown')),
 detail TEXT NOT NULL, checked_at INTEGER NOT NULL, source TEXT NOT NULL
);
CREATE INDEX os_analytics_time ON page_events(created_at,event);
ALTER TABLE operation_automations ADD COLUMN manual_minutes_saved INTEGER CHECK(manual_minutes_saved IS NULL OR manual_minutes_saved BETWEEN 0 AND 10080);
