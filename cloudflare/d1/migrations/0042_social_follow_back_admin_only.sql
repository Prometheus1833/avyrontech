-- 0042_social_follow_back_admin_only.sql
-- Follow-back-ul este exclusiv o decizie manuala a administratorilor.

PRAGMA foreign_keys = ON;

ALTER TABLE ai_social_policies
  ADD COLUMN follow_back_mode TEXT NOT NULL DEFAULT 'admin_only'
  CHECK (follow_back_mode = 'admin_only');

INSERT OR REPLACE INTO ai_social_tool_policies
  (project_id,provider,capability,billing_mode,status,requires_approval,max_calls_per_day,notes,last_checked_at,updated_at)
VALUES
  ('aip_avyron_web','facebook','follow_back_management','free_only','disabled',1,0,'Follow-back-ul ramane exclusiv manual pentru administratori; followerii sunt doar observati read-only.',NULL,CAST(strftime('%s','now') AS INTEGER)*1000),
  ('aip_avyron_web','instagram','follow_back_management','free_only','disabled',1,0,'Follow-back-ul ramane exclusiv manual pentru administratori; followerii sunt doar observati read-only.',NULL,CAST(strftime('%s','now') AS INTEGER)*1000),
  ('aip_avyron_web','tiktok','follow_back_management','free_only','disabled',1,0,'Follow-back-ul ramane exclusiv manual pentru administratori; followerii sunt doar observati read-only.',NULL,CAST(strftime('%s','now') AS INTEGER)*1000);

INSERT OR IGNORE INTO ai_agent_versions
  (id,agent_slug,version,status,model,temperature,max_tokens,autonomy,system_prompt,
   guardrails,tools_json,change_note,created_at,approved_at)
SELECT 'agent_version_ai_prod_content_7',slug,7,'approved',model,temperature,max_tokens,'assist',
  system_prompt,
  guardrails || ' Nu da si nu propune follow-back pe baza relatiei follower. Follow-back-ul este decis exclusiv manual de administratori; followerii pot fi doar semnalati read-only, fara coada sau efect extern.',
  tools_json,
  'Follow-back-ul este rezervat exclusiv administratorilor.',
  CAST(strftime('%s','now') AS INTEGER)*1000,
  CAST(strftime('%s','now') AS INTEGER)*1000
FROM ai_agents WHERE slug='ai-prod-content';

UPDATE ai_agents
   SET current_version=7,
       guardrails=(SELECT guardrails FROM ai_agent_versions WHERE id='agent_version_ai_prod_content_7'),
       updated_at=CAST(strftime('%s','now') AS INTEGER)*1000
 WHERE slug='ai-prod-content';

UPDATE ai_project_agents
   SET instructions=instructions || ' Nu propune si nu executa follow-back. Followerii sunt doar semnalati read-only, iar decizia apartine exclusiv administratorilor.',
       updated_at=CAST(strftime('%s','now') AS INTEGER)*1000
 WHERE project_id='aip_avyron_web' AND agent_slug='ai-prod-content'
   AND instr(instructions,'Nu propune si nu executa follow-back')=0;

UPDATE ai_projects
   SET agent_instructions=agent_instructions || ' Nu propune si nu executa follow-back; decizia apartine exclusiv administratorilor.',
       updated_at=CAST(strftime('%s','now') AS INTEGER)*1000
 WHERE id='aip_avyron_web'
   AND instr(agent_instructions,'Nu propune si nu executa follow-back')=0;

PRAGMA optimize;
