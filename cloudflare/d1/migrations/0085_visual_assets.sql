-- Private visual-resource catalog; CRM, accounts, projects and R2 remain canonical.
CREATE TABLE visual_assets(
 id TEXT PRIMARY KEY,scope TEXT NOT NULL CHECK(scope IN('agency','client')),
 client_id TEXT REFERENCES clients(id) ON DELETE RESTRICT,project_id TEXT REFERENCES projects(id) ON DELETE RESTRICT,
 title TEXT NOT NULL CHECK(length(title) BETWEEN 1 AND 180),category TEXT NOT NULL CHECK(category IN('logo','identity','icon','image','guideline','other')),
 description TEXT NOT NULL DEFAULT '',tags_json TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(tags_json)),
 object_key TEXT NOT NULL UNIQUE,file_name TEXT NOT NULL,content_type TEXT NOT NULL,size_bytes INTEGER NOT NULL CHECK(size_bytes>0 AND size_bytes<=15728640),
 sha256 TEXT NOT NULL,scan_status TEXT NOT NULL DEFAULT 'quarantined' CHECK(scan_status IN('quarantined','clean','rejected')),
 archived_at INTEGER,revision INTEGER NOT NULL DEFAULT 1 CHECK(revision>0),
 created_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,
 CHECK((scope='agency' AND client_id IS NULL AND project_id IS NULL) OR (scope='client' AND client_id IS NOT NULL))
);
CREATE INDEX visual_asset_scope ON visual_assets(scope,client_id,archived_at,updated_at DESC);
CREATE INDEX visual_asset_project ON visual_assets(project_id);
CREATE INDEX visual_asset_creator ON visual_assets(created_by,scan_status);
CREATE TRIGGER visual_asset_project_client_insert BEFORE INSERT ON visual_assets WHEN NEW.project_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM projects p WHERE p.id=NEW.project_id AND p.client_id=NEW.client_id) BEGIN SELECT RAISE(ABORT,'visual_asset_beneficiary_mismatch'); END;
CREATE TRIGGER visual_asset_context_immutable BEFORE UPDATE OF scope,client_id,project_id,object_key,sha256,file_name,content_type,size_bytes,created_by ON visual_assets BEGIN SELECT RAISE(ABORT,'visual_asset_context_immutable'); END;
CREATE TABLE visual_asset_backups(
 id TEXT PRIMARY KEY,asset_id TEXT NOT NULL REFERENCES visual_assets(id) ON DELETE RESTRICT,object_key TEXT NOT NULL UNIQUE,sha256 TEXT NOT NULL,manifest_sha256 TEXT NOT NULL,size_bytes INTEGER NOT NULL,
 created_by TEXT NOT NULL REFERENCES users(id),created_at INTEGER NOT NULL
);
CREATE INDEX visual_asset_backup_asset ON visual_asset_backups(asset_id,created_at DESC);

CREATE TRIGGER visual_asset_parent_beneficiary BEFORE UPDATE OF client_id ON projects WHEN NEW.client_id<>OLD.client_id AND EXISTS(SELECT 1 FROM visual_assets a WHERE a.project_id=OLD.id) BEGIN SELECT RAISE(ABORT,'client_workspace_asset_history'); END;
