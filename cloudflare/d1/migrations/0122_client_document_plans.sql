CREATE TABLE document_client_plans (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  template_id TEXT REFERENCES document_templates(id) ON DELETE SET NULL,
  document_id TEXT UNIQUE REFERENCES documents(id) ON DELETE RESTRICT,
  title TEXT NOT NULL CHECK(length(title) BETWEEN 1 AND 240),
  series TEXT NOT NULL DEFAULT '' CHECK(length(series) <= 120),
  due_date TEXT,
  notes TEXT NOT NULL DEFAULT '' CHECK(length(notes) <= 1000),
  archived_at INTEGER,
  revision INTEGER NOT NULL DEFAULT 1 CHECK(revision > 0),
  created_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX idx_document_client_plans_pending
  ON document_client_plans(client_id, due_date, created_at, id)
  WHERE archived_at IS NULL AND document_id IS NULL;

CREATE TRIGGER document_client_plan_project_insert
BEFORE INSERT ON document_client_plans
WHEN NEW.project_id IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM projects WHERE id=NEW.project_id AND client_id=NEW.client_id
)
BEGIN SELECT RAISE(ABORT, 'assignment_scope_denied'); END;

CREATE TRIGGER document_client_plan_scope_update
BEFORE UPDATE OF client_id, project_id, document_id ON document_client_plans
WHEN NEW.client_id<>OLD.client_id
  OR (NEW.project_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM projects WHERE id=NEW.project_id AND client_id=NEW.client_id
  ))
  OR (NEW.document_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM documents WHERE id=NEW.document_id AND beneficiary_id=NEW.client_id AND scope='client'
  ))
BEGIN SELECT RAISE(ABORT, 'assignment_scope_denied'); END;
