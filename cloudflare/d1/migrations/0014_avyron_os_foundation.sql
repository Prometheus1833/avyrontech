-- 0014_avyron_os_foundation.sql — multi-tenant RBAC, durable events and AI governance
--
-- This migration is append-only. It prepares the control plane without
-- changing existing public content or assigning legacy client data to a tenant.

PRAGMA foreign_keys = ON;

-- ─── Platform principals ────────────────────────────────────────────────
-- Super-admin identity is data, not a frontend rule. Existing owner emails
-- are provisioned here and every later change must go through an audited
-- administrative procedure.
CREATE TABLE IF NOT EXISTS platform_principals (
  email       TEXT PRIMARY KEY COLLATE NOCASE,
  role        TEXT NOT NULL CHECK (role IN ('platform_owner','superadmin')),
  status      TEXT NOT NULL DEFAULT 'active'
              CHECK (status IN ('active','suspended','revoked')),
  created_by  TEXT,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);

INSERT OR IGNORE INTO platform_principals
  (email, role, status, created_by, created_at, updated_at)
VALUES
  ('prometheus@avyron.ro', 'platform_owner', 'active', 'migration:0014',
   CAST(strftime('%s','now') AS INTEGER) * 1000,
   CAST(strftime('%s','now') AS INTEGER) * 1000),
  ('avyrontech@gmail.com', 'superadmin', 'active', 'migration:0014',
   CAST(strftime('%s','now') AS INTEGER) * 1000,
   CAST(strftime('%s','now') AS INTEGER) * 1000);

CREATE TABLE IF NOT EXISTS user_capabilities (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  capability    TEXT NOT NULL,
  organization_id TEXT REFERENCES organizations(id) ON DELETE CASCADE,
  granted_by    TEXT REFERENCES users(id) ON DELETE SET NULL,
  reason        TEXT NOT NULL,
  expires_at    INTEGER,
  revoked_at    INTEGER,
  created_at    INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_capabilities_scope
  ON user_capabilities(user_id, capability, ifnull(organization_id, 'platform'));
CREATE INDEX IF NOT EXISTS idx_user_capabilities_lookup
  ON user_capabilities(user_id, capability, revoked_at, expires_at);

-- ─── Organizations and memberships ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS organizations (
  id            TEXT PRIMARY KEY,
  slug          TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name          TEXT NOT NULL,
  kind          TEXT NOT NULL DEFAULT 'client'
                CHECK (kind IN ('platform','agency','client','partner')),
  status        TEXT NOT NULL DEFAULT 'active'
                CHECK (status IN ('active','suspended','archived')),
  timezone      TEXT NOT NULL DEFAULT 'Europe/Bucharest',
  currency      TEXT NOT NULL DEFAULT 'RON',
  created_by    TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_organizations_status ON organizations(status, name);

CREATE TABLE IF NOT EXISTS organization_memberships (
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id          TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role             TEXT NOT NULL
                   CHECK (role IN ('owner','admin','manager','specialist','client_admin','client_member','viewer')),
  status           TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','active','suspended','revoked')),
  approved_by      TEXT REFERENCES users(id) ON DELETE SET NULL,
  approved_at      INTEGER,
  created_at       INTEGER NOT NULL,
  updated_at       INTEGER NOT NULL,
  PRIMARY KEY (organization_id, user_id),
  CHECK (status <> 'active' OR approved_at IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_org_memberships_user
  ON organization_memberships(user_id, status, organization_id);
CREATE INDEX IF NOT EXISTS idx_org_memberships_role
  ON organization_memberships(organization_id, role, status);

CREATE TABLE IF NOT EXISTS organization_invitations (
  id              TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email           TEXT NOT NULL COLLATE NOCASE,
  role            TEXT NOT NULL
                  CHECK (role IN ('admin','manager','specialist','client_admin','client_member','viewer')),
  token_hash      TEXT NOT NULL UNIQUE,
  invited_by      TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  accepted_by     TEXT REFERENCES users(id) ON DELETE SET NULL,
  expires_at      INTEGER NOT NULL,
  accepted_at     INTEGER,
  revoked_at      INTEGER,
  created_at      INTEGER NOT NULL,
  CHECK (accepted_at IS NULL OR accepted_by IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_org_invitations_pending
  ON organization_invitations(organization_id, email, expires_at)
  WHERE accepted_at IS NULL AND revoked_at IS NULL;

-- Keep legacy client records intact and map them explicitly during onboarding.
CREATE TABLE IF NOT EXISTS client_organizations (
  client_id       TEXT PRIMARY KEY REFERENCES clients(id) ON DELETE CASCADE,
  organization_id TEXT NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  linked_by       TEXT REFERENCES users(id) ON DELETE SET NULL,
  linked_at       INTEGER NOT NULL
);

ALTER TABLE projects ADD COLUMN organization_id TEXT
  REFERENCES organizations(id) ON DELETE SET NULL;
ALTER TABLE leads ADD COLUMN organization_id TEXT
  REFERENCES organizations(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_projects_organization ON projects(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_leads_organization ON leads(organization_id, status, created_at);

-- ─── Sessions and MFA lifecycle ─────────────────────────────────────────
ALTER TABLE sessions ADD COLUMN revoked_at INTEGER;
ALTER TABLE sessions ADD COLUMN revoked_reason TEXT;
ALTER TABLE sessions ADD COLUMN mfa_verified_at INTEGER;
ALTER TABLE sessions ADD COLUMN device_name TEXT;
CREATE INDEX IF NOT EXISTS idx_sessions_active
  ON sessions(user_id, expires_at) WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS mfa_factors (
  id             TEXT PRIMARY KEY,
  user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind           TEXT NOT NULL CHECK (kind IN ('totp','webauthn')),
  label          TEXT NOT NULL,
  secret_ciphertext TEXT,
  credential_json TEXT,
  status         TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','active','revoked')),
  verified_at    INTEGER,
  last_used_at   INTEGER,
  created_at     INTEGER NOT NULL,
  CHECK ((kind = 'totp' AND secret_ciphertext IS NOT NULL) OR
         (kind = 'webauthn' AND credential_json IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS idx_mfa_factors_user ON mfa_factors(user_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS uq_mfa_active_totp
  ON mfa_factors(user_id, kind) WHERE status = 'active';

CREATE TABLE IF NOT EXISTS mfa_recovery_codes (
  factor_id    TEXT NOT NULL REFERENCES mfa_factors(id) ON DELETE CASCADE,
  code_hash    TEXT NOT NULL,
  used_at      INTEGER,
  created_at   INTEGER NOT NULL,
  PRIMARY KEY (factor_id, code_hash)
);

CREATE TABLE IF NOT EXISTS mfa_challenges (
  token_hash    TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  factor_id     TEXT NOT NULL REFERENCES mfa_factors(id) ON DELETE CASCADE,
  ip_hash       TEXT NOT NULL,
  attempts      INTEGER NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 5),
  expires_at    INTEGER NOT NULL,
  used_at       INTEGER,
  created_at    INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_mfa_challenges_user
  ON mfa_challenges(user_id, expires_at) WHERE used_at IS NULL;

CREATE TABLE IF NOT EXISTS email_change_requests (
  token_hash    TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  old_email     TEXT NOT NULL COLLATE NOCASE,
  new_email     TEXT NOT NULL COLLATE NOCASE,
  expires_at    INTEGER NOT NULL,
  used_at       INTEGER,
  revoked_at    INTEGER,
  created_at    INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_email_change_pending_user
  ON email_change_requests(user_id)
  WHERE used_at IS NULL AND revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_email_change_expiry
  ON email_change_requests(expires_at) WHERE used_at IS NULL AND revoked_at IS NULL;

-- ─── Auditing, idempotency and outbox ───────────────────────────────────
CREATE TABLE IF NOT EXISTS security_events (
  id              TEXT PRIMARY KEY,
  organization_id TEXT REFERENCES organizations(id) ON DELETE SET NULL,
  actor_user_id   TEXT REFERENCES users(id) ON DELETE SET NULL,
  actor_type      TEXT NOT NULL DEFAULT 'user'
                  CHECK (actor_type IN ('user','agent','system','anonymous')),
  action          TEXT NOT NULL,
  target_type     TEXT,
  target_id       TEXT,
  outcome         TEXT NOT NULL CHECK (outcome IN ('allowed','denied','failed')),
  severity        TEXT NOT NULL DEFAULT 'info'
                  CHECK (severity IN ('info','warning','critical')),
  request_id      TEXT,
  ip_hash         TEXT,
  metadata_json   TEXT NOT NULL DEFAULT '{}',
  created_at      INTEGER NOT NULL,
  CHECK (json_valid(metadata_json))
);
CREATE INDEX IF NOT EXISTS idx_security_events_org_time
  ON security_events(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_action_time
  ON security_events(action, created_at DESC);

CREATE TABLE IF NOT EXISTS idempotency_keys (
  scope             TEXT NOT NULL,
  idempotency_key   TEXT NOT NULL,
  request_hash      TEXT NOT NULL,
  response_status   INTEGER,
  response_json     TEXT,
  resource_type     TEXT,
  resource_id       TEXT,
  created_at        INTEGER NOT NULL,
  expires_at        INTEGER NOT NULL,
  PRIMARY KEY (scope, idempotency_key),
  CHECK (response_json IS NULL OR json_valid(response_json))
);
CREATE INDEX IF NOT EXISTS idx_idempotency_expiry ON idempotency_keys(expires_at);

CREATE TABLE IF NOT EXISTS outbox_events (
  id              TEXT PRIMARY KEY,
  deduplication_key TEXT NOT NULL UNIQUE,
  organization_id TEXT REFERENCES organizations(id) ON DELETE SET NULL,
  aggregate_type  TEXT NOT NULL,
  aggregate_id    TEXT NOT NULL,
  event_type      TEXT NOT NULL,
  payload_json    TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','processing','published','dead')),
  attempts        INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  available_at    INTEGER NOT NULL,
  locked_at       INTEGER,
  published_at    INTEGER,
  last_error      TEXT,
  created_at      INTEGER NOT NULL,
  CHECK (json_valid(payload_json))
);
CREATE INDEX IF NOT EXISTS idx_outbox_delivery
  ON outbox_events(status, available_at, created_at);

-- ─── Versioned AI control plane ─────────────────────────────────────────
ALTER TABLE ai_agents ADD COLUMN current_version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE ai_conversations ADD COLUMN organization_id TEXT
  REFERENCES organizations(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_ai_conv_organization
  ON ai_conversations(organization_id, created_at DESC);

CREATE TABLE IF NOT EXISTS ai_agent_versions (
  id             TEXT PRIMARY KEY,
  agent_slug     TEXT NOT NULL REFERENCES ai_agents(slug) ON DELETE CASCADE,
  version        INTEGER NOT NULL CHECK (version > 0),
  status         TEXT NOT NULL DEFAULT 'draft'
                 CHECK (status IN ('draft','approved','retired')),
  model          TEXT NOT NULL,
  temperature    REAL NOT NULL CHECK (temperature >= 0 AND temperature <= 2),
  max_tokens     INTEGER NOT NULL CHECK (max_tokens BETWEEN 64 AND 8192),
  autonomy       TEXT NOT NULL CHECK (autonomy IN ('assist','semi','auto')),
  system_prompt  TEXT NOT NULL,
  guardrails     TEXT NOT NULL,
  tools_json     TEXT NOT NULL DEFAULT '[]',
  change_note    TEXT NOT NULL,
  created_by     TEXT REFERENCES users(id) ON DELETE SET NULL,
  approved_by    TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at     INTEGER NOT NULL,
  approved_at    INTEGER,
  UNIQUE (agent_slug, version),
  CHECK (json_valid(tools_json)),
  CHECK (status <> 'approved' OR approved_at IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_ai_agent_versions_active
  ON ai_agent_versions(agent_slug, status, version DESC);

INSERT OR IGNORE INTO ai_agent_versions
  (id, agent_slug, version, status, model, temperature, max_tokens, autonomy,
   system_prompt, guardrails, tools_json, change_note, created_at, approved_at)
SELECT 'agent_version_' || slug, slug, 1,
       CASE WHEN status = 'active' THEN 'approved' ELSE 'draft' END,
       model, temperature, max_tokens, autonomy, system_prompt, guardrails,
       tools_json, 'Snapshot imported by migration 0014',
       CASE WHEN created_at < 100000000000 THEN created_at * 1000 ELSE created_at END,
       CASE WHEN status = 'active'
            THEN CASE WHEN updated_at < 100000000000 THEN updated_at * 1000 ELSE updated_at END
            ELSE NULL END
  FROM ai_agents;

CREATE TABLE IF NOT EXISTS ai_tools (
  slug              TEXT PRIMARY KEY,
  name              TEXT NOT NULL,
  description       TEXT NOT NULL,
  action_class      TEXT NOT NULL
                    CHECK (action_class IN ('read','write','external','financial','publish')),
  risk_level        TEXT NOT NULL
                    CHECK (risk_level IN ('low','medium','high','critical')),
  input_schema_json TEXT NOT NULL DEFAULT '{}',
  status            TEXT NOT NULL DEFAULT 'disabled'
                    CHECK (status IN ('disabled','active','retired')),
  handler_version   TEXT NOT NULL,
  created_at        INTEGER NOT NULL,
  updated_at        INTEGER NOT NULL,
  CHECK (json_valid(input_schema_json))
);

INSERT OR IGNORE INTO ai_tools
  (slug, name, description, action_class, risk_level, input_schema_json,
   status, handler_version, created_at, updated_at)
VALUES
  ('knowledge_search', 'Knowledge search', 'Căutare read-only în baza aprobată de cunoștințe.',
   'read', 'low', '{"type":"object"}', 'active', 'v1',
   CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000),
  ('recommend_product', 'Product recommendation', 'Recomandare fără comandă sau publicare.',
   'read', 'low', '{"type":"object"}', 'disabled', 'unimplemented',
   CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000),
  ('capture_lead', 'Lead capture', 'Propune crearea unui lead; necesită flux aprobat.',
   'write', 'medium', '{"type":"object"}', 'disabled', 'unimplemented',
   CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000),
  ('qualify_lead', 'Lead qualification', 'Propune calificarea unui lead existent.',
   'write', 'medium', '{"type":"object"}', 'disabled', 'unimplemented',
   CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000),
  ('handoff', 'Human handoff', 'Pregătește un transfer către echipă; livrarea externă cere aprobare.',
   'external', 'high', '{"type":"object"}', 'disabled', 'unimplemented',
   CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000);

CREATE TABLE IF NOT EXISTS ai_agent_tool_policies (
  agent_version_id TEXT NOT NULL REFERENCES ai_agent_versions(id) ON DELETE CASCADE,
  tool_slug        TEXT NOT NULL REFERENCES ai_tools(slug) ON DELETE RESTRICT,
  mode             TEXT NOT NULL DEFAULT 'disabled'
                   CHECK (mode IN ('disabled','read','approval','execute')),
  allowed_scopes_json TEXT NOT NULL DEFAULT '[]',
  max_calls_per_run INTEGER NOT NULL DEFAULT 1 CHECK (max_calls_per_run BETWEEN 0 AND 100),
  PRIMARY KEY (agent_version_id, tool_slug),
  CHECK (json_valid(allowed_scopes_json))
);

INSERT OR IGNORE INTO ai_agent_tool_policies
  (agent_version_id, tool_slug, mode, allowed_scopes_json, max_calls_per_run)
SELECT version.id,
       CAST(tool.value AS TEXT),
       CASE WHEN tool.value = 'knowledge_search' THEN 'read' ELSE 'disabled' END,
       '[]',
       CASE WHEN tool.value = 'knowledge_search' THEN 4 ELSE 0 END
  FROM ai_agent_versions AS version,
       json_each(version.tools_json) AS tool
  JOIN ai_tools AS registry ON registry.slug = tool.value;

CREATE TABLE IF NOT EXISTS ai_budgets (
  id                TEXT PRIMARY KEY,
  organization_id   TEXT REFERENCES organizations(id) ON DELETE CASCADE,
  agent_slug        TEXT REFERENCES ai_agents(slug) ON DELETE CASCADE,
  period            TEXT NOT NULL CHECK (period IN ('day','month')),
  period_start      INTEGER NOT NULL,
  period_end        INTEGER NOT NULL,
  max_runs          INTEGER NOT NULL CHECK (max_runs >= 0),
  max_input_tokens  INTEGER NOT NULL CHECK (max_input_tokens >= 0),
  max_output_tokens INTEGER NOT NULL CHECK (max_output_tokens >= 0),
  max_cost_micros   INTEGER NOT NULL CHECK (max_cost_micros >= 0),
  used_runs         INTEGER NOT NULL DEFAULT 0 CHECK (used_runs >= 0),
  used_input_tokens INTEGER NOT NULL DEFAULT 0 CHECK (used_input_tokens >= 0),
  used_output_tokens INTEGER NOT NULL DEFAULT 0 CHECK (used_output_tokens >= 0),
  used_cost_micros  INTEGER NOT NULL DEFAULT 0 CHECK (used_cost_micros >= 0),
  created_at        INTEGER NOT NULL,
  updated_at        INTEGER NOT NULL,
  CHECK (period_end > period_start)
);
CREATE INDEX IF NOT EXISTS idx_ai_budgets_lookup
  ON ai_budgets(organization_id, agent_slug, period_start, period_end);

CREATE TABLE IF NOT EXISTS ai_kill_switches (
  scope_type      TEXT NOT NULL CHECK (scope_type IN ('global','organization','agent','tool')),
  scope_id        TEXT NOT NULL,
  enabled         INTEGER NOT NULL DEFAULT 0 CHECK (enabled IN (0,1)),
  reason          TEXT NOT NULL,
  changed_by      TEXT REFERENCES users(id) ON DELETE SET NULL,
  changed_at      INTEGER NOT NULL,
  PRIMARY KEY (scope_type, scope_id)
);

CREATE TABLE IF NOT EXISTS ai_runs (
  id                TEXT PRIMARY KEY,
  organization_id   TEXT REFERENCES organizations(id) ON DELETE SET NULL,
  agent_slug        TEXT NOT NULL REFERENCES ai_agents(slug) ON DELETE RESTRICT,
  agent_version_id  TEXT NOT NULL REFERENCES ai_agent_versions(id) ON DELETE RESTRICT,
  conversation_id   TEXT REFERENCES ai_conversations(id) ON DELETE SET NULL,
  actor_user_id     TEXT REFERENCES users(id) ON DELETE SET NULL,
  status            TEXT NOT NULL CHECK (status IN ('queued','running','awaiting_approval','succeeded','failed','cancelled','denied')),
  input_hash        TEXT NOT NULL,
  input_tokens      INTEGER NOT NULL DEFAULT 0 CHECK (input_tokens >= 0),
  output_tokens     INTEGER NOT NULL DEFAULT 0 CHECK (output_tokens >= 0),
  estimated_cost_micros INTEGER NOT NULL DEFAULT 0 CHECK (estimated_cost_micros >= 0),
  request_id        TEXT,
  error_code        TEXT,
  started_at        INTEGER,
  completed_at      INTEGER,
  created_at        INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ai_runs_agent_time ON ai_runs(agent_slug, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_runs_org_time ON ai_runs(organization_id, created_at DESC);

CREATE TABLE IF NOT EXISTS ai_run_steps (
  id            TEXT PRIMARY KEY,
  run_id        TEXT NOT NULL REFERENCES ai_runs(id) ON DELETE CASCADE,
  sequence      INTEGER NOT NULL CHECK (sequence >= 0),
  kind          TEXT NOT NULL CHECK (kind IN ('retrieval','model','tool','handoff','policy')),
  name          TEXT NOT NULL,
  status        TEXT NOT NULL CHECK (status IN ('queued','running','awaiting_approval','succeeded','failed','denied','skipped')),
  input_json    TEXT,
  output_json   TEXT,
  error_code    TEXT,
  started_at    INTEGER,
  completed_at  INTEGER,
  created_at    INTEGER NOT NULL,
  UNIQUE (run_id, sequence),
  CHECK (input_json IS NULL OR json_valid(input_json)),
  CHECK (output_json IS NULL OR json_valid(output_json))
);

CREATE TABLE IF NOT EXISTS ai_approvals (
  id             TEXT PRIMARY KEY,
  run_id         TEXT NOT NULL REFERENCES ai_runs(id) ON DELETE CASCADE,
  step_id        TEXT NOT NULL REFERENCES ai_run_steps(id) ON DELETE CASCADE,
  action_class   TEXT NOT NULL CHECK (action_class IN ('write','external','financial','publish')),
  summary        TEXT NOT NULL,
  request_json   TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','approved','rejected','expired','cancelled')),
  requested_at   INTEGER NOT NULL,
  expires_at     INTEGER NOT NULL,
  decided_by     TEXT REFERENCES users(id) ON DELETE SET NULL,
  decided_at     INTEGER,
  decision_note  TEXT,
  CHECK (json_valid(request_json)),
  CHECK (status NOT IN ('approved','rejected') OR decided_at IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_ai_approvals_pending ON ai_approvals(status, expires_at);

CREATE TABLE IF NOT EXISTS ai_evaluations (
  id               TEXT PRIMARY KEY,
  agent_version_id TEXT NOT NULL REFERENCES ai_agent_versions(id) ON DELETE CASCADE,
  suite             TEXT NOT NULL,
  case_name         TEXT NOT NULL,
  status            TEXT NOT NULL CHECK (status IN ('passed','failed','error')),
  score             REAL,
  metrics_json      TEXT NOT NULL DEFAULT '{}',
  evaluated_by      TEXT NOT NULL DEFAULT 'system',
  created_at        INTEGER NOT NULL,
  CHECK (score IS NULL OR (score >= 0 AND score <= 1)),
  CHECK (json_valid(metrics_json))
);
CREATE INDEX IF NOT EXISTS idx_ai_evaluations_version
  ON ai_evaluations(agent_version_id, created_at DESC);

-- Normalize the legacy AI seed, which stored epoch seconds, to the project-wide
-- epoch-millisecond convention. The guard keeps this idempotent.
UPDATE ai_agents
   SET created_at = CASE WHEN created_at < 100000000000 THEN created_at * 1000 ELSE created_at END,
       updated_at = CASE WHEN updated_at < 100000000000 THEN updated_at * 1000 ELSE updated_at END;
UPDATE ai_knowledge
   SET created_at = CASE WHEN created_at < 100000000000 THEN created_at * 1000 ELSE created_at END,
       updated_at = CASE WHEN updated_at < 100000000000 THEN updated_at * 1000 ELSE updated_at END;
UPDATE ai_conversations
   SET created_at = CASE WHEN created_at < 100000000000 THEN created_at * 1000 ELSE created_at END,
       last_at = CASE WHEN last_at < 100000000000 THEN last_at * 1000 ELSE last_at END;
UPDATE ai_messages
   SET created_at = CASE WHEN created_at < 100000000000 THEN created_at * 1000 ELSE created_at END;
UPDATE ai_learning_queue
   SET created_at = CASE WHEN created_at < 100000000000 THEN created_at * 1000 ELSE created_at END,
       updated_at = CASE WHEN updated_at < 100000000000 THEN updated_at * 1000 ELSE updated_at END;

INSERT OR IGNORE INTO security_events
  (id, actor_type, action, target_type, target_id, outcome, severity, metadata_json, created_at)
VALUES
  ('migration_0014_platform_principals', 'system', 'platform_principal.bootstrap',
   'platform_principals', 'initial', 'allowed', 'warning',
   '{"migration":"0014_avyron_os_foundation.sql"}',
   CAST(strftime('%s','now') AS INTEGER) * 1000);

PRAGMA optimize;
