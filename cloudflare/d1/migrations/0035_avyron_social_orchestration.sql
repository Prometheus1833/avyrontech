-- 0035_avyron_social_orchestration.sql
-- Calendar editorial, cercetare cu provenienta, variante pe canal si
-- oportunitati sociale controlate pentru AVYRON Social Studio.

PRAGMA foreign_keys = ON;

-- Extindem canalele AI Prod cu Threads, pastrand toate conexiunile existente.
CREATE TABLE ai_project_channels_v2 (
  project_id           TEXT NOT NULL REFERENCES ai_projects(id) ON DELETE CASCADE,
  provider             TEXT NOT NULL
                       CHECK (provider IN ('facebook','instagram','tiktok','threads','linkedin','whatsapp','messenger')),
  connection_id        TEXT REFERENCES source_connections(id) ON DELETE SET NULL,
  account_label        TEXT,
  external_account_id  TEXT,
  connection_status    TEXT NOT NULL DEFAULT 'disconnected'
                       CHECK (connection_status IN ('disconnected','verifying','connected','error','paused')),
  allowed_actions_json TEXT NOT NULL DEFAULT '["read"]',
  last_analyzed_at     INTEGER,
  last_synced_at       INTEGER,
  last_error_code      TEXT,
  updated_by           TEXT REFERENCES users(id) ON DELETE SET NULL,
  updated_at           INTEGER NOT NULL,
  PRIMARY KEY (project_id, provider),
  CHECK (json_valid(allowed_actions_json)),
  CHECK (connection_status <> 'connected' OR connection_id IS NOT NULL)
);

INSERT INTO ai_project_channels_v2
  (project_id,provider,connection_id,account_label,external_account_id,
   connection_status,allowed_actions_json,last_analyzed_at,last_synced_at,
   last_error_code,updated_by,updated_at)
SELECT project_id,provider,connection_id,account_label,external_account_id,
       connection_status,allowed_actions_json,last_analyzed_at,last_synced_at,
       last_error_code,updated_by,updated_at
  FROM ai_project_channels;

DROP TABLE ai_project_channels;
ALTER TABLE ai_project_channels_v2 RENAME TO ai_project_channels;
CREATE INDEX idx_ai_project_channels_status
  ON ai_project_channels(connection_status, provider, updated_at DESC);

INSERT OR IGNORE INTO ai_project_channels (project_id,provider,updated_at)
SELECT id,'threads',CAST(strftime('%s','now') AS INTEGER)*1000
  FROM ai_projects;

CREATE TABLE ai_social_policies (
  project_id                  TEXT PRIMARY KEY REFERENCES ai_projects(id) ON DELETE CASCADE,
  timezone                    TEXT NOT NULL DEFAULT 'Europe/Bucharest',
  status                      TEXT NOT NULL DEFAULT 'active'
                              CHECK (status IN ('active','paused')),
  daily_post_count            INTEGER NOT NULL DEFAULT 1 CHECK (daily_post_count BETWEEN 0 AND 8),
  daily_image_count           INTEGER NOT NULL DEFAULT 1 CHECK (daily_image_count BETWEEN 0 AND 8),
  reel_interval_days          INTEGER NOT NULL DEFAULT 3 CHECK (reel_interval_days BETWEEN 1 AND 30),
  tag_min                     INTEGER NOT NULL DEFAULT 5 CHECK (tag_min BETWEEN 0 AND 20),
  tag_max                     INTEGER NOT NULL DEFAULT 10 CHECK (tag_max BETWEEN 0 AND 30),
  weekly_article_weekday      INTEGER NOT NULL DEFAULT 5 CHECK (weekly_article_weekday BETWEEN 1 AND 7),
  weekly_article_hour         INTEGER NOT NULL DEFAULT 16 CHECK (weekly_article_hour BETWEEN 0 AND 23),
  weekly_article_minute       INTEGER NOT NULL DEFAULT 0 CHECK (weekly_article_minute BETWEEN 0 AND 59),
  engagement_interval_minutes INTEGER NOT NULL DEFAULT 180 CHECK (engagement_interval_minutes BETWEEN 60 AND 1440),
  story_like_target           INTEGER NOT NULL DEFAULT 8 CHECK (story_like_target BETWEEN 0 AND 20),
  feed_like_target            INTEGER NOT NULL DEFAULT 6 CHECK (feed_like_target BETWEEN 0 AND 20),
  require_human_approval      INTEGER NOT NULL DEFAULT 1 CHECK (require_human_approval IN (0,1)),
  time_slots_json             TEXT NOT NULL DEFAULT '{"post":"10:15","image":"13:15","reel":"18:15","story":"20:15"}',
  channel_priority_json       TEXT NOT NULL DEFAULT '["instagram","facebook","linkedin","threads","tiktok","whatsapp"]',
  industry_rotation_json      TEXT NOT NULL DEFAULT '["servicii-profesionale","horeca","sanatate","constructii","retail","educatie","turism","productie"]',
  last_planned_at             INTEGER,
  created_at                  INTEGER NOT NULL,
  updated_at                  INTEGER NOT NULL,
  CHECK (tag_max >= tag_min),
  CHECK (json_valid(time_slots_json)),
  CHECK (json_valid(channel_priority_json)),
  CHECK (json_valid(industry_rotation_json))
);

CREATE TABLE ai_social_jobs (
  id               TEXT PRIMARY KEY,
  project_id       TEXT NOT NULL REFERENCES ai_projects(id) ON DELETE CASCADE,
  schedule_key     TEXT NOT NULL UNIQUE,
  kind             TEXT NOT NULL
                   CHECK (kind IN ('daily_post','daily_image','story','reel','weekly_article','research','engagement_review')),
  format           TEXT NOT NULL
                   CHECK (format IN ('post','story','reel','article','research','engagement')),
  primary_channel  TEXT NOT NULL
                   CHECK (primary_channel IN ('facebook','instagram','tiktok','threads','linkedin','whatsapp','messenger','blog','multi')),
  topic            TEXT NOT NULL,
  brief_json       TEXT NOT NULL DEFAULT '{}',
  status           TEXT NOT NULL DEFAULT 'queued'
                   CHECK (status IN ('queued','generating','draft_ready','awaiting_budget','awaiting_approval','approved','completed','failed','skipped')),
  due_at           INTEGER NOT NULL,
  content_id       TEXT REFERENCES ai_content_items(id) ON DELETE SET NULL,
  blog_post_id     TEXT REFERENCES blog_posts(id) ON DELETE SET NULL,
  attempt_count    INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count BETWEEN 0 AND 10),
  last_error_code  TEXT,
  created_at       INTEGER NOT NULL,
  updated_at       INTEGER NOT NULL,
  completed_at     INTEGER,
  CHECK (json_valid(brief_json))
);
CREATE INDEX idx_ai_social_jobs_due
  ON ai_social_jobs(project_id,status,due_at);

CREATE TABLE ai_social_sources (
  id                TEXT PRIMARY KEY,
  project_id        TEXT NOT NULL REFERENCES ai_projects(id) ON DELETE CASCADE,
  kind              TEXT NOT NULL
                    CHECK (kind IN ('current_post','competitor_post','trend','industry_news','pdf_book','website','analytics')),
  title             TEXT NOT NULL,
  canonical_url     TEXT,
  source_label      TEXT NOT NULL,
  scope             TEXT NOT NULL DEFAULT 'national'
                    CHECK (scope IN ('owned','local','national','international','internal')),
  evidence_hash     TEXT,
  evidence_json     TEXT NOT NULL DEFAULT '{}',
  insight           TEXT NOT NULL DEFAULT '',
  status            TEXT NOT NULL DEFAULT 'proposed'
                    CHECK (status IN ('proposed','approved','rejected','expired')),
  observed_at       INTEGER NOT NULL,
  expires_at        INTEGER,
  approved_by       TEXT REFERENCES users(id) ON DELETE SET NULL,
  approved_at       INTEGER,
  created_at        INTEGER NOT NULL,
  updated_at        INTEGER NOT NULL,
  CHECK (json_valid(evidence_json)),
  CHECK (status <> 'approved' OR approved_at IS NOT NULL)
);
CREATE INDEX idx_ai_social_sources_active
  ON ai_social_sources(project_id,status,kind,observed_at DESC);

CREATE TABLE ai_social_variants (
  id                TEXT PRIMARY KEY,
  content_id        TEXT NOT NULL REFERENCES ai_content_items(id) ON DELETE CASCADE,
  channel           TEXT NOT NULL
                    CHECK (channel IN ('facebook','instagram','tiktok','threads','linkedin','whatsapp','messenger','blog')),
  caption           TEXT NOT NULL,
  hashtags_json     TEXT NOT NULL DEFAULT '[]',
  media_brief       TEXT NOT NULL DEFAULT '',
  accessibility_alt TEXT NOT NULL DEFAULT '',
  cta               TEXT NOT NULL DEFAULT '',
  scheduled_at      INTEGER,
  status            TEXT NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','pending_approval','approved','scheduled','published','rejected','failed')),
  remote_id         TEXT,
  created_at        INTEGER NOT NULL,
  updated_at        INTEGER NOT NULL,
  UNIQUE (content_id,channel),
  CHECK (json_valid(hashtags_json)),
  CHECK (status NOT IN ('approved','scheduled','published') OR length(caption) > 0)
);
CREATE INDEX idx_ai_social_variants_queue
  ON ai_social_variants(channel,status,scheduled_at);

CREATE TABLE ai_social_quality_reviews (
  id               TEXT PRIMARY KEY,
  content_id       TEXT NOT NULL REFERENCES ai_content_items(id) ON DELETE CASCADE,
  reviewer_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  reviewer_agent   TEXT REFERENCES ai_agents(slug) ON DELETE SET NULL,
  decision         TEXT NOT NULL CHECK (decision IN ('pass','revise','block')),
  score            INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),
  checks_json      TEXT NOT NULL DEFAULT '{}',
  notes            TEXT NOT NULL DEFAULT '',
  created_at       INTEGER NOT NULL,
  CHECK (json_valid(checks_json))
);
CREATE INDEX idx_ai_social_quality_content
  ON ai_social_quality_reviews(content_id,created_at DESC);

CREATE TABLE ai_social_opportunities (
  id                  TEXT PRIMARY KEY,
  project_id          TEXT NOT NULL REFERENCES ai_projects(id) ON DELETE CASCADE,
  channel             TEXT NOT NULL
                      CHECK (channel IN ('facebook','instagram','tiktok','threads','linkedin','whatsapp')),
  external_object_id  TEXT,
  provenance_url      TEXT NOT NULL,
  business_name       TEXT,
  business_signal     TEXT NOT NULL,
  intent_score        INTEGER NOT NULL CHECK (intent_score BETWEEN 0 AND 100),
  recommended_action  TEXT NOT NULL
                      CHECK (recommended_action IN ('like','comment','follow','dm','lead_handoff','ignore')),
  proposed_message    TEXT NOT NULL DEFAULT '',
  status              TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','approved','rejected','executed','expired','handed_off')),
  lead_candidate_id   TEXT REFERENCES lead_candidates(id) ON DELETE SET NULL,
  reviewed_by         TEXT REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at         INTEGER,
  created_at          INTEGER NOT NULL,
  updated_at          INTEGER NOT NULL,
  CHECK (status NOT IN ('approved','rejected','executed','handed_off') OR reviewed_at IS NOT NULL)
);
CREATE INDEX idx_ai_social_opportunities_review
  ON ai_social_opportunities(project_id,status,intent_score DESC,created_at DESC);

INSERT OR IGNORE INTO ai_social_policies
  (project_id,timezone,status,daily_post_count,daily_image_count,reel_interval_days,
   tag_min,tag_max,weekly_article_weekday,weekly_article_hour,weekly_article_minute,
   engagement_interval_minutes,story_like_target,feed_like_target,require_human_approval,
   created_at,updated_at)
SELECT id,'Europe/Bucharest','active',1,1,3,5,10,5,16,0,180,8,6,1,
       CAST(strftime('%s','now') AS INTEGER)*1000,
       CAST(strftime('%s','now') AS INTEGER)*1000
  FROM ai_projects WHERE id='aip_avyron_web';

INSERT OR IGNORE INTO ai_agent_versions
  (id,agent_slug,version,status,model,temperature,max_tokens,autonomy,system_prompt,
   guardrails,tools_json,change_note,created_at,approved_at)
SELECT 'agent_version_ai_prod_content_2',slug,2,'approved',model,0.4,1800,'assist',
  'Esti creierul editorial AVYRON Social Studio. Creezi ciorne originale, clare, premium, tech si orientate spre conversie. Adaptezi nativ ideea pentru fiecare canal, folosesti 5-10 hashtaguri relevante la postarile de feed, descrieri scurte la Story, surse recente cu provenienta si un stil uman pentru articole. Pentru fiecare vizual livrezi un brief minimalist, fotorealist sau grafic, cu alt text. Analizezi tipare de succes fara a copia expresii, structuri distinctive sau identitatea altui brand.',
  'Nu publica, nu trimite mesaje, nu da like, nu urmari conturi si nu comentezi fara aprobare umana si conector verificat. Nu inventa rezultate, clienti, cifre, tendinte sau capabilitati. Nu targeta persoane fizice pe baza vietii private; oportunitatile trebuie sa fie afaceri si activitati profesionale. Orice afirmatie despre piata, tendinte sau concurenti trebuie legata de o sursa aprobata.',
  '["knowledge_search","social_research","platform_adaptation","seo_caption","visual_brief","video_brief","quality_review","lead_signal_handoff"]',
  'Calendar AVYRON, adaptare multi-canal, continut editorial si oportunitati controlate.',
  CAST(strftime('%s','now') AS INTEGER)*1000,
  CAST(strftime('%s','now') AS INTEGER)*1000
FROM ai_agents WHERE slug='ai-prod-content';

UPDATE ai_agents
   SET current_version=2,
       mission='Planifica si creeaza ciorne premium pentru social media si blog, cu adaptari native, cercetare verificabila si control uman.',
       system_prompt=(SELECT system_prompt FROM ai_agent_versions WHERE id='agent_version_ai_prod_content_2'),
       guardrails=(SELECT guardrails FROM ai_agent_versions WHERE id='agent_version_ai_prod_content_2'),
       tools_json=(SELECT tools_json FROM ai_agent_versions WHERE id='agent_version_ai_prod_content_2'),
       updated_at=CAST(strftime('%s','now') AS INTEGER)*1000
 WHERE slug='ai-prod-content';

UPDATE ai_project_agents
   SET capabilities_json='["post","story","reel","carousel","article","seo_caption","visual_brief","video_brief","platform_variants","quality_review"]',
       instructions='Genereaza numai ciorne bazate pe strategia, postarile proprii si sursele aprobate. Livreaza variante native pe canal si cere aprobare inaintea oricarei actiuni externe.',
       updated_at=CAST(strftime('%s','now') AS INTEGER)*1000
 WHERE project_id='aip_avyron_web' AND agent_slug='ai-prod-content';

UPDATE ai_projects
   SET status='active', automation_mode='approval', daily_generation_limit=12,
       brand_tone='premium, tech, minimalist, clar, uman, profesionist si orientat spre rezultate',
       target_audience='Afaceri si organizatii care au nevoie de website-uri de prezentare, produse digitale, automatizari si identitate online performanta.',
       core_offer='Website-uri de prezentare premium, rapide, accesibile si optimizate pentru conversii, completate de branding, continut si automatizari.',
       agent_instructions='Studiaza descrierile si performanta continutului AVYRON existent. Cerceteaza surse nationale si internationale aprobate, extrage tipare transferabile fara copiere si personalizeaza fiecare material pentru o industrie concreta. Postarile de feed au 5-10 hashtaguri; Story-urile au text scurt; fiecare vizual are brief si alt text; articolele sunt jurnalistice, editoriale, umane si optimizate SEO. Publicarea si engagementul extern necesita aprobare si conector verificat.',
       updated_at=CAST(strftime('%s','now') AS INTEGER)*1000
 WHERE id='aip_avyron_web';

PRAGMA optimize;
