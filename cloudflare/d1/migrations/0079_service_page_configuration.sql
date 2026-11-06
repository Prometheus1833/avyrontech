-- Service editorial configuration, using the existing D1 database and accounts.
CREATE TABLE service_page_configs (
 page_key TEXT PRIMARY KEY,
 revision INTEGER NOT NULL DEFAULT 1 CHECK(revision>0),
 draft_json TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(draft_json) AND json_type(draft_json)='object'),
 published_revision INTEGER,
 updated_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 updated_at INTEGER NOT NULL,
 FOREIGN KEY(page_key,published_revision) REFERENCES service_page_versions(page_key,revision)
);
CREATE TABLE service_page_versions (
 page_key TEXT NOT NULL REFERENCES service_page_configs(page_key) ON DELETE RESTRICT,
 revision INTEGER NOT NULL CHECK(revision>0),
 content_json TEXT NOT NULL CHECK(json_valid(content_json) AND json_type(content_json)='object'),
 actor_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 created_at INTEGER NOT NULL,
 PRIMARY KEY(page_key,revision)
);
CREATE TRIGGER service_page_versions_immutable_update BEFORE UPDATE ON service_page_versions BEGIN SELECT RAISE(ABORT,'immutable_service_page_version'); END;
CREATE TRIGGER service_page_versions_immutable_delete BEFORE DELETE ON service_page_versions BEGIN SELECT RAISE(ABORT,'immutable_service_page_version'); END;
