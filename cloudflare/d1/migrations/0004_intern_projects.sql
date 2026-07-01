-- 0004_intern_projects.sql — Platformă internă: proiecte + propuneri + linkuri + logs + media
-- Aplicare: bunx wrangler d1 migrations apply avyron-db --remote
--
-- Extinde tabelul `projects` existent (0001_init.sql) și adaugă structurile
-- necesare paginii /intern/projects/:slug (staff + client admin al proiectului).

PRAGMA foreign_keys = ON;

-- ─── PROJECTS: extindere ─────────────────────────────────────────────────
-- ALTER TABLE ... ADD COLUMN pentru fiecare câmp nou (SQLite acceptă doar o coloană / statement)
ALTER TABLE projects ADD COLUMN slug          TEXT;                                    -- avyron.ro/intern/projects/<slug>
ALTER TABLE projects ADD COLUMN kind          TEXT DEFAULT 'website_prezentare';      -- website_prezentare | prezentare_premium | magazin_online | retele_sociale | identitate_completa | aplicatie
ALTER TABLE projects ADD COLUMN description   TEXT;
ALTER TABLE projects ADD COLUMN owner_user_id TEXT REFERENCES users(id) ON DELETE SET NULL; -- clientul admin
ALTER TABLE projects ADD COLUMN banner_status TEXT DEFAULT 'in_progress';             -- online | offline | revizuire | in_progress | testing
ALTER TABLE projects ADD COLUMN url           TEXT;                                    -- link produs live (buton "Accesare produs")
ALTER TABLE projects ADD COLUMN favicon_url   TEXT;
ALTER TABLE projects ADD COLUMN og_title      TEXT;
ALTER TABLE projects ADD COLUMN og_description TEXT;
ALTER TABLE projects ADD COLUMN og_image_url  TEXT;
ALTER TABLE projects ADD COLUMN cover_image_url TEXT;                                 -- background specific proiectului
ALTER TABLE projects ADD COLUMN price_ron     REAL;                                    -- cost (informativ)
ALTER TABLE projects ADD COLUMN price_eur     REAL;
ALTER TABLE projects ADD COLUMN subscription_plan TEXT;                                -- 100e | 150e | 300e | null
ALTER TABLE projects ADD COLUMN subscription_status TEXT;                              -- active | none | cancelled
ALTER TABLE projects ADD COLUMN billing_next  INTEGER;                                 -- epoch ms
ALTER TABLE projects ADD COLUMN updated_at    INTEGER;

CREATE UNIQUE INDEX IF NOT EXISTS uq_projects_slug ON projects(slug);
CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_projects_banner ON projects(banner_status);

-- ─── PROJECT_STAFF: many-to-many staff ↔ project ─────────────────────────
CREATE TABLE IF NOT EXISTS project_staff (
  project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id     TEXT NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'contributor'
              CHECK (role IN ('owner','contributor','viewer')),
  assigned_at INTEGER NOT NULL,
  PRIMARY KEY (project_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_project_staff_user ON project_staff(user_id);

-- ─── PROJECT_PROPOSALS: propuneri modificări (create de client / staff) ──
CREATE TABLE IF NOT EXISTS project_proposals (
  id          TEXT PRIMARY KEY,
  project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  author_id   TEXT NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  status      TEXT NOT NULL DEFAULT 'proposed'
              CHECK (status IN ('proposed','reviewed','in_progress','done','rejected')),
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_proposals_project ON project_proposals(project_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status  ON project_proposals(status);

-- ─── PROJECT_MEDIA: atașamente (imagini/documente) pentru propuneri ─────
CREATE TABLE IF NOT EXISTS project_media (
  id           TEXT PRIMARY KEY,
  project_id   TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  proposal_id  TEXT REFERENCES project_proposals(id) ON DELETE CASCADE,
  uploader_id  TEXT NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  r2_key       TEXT NOT NULL,                          -- projects/<project_id>/<uuid>-<file>
  filename     TEXT NOT NULL,
  content_type TEXT,
  size_bytes   INTEGER,
  created_at   INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_media_project  ON project_media(project_id);
CREATE INDEX IF NOT EXISTS idx_media_proposal ON project_media(proposal_id);

-- ─── PROJECT_LINKS: panouri externe (Cloudflare, GSC, GBP, social) ──────
CREATE TABLE IF NOT EXISTS project_links (
  id          TEXT PRIMARY KEY,
  project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL,                           -- cloudflare | gsc | gbp | facebook | instagram | tiktok | youtube | linkedin | other
  label       TEXT NOT NULL,
  url         TEXT NOT NULL,
  updated_by  TEXT REFERENCES users(id) ON DELETE SET NULL,
  updated_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_links_project ON project_links(project_id);

-- ─── PROJECT_LOGS: audit trail (cine/când a modificat) ──────────────────
CREATE TABLE IF NOT EXISTS project_logs (
  id          TEXT PRIMARY KEY,
  project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  actor_id    TEXT REFERENCES users(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,                           -- ex: 'project.update', 'proposal.status', 'link.add'
  target_type TEXT,                                    -- 'project' | 'proposal' | 'link' | 'media'
  target_id   TEXT,
  meta_json   TEXT,                                    -- JSON serializat cu diff/context
  created_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_logs_project ON project_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_logs_created ON project_logs(created_at);

-- ─── PROJECT_UPDATES: "Ultimele modificări" (feed public către client) ──
CREATE TABLE IF NOT EXISTS project_updates (
  id           TEXT PRIMARY KEY,
  project_id   TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  author_id    TEXT REFERENCES users(id) ON DELETE SET NULL,
  proposal_id  TEXT REFERENCES project_proposals(id) ON DELETE SET NULL,
  title        TEXT NOT NULL,
  body         TEXT,
  created_at   INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_updates_project ON project_updates(project_id);
CREATE INDEX IF NOT EXISTS idx_updates_created ON project_updates(created_at);

-- ─── SEED: 2 proiecte de test (placeholders — actualizează client_id/owner_user_id în app) ─
-- NOTE: rulează manual după ce ai un client + user înregistrat, sau via UI.
-- INSERT INTO projects (id, client_id, name, slug, kind, banner_status, url, description, created_at, updated_at)
-- VALUES
--   ('demo-1', '<client_id>', 'Clar Luminari', 'clarluminari-ro', 'website_prezentare', 'in_progress', 'https://clarluminari.ro', 'Website de prezentare pentru showroom corpuri iluminat.', strftime('%s','now')*1000, strftime('%s','now')*1000),
--   ('demo-2', '<client_id>', 'Pensiunea Cerbul', 'pensiuneacerbul-ro', 'prezentare_premium', 'testing', 'https://pensiuneacerbul.ro', 'Prezentare premium cu rezervări pentru pensiune.', strftime('%s','now')*1000, strftime('%s','now')*1000);
