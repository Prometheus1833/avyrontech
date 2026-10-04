-- 0041_optional_supabase_drive_connections.sql — optional, metadata-only
-- Supabase and Google Drive connections. Cloudflare D1/KV/R2 remain primary.
PRAGMA foreign_keys = ON;

CREATE TABLE integration_accounts_v2 (
 id TEXT PRIMARY KEY,
 provider TEXT NOT NULL CHECK(provider IN ('github','stripe','cloudflare','revolut','supabase','google_drive')),
 label TEXT NOT NULL,
 environment TEXT NOT NULL CHECK(environment IN ('test','live')),
 status TEXT NOT NULL DEFAULT 'configured' CHECK(status IN ('configured','connected','error','disconnected')),
 secret_reference TEXT,
 config_json TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(config_json)),
 revision INTEGER NOT NULL DEFAULT 1,
 checked_at INTEGER,
 synced_at INTEGER,
 error_code TEXT,
 owner_user_id TEXT NOT NULL REFERENCES users(id),
 created_by TEXT NOT NULL REFERENCES users(id),
 created_at INTEGER NOT NULL,
 updated_at INTEGER NOT NULL
);

INSERT INTO integration_accounts_v2
 (id,provider,label,environment,status,secret_reference,config_json,revision,checked_at,synced_at,error_code,owner_user_id,created_by,created_at,updated_at)
SELECT id,provider,label,environment,status,secret_reference,'{}',revision,checked_at,synced_at,error_code,created_by,created_by,created_at,updated_at
FROM integration_accounts;

CREATE TABLE integration_snapshots_v2 (
 account_id TEXT PRIMARY KEY REFERENCES integration_accounts_v2(id),
 summary_json TEXT NOT NULL CHECK(json_valid(summary_json)),
 created_at INTEGER NOT NULL
);
INSERT INTO integration_snapshots_v2 SELECT * FROM integration_snapshots;

CREATE TABLE integration_documents_v2 (
 account_id TEXT NOT NULL REFERENCES integration_accounts_v2(id),
 external_id TEXT NOT NULL,
 kind TEXT NOT NULL,
 summary_json TEXT NOT NULL CHECK(json_valid(summary_json)),
 synced_at INTEGER NOT NULL,
 PRIMARY KEY(account_id,external_id)
);
INSERT INTO integration_documents_v2 SELECT * FROM integration_documents;

DROP TABLE integration_documents;
DROP TABLE integration_snapshots;
DROP TABLE integration_accounts;

ALTER TABLE integration_accounts_v2 RENAME TO integration_accounts;
ALTER TABLE integration_snapshots_v2 RENAME TO integration_snapshots;
ALTER TABLE integration_documents_v2 RENAME TO integration_documents;

PRAGMA optimize;
