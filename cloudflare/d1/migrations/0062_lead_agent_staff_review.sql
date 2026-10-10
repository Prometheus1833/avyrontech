-- 0062_lead_agent_staff_review.sql
-- Completează fluxul append-only al agentului Leads cu review de staff,
-- revizii punctuale prin AI Core și rute explicite de cercetare/planificare.

PRAGMA foreign_keys = ON;

ALTER TABLE lead_follow_up_drafts ADD COLUMN approval_status TEXT NOT NULL DEFAULT 'pending'
  CHECK (approval_status IN ('pending','approved','rejected'));
ALTER TABLE lead_follow_up_drafts ADD COLUMN approved_by TEXT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE lead_follow_up_drafts ADD COLUMN approved_at INTEGER;
ALTER TABLE lead_follow_up_drafts ADD COLUMN revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0);

CREATE TABLE lead_follow_up_draft_revisions (
  id                TEXT PRIMARY KEY,
  draft_id          TEXT NOT NULL REFERENCES lead_follow_up_drafts(id) ON DELETE CASCADE,
  section           TEXT NOT NULL CHECK (section IN ('whatsapp','email')),
  instruction       TEXT NOT NULL,
  before_text       TEXT NOT NULL,
  proposed_text     TEXT,
  proposed_subject  TEXT,
  model             TEXT,
  status            TEXT NOT NULL DEFAULT 'generating'
                    CHECK (status IN ('generating','ready','failed','superseded')),
  error_code        TEXT,
  idempotency_key   TEXT NOT NULL UNIQUE,
  requested_by      TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  base_revision     INTEGER NOT NULL CHECK (base_revision > 0),
  created_at        INTEGER NOT NULL,
  completed_at      INTEGER
);
CREATE INDEX idx_lead_follow_up_draft_revisions
  ON lead_follow_up_draft_revisions(draft_id, created_at DESC);

-- Migrarea 0061 a enumerat instrumentul, dar modul `write` nu este o valoare
-- validă pentru politica de tool. Îl înregistrăm explicit și folosim `execute`
-- numai pentru generarea unei ciorne interne, fără trimitere externă.
INSERT OR IGNORE INTO ai_tools
  (slug,name,description,action_class,risk_level,input_schema_json,status,handler_version,created_at,updated_at)
VALUES
  ('draft_follow_up','Necesit follow-up draft',
   'Generează sau revizuiește o ciornă internă; nu trimite extern.',
   'write','medium','{"type":"object"}','active','v1',
   CAST(strftime('%s','now') AS INTEGER)*1000,
   CAST(strftime('%s','now') AS INTEGER)*1000);

INSERT OR IGNORE INTO ai_agent_versions
  (id,agent_slug,version,status,model,temperature,max_tokens,autonomy,system_prompt,
   guardrails,tools_json,change_note,created_at,approved_at)
SELECT 'agent_version_leads_5',slug,5,'approved','@cf/qwen/qwen3-30b-a3b-fp8',
  0.2,700,'semi',
  'Ești AVY Leads, agentul intern AVYRON pentru cercetare, planificare și conversații comerciale consultative. Lucrezi în cozi independente: Necesit eligibil, inbound nou, fire active, oportunități publice, prospectare și cercetare, apoi CRM și handoff. Prioritizezi Necesit și răspunsurile noi, dar după o acțiune verificată eliberezi firul și continui celelalte cozi. Cercetarea folosește numai surse profesionale publice, manual sau asistat, fără scraping; separă faptele, ipotezele și necunoscutele. Pregătești loturi mici, individualizate, pentru ferestrele aprobate și păstrezi candidații reci în afara Leads până la nevoie confirmată. Planifici următorul pas, responsabilul și momentul de reverificare. Pentru Necesit pregătești cel mult două reveniri: prima la aproximativ 48 de ore și ultima în ziua 7 de la primul contact personalizat confirmat, numai dacă revenirea anterioară a fost confirmată ca trimisă și nu există răspuns. Orice ciornă intră în review de staff. O revizie AI modifică exclusiv secțiunea selectată, WhatsApp sau e-mail, iar restul ciornei rămâne identic. Stafful poate aproba ciorna, o poate trimite înapoi pentru revizie și poate prelua responsabilitatea leadului. Nu confunzi aprobarea ciornei cu trimiterea externă. Conduci conversația consultativ, cu maximum una-două întrebări relevante, traduci funcțiile în rezultate practice și predai echipei deciziile comerciale.',
  'Nu comunica și nu estima autonom bugete, costuri, prețuri, oferte, reduceri, plăți, contracte, garanții sau termene ferme; la primul asemenea semnal oprești răspunsul comercial și soliciți intervenția echipei. Nu publici și nu trimiți extern fără conector oficial, identitate verificată, aprobarea reviziei exacte și confirmarea cerută de instrument. Nu folosi scraping, automatizări neoficiale, date private, credite sau servicii plătite. Workers AI rulează numai prin AI Core cu plafon gratuit și hard-stop înainte de overage. Nu creezi leaduri pentru candidați reci, nu reiei prospectarea rece fără răspuns, nu ocolești un refuz și respecți do_not_contact global. La inbound respecți fereastra echipei și recitești firul înainte de răspuns. Anulezi revenirile la răspuns, refuz, contact invalid, disconfort sau preluare umană. Nu declari o acțiune trimisă, livrată, citită ori publicată fără dovadă în canal. Păstrezi rezumate comerciale necesare, nu conversații private brute.',
  '["knowledge_search","capture_lead","qualify_lead","draft_follow_up","handoff"]',
  'Flux v5: review staff, revizie punctuală AI Core, două reveniri Necesit și cozi de cercetare/planificare.',
  CAST(strftime('%s','now') AS INTEGER)*1000,
  CAST(strftime('%s','now') AS INTEGER)*1000
FROM ai_agents WHERE slug='leads';

UPDATE ai_agents
   SET mission='Cercetează și planifică prospectarea, sprijină conversațiile, pregătește ciorne controlate și coordonează handoff-ul către staff.',
       status='active',visibility='private',model='@cf/qwen/qwen3-30b-a3b-fp8',
       temperature=0.2,max_tokens=700,autonomy='semi',
       system_prompt=(SELECT system_prompt FROM ai_agent_versions WHERE id='agent_version_leads_5'),
       guardrails=(SELECT guardrails FROM ai_agent_versions WHERE id='agent_version_leads_5'),
       tools_json=(SELECT tools_json FROM ai_agent_versions WHERE id='agent_version_leads_5'),
       handoff_email='avyrontech@gmail.com',current_version=5,
       updated_at=CAST(strftime('%s','now') AS INTEGER)*1000
 WHERE slug='leads'
   AND EXISTS (SELECT 1 FROM ai_agent_versions WHERE id='agent_version_leads_5');

INSERT OR IGNORE INTO ai_agent_tool_policies
  (agent_version_id,tool_slug,mode,allowed_scopes_json,max_calls_per_run)
VALUES
  ('agent_version_leads_5','knowledge_search','read','["approved_knowledge","public_business_sources"]',6),
  ('agent_version_leads_5','capture_lead','approval','["qualified_leads"]',1),
  ('agent_version_leads_5','qualify_lead','approval','["qualified_leads"]',2),
  ('agent_version_leads_5','draft_follow_up','execute','["necesit_follow_up_draft","selected_section_revision","lead_history_summary"]',2),
  ('agent_version_leads_5','handoff','approval','["super_admin_notification","avyrontech@gmail.com"]',1);

UPDATE ai_project_agents
   SET status='ready',autonomy='assist',
       capabilities_json='["lead_signals","public_lead_research","outreach_planning","conversation_summary","reply_draft","necesit_follow_up_48h","necesit_follow_up_day_7","staff_review","task_handoff","qualification"]',
       instructions='Coordonează cozi independente pentru cercetare, planificare, conversații și CRM. Workers AI clasifică și redactează intern; Codex verifică sursa, eligibilitatea și firul; stafful aprobă ciorna și poate prelua leadul. Nicio aprobare internă nu execută automat trimiterea externă.',
       updated_at=CAST(strftime('%s','now') AS INTEGER)*1000
 WHERE project_id='aip_avyron_web' AND agent_slug='leads';

INSERT INTO agent_execution_routes
  (agent_slug,task_key,action_class,executor,requires_approval,max_daily_runs,status,notes,updated_at)
VALUES
  ('leads','public_lead_research','research','codex_manual',0,9,'active','Cercetare manuală/asistată din surse publice; fără scraping sau contactare.',CAST(strftime('%s','now') AS INTEGER)*1000),
  ('leads','outreach_window_plan','classification','workers_ai',0,3,'active','Planifică loturile mici și ordinea cozilor; nu autorizează trimiterea.',CAST(strftime('%s','now') AS INTEGER)*1000),
  ('leads','necesit_follow_up_generation','draft','workers_ai',0,3,'active','Generează ciornele 48h/ziua 7 prin AI Core; fallbackul determinist rămâne intern și netrimis.',CAST(strftime('%s','now') AS INTEGER)*1000),
  ('leads','follow_up_section_revision','draft','workers_ai',0,12,'active','Revizuiește numai secțiunea WhatsApp sau e-mail selectată, prin AI Core.',CAST(strftime('%s','now') AS INTEGER)*1000),
  ('leads','staff_task_handoff','review','codex_review',0,24,'active','Pregătește contextul minim pentru ca un membru staff să preia leadul.',CAST(strftime('%s','now') AS INTEGER)*1000)
ON CONFLICT(agent_slug,task_key) DO UPDATE SET
  action_class=excluded.action_class,executor=excluded.executor,
  requires_approval=excluded.requires_approval,max_daily_runs=excluded.max_daily_runs,
  status=excluded.status,notes=excluded.notes,updated_at=excluded.updated_at;

UPDATE agent_operator_bindings
   SET permissions_json='["read_leads","create_leads","update_leads","add_activities","manage_reminders","research_public_candidates","prepare_outreach_plan","prepare_follow_up_revision","handoff_to_staff"]',
       synced_at=CAST(strftime('%s','now') AS INTEGER)*1000
 WHERE project_id='aip_avyron_web' AND agent_slug='leads' AND status='active';

-- Agentul folosește numai alocarea gratuită verificată de AI Core. Costul
-- estimat rămâne zero, iar quota Cloudflare are hard-stop înainte de plată.
INSERT OR IGNORE INTO financial_agent_provider_policies
  (agent_slug,vendor_id,status,daily_budget_minor,monthly_budget_minor,max_request_cost_minor,
   currency,created_at,updated_at)
VALUES
  ('leads','fin_vendor_cloudflare_ai','active',0,0,0,'RON',
   CAST(strftime('%s','now') AS INTEGER)*1000,
   CAST(strftime('%s','now') AS INTEGER)*1000);

UPDATE financial_agent_provider_policies
   SET status='active',daily_budget_minor=0,monthly_budget_minor=0,max_request_cost_minor=0,
       updated_at=CAST(strftime('%s','now') AS INTEGER)*1000
 WHERE agent_slug='leads' AND vendor_id='fin_vendor_cloudflare_ai'
   AND EXISTS (
     SELECT 1 FROM financial_provider_quotas
      WHERE id='fin_quota_cloudflare_ai' AND hard_stop_before_paid=1
        AND quota_total=5000 AND status IN ('active','warning')
   );

PRAGMA optimize;
