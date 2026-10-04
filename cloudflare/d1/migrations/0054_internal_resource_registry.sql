-- Registru configurabil pentru resursele operaționale care nu sunt documente R2.
-- Documentele private rămân în hub_documents; aici păstrăm doar referințe,
-- câmpuri de lucru și elemente de roadmap, fără secrete sau credențiale.

CREATE TABLE IF NOT EXISTS internal_resources (
  id          TEXT PRIMARY KEY,
  kind        TEXT NOT NULL CHECK (kind IN ('website','field','tool','reference','career','library')),
  title       TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  url         TEXT,
  category    TEXT NOT NULL DEFAULT 'General',
  status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','planned','archived')),
  created_by  TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  updated_by  TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_internal_resources_kind_status
  ON internal_resources(kind, status, updated_at DESC);
