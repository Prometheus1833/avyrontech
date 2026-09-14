-- Internal operations; all writes remain authenticated and audited.
CREATE TABLE operation_records (
 id TEXT PRIMARY KEY,
 kind TEXT NOT NULL CHECK(kind IN ('contract','change_request','appointment','compliance','privacy_request','experiment')),
 title TEXT NOT NULL,
 description TEXT NOT NULL DEFAULT '',
 project_id TEXT REFERENCES projects(id),
 client_id TEXT REFERENCES clients(id),
 assignee_id TEXT REFERENCES users(id),
 status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','pending','approved','active','done','cancelled')),
 starts_at INTEGER,
 due_at INTEGER,
 amount_minor INTEGER CHECK(amount_minor IS NULL OR amount_minor>=0),
 currency TEXT NOT NULL DEFAULT 'RON' CHECK(currency IN ('RON','EUR','USD','GBP','CHF')),
 revision INTEGER NOT NULL DEFAULT 1,
 approved_revision INTEGER,
 approved_by TEXT REFERENCES users(id),
 approved_at INTEGER,
 created_by TEXT NOT NULL REFERENCES users(id),
 created_at INTEGER NOT NULL,
 updated_at INTEGER NOT NULL,
 archived_at INTEGER
);
CREATE INDEX operation_records_listing ON operation_records(kind,archived_at,due_at);
CREATE TABLE operation_automations (
 id TEXT PRIMARY KEY,
 name TEXT NOT NULL,
 action TEXT NOT NULL CHECK(action IN ('briefing','deadlines','health')),
 interval_minutes INTEGER NOT NULL CHECK(interval_minutes BETWEEN 15 AND 10080),
 enabled INTEGER NOT NULL DEFAULT 0 CHECK(enabled IN (0,1)),
 next_run_at INTEGER NOT NULL,
 created_by TEXT NOT NULL REFERENCES users(id),
 revision INTEGER NOT NULL DEFAULT 1,
 created_at INTEGER NOT NULL,
 updated_at INTEGER NOT NULL
);
CREATE TABLE operation_jobs (
 id TEXT PRIMARY KEY,
 automation_id TEXT REFERENCES operation_automations(id),
 action TEXT NOT NULL CHECK(action IN ('briefing','deadlines','health')),
 deduplication_key TEXT NOT NULL UNIQUE,
 status TEXT NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','running','succeeded','failed','cancelled')),
 attempts INTEGER NOT NULL DEFAULT 0,
 available_at INTEGER NOT NULL,
 lease_token TEXT,
 locked_until INTEGER,
 result_json TEXT CHECK(result_json IS NULL OR json_valid(result_json)),
 error_code TEXT,
 created_at INTEGER NOT NULL,
 completed_at INTEGER
);
CREATE INDEX operation_jobs_pending ON operation_jobs(status,available_at,locked_until);
CREATE TABLE operation_notifications (
 id TEXT PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES users(id),
 deduplication_key TEXT NOT NULL,
 title TEXT NOT NULL,
 body TEXT NOT NULL,
 destination TEXT NOT NULL,
 read_at INTEGER,
 created_at INTEGER NOT NULL,
 UNIQUE(user_id,deduplication_key)
);
CREATE INDEX operation_notifications_user ON operation_notifications(user_id,created_at);
CREATE TABLE integration_accounts (
 id TEXT PRIMARY KEY,
 provider TEXT NOT NULL CHECK(provider IN ('github','stripe','cloudflare','revolut')),
 label TEXT NOT NULL,
 environment TEXT NOT NULL CHECK(environment IN ('test','live')),
 status TEXT NOT NULL DEFAULT 'configured' CHECK(status IN ('configured','connected','error','disconnected')),
 secret_reference TEXT,
 revision INTEGER NOT NULL DEFAULT 1,
 checked_at INTEGER,
 synced_at INTEGER,
 error_code TEXT,
 created_by TEXT NOT NULL REFERENCES users(id),
 created_at INTEGER NOT NULL,
 updated_at INTEGER NOT NULL
);
CREATE TABLE integration_snapshots (
 account_id TEXT PRIMARY KEY REFERENCES integration_accounts(id),
 summary_json TEXT NOT NULL CHECK(json_valid(summary_json)),
 created_at INTEGER NOT NULL
);
CREATE TABLE integration_documents (
 account_id TEXT NOT NULL REFERENCES integration_accounts(id),
 external_id TEXT NOT NULL,
 kind TEXT NOT NULL,
 summary_json TEXT NOT NULL CHECK(json_valid(summary_json)),
 synced_at INTEGER NOT NULL,
 PRIMARY KEY(account_id,external_id)
);
