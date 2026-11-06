CREATE TABLE example_carousel_configs (
 page_key TEXT PRIMARY KEY,
 revision INTEGER NOT NULL CHECK(revision>0),
 draft_json TEXT NOT NULL CHECK(json_valid(draft_json)),
 review_state TEXT NOT NULL DEFAULT 'draft' CHECK(review_state IN('draft','in_review','rejected','approved','published')),
 published_revision INTEGER,
 updated_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 updated_at INTEGER NOT NULL,
 FOREIGN KEY(page_key,published_revision) REFERENCES example_carousel_versions(page_key,revision) ON DELETE RESTRICT
);
CREATE TABLE example_carousel_versions (
 page_key TEXT NOT NULL REFERENCES example_carousel_configs(page_key) ON DELETE RESTRICT,
 revision INTEGER NOT NULL CHECK(revision>0),
 content_json TEXT NOT NULL CHECK(json_valid(content_json)),
 actor_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 created_at INTEGER NOT NULL,
 PRIMARY KEY(page_key,revision)
);
CREATE INDEX idx_example_review ON example_carousel_configs(review_state,updated_at DESC);
CREATE TRIGGER immutable_example_version_update BEFORE UPDATE ON example_carousel_versions BEGIN SELECT RAISE(ABORT,'immutable_example_version'); END;
CREATE TRIGGER immutable_example_version_delete BEFORE DELETE ON example_carousel_versions BEGIN SELECT RAISE(ABORT,'immutable_example_version'); END;
CREATE TRIGGER immutable_example_key BEFORE UPDATE OF page_key ON example_carousel_configs BEGIN SELECT RAISE(ABORT,'immutable_example_key'); END;
