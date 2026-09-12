-- 0017_ai_production_projects.sql — AI AVY Prod / Proiecte AI
--
-- Modul separat de proiectele operaționale. D1 păstrează configurația,
-- permisiunile, rezumatele și metadata; materialele binare aparțin R2.
-- Conectorii păstrează numai referințe la secrete Cloudflare.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS ai_projects (
  id                      TEXT PRIMARY KEY,
  organization_id         TEXT REFERENCES organizations(id) ON DELETE CASCADE,
  slug                    TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name                    TEXT NOT NULL,
  product_key             TEXT NOT NULL
                          CHECK (product_key IN ('avyron_web','cutiuta_magica','retuvo','client_brand','other')),
  ownership_scope         TEXT NOT NULL DEFAULT 'agency'
                          CHECK (ownership_scope IN ('agency','client_managed')),
  summary                 TEXT NOT NULL DEFAULT '',
  status                  TEXT NOT NULL DEFAULT 'setup'
                          CHECK (status IN ('setup','active','paused','archived')),
  primary_objective       TEXT NOT NULL DEFAULT 'visibility'
                          CHECK (primary_objective IN ('sales','promotion','visibility','monetization','community')),
  automation_mode         TEXT NOT NULL DEFAULT 'manual'
                          CHECK (automation_mode IN ('manual','approval','automatic')),
  memory_status           TEXT NOT NULL DEFAULT 'empty'
                          CHECK (memory_status IN ('empty','learning','ready','stale','paused')),
  brand_tone              TEXT NOT NULL DEFAULT 'profesionist, tech, clar, prietenos',
  target_audience         TEXT NOT NULL DEFAULT '',
  core_offer              TEXT NOT NULL DEFAULT '',
  agent_instructions      TEXT NOT NULL DEFAULT '',
  competitor_scopes_json  TEXT NOT NULL DEFAULT '["local","national","international"]',
  daily_generation_limit  INTEGER NOT NULL DEFAULT 6 CHECK (daily_generation_limit BETWEEN 0 AND 100),
  content_retention_days  INTEGER NOT NULL DEFAULT 45 CHECK (content_retention_days BETWEEN 7 AND 365),
  raw_data_retention_days INTEGER NOT NULL DEFAULT 7 CHECK (raw_data_retention_days BETWEEN 1 AND 30),
  max_asset_bytes         INTEGER NOT NULL DEFAULT 25000000 CHECK (max_asset_bytes BETWEEN 1000000 AND 100000000),
  allow_outbound_messages INTEGER NOT NULL DEFAULT 0 CHECK (allow_outbound_messages IN (0,1)),
  created_by              TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at              INTEGER NOT NULL,
  updated_at              INTEGER NOT NULL,
  CHECK (json_valid(competitor_scopes_json)),
  CHECK (allow_outbound_messages = 0 OR automation_mode = 'automatic')
);
CREATE INDEX IF NOT EXISTS idx_ai_projects_status
  ON ai_projects(status, ownership_scope, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_projects_organization
  ON ai_projects(organization_id, status, updated_at DESC);

CREATE TABLE IF NOT EXISTS ai_project_members (
  project_id    TEXT NOT NULL REFERENCES ai_projects(id) ON DELETE CASCADE,
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role          TEXT NOT NULL CHECK (role IN ('owner','manager','editor','viewer')),
  status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','revoked')),
  granted_by    TEXT REFERENCES users(id) ON DELETE SET NULL,
  granted_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL,
  PRIMARY KEY (project_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_ai_project_members_user
  ON ai_project_members(user_id, status, project_id);

CREATE TABLE IF NOT EXISTS ai_project_channels (
  project_id          TEXT NOT NULL REFERENCES ai_projects(id) ON DELETE CASCADE,
  provider            TEXT NOT NULL
                      CHECK (provider IN ('facebook','instagram','tiktok','linkedin','whatsapp','messenger')),
  connection_id       TEXT REFERENCES source_connections(id) ON DELETE SET NULL,
  account_label       TEXT,
  external_account_id TEXT,
  connection_status   TEXT NOT NULL DEFAULT 'disconnected'
                      CHECK (connection_status IN ('disconnected','verifying','connected','error','paused')),
  allowed_actions_json TEXT NOT NULL DEFAULT '["read"]',
  last_analyzed_at    INTEGER,
  last_synced_at      INTEGER,
  last_error_code     TEXT,
  updated_by          TEXT REFERENCES users(id) ON DELETE SET NULL,
  updated_at          INTEGER NOT NULL,
  PRIMARY KEY (project_id, provider),
  CHECK (json_valid(allowed_actions_json)),
  CHECK (connection_status <> 'connected' OR connection_id IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_ai_project_channels_status
  ON ai_project_channels(connection_status, provider, updated_at DESC);

CREATE TABLE IF NOT EXISTS ai_project_agents (
  project_id        TEXT NOT NULL REFERENCES ai_projects(id) ON DELETE CASCADE,
  agent_slug        TEXT NOT NULL REFERENCES ai_agents(slug) ON DELETE RESTRICT,
  role              TEXT NOT NULL CHECK (role IN ('strategy','content','research','community','inbox','conversion')),
  status            TEXT NOT NULL DEFAULT 'setup'
                    CHECK (status IN ('setup','training','ready','paused','error')),
  autonomy          TEXT NOT NULL DEFAULT 'assist' CHECK (autonomy IN ('assist','semi','auto')),
  capabilities_json TEXT NOT NULL DEFAULT '[]',
  instructions      TEXT NOT NULL DEFAULT '',
  quality_score     REAL CHECK (quality_score IS NULL OR (quality_score >= 0 AND quality_score <= 1)),
  last_trained_at   INTEGER,
  last_run_at       INTEGER,
  updated_by        TEXT REFERENCES users(id) ON DELETE SET NULL,
  updated_at        INTEGER NOT NULL,
  PRIMARY KEY (project_id, agent_slug, role),
  CHECK (json_valid(capabilities_json))
);
CREATE INDEX IF NOT EXISTS idx_ai_project_agents_state
  ON ai_project_agents(project_id, status, role);

CREATE TABLE IF NOT EXISTS ai_project_strategy_versions (
  id              TEXT PRIMARY KEY,
  project_id      TEXT NOT NULL REFERENCES ai_projects(id) ON DELETE CASCADE,
  version         INTEGER NOT NULL CHECK (version > 0),
  objective       TEXT NOT NULL,
  strategy_json   TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft','approved','retired')),
  change_note     TEXT NOT NULL,
  created_by      TEXT REFERENCES users(id) ON DELETE SET NULL,
  approved_by     TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at      INTEGER NOT NULL,
  approved_at     INTEGER,
  UNIQUE (project_id, version),
  CHECK (json_valid(strategy_json)),
  CHECK (status <> 'approved' OR approved_at IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS ai_project_memories (
  id             TEXT PRIMARY KEY,
  project_id     TEXT NOT NULL REFERENCES ai_projects(id) ON DELETE CASCADE,
  kind           TEXT NOT NULL CHECK (kind IN ('brand','audience','performance','competitor','inbox','learning')),
  summary        TEXT NOT NULL CHECK (length(summary) BETWEEN 1 AND 4000),
  source_url     TEXT,
  source_hash    TEXT,
  confidence     REAL NOT NULL DEFAULT 0 CHECK (confidence >= 0 AND confidence <= 1),
  status         TEXT NOT NULL DEFAULT 'proposed'
                 CHECK (status IN ('proposed','approved','rejected','expired')),
  observed_at    INTEGER NOT NULL,
  expires_at     INTEGER NOT NULL,
  approved_by    TEXT REFERENCES users(id) ON DELETE SET NULL,
  approved_at    INTEGER,
  created_at     INTEGER NOT NULL,
  CHECK (expires_at > observed_at),
  CHECK (status <> 'approved' OR approved_at IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_ai_project_memory_active
  ON ai_project_memories(project_id, status, expires_at, kind);

CREATE TABLE IF NOT EXISTS ai_project_competitors (
  id                TEXT PRIMARY KEY,
  project_id        TEXT NOT NULL REFERENCES ai_projects(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  scope             TEXT NOT NULL CHECK (scope IN ('local','national','international')),
  canonical_url     TEXT NOT NULL,
  monitoring_status TEXT NOT NULL DEFAULT 'proposed'
                    CHECK (monitoring_status IN ('proposed','approved','paused','rejected')),
  rationale         TEXT NOT NULL DEFAULT '',
  last_analyzed_at  INTEGER,
  created_by        TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at        INTEGER NOT NULL,
  updated_at        INTEGER NOT NULL,
  UNIQUE (project_id, canonical_url)
);

CREATE TABLE IF NOT EXISTS ai_content_items (
  id                 TEXT PRIMARY KEY,
  project_id         TEXT NOT NULL REFERENCES ai_projects(id) ON DELETE CASCADE,
  created_by         TEXT REFERENCES users(id) ON DELETE SET NULL,
  generated_by_agent TEXT REFERENCES ai_agents(slug) ON DELETE SET NULL,
  format             TEXT NOT NULL
                     CHECK (format IN ('post','story','reel','carousel','message','article')),
  objective          TEXT NOT NULL
                     CHECK (objective IN ('sales','promotion','visibility','monetization','community')),
  channels_json      TEXT NOT NULL DEFAULT '[]',
  title              TEXT NOT NULL,
  caption            TEXT NOT NULL,
  visual_direction   TEXT NOT NULL DEFAULT '',
  cta                TEXT NOT NULL DEFAULT '',
  hashtags_json      TEXT NOT NULL DEFAULT '[]',
  r2_object_key      TEXT,
  asset_bytes        INTEGER CHECK (asset_bytes IS NULL OR asset_bytes >= 0),
  status             TEXT NOT NULL DEFAULT 'draft'
                     CHECK (status IN ('draft','pending_approval','approved','scheduled','published','rejected','expired')),
  scheduled_at       INTEGER,
  published_at       INTEGER,
  external_post_id   TEXT,
  approved_by        TEXT REFERENCES users(id) ON DELETE SET NULL,
  approved_at        INTEGER,
  expires_at         INTEGER NOT NULL,
  created_at         INTEGER NOT NULL,
  updated_at         INTEGER NOT NULL,
  CHECK (json_valid(channels_json)),
  CHECK (json_valid(hashtags_json)),
  CHECK (status NOT IN ('approved','scheduled','published') OR approved_at IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_ai_content_project_queue
  ON ai_content_items(project_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_content_expiry
  ON ai_content_items(status, expires_at);

CREATE TABLE IF NOT EXISTS ai_project_events (
  id            TEXT PRIMARY KEY,
  project_id    TEXT NOT NULL REFERENCES ai_projects(id) ON DELETE CASCADE,
  actor_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  action        TEXT NOT NULL,
  target_type   TEXT,
  target_id     TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at    INTEGER NOT NULL,
  CHECK (json_valid(metadata_json))
);
CREATE INDEX IF NOT EXISTS idx_ai_project_events_timeline
  ON ai_project_events(project_id, created_at DESC);

-- Agentul de producție generează numai ciorne. Publicarea, mesajele și
-- conectarea conturilor sunt instrumente distincte și rămân dezactivate.
INSERT OR IGNORE INTO ai_agents
  (id, slug, name, mission, channel, status, visibility, model, temperature,
   max_tokens, autonomy, language, accent, system_prompt, guardrails, tools_json,
   created_at, updated_at, current_version)
VALUES
  ('agent_ai_prod_content', 'ai-prod-content', 'AI AVY Content Producer',
   'Generează ciorne relevante de postări, story-uri, reels, carusele și mesaje pentru proiectele aprobate.',
   'intern', 'active', 'private', '@cf/meta/llama-3.1-8b-instruct-fast', 0.45,
   800, 'assist', 'ro', '#8B5CF6',
   'Ești agentul editorial AI AVY Prod. Generezi conținut original, realist, specific brandului, clar și orientat către obiectiv.',
   'Nu publica și nu trimite mesaje. Nu inventa rezultate, prețuri, clienți sau date despre competitori. Orice ieșire este ciornă și necesită aprobare umană.',
   '["knowledge_search"]',
   CAST(strftime('%s','now') AS INTEGER) * 1000,
   CAST(strftime('%s','now') AS INTEGER) * 1000, 1);

INSERT OR IGNORE INTO ai_agent_versions
  (id, agent_slug, version, status, model, temperature, max_tokens, autonomy,
   system_prompt, guardrails, tools_json, change_note, created_at, approved_at)
SELECT
  'agent_version_ai_prod_content_1', slug, 1, 'approved', model, temperature,
  max_tokens, autonomy, system_prompt, guardrails, tools_json,
  'Versiune inițială limitată la generarea de ciorne', created_at, created_at
FROM ai_agents WHERE slug = 'ai-prod-content';

INSERT OR IGNORE INTO ai_agent_tool_policies
  (agent_version_id, tool_slug, mode, allowed_scopes_json, max_calls_per_run)
VALUES ('agent_version_ai_prod_content_1', 'knowledge_search', 'read', '["approved_content"]', 4);

INSERT OR IGNORE INTO ai_projects
  (id, slug, name, product_key, ownership_scope, summary, status,
   primary_objective, automation_mode, memory_status, target_audience, core_offer,
   agent_instructions, created_at, updated_at)
VALUES
  ('aip_avyron_web', 'avyron-web', 'Avyron WEB', 'avyron_web', 'agency',
   'Prezența digitală și produsele agenției Avyron.', 'setup', 'sales', 'manual', 'learning',
   'Afaceri și antreprenori care au nevoie de produse digitale performante.',
   'Website-uri, aplicații, identitate digitală și agenți AI orientați spre rezultate.',
   'Comunicare premium, concretă, fără promisiuni neverificabile.',
   CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000),
  ('aip_cutiuta_magica', 'cutiuta-magica', 'Cutiuța Magică', 'cutiuta_magica', 'agency',
   'Produs educațional și comercial administrat prin ecosistemul Avyron.', 'setup', 'promotion', 'manual', 'empty',
   'Părinți, familii și cumpărători interesați de experiențe și produse atent curate.',
   'Produse și experiențe prezentate cald, clar și responsabil.',
   'Ton prietenos și credibil; fiecare afirmație comercială trebuie verificată.',
   CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000),
  ('aip_retuvo', 'retuvo', 'Retuvo', 'retuvo', 'agency',
   'Produs digital Avyron cu strategie separată de vizibilitate și monetizare.', 'setup', 'visibility', 'manual', 'empty',
   'Utilizatori și parteneri relevanți pentru ecosistemul Retuvo.',
   'Platformă digitală configurabilă, cu experiență clară și scalabilă.',
   'Conținut tehnic accesibil, realist și orientat spre încredere.',
   CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000);

INSERT OR IGNORE INTO ai_project_channels (project_id, provider, updated_at)
SELECT project.id, provider.value, CAST(strftime('%s','now') AS INTEGER) * 1000
  FROM ai_projects AS project,
       json_each('["facebook","instagram","tiktok","linkedin","whatsapp","messenger"]') AS provider
 WHERE project.id IN ('aip_avyron_web','aip_cutiuta_magica','aip_retuvo');

INSERT OR IGNORE INTO ai_project_agents
  (project_id, agent_slug, role, status, autonomy, capabilities_json, instructions, updated_at)
SELECT id, 'ai-prod-content', 'content', 'ready', 'assist',
       '["post","story","reel","carousel","message","seo_caption"]',
       'Generează numai ciorne pe baza strategiei și memoriei aprobate.',
       CAST(strftime('%s','now') AS INTEGER) * 1000
  FROM ai_projects WHERE id IN ('aip_avyron_web','aip_cutiuta_magica','aip_retuvo');

INSERT OR IGNORE INTO ai_project_agents
  (project_id, agent_slug, role, status, autonomy, capabilities_json, instructions, updated_at)
SELECT id, 'leads', 'conversion', 'training', 'assist',
       '["lead_signals","reply_draft","handoff"]',
       'Propune răspunsuri și lead-uri; nu contactează extern.',
       CAST(strftime('%s','now') AS INTEGER) * 1000
  FROM ai_projects WHERE id IN ('aip_avyron_web','aip_cutiuta_magica','aip_retuvo');

INSERT OR IGNORE INTO ai_project_agents
  (project_id, agent_slug, role, status, autonomy, capabilities_json, instructions, updated_at)
SELECT id, 'avy', 'research', 'training', 'assist',
       '["approved_sources","competitor_summary","opportunity_map"]',
       'Analizează numai surse publice aprobate și păstrează proveniența.',
       CAST(strftime('%s','now') AS INTEGER) * 1000
  FROM ai_projects WHERE id IN ('aip_avyron_web','aip_cutiuta_magica','aip_retuvo');
