-- 0037_social_audience_optimizer.sql
-- Audit zilnic separat pe cont/pagina, liste aprobabile si protectii pentru
-- conversatii, interactiuni, clienti si contacte anterioare.

PRAGMA foreign_keys = ON;

CREATE TABLE ai_social_accounts (
  id                    TEXT PRIMARY KEY,
  project_id            TEXT NOT NULL REFERENCES ai_projects(id) ON DELETE CASCADE,
  provider              TEXT NOT NULL CHECK (provider IN ('facebook','instagram','tiktok')),
  surface               TEXT NOT NULL CHECK (surface IN ('profile','page','professional','business','creator')),
  label                 TEXT NOT NULL,
  external_account_id   TEXT,
  connection_id         TEXT REFERENCES source_connections(id) ON DELETE SET NULL,
  connection_status     TEXT NOT NULL DEFAULT 'disconnected'
                        CHECK (connection_status IN ('disconnected','verifying','connected','error','paused')),
  review_status         TEXT NOT NULL DEFAULT 'active' CHECK (review_status IN ('active','paused')),
  timezone              TEXT NOT NULL DEFAULT 'Europe/Bucharest',
  daily_review_hour     INTEGER NOT NULL DEFAULT 15 CHECK (daily_review_hour BETWEEN 0 AND 23),
  daily_review_minute   INTEGER NOT NULL DEFAULT 0 CHECK (daily_review_minute BETWEEN 0 AND 59),
  cleanup_limit         INTEGER NOT NULL DEFAULT 25 CHECK (cleanup_limit BETWEEN 0 AND 25),
  growth_limit          INTEGER NOT NULL DEFAULT 25 CHECK (growth_limit BETWEEN 0 AND 25),
  require_approval      INTEGER NOT NULL DEFAULT 1 CHECK (require_approval IN (0,1)),
  last_snapshot_at      INTEGER,
  last_review_at        INTEGER,
  last_error_code       TEXT,
  created_at            INTEGER NOT NULL,
  updated_at            INTEGER NOT NULL,
  UNIQUE (project_id,provider,surface,label),
  CHECK (connection_status <> 'connected' OR connection_id IS NOT NULL)
);
CREATE INDEX idx_ai_social_accounts_due
  ON ai_social_accounts(review_status,provider,daily_review_hour,daily_review_minute);

CREATE TABLE ai_social_relationships (
  id                    TEXT PRIMARY KEY,
  account_id            TEXT NOT NULL REFERENCES ai_social_accounts(id) ON DELETE CASCADE,
  external_profile_id   TEXT NOT NULL,
  profile_url           TEXT NOT NULL,
  handle                TEXT,
  display_name          TEXT,
  relationship          TEXT NOT NULL CHECK (relationship IN ('friend','following','follower','mutual','requested','suggested')),
  profile_kind          TEXT NOT NULL DEFAULT 'unknown' CHECK (profile_kind IN ('business','organization','creator','personal','unknown')),
  business_category     TEXT,
  website_url           TEXT,
  website_state         TEXT NOT NULL DEFAULT 'unknown' CHECK (website_state IN ('none','weak','adequate','unknown')),
  activity_state        TEXT NOT NULL DEFAULT 'unknown' CHECK (activity_state IN ('active','inactive','unknown')),
  last_activity_at      INTEGER,
  follows_back          INTEGER CHECK (follows_back IN (0,1)),
  relevance_score       INTEGER NOT NULL DEFAULT 0 CHECK (relevance_score BETWEEN 0 AND 100),
  intent_score          INTEGER NOT NULL DEFAULT 0 CHECK (intent_score BETWEEN 0 AND 100),
  evidence_json         TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(evidence_json)),
  first_observed_at     INTEGER NOT NULL,
  last_observed_at      INTEGER NOT NULL,
  created_at            INTEGER NOT NULL,
  updated_at            INTEGER NOT NULL,
  UNIQUE (account_id,external_profile_id)
);
CREATE INDEX idx_ai_social_relationships_rank
  ON ai_social_relationships(account_id,profile_kind,activity_state,relevance_score DESC,intent_score DESC);

CREATE TABLE ai_social_profile_protections (
  account_id            TEXT NOT NULL REFERENCES ai_social_accounts(id) ON DELETE CASCADE,
  external_profile_id   TEXT NOT NULL,
  protection_type       TEXT NOT NULL
                        CHECK (protection_type IN ('conversation','engagement','contacted','lead','client','partner','manual','do_not_contact')),
  source_ref            TEXT,
  reason                TEXT NOT NULL,
  observed_at           INTEGER NOT NULL,
  expires_at            INTEGER,
  created_at            INTEGER NOT NULL,
  updated_at            INTEGER NOT NULL,
  PRIMARY KEY (account_id,external_profile_id,protection_type)
);
CREATE INDEX idx_ai_social_profile_protections_active
  ON ai_social_profile_protections(account_id,external_profile_id,expires_at);

CREATE TABLE ai_social_audience_runs (
  id                    TEXT PRIMARY KEY,
  account_id            TEXT NOT NULL REFERENCES ai_social_accounts(id) ON DELETE CASCADE,
  schedule_key          TEXT NOT NULL UNIQUE,
  review_date           TEXT NOT NULL,
  status                TEXT NOT NULL DEFAULT 'scheduled'
                        CHECK (status IN ('scheduled','awaiting_connection','awaiting_data','analyzing','review_ready','approved','executing','completed','partial','failed','cancelled')),
  cleanup_limit         INTEGER NOT NULL CHECK (cleanup_limit BETWEEN 0 AND 25),
  growth_limit          INTEGER NOT NULL CHECK (growth_limit BETWEEN 0 AND 25),
  cleanup_count         INTEGER NOT NULL DEFAULT 0,
  growth_count          INTEGER NOT NULL DEFAULT 0,
  due_at                INTEGER NOT NULL,
  approved_by           TEXT REFERENCES users(id) ON DELETE SET NULL,
  approved_at           INTEGER,
  completed_at          INTEGER,
  last_error_code       TEXT,
  created_at            INTEGER NOT NULL,
  updated_at            INTEGER NOT NULL
);
CREATE INDEX idx_ai_social_audience_runs_status
  ON ai_social_audience_runs(status,due_at,account_id);

CREATE TABLE ai_social_audience_candidates (
  id                    TEXT PRIMARY KEY,
  run_id                TEXT NOT NULL REFERENCES ai_social_audience_runs(id) ON DELETE CASCADE,
  relationship_id       TEXT NOT NULL REFERENCES ai_social_relationships(id) ON DELETE CASCADE,
  action                TEXT NOT NULL CHECK (action IN ('unfollow','unfriend','follow','friend_request','keep','ignore')),
  score                 INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),
  reasons_json          TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(reasons_json)),
  protection_json       TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(protection_json)),
  status                TEXT NOT NULL DEFAULT 'proposed'
                        CHECK (status IN ('proposed','approved','rejected','queued','executing','executed','skipped','failed','uncertain')),
  approved_by           TEXT REFERENCES users(id) ON DELETE SET NULL,
  approved_at           INTEGER,
  executed_at           INTEGER,
  external_result_json  TEXT CHECK (external_result_json IS NULL OR json_valid(external_result_json)),
  last_error_code       TEXT,
  created_at            INTEGER NOT NULL,
  updated_at            INTEGER NOT NULL,
  UNIQUE (run_id,relationship_id,action)
);
CREATE INDEX idx_ai_social_audience_candidates_review
  ON ai_social_audience_candidates(run_id,status,action,score DESC);

CREATE TABLE ai_social_audience_events (
  id                    TEXT PRIMARY KEY,
  account_id            TEXT NOT NULL REFERENCES ai_social_accounts(id) ON DELETE CASCADE,
  run_id                TEXT REFERENCES ai_social_audience_runs(id) ON DELETE SET NULL,
  candidate_id          TEXT REFERENCES ai_social_audience_candidates(id) ON DELETE SET NULL,
  action                TEXT NOT NULL,
  metadata_json         TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(metadata_json)),
  actor_id              TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at            INTEGER NOT NULL
);
CREATE INDEX idx_ai_social_audience_events_account
  ON ai_social_audience_events(account_id,created_at DESC);

PRAGMA optimize;
