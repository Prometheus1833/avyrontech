-- 0058_cloudflare_native_auth_ai_core.sql
-- Finalizeaza identitatea locala, registrul AI central, diagnosticele si
-- propunerile Codex fara a introduce un backend sau un furnizor obligatoriu.

PRAGMA foreign_keys = ON;

ALTER TABLE users ADD COLUMN username TEXT;
CREATE UNIQUE INDEX idx_users_username_nocase
  ON users(lower(username)) WHERE username IS NOT NULL;

CREATE TABLE auth_provider_metadata (
  provider        TEXT PRIMARY KEY CHECK (provider IN ('password','google','github')),
  status          TEXT NOT NULL CHECK (status IN ('active','not_configured','disabled')),
  enabled         INTEGER NOT NULL DEFAULT 0 CHECK (enabled IN (0,1)),
  updated_by      TEXT REFERENCES users(id) ON DELETE SET NULL,
  updated_at      INTEGER NOT NULL
);

CREATE TABLE auth_identities (
  id                TEXT PRIMARY KEY,
  user_id           TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider          TEXT NOT NULL CHECK (provider IN ('google','github')),
  provider_subject  TEXT NOT NULL,
  email             TEXT,
  created_at        INTEGER NOT NULL,
  last_login_at     INTEGER,
  UNIQUE(provider, provider_subject)
);
CREATE INDEX idx_auth_identities_user ON auth_identities(user_id, provider);

INSERT INTO auth_provider_metadata(provider,status,enabled,updated_at) VALUES
  ('password','active',1,CAST(strftime('%s','now') AS INTEGER)*1000),
  ('google','not_configured',0,CAST(strftime('%s','now') AS INTEGER)*1000),
  ('github','not_configured',0,CAST(strftime('%s','now') AS INTEGER)*1000);

CREATE TABLE ai_model_registry (
  role                TEXT PRIMARY KEY CHECK (role IN ('primary','secondary','image')),
  model_id            TEXT NOT NULL UNIQUE,
  modality            TEXT NOT NULL CHECK (modality IN ('text','vision','image')),
  status              TEXT NOT NULL DEFAULT 'configured' CHECK (status IN ('configured','disabled','limited')),
  default_max_tokens  INTEGER NOT NULL DEFAULT 0,
  normal_max_tokens   INTEGER NOT NULL DEFAULT 0,
  special_max_tokens  INTEGER NOT NULL DEFAULT 0,
  daily_neuron_limit  INTEGER NOT NULL,
  requires_billing    INTEGER NOT NULL DEFAULT 0 CHECK (requires_billing IN (0,1)),
  updated_at          INTEGER NOT NULL
);

INSERT INTO ai_model_registry
  (role,model_id,modality,status,default_max_tokens,normal_max_tokens,special_max_tokens,daily_neuron_limit,requires_billing,updated_at)
VALUES
  ('primary','@cf/qwen/qwen3-30b-a3b-fp8','text','configured',700,1200,1800,3000,0,CAST(strftime('%s','now') AS INTEGER)*1000),
  ('secondary','@cf/google/gemma-4-26b-a4b-it','vision','configured',500,900,1400,700,0,CAST(strftime('%s','now') AS INTEGER)*1000),
  ('image','@cf/black-forest-labs/flux-2-klein-4b','image','configured',0,0,0,700,0,CAST(strftime('%s','now') AS INTEGER)*1000);

CREATE TABLE ai_daily_usage (
  usage_day         TEXT NOT NULL,
  model_role        TEXT NOT NULL REFERENCES ai_model_registry(role),
  agent_slug        TEXT NOT NULL,
  request_count     INTEGER NOT NULL DEFAULT 0,
  input_tokens      INTEGER NOT NULL DEFAULT 0,
  output_tokens     INTEGER NOT NULL DEFAULT 0,
  estimated_neurons INTEGER NOT NULL DEFAULT 0,
  updated_at        INTEGER NOT NULL,
  PRIMARY KEY (usage_day, model_role, agent_slug)
);
CREATE INDEX idx_ai_daily_usage_day ON ai_daily_usage(usage_day, model_role);

-- O rezervare idempotentă precede fiecare apel. Triggerele blochează atât
-- bugetul pe rol, cât și plafonul intern global de 5.000 unități/zi.
CREATE TABLE ai_core_reservations (
  idempotency_hash  TEXT PRIMARY KEY,
  usage_day         TEXT NOT NULL,
  model_role        TEXT NOT NULL REFERENCES ai_model_registry(role),
  agent_slug        TEXT NOT NULL,
  priority          TEXT NOT NULL DEFAULT 'user' CHECK (priority IN ('background','important','user')),
  estimated_neurons INTEGER NOT NULL CHECK (estimated_neurons > 0),
  created_at        INTEGER NOT NULL
);
CREATE INDEX idx_ai_core_reservations_day ON ai_core_reservations(usage_day, model_role);

CREATE TRIGGER ai_core_role_limit_insert
BEFORE INSERT ON ai_core_reservations
BEGIN
  SELECT (CASE WHEN
    COALESCE((SELECT SUM(estimated_neurons) FROM ai_core_reservations
      WHERE usage_day=new.usage_day AND model_role=new.model_role),0) + new.estimated_neurons
    > COALESCE((SELECT daily_neuron_limit FROM ai_model_registry WHERE role=new.model_role),0)
  THEN RAISE(ABORT,'ai_role_daily_limit_exceeded') END);
  SELECT (CASE WHEN
    COALESCE((SELECT SUM(estimated_neurons) FROM ai_core_reservations WHERE usage_day=new.usage_day),0)
      + new.estimated_neurons > 5000
  THEN RAISE(ABORT,'ai_global_daily_limit_exceeded') END);
  SELECT (CASE WHEN new.priority='background' AND
    COALESCE((SELECT SUM(estimated_neurons) FROM ai_core_reservations
      WHERE usage_day=new.usage_day AND priority='background'),0) + new.estimated_neurons > 400
  THEN RAISE(ABORT,'ai_background_daily_limit_exceeded') END);
END;

CREATE TRIGGER ai_core_usage_after_insert
AFTER INSERT ON ai_core_reservations
BEGIN
  INSERT INTO ai_daily_usage
    (usage_day,model_role,agent_slug,request_count,input_tokens,output_tokens,estimated_neurons,updated_at)
  VALUES (new.usage_day,new.model_role,new.agent_slug,1,0,0,new.estimated_neurons,new.created_at)
  ON CONFLICT(usage_day,model_role,agent_slug) DO UPDATE SET
    request_count=request_count+1,
    estimated_neurons=estimated_neurons+excluded.estimated_neurons,
    updated_at=excluded.updated_at;
END;

CREATE TABLE codex_work_items (
  id                  TEXT PRIMARY KEY,
  title               TEXT NOT NULL,
  problem             TEXT NOT NULL,
  context              TEXT NOT NULL DEFAULT '',
  affected_module     TEXT NOT NULL,
  likely_files_json   TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(likely_files_json)),
  priority            TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
  acceptance_criteria TEXT NOT NULL,
  risk                TEXT NOT NULL DEFAULT 'medium' CHECK (risk IN ('low','medium','high')),
  status              TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed','approved','in_progress','completed','rejected','cancelled')),
  source_agent        TEXT REFERENCES ai_agents(slug) ON DELETE SET NULL,
  proposed_by         TEXT REFERENCES users(id) ON DELETE SET NULL,
  decided_by          TEXT REFERENCES users(id) ON DELETE SET NULL,
  decided_at          INTEGER,
  created_at          INTEGER NOT NULL,
  updated_at          INTEGER NOT NULL
);
CREATE INDEX idx_codex_work_items_status ON codex_work_items(status, priority, created_at);

CREATE TABLE system_diagnostic_runs (
  id            TEXT PRIMARY KEY,
  requested_by  TEXT REFERENCES users(id) ON DELETE SET NULL,
  status        TEXT NOT NULL CHECK (status IN ('running','completed','failed')),
  created_at    INTEGER NOT NULL,
  completed_at  INTEGER
);

CREATE TABLE system_diagnostic_results (
  run_id       TEXT NOT NULL REFERENCES system_diagnostic_runs(id) ON DELETE CASCADE,
  component    TEXT NOT NULL,
  status       TEXT NOT NULL CHECK (status IN ('healthy','degraded','not_configured','limited','error','unknown')),
  detail       TEXT NOT NULL,
  checked_at   INTEGER NOT NULL,
  PRIMARY KEY (run_id, component)
);

-- Cele doua LLM-uri aprobate devin sursa unica pentru agentii text existenti.
UPDATE ai_agents
   SET model='@cf/qwen/qwen3-30b-a3b-fp8', max_tokens=MIN(max_tokens,1800), updated_at=CAST(strftime('%s','now') AS INTEGER)*1000
 WHERE model LIKE '@cf/%';
UPDATE ai_agent_versions
   SET model='@cf/qwen/qwen3-30b-a3b-fp8', max_tokens=MIN(max_tokens,1800)
 WHERE status='approved' AND model LIKE '@cf/%';

UPDATE ai_social_model_routes
   SET status='disabled', notes=notes || ' Inlocuit de registrul AI Core central.', updated_at=CAST(strftime('%s','now') AS INTEGER)*1000
 WHERE modality='text' AND model_id NOT IN ('@cf/qwen/qwen3-30b-a3b-fp8','@cf/google/gemma-4-26b-a4b-it');
INSERT OR IGNORE INTO ai_social_model_routes
  (project_id,route_key,provider,model_id,modality,execution_mode,billing_mode,status,priority,max_output_tokens,daily_unit_limit,source_url,license_spdx,storage_policy,notes,last_verified_at,updated_at)
SELECT id,'routine_copy','cloudflare_workers_ai','@cf/qwen/qwen3-30b-a3b-fp8','text','remote_api','free_only','available',5,1200,3000,
       'https://developers.cloudflare.com/workers-ai/models/qwen3-30b-a3b-fp8/',NULL,'metadata_only','Ruta primara AI Core; hard-stop intern inainte de overage.',NULL,CAST(strftime('%s','now') AS INTEGER)*1000
  FROM ai_projects;
INSERT OR IGNORE INTO ai_social_model_routes
  (project_id,route_key,provider,model_id,modality,execution_mode,billing_mode,status,priority,max_output_tokens,daily_unit_limit,source_url,license_spdx,storage_policy,notes,last_verified_at,updated_at)
SELECT id,'visual_review','cloudflare_workers_ai','@cf/google/gemma-4-26b-a4b-it','text','remote_api','free_only','available',5,900,700,
       'https://developers.cloudflare.com/workers-ai/models/gemma-4-26b-a4b-it/',NULL,'metadata_only','Ruta secundara numai pentru vision, context mare sau review explicit.',NULL,CAST(strftime('%s','now') AS INTEGER)*1000
  FROM ai_projects;
UPDATE ai_social_model_routes
   SET model_id='@cf/black-forest-labs/flux-2-klein-4b', daily_unit_limit=700,
       source_url='https://developers.cloudflare.com/workers-ai/models/flux-2-klein-4b/',
       notes='Generare sau editare vizuala numai cand nu exista asset potrivit; approval obligatoriu.',
       updated_at=CAST(strftime('%s','now') AS INTEGER)*1000
 WHERE modality='image';

UPDATE financial_provider_quotas
   SET plan='Workers AI free allocation; internal 50 percent hard stop', quota_total=5000,
       hard_limit=5000, soft_limit=3000,
       quota_used=CASE WHEN quota_used>5000 THEN 5000 ELSE quota_used END,
       hard_stop_before_paid=1, estimated_cost_after_limit_minor=0,
       status=CASE WHEN quota_used>=5000 THEN 'exhausted' WHEN quota_used>=3000 THEN 'warning' ELSE 'active' END,
       updated_at=CAST(strftime('%s','now') AS INTEGER)*1000
 WHERE id='fin_quota_cloudflare_ai';

PRAGMA optimize;
