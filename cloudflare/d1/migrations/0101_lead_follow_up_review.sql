-- Restores reviewed lead follow-ups from PR #28 without changing applied migrations.
PRAGMA foreign_keys=ON;
CREATE TABLE lead_follow_up_drafts (
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
  whatsapp_sent_at INTEGER, email_sent_at INTEGER,
  expires_at         INTEGER NOT NULL,
  created_at         INTEGER NOT NULL,
  updated_at         INTEGER NOT NULL,
  approval_status TEXT NOT NULL DEFAULT 'pending' CHECK(approval_status IN('pending','approved','rejected')),
  approved_by TEXT REFERENCES users(id) ON DELETE SET NULL, approved_at INTEGER,
  revision INTEGER NOT NULL DEFAULT 1 CHECK(revision>0),
  UNIQUE (lead_id, sequence),
  CHECK (whatsapp_body IS NULL OR length(whatsapp_body) <= 1200),
  CHECK (email_subject IS NULL OR length(email_subject) <= 200),
  CHECK (email_body IS NULL OR length(email_body) <= 5000)
);
CREATE INDEX IF NOT EXISTS idx_lead_follow_up_drafts_due
  ON lead_follow_up_drafts(status, due_at, created_at);
CREATE INDEX IF NOT EXISTS idx_lead_follow_up_drafts_expiry
  ON lead_follow_up_drafts(status, expires_at);

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
  request_hash TEXT NOT NULL,
  base_revision     INTEGER NOT NULL CHECK (base_revision > 0),
  created_at        INTEGER NOT NULL,
  completed_at      INTEGER
);
CREATE INDEX idx_lead_follow_up_draft_revisions
  ON lead_follow_up_draft_revisions(draft_id, created_at DESC);


-- A new approved version retains the existing instructions and tool rights.
-- Operational hard stops remain in AI Core; no paid provider or send is enabled.
INSERT INTO ai_agent_versions(id,agent_slug,version,status,model,temperature,max_tokens,autonomy,system_prompt,guardrails,tools_json,change_note,created_at,approved_at)
SELECT 'agent_version_leads_release_20261107',a.slug,(SELECT COALESCE(MAX(version),0)+1 FROM ai_agent_versions WHERE agent_slug=a.slug),'approved',
 COALESCE((SELECT model_id FROM ai_model_registry WHERE role='primary' AND status='configured' AND requires_billing=0),a.model),a.temperature,a.max_tokens,a.autonomy,
 COALESCE(a.system_prompt,'') || '
Flux operațional: păstrează reconcilierea și prospectarea independente, cu checkpoint și stare terminală verificată pentru fiecare canal. Reia numai pașii incompleți; rezultatele confirmate sau incerte nu se repetă automat. Ciornele Necesit se pregătesc la 48h și în ziua 7, fără răspuns, fără refuz și fără preluare umană. Revizia modifică numai secțiunea WhatsApp sau e-mail selectată și netrimisă. Stafful poate prelua, aproba sau respinge din fișa leadului. API-ul nativ oferă /api/leads/ID/claim și /follow-ups/DRAFT/review, /revise, /sent. Confirmarea trimiterii este distinctă pentru fiecare canal.',
 COALESCE(a.guardrails,'') || '
Nu trimite extern automat. Aprobarea exactă nu se extinde la texte, destinatari sau canale noi. Nu declara livrare ori citire din deschiderea aplicației. Anulează revenirile la răspuns, arhivare, refuz sau do_not_contact. Folosește numai AI Core și bugetele existente; fără activări plătite. Păstrează rezumate factuale și context minim, fără conversații private brute.',
 a.tools_json,'Reconciliere PR #28 și disciplină de reluare: păstrează drepturile native și separă confirmările de canal.',unixepoch()*1000,unixepoch()*1000
FROM ai_agents a WHERE a.slug='leads';
INSERT INTO ai_agent_tool_policies(agent_version_id,tool_slug,mode,allowed_scopes_json,max_calls_per_run)
SELECT 'agent_version_leads_release_20261107',p.tool_slug,p.mode,p.allowed_scopes_json,p.max_calls_per_run FROM ai_agent_tool_policies p JOIN ai_agent_versions v ON v.id=p.agent_version_id JOIN ai_agents a ON a.slug=v.agent_slug AND a.current_version=v.version WHERE a.slug='leads';
UPDATE ai_agents SET current_version=(SELECT version FROM ai_agent_versions WHERE id='agent_version_leads_release_20261107'),
 model=(SELECT model FROM ai_agent_versions WHERE id='agent_version_leads_release_20261107'),
 system_prompt=(SELECT system_prompt FROM ai_agent_versions WHERE id='agent_version_leads_release_20261107'),
 guardrails=(SELECT guardrails FROM ai_agent_versions WHERE id='agent_version_leads_release_20261107'),updated_at=unixepoch()*1000
WHERE slug='leads';
-- Complete only a missing Free policy. Existing disabled/custom policies survive.
INSERT OR IGNORE INTO financial_agent_provider_policies(agent_slug,vendor_id,status,daily_budget_minor,monthly_budget_minor,max_request_cost_minor,currency,created_at,updated_at)
SELECT 'leads','fin_vendor_cloudflare_ai','active',0,0,0,'RON',unixepoch()*1000,unixepoch()*1000
WHERE EXISTS(SELECT 1 FROM financial_provider_quotas WHERE vendor_id='fin_vendor_cloudflare_ai' AND hard_stop_before_paid=1 AND quota_total>0 AND status IN('active','warning'));

-- Route catalogue: distinguish inherited Free budgets from daily ceilings.
ALTER TABLE agent_execution_routes ADD COLUMN limit_mode TEXT NOT NULL DEFAULT 'daily' CHECK(limit_mode IN('daily','native_budget','manual'));
INSERT INTO agent_execution_routes(agent_slug,task_key,action_class,executor,requires_approval,max_daily_runs,status,notes,updated_at,limit_mode) VALUES
 ('leads','public_lead_research','research','codex_manual',0,0,'active','Cercetare din surse publice, fără scraping sau contactare; fără plafon zilnic propriu.',unixepoch()*1000,'manual'),
 ('leads','outreach_window_plan','classification','workers_ai',0,0,'active','Plan intern de loturi; nu autorizează trimiterea. Bugetele native AI Core.',unixepoch()*1000,'native_budget'),
 ('leads','necesit_follow_up_generation','draft','workers_ai',0,0,'active','Ciorne 48h/ziua 7 prin AI Core, fallback intern explicit, fără trimitere.',unixepoch()*1000,'native_budget'),
 ('leads','follow_up_section_revision','draft','workers_ai',0,0,'active','Revizuiește numai secțiunea netrimisă selectată. Bugetele native AI Core.',unixepoch()*1000,'native_budget'),
 ('leads','staff_task_handoff','review','codex_review',0,0,'active','Predare contextuală și preluare umană; fără plafon zilnic propriu.',unixepoch()*1000,'manual');
UPDATE agent_operator_bindings SET permissions_json=json_insert(permissions_json,'$[#]','prepare_follow_up_revision'),synced_at=unixepoch()*1000
WHERE agent_slug='leads' AND status='active' AND NOT EXISTS(SELECT 1 FROM json_each(permissions_json) WHERE value='prepare_follow_up_revision');
