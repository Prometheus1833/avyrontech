-- 0045_social_studio_library_backup.sql
-- Profil de design versionat, registru de active si backupuri verificabile.

PRAGMA foreign_keys = ON;

ALTER TABLE ai_social_variants ADD COLUMN link_url TEXT;
ALTER TABLE ai_social_variants ADD COLUMN link_strategy TEXT NOT NULL DEFAULT 'visible_fallback'
  CHECK (link_strategy IN ('native_clickable','profile_link','first_comment','visible_fallback','none'));
ALTER TABLE ai_social_variants ADD COLUMN native_elements_json TEXT NOT NULL DEFAULT '[]'
  CHECK (json_valid(native_elements_json));
ALTER TABLE ai_social_variants ADD COLUMN safe_zone_json TEXT NOT NULL DEFAULT '{}'
  CHECK (json_valid(safe_zone_json));
ALTER TABLE ai_social_variants ADD COLUMN background_direction TEXT NOT NULL DEFAULT '';
ALTER TABLE ai_social_variants ADD COLUMN asset_group_id TEXT;
ALTER TABLE ai_social_variants ADD COLUMN quality_score INTEGER CHECK (quality_score BETWEEN 0 AND 100);
ALTER TABLE ai_social_variants ADD COLUMN published_preview_object_key TEXT;

CREATE TABLE ai_social_design_profiles (
  id               TEXT PRIMARY KEY,
  project_id       TEXT NOT NULL REFERENCES ai_projects(id) ON DELETE CASCADE,
  version          INTEGER NOT NULL CHECK (version > 0),
  status           TEXT NOT NULL DEFAULT 'draft'
                   CHECK (status IN ('draft','approved','retired')),
  profile_json     TEXT NOT NULL,
  source_sha256    TEXT,
  source_object_key TEXT,
  created_by       TEXT REFERENCES users(id) ON DELETE SET NULL,
  approved_by      TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at       INTEGER NOT NULL,
  approved_at      INTEGER,
  updated_at       INTEGER NOT NULL,
  UNIQUE (project_id,version),
  CHECK (json_valid(profile_json)),
  CHECK (status <> 'approved' OR approved_at IS NOT NULL)
);
CREATE UNIQUE INDEX idx_ai_social_design_profile_approved
  ON ai_social_design_profiles(project_id) WHERE status='approved';

CREATE TABLE ai_social_assets (
  id               TEXT PRIMARY KEY,
  project_id       TEXT NOT NULL REFERENCES ai_projects(id) ON DELETE CASCADE,
  content_id       TEXT REFERENCES ai_content_items(id) ON DELETE SET NULL,
  asset_group_id   TEXT,
  channel          TEXT CHECK (channel IS NULL OR channel IN ('facebook','instagram','tiktok','threads','linkedin','whatsapp','messenger','blog')),
  role             TEXT NOT NULL CHECK (role IN ('source','visual','cover','video','audio','subtitle','published_preview')),
  r2_bucket        TEXT NOT NULL CHECK (r2_bucket IN ('files','media')),
  object_key       TEXT NOT NULL UNIQUE,
  mime_type        TEXT NOT NULL,
  width            INTEGER CHECK (width IS NULL OR width > 0),
  height           INTEGER CHECK (height IS NULL OR height > 0),
  duration_ms      INTEGER CHECK (duration_ms IS NULL OR duration_ms >= 0),
  byte_size        INTEGER NOT NULL DEFAULT 0 CHECK (byte_size >= 0),
  sha256           TEXT NOT NULL,
  provenance_json  TEXT NOT NULL DEFAULT '{}',
  status           TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived','deleted')),
  created_at       INTEGER NOT NULL,
  updated_at       INTEGER NOT NULL,
  CHECK (json_valid(provenance_json))
);
CREATE INDEX idx_ai_social_assets_project
  ON ai_social_assets(project_id,status,created_at DESC);
CREATE INDEX idx_ai_social_assets_content
  ON ai_social_assets(content_id,channel,role);

CREATE TABLE ai_social_backup_runs (
  id                  TEXT PRIMARY KEY,
  project_id          TEXT NOT NULL REFERENCES ai_projects(id) ON DELETE CASCADE,
  scope               TEXT NOT NULL CHECK (scope IN ('configuration','content','full')),
  status              TEXT NOT NULL DEFAULT 'creating'
                      CHECK (status IN ('creating','ready','failed','verified','expired')),
  schema_version      INTEGER NOT NULL CHECK (schema_version > 0),
  manifest_object_key TEXT,
  manifest_sha256     TEXT,
  byte_size           INTEGER NOT NULL DEFAULT 0 CHECK (byte_size >= 0),
  row_counts_json     TEXT NOT NULL DEFAULT '{}',
  created_by          TEXT REFERENCES users(id) ON DELETE SET NULL,
  started_at          INTEGER NOT NULL,
  completed_at        INTEGER,
  verified_at         INTEGER,
  last_error_code     TEXT,
  CHECK (json_valid(row_counts_json)),
  CHECK (status NOT IN ('ready','verified') OR (manifest_object_key IS NOT NULL AND manifest_sha256 IS NOT NULL))
);
CREATE INDEX idx_ai_social_backup_runs_project
  ON ai_social_backup_runs(project_id,started_at DESC);

INSERT INTO ai_social_design_profiles
  (id,project_id,version,status,profile_json,created_at,approved_at,updated_at)
SELECT 'asdp_avyron_web_3',id,3,'approved',
  '{"schemaVersion":3,"tone":["premium","tech","minimalist","clar","uman","profesionist"],"story":{"canvas":{"width":1080,"height":1920},"safeZone":{"top":180,"bottom":250,"left":72,"right":72},"maxInteractiveElements":1,"maxSecondaryAccents":1},"links":{"defaultUrl":"https://avyron.ro","storyPriority":["native_link_sticker","profile_link","visible_avyron_ro"]},"contact":{"email":"contact@avyron.ro","phone":"0734 605 055","useWhenRelevant":true},"quality":{"minimumScore":90,"liveMobilePreviewRequired":true},"freeOnly":true}',
  CAST(strftime('%s','now') AS INTEGER)*1000,
  CAST(strftime('%s','now') AS INTEGER)*1000,
  CAST(strftime('%s','now') AS INTEGER)*1000
FROM ai_projects WHERE id='aip_avyron_web';

INSERT OR IGNORE INTO ai_agent_versions
  (id,agent_slug,version,status,model,temperature,max_tokens,autonomy,system_prompt,
   guardrails,tools_json,change_note,created_at,approved_at)
SELECT 'agent_version_ai_prod_content_3',slug,3,'approved',model,0.4,1800,'assist',
  'Esti creierul editorial AVYRON Social Studio. Creezi continut original, premium, tech, minimalist si orientat spre conversie, in care serviciul de website sau produs digital este evident. Adaptezi nativ textul, vizualul, CTA-ul, linkul, muzica si efectele pentru fiecare canal. Pentru Story protejezi 180 px sus, 250 px jos si 72 px lateral pe canvas 1080x1920, folosesti text scurt si maximum un element interactiv plus un accent secundar. Livrezi alt text, directie de fundal, elemente native si strategie de link. Verifici previzualizarea mobila dupa publicare inainte de reutilizare.',
  'Nu publica, nu trimite mesaje, nu interactiona si nu modifica audiente fara aprobare umana si conector verificat. Nu consuma servicii platite: politica este free_only. Nu inventa clienti, rezultate, cifre sau capabilitati si nu prezenta lucrari demonstrative drept proiecte reale. Nu include secrete, sesiuni sau conversatii private in backupuri.',
  '["knowledge_search","social_research","platform_adaptation","seo_caption","visual_brief","video_brief","native_effects_brief","safe_zone_review","live_preview_review","quality_review","backup_manifest","lead_signal_handoff"]',
  'Profil vizual v3, legaturi native, zone sigure, QA mobil si backup verificabil.',
  CAST(strftime('%s','now') AS INTEGER)*1000,
  CAST(strftime('%s','now') AS INTEGER)*1000
FROM ai_agents WHERE slug='ai-prod-content';

UPDATE ai_agents
   SET current_version=3,
       mission='Planifica si creeaza continut social si editorial AVYRON premium, adaptat nativ, verificabil si protejat prin aprobare umana.',
       system_prompt=(SELECT system_prompt FROM ai_agent_versions WHERE id='agent_version_ai_prod_content_3'),
       guardrails=(SELECT guardrails FROM ai_agent_versions WHERE id='agent_version_ai_prod_content_3'),
       tools_json=(SELECT tools_json FROM ai_agent_versions WHERE id='agent_version_ai_prod_content_3'),
       updated_at=CAST(strftime('%s','now') AS INTEGER)*1000
 WHERE slug='ai-prod-content';

UPDATE ai_project_agents
   SET capabilities_json='["post","story","reel","carousel","article","seo_caption","visual_brief","video_brief","platform_variants","native_effects_brief","safe_zone_review","live_preview_review","quality_review","backup_manifest"]',
       instructions='Genereaza ciorne si variante native folosind profilul de design aprobat. Include strategia de link, zonele sigure, directia fundalului, efectele native si criteriile de verificare mobila. Pastreaza aprobarea umana si politica free_only.',
       updated_at=CAST(strftime('%s','now') AS INTEGER)*1000
 WHERE project_id='aip_avyron_web' AND agent_slug='ai-prod-content';

PRAGMA optimize;
