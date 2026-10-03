-- 0038_internal_platform_19.sql — blog settings, recoverable lead removal,
-- and human-approved private documentation drafts for AVY Engine.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS blog_settings (
  id                    TEXT PRIMARY KEY CHECK (id = 'global'),
  publication_name      TEXT NOT NULL DEFAULT 'Avyron Insights',
  editorial_description TEXT NOT NULL DEFAULT '',
  default_language      TEXT NOT NULL DEFAULT 'ro' CHECK (default_language IN ('ro','en')),
  default_category      TEXT NOT NULL DEFAULT 'digital',
  updated_by            TEXT REFERENCES users(id) ON DELETE SET NULL,
  updated_at            INTEGER NOT NULL
);

INSERT OR IGNORE INTO blog_settings
  (id, publication_name, editorial_description, default_language, default_category, updated_at)
VALUES
  ('global', 'Avyron Insights', 'Analize aplicate, ghiduri și studii de caz AVYRON.', 'ro', 'digital', CAST(strftime('%s','now') AS INTEGER) * 1000);

ALTER TABLE leads ADD COLUMN deleted_at INTEGER;
CREATE INDEX IF NOT EXISTS idx_leads_active_pipeline
  ON leads(deleted_at, lifecycle_stage, urgent, created_at DESC);

ALTER TABLE engine_sources ADD COLUMN private_documentation TEXT NOT NULL DEFAULT '';
ALTER TABLE engine_capabilities ADD COLUMN private_documentation TEXT NOT NULL DEFAULT '';
ALTER TABLE engine_connectors ADD COLUMN private_documentation TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS engine_documentation_drafts (
  id                TEXT PRIMARY KEY,
  source_id         TEXT NOT NULL REFERENCES engine_sources(id) ON DELETE CASCADE,
  target_type       TEXT NOT NULL CHECK (target_type IN ('source','capability','connector')),
  target_id         TEXT NOT NULL,
  prompt            TEXT NOT NULL CHECK (length(prompt) BETWEEN 10 AND 4000),
  generated_content TEXT NOT NULL CHECK (length(generated_content) BETWEEN 20 AND 12000),
  status            TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','applied','rejected')),
  requested_by      TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  applied_by        TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at        INTEGER NOT NULL,
  applied_at        INTEGER
);
CREATE INDEX IF NOT EXISTS idx_engine_documentation_drafts_target
  ON engine_documentation_drafts(target_type, target_id, created_at DESC);

PRAGMA optimize;
