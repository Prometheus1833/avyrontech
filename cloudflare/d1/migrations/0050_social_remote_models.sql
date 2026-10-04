-- 0050_social_remote_models.sql
-- Registru compact pentru modele remote. Nu stocheaza greutati, binare, media
-- sau raspunsuri brute in D1. Toate rutele executabile sunt free_only.

PRAGMA foreign_keys = ON;

CREATE TABLE ai_social_model_routes (
  project_id          TEXT NOT NULL REFERENCES ai_projects(id) ON DELETE CASCADE,
  route_key           TEXT NOT NULL,
  provider            TEXT NOT NULL,
  model_id            TEXT NOT NULL,
  modality            TEXT NOT NULL CHECK (modality IN ('text','image','audio','video')),
  execution_mode      TEXT NOT NULL CHECK (execution_mode IN ('remote_api','catalog_only')),
  billing_mode        TEXT NOT NULL DEFAULT 'free_only' CHECK (billing_mode = 'free_only'),
  status              TEXT NOT NULL CHECK (status IN ('available','catalog_only','blocked_paid','disabled')),
  priority            INTEGER NOT NULL DEFAULT 100 CHECK (priority BETWEEN 1 AND 999),
  max_output_tokens   INTEGER NOT NULL DEFAULT 0 CHECK (max_output_tokens BETWEEN 0 AND 4000),
  daily_unit_limit    INTEGER NOT NULL DEFAULT 0 CHECK (daily_unit_limit BETWEEN 0 AND 10000),
  source_url          TEXT NOT NULL,
  license_spdx        TEXT,
  storage_policy      TEXT NOT NULL DEFAULT 'metadata_only' CHECK (storage_policy = 'metadata_only'),
  notes               TEXT NOT NULL DEFAULT '',
  last_verified_at    INTEGER,
  updated_at          INTEGER NOT NULL,
  PRIMARY KEY (project_id,route_key,model_id),
  CHECK (length(route_key) BETWEEN 1 AND 80),
  CHECK (length(model_id) BETWEEN 1 AND 180),
  CHECK (length(source_url) BETWEEN 8 AND 500),
  CHECK (length(notes) <= 1200),
  CHECK (execution_mode <> 'remote_api' OR provider = 'cloudflare_workers_ai'),
  CHECK (status <> 'available' OR execution_mode = 'remote_api')
);
CREATE INDEX idx_social_model_routes_lookup
  ON ai_social_model_routes(project_id,route_key,status,priority);

INSERT INTO ai_social_model_routes
  (project_id,route_key,provider,model_id,modality,execution_mode,billing_mode,status,
   priority,max_output_tokens,daily_unit_limit,source_url,license_spdx,storage_policy,
   notes,last_verified_at,updated_at)
VALUES
  ('aip_avyron_web','routine_copy','cloudflare_workers_ai','@cf/zai-org/glm-4.7-flash','text','remote_api','free_only','available',10,1200,7000,'https://github.com/zai-org/GLM-4.5','Apache-2.0','metadata_only','Copy social multilingv, hook-uri, variante native si structura. Ruleaza numai prin alocarea gratuita si cost guard.',1791100800000,1791100800000),
  ('aip_avyron_web','premium_editorial','cloudflare_workers_ai','@cf/openai/gpt-oss-120b','text','remote_api','free_only','available',10,1800,7000,'https://github.com/openai/gpt-oss','Apache-2.0','metadata_only','Articole, concepte Reel si revizie editoriala cu rationament. Nu se descarca greutatile modelului.',1791100800000,1791100800000),
  ('aip_avyron_web','image_generation','cloudflare_workers_ai','@cf/black-forest-labs/flux-1-schnell','image','remote_api','free_only','available',10,0,1,'https://github.com/black-forest-labs/flux','Apache-2.0','metadata_only','Imagine remote. D1 pastreaza numai metadate; assetul aprobat poate fi pastrat in R2, niciodata ca blob D1.',1791100800000,1791100800000),
  ('aip_avyron_web','audio_transcription','cloudflare_workers_ai','@cf/openai/whisper-large-v3-turbo','audio','remote_api','free_only','available',10,0,2,'https://github.com/openai/whisper','MIT','metadata_only','Transcriere remote pentru subtitrari. Fisierul audio nu este copiat in D1.',1791100800000,1791100800000),
  ('aip_avyron_web','video_generation','official_github','Lightricks/LTX-Video','video','catalog_only','free_only','catalog_only',20,0,0,'https://github.com/Lightricks/LTX-Video','Apache-2.0','metadata_only','Catalog oficial pentru evaluare. Fara endpoint remote gratuit verificat; generarea ramane dezactivata.',1791100800000,1791100800000),
  ('aip_avyron_web','video_generation','official_github','Wan-Video/Wan2.2','video','catalog_only','free_only','catalog_only',30,0,0,'https://github.com/Wan-Video/Wan2.2','Apache-2.0','metadata_only','Catalog oficial pentru evaluare. Fara instalare locala, greutati sau consum de GPU platit.',1791100800000,1791100800000);

INSERT OR REPLACE INTO ai_social_tool_policies
  (project_id,provider,capability,billing_mode,status,requires_approval,max_calls_per_day,notes,last_checked_at,updated_at)
VALUES
  ('aip_avyron_web','cloudflare_workers_ai','remote_text_generation','free_only','available',0,6,'Modele gazduite remote; oprire interna la 7000 de unitati/zi si fara fallback platit.',1791100800000,1791100800000),
  ('aip_avyron_web','cloudflare_workers_ai','remote_image_generation','free_only','available',1,1,'FLUX.1 schnell prin Workers AI. Assetele nu se stocheaza in D1.',1791100800000,1791100800000),
  ('aip_avyron_web','cloudflare_workers_ai','remote_audio_transcription','free_only','available',1,2,'Whisper remote pentru subtitrari; fara fisiere audio in D1.',1791100800000,1791100800000),
  ('aip_avyron_web','official_github','remote_video_generation','free_only','disabled',1,0,'LTX-Video si Wan2.2 sunt numai catalog metadata pana la un endpoint remote gratuit verificat.',1791100800000,1791100800000);

-- Rezerva interna este deliberat sub alocarea publica de 10.000 neuroni/zi.
-- Resetarea are loc la 00:00 UTC; hard_stop_before_paid ramane obligatoriu.
UPDATE financial_provider_quotas
   SET plan='Workers AI free allocation only',
       quota_total=7000,
       quota_used=CASE WHEN quota_used > 7000 THEN 7000 ELSE quota_used END,
       reset_frequency='daily',
       reset_date=CAST(strftime('%s','now','start of day','+1 day') AS INTEGER)*1000,
       estimated_cost_after_limit_minor=0,
       hard_limit=7000,
       soft_limit=5600,
       hard_stop_before_paid=1,
       status=CASE WHEN quota_used >= 7000 THEN 'exhausted' ELSE 'active' END,
       updated_at=CAST(strftime('%s','now') AS INTEGER)*1000
 WHERE id='fin_quota_cloudflare_ai';

UPDATE financial_agent_provider_policies
   SET status='active',daily_budget_minor=0,monthly_budget_minor=0,max_request_cost_minor=0,
       updated_at=CAST(strftime('%s','now') AS INTEGER)*1000
 WHERE agent_slug='ai-prod-content' AND vendor_id='fin_vendor_cloudflare_ai';

INSERT OR IGNORE INTO ai_agent_versions
  (id,agent_slug,version,status,model,temperature,max_tokens,autonomy,system_prompt,
   guardrails,tools_json,change_note,created_at,approved_at)
SELECT 'agent_version_ai_prod_content_5',slug,5,'approved',model,0.4,1800,'assist',
  system_prompt,
  guardrails || ' Modelele ruleaza exclusiv remote si free_only. Nu descarca si nu stoca greutati, checkpoint-uri, runtime-uri sau cache-uri de model local, in D1 ori in R2. D1 pastreaza numai metadate compacte; media aprobata foloseste stocarea de obiecte. Daca ruta gratuita nu este verificata sau limita este atinsa, opreste generarea fara fallback platit.',
  tools_json,
  'Rute remote gratuite, registru metadata_only si interdictie explicita pentru greutati ori date mari.',
  CAST(strftime('%s','now') AS INTEGER)*1000,
  CAST(strftime('%s','now') AS INTEGER)*1000
FROM ai_agents WHERE slug='ai-prod-content';

UPDATE ai_agents
   SET current_version=5,
       guardrails=(SELECT guardrails FROM ai_agent_versions WHERE id='agent_version_ai_prod_content_5'),
       updated_at=CAST(strftime('%s','now') AS INTEGER)*1000
 WHERE slug='ai-prod-content';

UPDATE ai_project_agents
   SET capabilities_json='["post","story","reel","carousel","article","seo_caption","canonical_link_review","visual_brief","video_brief","platform_variants","native_effects_brief","safe_zone_review","live_preview_review","quality_review","backup_manifest","remote_model_routing"]',
       instructions=instructions || ' Foloseste numai rute cloud remote free_only din registrul proiectului. Nu stoca modele sau date mari; pentru video fara endpoint gratuit livreaza storyboard si instructiuni pentru editorul nativ.',
       updated_at=CAST(strftime('%s','now') AS INTEGER)*1000
 WHERE project_id='aip_avyron_web' AND agent_slug='ai-prod-content'
   AND instr(instructions,'rute cloud remote free_only')=0;

PRAGMA optimize;
