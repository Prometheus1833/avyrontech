-- 0041_social_friend_requests_admin_only.sql
-- Cererile de prietenie primite sunt gestionate exclusiv de administratori.
-- Agentul nu primeste capabilitate, ruta sau coada pentru acceptare/respingere.

PRAGMA foreign_keys = ON;

ALTER TABLE ai_social_policies
  ADD COLUMN incoming_friend_request_mode TEXT NOT NULL DEFAULT 'admin_only'
  CHECK (incoming_friend_request_mode = 'admin_only');

INSERT OR REPLACE INTO ai_social_tool_policies
  (project_id,provider,capability,billing_mode,status,requires_approval,max_calls_per_day,notes,last_checked_at,updated_at)
VALUES
  ('aip_avyron_web','facebook','incoming_friend_request_management','free_only','disabled',1,0,
   'Acceptarea si respingerea cererilor de prietenie primite raman exclusiv manuale pentru administratori. Agentul poate doar observa read-only.',
   NULL,
   CAST(strftime('%s','now') AS INTEGER)*1000);

INSERT OR IGNORE INTO ai_agent_versions
  (id,agent_slug,version,status,model,temperature,max_tokens,autonomy,system_prompt,
   guardrails,tools_json,change_note,created_at,approved_at)
SELECT 'agent_version_ai_prod_content_6',slug,6,'approved',model,temperature,max_tokens,'assist',
  system_prompt,
  guardrails || ' Nu accepta, nu respinge si nu proceseaza cereri de prietenie primite. Aceste decizii apartin exclusiv administratorilor; poti doar semnala read-only existenta unei cereri, fara coada sau efect extern.',
  tools_json,
  'Cererile de prietenie primite sunt rezervate exclusiv administratorilor.',
  CAST(strftime('%s','now') AS INTEGER)*1000,
  CAST(strftime('%s','now') AS INTEGER)*1000
FROM ai_agents WHERE slug='ai-prod-content';

UPDATE ai_agents
   SET current_version=6,
       guardrails=(SELECT guardrails FROM ai_agent_versions WHERE id='agent_version_ai_prod_content_6'),
       updated_at=CAST(strftime('%s','now') AS INTEGER)*1000
 WHERE slug='ai-prod-content';

UPDATE ai_project_agents
   SET instructions=instructions || ' Cererile de prietenie primite nu sunt acceptate sau respinse de agent; administrarea lor ramane exclusiv la administratorii contului.',
       updated_at=CAST(strftime('%s','now') AS INTEGER)*1000
 WHERE project_id='aip_avyron_web' AND agent_slug='ai-prod-content'
   AND instr(instructions,'Cererile de prietenie primite')=0;

UPDATE ai_projects
   SET agent_instructions=agent_instructions || ' Cererile de prietenie primite nu sunt acceptate sau respinse automat; decizia ramane exclusiv administratorilor.',
       updated_at=CAST(strftime('%s','now') AS INTEGER)*1000
 WHERE id='aip_avyron_web'
   AND instr(agent_instructions,'Cererile de prietenie primite')=0;

PRAGMA optimize;
