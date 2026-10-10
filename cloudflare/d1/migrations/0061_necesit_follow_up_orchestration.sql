-- 0061_necesit_follow_up_orchestration.sql
-- Reveniri Necesit la 48h, ciorne temporare free-first și istoric CRM compact.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS lead_follow_up_drafts (
  id                 TEXT PRIMARY KEY,
  lead_id            TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  sequence           INTEGER NOT NULL CHECK (sequence IN (1,2)),
  due_at              INTEGER NOT NULL,
  status              TEXT NOT NULL DEFAULT 'queued'
                      CHECK (status IN ('queued','generating','ready','sent','cancelled','failed','expired')),
  whatsapp_body      TEXT,
  email_subject      TEXT,
  email_body         TEXT,
  generated_by_model TEXT,
  last_error_code    TEXT,
  attempt_count      INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count BETWEEN 0 AND 5),
  generated_at       INTEGER,
  sent_at            INTEGER,
  expires_at         INTEGER NOT NULL,
  created_at         INTEGER NOT NULL,
  updated_at         INTEGER NOT NULL,
  UNIQUE (lead_id, sequence),
  CHECK (whatsapp_body IS NULL OR length(whatsapp_body) <= 1200),
  CHECK (email_subject IS NULL OR length(email_subject) <= 200),
  CHECK (email_body IS NULL OR length(email_body) <= 5000)
);
CREATE INDEX IF NOT EXISTS idx_lead_follow_up_drafts_due
  ON lead_follow_up_drafts(status, due_at, created_at);
CREATE INDEX IF NOT EXISTS idx_lead_follow_up_drafts_expiry
  ON lead_follow_up_drafts(status, expires_at);

INSERT OR IGNORE INTO ai_agent_versions
  (id,agent_slug,version,status,model,temperature,max_tokens,autonomy,system_prompt,
   guardrails,tools_json,change_note,created_at,approved_at)
SELECT 'agent_version_leads_4',slug,4,'approved','@cf/meta/llama-3.1-8b-instruct-fast',
  0.2,650,'semi',
  'Ești AVY Leads, agentul AVYRON pentru conversații comerciale. Răspunzi în limba clientului, uman, profesionist, calm și concis. Lucrezi consultativ: pornești de la fapte verificate, separi intern faptul de ipoteză, răspunzi întâi întrebării reale, reflectezi ce ai înțeles și pui maximum una-două întrebări de continuare legate de ultimul răspuns. Nu transformi descoperirea într-un chestionar. Pentru un lead Necesit fără răspuns, prima revenire este la aproximativ 48 de ore de la primul contact personalizat confirmat. Continui distinct firul WhatsApp și e-mailul, menționezi transparent solicitarea prin platforma Necesit și verifici politicos, cu o singură întrebare principală, dacă proiectul mai este actual, dacă solicitarea a fost transmisă din greșeală sau dacă persoana dorește o explicație mai clară a serviciului. Tradu fiecare capabilitate în valoare practică pentru activitatea clientului și alegi una-două direcții relevante. După nevoia confirmată, păstrezi un rezumat factual și predai echipei când decizia devine comercială.',
  'Nu comunica și nu estima autonom bugete, costuri, prețuri, oferte, reduceri, plăți, contracte, garanții sau termene ferme. Nu inventa detalii despre client, nu acuza și nu crea presiune. La răspuns, refuz, contact invalid, do_not_contact, disconfort sau preluare umană anulezi toate revenirile nesosite. Maximum două reveniri Necesit: prima la aproximativ 48 de ore și ultima în ziua 7; prospectarea rece nu primește reveniri fără răspuns. Ignori complet estimarea automată Necesit. Nu folosi scraping, automatizări neoficiale, credite sau servicii plătite. Workers AI rulează numai prin AI Core cu plafon gratuit și fallback determinist. Nu declari un mesaj trimis, livrat ori citit fără dovada platformei. Ciornele sunt temporare; istoricul AVYRON OS păstrează numai rezumatul factual, canalul, rezultatul și următorul pas.',
  '["knowledge_search","capture_lead","qualify_lead","draft_follow_up","handoff"]',
  'Necesit 48h v4: revenire idempotentă, ciorne temporare, AI Core free-first și cozi independente.',
  CAST(strftime('%s','now') AS INTEGER)*1000,
  CAST(strftime('%s','now') AS INTEGER)*1000
FROM ai_agents WHERE slug='leads';

UPDATE ai_agents
   SET status='active',visibility='private',autonomy='semi',
       system_prompt=(SELECT system_prompt FROM ai_agent_versions WHERE id='agent_version_leads_4'),
       guardrails=(SELECT guardrails FROM ai_agent_versions WHERE id='agent_version_leads_4'),
       tools_json=(SELECT tools_json FROM ai_agent_versions WHERE id='agent_version_leads_4'),
       current_version=4,
       updated_at=CAST(strftime('%s','now') AS INTEGER)*1000
 WHERE slug='leads'
   AND EXISTS (SELECT 1 FROM ai_agent_versions WHERE id='agent_version_leads_4');

INSERT OR IGNORE INTO ai_agent_tool_policies
  (agent_version_id,tool_slug,mode,allowed_scopes_json,max_calls_per_run)
VALUES
  ('agent_version_leads_4','knowledge_search','read','["approved_knowledge"]',4),
  ('agent_version_leads_4','capture_lead','approval','["qualified_leads"]',1),
  ('agent_version_leads_4','qualify_lead','approval','["qualified_leads"]',2),
  ('agent_version_leads_4','draft_follow_up','write','["necesit_follow_up_draft","lead_history_summary"]',1),
  ('agent_version_leads_4','handoff','approval','["super_admin_notification","avyrontech@gmail.com"]',1);

UPDATE ai_project_agents
   SET status='ready',autonomy='assist',
       capabilities_json='["lead_signals","conversation_summary","reply_draft","necesit_follow_up_48h","qualification","handoff"]',
       instructions='Folosește fapte verificate și întrebări de continuare. Pentru Necesit pregătește idempotent o singură pereche WhatsApp plus e-mail la 48 de ore numai dacă nu există răspuns, refuz, do_not_contact sau preluare umană. Folosește AI Core free-first, păstrează ciornele temporar și scrie în istoric numai rezumatul factual. Nu trimite extern; execuția rămâne pe conector oficial verificat sau la operator.',
       updated_at=CAST(strftime('%s','now') AS INTEGER)*1000
 WHERE project_id='aip_avyron_web' AND agent_slug='leads';

PRAGMA optimize;
