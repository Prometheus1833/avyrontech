-- Preserve v1 execution history; use a JSON Schema-capable model for new runs.
-- Both versions remain subject to the same user-approved survey-brief RON policy.
INSERT INTO ai_agent_versions(id,agent_slug,version,status,model,temperature,max_tokens,autonomy,system_prompt,guardrails,change_note,created_at,approved_at)
VALUES('survey_brief_v2','survey-brief',2,'approved','@cf/meta/llama-3.3-70b-instruct-fp8-fast',0,1200,'assist','Folosește doar răspunsuri disponibile.','Fără date inventate; citate verificabile, schemă JSON, revizuire umană.','Structured JSON model after live compatibility verification; the existing 25 RON monthly cap is unchanged.',CAST(strftime('%s','now') AS INTEGER)*1000,CAST(strftime('%s','now') AS INTEGER)*1000);
UPDATE ai_agents SET current_version=2,model='@cf/meta/llama-3.3-70b-instruct-fp8-fast',updated_at=CAST(strftime('%s','now') AS INTEGER)*1000 WHERE slug='survey-brief' AND current_version=1;
