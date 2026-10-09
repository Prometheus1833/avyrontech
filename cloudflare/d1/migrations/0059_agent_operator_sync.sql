-- 0059_agent_operator_sync.sql
-- Leaga identitatea operationala Codex de agentii canonici, cu privilegii
-- minime, si separa activitatile repetitive de pasii manuali cu impact extern.

PRAGMA foreign_keys = ON;

CREATE TABLE agent_operator_bindings (
  user_id           TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id        TEXT NOT NULL REFERENCES ai_projects(id) ON DELETE CASCADE,
  agent_slug        TEXT NOT NULL REFERENCES ai_agents(slug) ON DELETE CASCADE,
  operator_role     TEXT NOT NULL CHECK (operator_role IN ('lead_operator','social_manager')),
  status            TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','revoked')),
  permissions_json  TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(permissions_json)),
  synced_at         INTEGER NOT NULL,
  PRIMARY KEY (user_id, project_id, agent_slug)
);
CREATE INDEX idx_agent_operator_bindings_agent
  ON agent_operator_bindings(agent_slug, status, project_id);

CREATE TABLE agent_execution_routes (
  agent_slug        TEXT NOT NULL REFERENCES ai_agents(slug) ON DELETE CASCADE,
  task_key          TEXT NOT NULL,
  action_class      TEXT NOT NULL CHECK (action_class IN ('research','classification','draft','review','external')),
  executor          TEXT NOT NULL CHECK (executor IN ('workers_ai','codex_review','codex_manual')),
  requires_approval INTEGER NOT NULL DEFAULT 0 CHECK (requires_approval IN (0,1)),
  max_daily_runs    INTEGER NOT NULL DEFAULT 0 CHECK (max_daily_runs BETWEEN 0 AND 1000),
  status            TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','disabled')),
  notes             TEXT NOT NULL DEFAULT '',
  updated_at        INTEGER NOT NULL,
  PRIMARY KEY (agent_slug, task_key)
);
CREATE INDEX idx_agent_execution_routes_executor
  ON agent_execution_routes(executor, status, action_class);

INSERT INTO agent_execution_routes
  (agent_slug,task_key,action_class,executor,requires_approval,max_daily_runs,status,notes,updated_at)
VALUES
  ('leads','public_signal_triage','classification','workers_ai',0,40,'active','Clasificare si prioritizare din semnale publice aprobate; fara contact extern.',CAST(strftime('%s','now') AS INTEGER)*1000),
  ('leads','conversation_summary','research','workers_ai',0,40,'active','Rezumat factual pentru context; conversatia completa ramane in CRM.',CAST(strftime('%s','now') AS INTEGER)*1000),
  ('leads','reply_draft','draft','workers_ai',0,30,'active','Ciorna scurta si personalizata; nu trimite mesajul.',CAST(strftime('%s','now') AS INTEGER)*1000),
  ('leads','exact_thread_review','review','codex_review',0,12,'active','Codex verifica identitatea, firul exact, istoricul si eligibilitatea.',CAST(strftime('%s','now') AS INTEGER)*1000),
  ('leads','external_send','external','codex_manual',1,6,'active','Trimitere manuala numai dupa aprobarea exacta si reverificarea destinatiei.',CAST(strftime('%s','now') AS INTEGER)*1000),
  ('ai-prod-content','topic_research_summary','research','workers_ai',0,24,'active','Rezumate din surse aprobate; fara afirmatii neverificate.',CAST(strftime('%s','now') AS INTEGER)*1000),
  ('ai-prod-content','copy_and_variants','draft','workers_ai',0,24,'active','Copy, variante native, hashtaguri si brief vizual prin AI Core intern.',CAST(strftime('%s','now') AS INTEGER)*1000),
  ('ai-prod-content','content_quality_review','review','codex_review',0,12,'active','Codex verifica brandul, adevarul, CTA-ul si potrivirea pe canal.',CAST(strftime('%s','now') AS INTEGER)*1000),
  ('ai-prod-content','manual_publish','external','codex_manual',1,8,'active','Publicare manuala cu identitate, destinatie, placement si revizie verificate.',CAST(strftime('%s','now') AS INTEGER)*1000);

-- Daca identitatea dedicata exista deja, migrarea o sincronizeaza fara parola,
-- fara rol administrativ si fara a crea o a doua sursa de adevar.
DELETE FROM user_roles
 WHERE user_id IN (SELECT id FROM users WHERE lower(email)='codexagent@avyron.ro')
   AND role IN ('staff','admin');
INSERT OR IGNORE INTO user_roles(user_id,role)
SELECT id,'user' FROM users
 WHERE lower(email)='codexagent@avyron.ro' AND disabled_at IS NULL;

UPDATE ai_project_members
   SET status='revoked', updated_at=CAST(strftime('%s','now') AS INTEGER)*1000
 WHERE user_id IN (SELECT id FROM users WHERE lower(email)='codexagent@avyron.ro')
   AND project_id<>'aip_avyron_web'
   AND status='active';

INSERT OR IGNORE INTO ai_project_members
  (project_id,user_id,role,status,granted_by,granted_at,updated_at)
SELECT 'aip_avyron_web',id,'editor','active',NULL,
       CAST(strftime('%s','now') AS INTEGER)*1000,
       CAST(strftime('%s','now') AS INTEGER)*1000
  FROM users WHERE lower(email)='codexagent@avyron.ro' AND disabled_at IS NULL;

INSERT OR IGNORE INTO agent_operator_bindings
  (user_id,project_id,agent_slug,operator_role,status,permissions_json,synced_at)
SELECT id,'aip_avyron_web','leads','lead_operator','active',
       '["read_leads","create_leads","update_leads","add_activities","manage_reminders"]',
       CAST(strftime('%s','now') AS INTEGER)*1000
  FROM users WHERE lower(email)='codexagent@avyron.ro' AND disabled_at IS NULL;
INSERT OR IGNORE INTO agent_operator_bindings
  (user_id,project_id,agent_slug,operator_role,status,permissions_json,synced_at)
SELECT id,'aip_avyron_web','ai-prod-content','social_manager','active',
       '["read_project","create_drafts","propose_sources","handoff_lead","manual_publish_after_approval"]',
       CAST(strftime('%s','now') AS INTEGER)*1000
  FROM users WHERE lower(email)='codexagent@avyron.ro' AND disabled_at IS NULL;

-- Profilul dedicat este o identitate operationala, nu un administrator.
-- Eliminam orice grant istoric pentru ca lista de mai jos sa fie exhaustiva.
DELETE FROM user_capabilities
 WHERE user_id IN (SELECT id FROM users WHERE lower(email)='codexagent@avyron.ro');

INSERT OR IGNORE INTO user_capabilities
  (id,user_id,capability,organization_id,granted_by,reason,created_at)
SELECT 'codex_cap_' || replace(capability,'.','_'),account.id,capability,NULL,NULL,
       'agent_operator_profile:codex-v1',CAST(strftime('%s','now') AS INTEGER)*1000
  FROM users account
  CROSS JOIN (
    SELECT 'leads.read' capability UNION ALL
    SELECT 'leads.create' UNION ALL SELECT 'leads.write' UNION ALL
    SELECT 'leads.activity.create' UNION ALL SELECT 'leads.reminder.manage' UNION ALL
    SELECT 'ai_projects.read' UNION ALL SELECT 'ai_content.create' UNION ALL
    SELECT 'social.source.propose' UNION ALL SELECT 'social.lead_handoff'
  ) grants
 WHERE lower(account.email)='codexagent@avyron.ro' AND account.disabled_at IS NULL;

PRAGMA optimize;
