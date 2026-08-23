-- 0001_init.sql — Schemă D1 inițială (Avyron business data)
-- Aplicare: npx wrangler d1 migrations apply avyron-db --remote
--
-- Regulă de aur:
--   D1 = listări, relații, filtrări, căutări (clients, projects, invoices, …)
--   KV = setări unice (site_settings, homepage_content, seo_settings, features)
--   R2 = fișiere (contracts, logos, website-media, invoices PDF)

PRAGMA foreign_keys = ON;

-- ─── CLIENTS ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clients (
  id            TEXT PRIMARY KEY,                 -- uuid generat în Worker
  company_name  TEXT NOT NULL,
  contact_name  TEXT,
  email         TEXT NOT NULL,
  phone         TEXT,
  status        TEXT NOT NULL DEFAULT 'active'    -- active | paused | archived
                CHECK (status IN ('active','paused','archived')),
  created_at    INTEGER NOT NULL                  -- epoch ms
);
CREATE INDEX IF NOT EXISTS idx_clients_email  ON clients(email);
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);

-- ─── PROJECTS ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS projects (
  id          TEXT PRIMARY KEY,
  client_id   TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  domain      TEXT,
  status      TEXT NOT NULL DEFAULT 'in_progress'
              CHECK (status IN ('lead','in_progress','live','maintenance','archived')),
  created_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_projects_client ON projects(client_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);

-- ─── SERVICES ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS services (
  id             TEXT PRIMARY KEY,
  project_id     TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  service_name   TEXT NOT NULL,
  price          REAL NOT NULL DEFAULT 0,         -- RON
  billing_cycle  TEXT NOT NULL DEFAULT 'monthly'
                 CHECK (billing_cycle IN ('one_time','monthly','yearly'))
);
CREATE INDEX IF NOT EXISTS idx_services_project ON services(project_id);

-- ─── SUBSCRIPTIONS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscriptions (
  id                 TEXT PRIMARY KEY,
  client_id          TEXT NOT NULL REFERENCES clients(id)  ON DELETE CASCADE,
  service_id         TEXT NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  next_billing_date  INTEGER NOT NULL,            -- epoch ms
  status             TEXT NOT NULL DEFAULT 'active'
                     CHECK (status IN ('active','paused','cancelled'))
);
CREATE INDEX IF NOT EXISTS idx_subs_client ON subscriptions(client_id);
CREATE INDEX IF NOT EXISTS idx_subs_next   ON subscriptions(next_billing_date);

-- ─── INVOICES ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoices (
  id          TEXT PRIMARY KEY,
  client_id   TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  amount      REAL NOT NULL,
  status      TEXT NOT NULL DEFAULT 'draft'
              CHECK (status IN ('draft','sent','paid','overdue','void')),
  due_date    INTEGER NOT NULL,
  created_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_invoices_client ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due    ON invoices(due_date);

-- ─── PAYMENTS ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id          TEXT PRIMARY KEY,
  invoice_id  TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  amount      REAL NOT NULL,
  provider    TEXT NOT NULL,                      -- stripe | paddle | bank | cash
  paid_at     INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);

-- ─── LEADS ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leads (
  id          TEXT PRIMARY KEY,
  source      TEXT,                                -- ex: 'homepage', 'examples', 'ads:google'
  name        TEXT,
  phone       TEXT,
  email       TEXT,
  message     TEXT,
  status      TEXT NOT NULL DEFAULT 'new'
              CHECK (status IN ('new','contacted','qualified','won','lost')),
  created_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_leads_status  ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at);

-- ─── SUPPORT TICKETS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS support_tickets (
  id          TEXT PRIMARY KEY,
  client_id   TEXT NOT NULL REFERENCES clients(id)  ON DELETE CASCADE,
  project_id  TEXT REFERENCES projects(id) ON DELETE SET NULL,
  subject     TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'open'
              CHECK (status IN ('open','pending','resolved','closed')),
  created_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tickets_client ON support_tickets(client_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON support_tickets(status);

-- ─── WEBSITE CONTENT (per-project CMS pentru clienții cu admin) ───────
CREATE TABLE IF NOT EXISTS website_content (
  id            TEXT PRIMARY KEY,
  project_id    TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  section       TEXT NOT NULL,                    -- ex: 'hero', 'about', 'services'
  content_json  TEXT NOT NULL,                    -- JSON ca TEXT (SQLite)
  updated_at    INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_website_content_section
  ON website_content(project_id, section);
