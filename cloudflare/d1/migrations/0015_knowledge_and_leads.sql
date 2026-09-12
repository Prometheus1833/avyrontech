-- 0015_knowledge_and_leads.sql — surse verificate, knowledge graph și CRM Leads
--
-- D1 rămâne sursa centrală de adevăr. Conectorii păstrează numai referințe la
-- secrete; niciun token OAuth/API nu este stocat în D1.

PRAGMA foreign_keys = ON;

-- ─── Conectori și proveniență ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS source_connections (
  id                 TEXT PRIMARY KEY,
  organization_id    TEXT REFERENCES organizations(id) ON DELETE CASCADE,
  provider           TEXT NOT NULL,
  purpose            TEXT NOT NULL CHECK (purpose IN ('knowledge','leads','analytics','publishing')),
  account_label      TEXT NOT NULL,
  status             TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','active','paused','error','revoked')),
  scopes_json        TEXT NOT NULL DEFAULT '[]',
  secret_reference   TEXT,
  external_account_id TEXT,
  last_validated_at  INTEGER,
  last_error_code    TEXT,
  created_by         TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at         INTEGER NOT NULL,
  updated_at         INTEGER NOT NULL,
  UNIQUE (organization_id, provider, purpose, external_account_id),
  CHECK (json_valid(scopes_json)),
  CHECK (secret_reference IS NULL OR secret_reference LIKE 'secret:%')
);
CREATE INDEX IF NOT EXISTS idx_source_connections_status
  ON source_connections(purpose, status, provider);

CREATE TABLE IF NOT EXISTS knowledge_sources (
  id                 TEXT PRIMARY KEY,
  organization_id    TEXT REFERENCES organizations(id) ON DELETE CASCADE,
  connection_id      TEXT REFERENCES source_connections(id) ON DELETE SET NULL,
  kind               TEXT NOT NULL
                     CHECK (kind IN ('website','social','document','manual','project','product')),
  name               TEXT NOT NULL,
  canonical_url      TEXT,
  status             TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','active','paused','error','revoked')),
  visibility         TEXT NOT NULL DEFAULT 'internal'
                     CHECK (visibility IN ('public','internal','tenant')),
  trust_level        TEXT NOT NULL DEFAULT 'unverified'
                     CHECK (trust_level IN ('unverified','authorized','verified')),
  sync_policy_json   TEXT NOT NULL DEFAULT '{}',
  last_synced_at     INTEGER,
  last_error_code    TEXT,
  created_by         TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at         INTEGER NOT NULL,
  updated_at         INTEGER NOT NULL,
  UNIQUE (organization_id, canonical_url),
  CHECK (json_valid(sync_policy_json)),
  CHECK (visibility <> 'tenant' OR organization_id IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_knowledge_sources_sync
  ON knowledge_sources(status, kind, last_synced_at);

CREATE TABLE IF NOT EXISTS knowledge_documents (
  id                 TEXT PRIMARY KEY,
  source_id          TEXT NOT NULL REFERENCES knowledge_sources(id) ON DELETE CASCADE,
  organization_id    TEXT REFERENCES organizations(id) ON DELETE CASCADE,
  external_id        TEXT,
  canonical_url      TEXT,
  language           TEXT NOT NULL DEFAULT 'ro' CHECK (language IN ('ro','en')),
  title              TEXT NOT NULL,
  content_hash       TEXT NOT NULL,
  content_text       TEXT NOT NULL,
  visibility         TEXT NOT NULL DEFAULT 'internal'
                     CHECK (visibility IN ('public','internal','tenant')),
  status             TEXT NOT NULL DEFAULT 'draft'
                     CHECK (status IN ('draft','review','approved','archived')),
  published_at       INTEGER,
  fetched_at         INTEGER NOT NULL,
  approved_by        TEXT REFERENCES users(id) ON DELETE SET NULL,
  approved_at        INTEGER,
  created_at         INTEGER NOT NULL,
  updated_at         INTEGER NOT NULL,
  UNIQUE (source_id, content_hash),
  CHECK (length(content_text) <= 65536),
  CHECK (status <> 'approved' OR approved_at IS NOT NULL),
  CHECK (visibility <> 'tenant' OR organization_id IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_retrieval
  ON knowledge_documents(status, visibility, language, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_source
  ON knowledge_documents(source_id, fetched_at DESC);

CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id                 TEXT PRIMARY KEY,
  document_id        TEXT NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
  ordinal            INTEGER NOT NULL CHECK (ordinal >= 0),
  content_hash       TEXT NOT NULL,
  content_text       TEXT NOT NULL,
  token_estimate     INTEGER NOT NULL DEFAULT 0 CHECK (token_estimate >= 0),
  metadata_json      TEXT NOT NULL DEFAULT '{}',
  created_at         INTEGER NOT NULL,
  UNIQUE (document_id, ordinal),
  UNIQUE (document_id, content_hash),
  CHECK (length(content_text) BETWEEN 1 AND 12000),
  CHECK (json_valid(metadata_json))
);

CREATE TABLE IF NOT EXISTS knowledge_claims (
  id                 TEXT PRIMARY KEY,
  organization_id    TEXT REFERENCES organizations(id) ON DELETE CASCADE,
  document_id        TEXT REFERENCES knowledge_documents(id) ON DELETE SET NULL,
  fact_key           TEXT NOT NULL,
  language           TEXT NOT NULL DEFAULT 'ro' CHECK (language IN ('ro','en')),
  value_json         TEXT NOT NULL,
  status             TEXT NOT NULL DEFAULT 'draft'
                     CHECK (status IN ('draft','approved','superseded','rejected')),
  valid_from         INTEGER,
  valid_until        INTEGER,
  approved_by        TEXT REFERENCES users(id) ON DELETE SET NULL,
  approved_at        INTEGER,
  created_at         INTEGER NOT NULL,
  updated_at         INTEGER NOT NULL,
  UNIQUE (organization_id, fact_key, language, valid_from),
  CHECK (json_valid(value_json)),
  CHECK (valid_until IS NULL OR valid_from IS NULL OR valid_until > valid_from),
  CHECK (status <> 'approved' OR approved_at IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_knowledge_claims_active
  ON knowledge_claims(status, fact_key, language, valid_until);

CREATE TABLE IF NOT EXISTS knowledge_sync_runs (
  id                 TEXT PRIMARY KEY,
  source_id          TEXT NOT NULL REFERENCES knowledge_sources(id) ON DELETE CASCADE,
  trigger_kind       TEXT NOT NULL CHECK (trigger_kind IN ('manual','schedule','webhook','backfill')),
  status             TEXT NOT NULL DEFAULT 'queued'
                     CHECK (status IN ('queued','running','awaiting_approval','succeeded','failed','cancelled')),
  cursor_json        TEXT,
  discovered_count  INTEGER NOT NULL DEFAULT 0 CHECK (discovered_count >= 0),
  imported_count    INTEGER NOT NULL DEFAULT 0 CHECK (imported_count >= 0),
  skipped_count     INTEGER NOT NULL DEFAULT 0 CHECK (skipped_count >= 0),
  error_code         TEXT,
  requested_by      TEXT REFERENCES users(id) ON DELETE SET NULL,
  started_at         INTEGER,
  completed_at       INTEGER,
  created_at         INTEGER NOT NULL,
  CHECK (cursor_json IS NULL OR json_valid(cursor_json))
);
CREATE INDEX IF NOT EXISTS idx_knowledge_sync_queue
  ON knowledge_sync_runs(status, created_at);

-- Site-ul poate fi sursă verificată. Conturile sociale sunt numai registry
-- până când proprietarul aprobă OAuth/API și conectorul validează identitatea.
INSERT OR IGNORE INTO knowledge_sources
  (id, kind, name, canonical_url, status, visibility, trust_level,
   sync_policy_json, created_at, updated_at)
VALUES
  ('ks_avyron_site', 'website', 'Avyron.ro', 'https://avyron.ro/', 'active', 'public', 'verified',
   '{"mode":"reviewed","schedule":"manual"}',
   CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000),
  ('ks_avyron_instagram', 'social', 'Instagram @avyrontech', 'https://www.instagram.com/avyrontech/', 'pending', 'public', 'unverified',
   '{"mode":"oauth_required"}',
   CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000),
  ('ks_avyron_facebook', 'social', 'Facebook Avyron Dev', 'https://www.facebook.com/people/Avyron-Dev/61560319432764/', 'pending', 'public', 'unverified',
   '{"mode":"oauth_required"}',
   CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000),
  ('ks_avyron_tiktok', 'social', 'TikTok @avyron4', 'https://www.tiktok.com/@avyron4', 'pending', 'public', 'unverified',
   '{"mode":"oauth_required"}',
   CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000),
  ('ks_avyron_linkedin', 'social', 'LinkedIn Avyron Solutions', 'https://www.linkedin.com/in/avyron-solutions-757595406', 'pending', 'public', 'unverified',
   '{"mode":"oauth_required"}',
   CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000);

UPDATE ai_knowledge
   SET source_url = 'https://avyron.ro/'
 WHERE source = 'site' AND source_url IS NULL;

-- ─── Leads CRM și agentul de calificare ────────────────────────────────
-- `status` rămâne compatibil cu aplicația existentă. `lifecycle_stage`
-- oferă fluxul detaliat fără o migrare distructivă a vechiului CHECK.
ALTER TABLE leads ADD COLUMN lifecycle_stage TEXT NOT NULL DEFAULT 'new_lead'
  CHECK (lifecycle_stage IN ('new_lead','contacted','discussion','potential_client','offer','accepted','rejected','converted'));
ALTER TABLE leads ADD COLUMN preferred_channel TEXT
  CHECK (preferred_channel IS NULL OR preferred_channel IN ('phone','whatsapp','email','sms','social'));
ALTER TABLE leads ADD COLUMN next_follow_up_at INTEGER;
ALTER TABLE leads ADD COLUMN urgent INTEGER NOT NULL DEFAULT 0 CHECK (urgent IN (0,1));
ALTER TABLE leads ADD COLUMN converted_project_id TEXT REFERENCES projects(id) ON DELETE SET NULL;
ALTER TABLE leads ADD COLUMN accepted_at INTEGER;
ALTER TABLE leads ADD COLUMN lost_reason TEXT;
ALTER TABLE leads ADD COLUMN confidence REAL CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1));
ALTER TABLE leads ADD COLUMN provenance_url TEXT;
ALTER TABLE leads ADD COLUMN outreach_eligibility TEXT NOT NULL DEFAULT 'unknown'
  CHECK (outreach_eligibility IN ('unknown','consented','legitimate_interest','do_not_contact','blocked'));

CREATE INDEX IF NOT EXISTS idx_leads_pipeline
  ON leads(organization_id, lifecycle_stage, urgent DESC, next_follow_up_at, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_converted_project ON leads(converted_project_id);

CREATE TABLE IF NOT EXISTS lead_assignments (
  lead_id            TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  user_id            TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assignment_role    TEXT NOT NULL DEFAULT 'owner'
                     CHECK (assignment_role IN ('owner','collaborator','reviewer')),
  assigned_by        TEXT REFERENCES users(id) ON DELETE SET NULL,
  assigned_at        INTEGER NOT NULL,
  PRIMARY KEY (lead_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_lead_assignments_user ON lead_assignments(user_id, assigned_at DESC);

CREATE TABLE IF NOT EXISTS lead_activities (
  id                 TEXT PRIMARY KEY,
  lead_id            TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  actor_user_id      TEXT REFERENCES users(id) ON DELETE SET NULL,
  actor_agent_slug   TEXT REFERENCES ai_agents(slug) ON DELETE SET NULL,
  kind               TEXT NOT NULL
                     CHECK (kind IN ('note','call','email','whatsapp','sms','social','status_change','assignment','offer','conversion')),
  direction          TEXT CHECK (direction IS NULL OR direction IN ('inbound','outbound','internal')),
  outcome            TEXT,
  content            TEXT,
  occurred_at        INTEGER NOT NULL,
  created_at         INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_lead_activities_timeline
  ON lead_activities(lead_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS lead_reminders (
  id                 TEXT PRIMARY KEY,
  lead_id            TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  assigned_to        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  due_at             INTEGER NOT NULL,
  note               TEXT NOT NULL,
  status             TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','done','cancelled')),
  created_by         TEXT REFERENCES users(id) ON DELETE SET NULL,
  completed_at       INTEGER,
  created_at         INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_lead_reminders_due
  ON lead_reminders(assigned_to, status, due_at);

CREATE TABLE IF NOT EXISTS lead_candidates (
  id                 TEXT PRIMARY KEY,
  organization_id    TEXT REFERENCES organizations(id) ON DELETE CASCADE,
  source_id          TEXT REFERENCES knowledge_sources(id) ON DELETE SET NULL,
  discovered_by      TEXT NOT NULL DEFAULT 'leads',
  business_name      TEXT,
  public_contact_json TEXT NOT NULL DEFAULT '{}',
  provenance_url     TEXT NOT NULL,
  rationale          TEXT NOT NULL,
  confidence         REAL NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  status             TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','approved','rejected','promoted','expired')),
  reviewed_by        TEXT REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at        INTEGER,
  promoted_lead_id   TEXT REFERENCES leads(id) ON DELETE SET NULL,
  created_at         INTEGER NOT NULL,
  updated_at         INTEGER NOT NULL,
  CHECK (json_valid(public_contact_json)),
  CHECK (status NOT IN ('approved','rejected','promoted') OR reviewed_at IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_lead_candidates_review
  ON lead_candidates(status, confidence DESC, created_at DESC);

-- Instrumentele există, dar scrierea/outreach-ul rămân dezactivate până când
-- API-ul cu idempotency, audit și aprobare umană este activat explicit.
UPDATE ai_tools
   SET description = 'Propune un lead cu proveniență; promovarea în CRM cere validare server-side.',
       handler_version = 'planned:v2', updated_at = CAST(strftime('%s','now') AS INTEGER) * 1000
 WHERE slug = 'capture_lead' AND status = 'disabled';
UPDATE ai_tools
   SET description = 'Propune calificarea și următorul pas; nu trimite mesaje externe.',
       handler_version = 'planned:v2', updated_at = CAST(strftime('%s','now') AS INTEGER) * 1000
 WHERE slug = 'qualify_lead' AND status = 'disabled';
