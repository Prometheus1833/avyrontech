-- One canonical editorial record, with a reusable source and an uncluttered queue.
-- AI production and CRM projects are distinct native entities. Do not put an
-- ai_projects ID into the existing projects foreign key when reserving cost.
ALTER TABLE financial_usage_events ADD COLUMN ai_project_id TEXT REFERENCES ai_projects(id) ON DELETE SET NULL;
CREATE INDEX idx_financial_usage_ai_project ON financial_usage_events(ai_project_id,created_at DESC);
ALTER TABLE ai_content_items ADD COLUMN reusable INTEGER NOT NULL DEFAULT 0 CHECK(reusable IN(0,1));
ALTER TABLE ai_content_items ADD COLUMN source_ref TEXT;
ALTER TABLE ai_content_items ADD COLUMN source_revision TEXT;
ALTER TABLE ai_content_items ADD COLUMN source_metadata_json TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(source_metadata_json));
ALTER TABLE ai_content_items ADD COLUMN reused_from_id TEXT REFERENCES ai_content_items(id) ON DELETE SET NULL;
ALTER TABLE ai_content_items ADD COLUMN archived_at INTEGER;
ALTER TABLE ai_social_jobs ADD COLUMN archived_at INTEGER;
ALTER TABLE ai_social_policies ADD COLUMN strategy_json TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(strategy_json));
CREATE UNIQUE INDEX idx_social_content_source ON ai_content_items(project_id,source_ref,source_revision) WHERE source_ref IS NOT NULL;
CREATE INDEX idx_social_jobs_agenda ON ai_social_jobs(project_id,archived_at,due_at,status);
CREATE INDEX idx_social_content_library ON ai_content_items(project_id,reusable,archived_at,updated_at DESC);

-- Preserve any real Codex handoff imported before this release.
UPDATE ai_content_items SET reusable=1,
 source_ref=(SELECT json_extract(e.metadata_json,'$.sourceRef') FROM ai_project_events e WHERE e.target_id=ai_content_items.id AND e.action IN('social_studio.codex.import','social_studio.codex.assets.synced') ORDER BY e.created_at DESC LIMIT 1),
 source_revision=(SELECT json_extract(e.metadata_json,'$.sourceRevision') FROM ai_project_events e WHERE e.target_id=ai_content_items.id AND e.action IN('social_studio.codex.import','social_studio.codex.assets.synced') ORDER BY e.created_at DESC LIMIT 1),
 source_metadata_json=coalesce((SELECT e.metadata_json FROM ai_project_events e WHERE e.target_id=ai_content_items.id AND e.action IN('social_studio.codex.import','social_studio.codex.assets.synced') ORDER BY e.created_at DESC LIMIT 1),'{}')
WHERE EXISTS(SELECT 1 FROM ai_project_events e WHERE e.target_id=ai_content_items.id AND e.project_id=ai_content_items.project_id AND e.action IN('social_studio.codex.import','social_studio.codex.assets.synced'));

-- History is retained; old placeholders no longer occupy the active queue.
UPDATE ai_social_jobs SET archived_at=unixepoch()*1000
WHERE project_id='aip_avyron_web' AND due_at<(unixepoch()*1000-86400000)
 AND status<>'generating' AND archived_at IS NULL;

UPDATE ai_social_policies SET strategy_json=json_object(
 'version',1,'startsOn','2026-11-07','timezone','Europe/Bucharest',
 'objective','Cereri relevante pentru serviciile AVYRON, prin demonstrații și conținut util.',
 'reuseFirst',json('true'),'approvalChannels',json('["dashboard","codex_chat"]'),
 'pillars',json('["Website și conversii","Magazin online și operațiuni","Aplicații și automatizări","Identitate și social media","QA și mentenanță"]'),
 'cadence','O temă relevantă pe zi; Story când adaugă valoare; Reel la trei zile dacă există video real; articol vineri la 16:00.',
 'measurement','La 24–72h și 7 zile: accesări ale paginii vizate, conversații relevante, salvări și solicitări confirmate. Datele lipsă rămân necunoscute.',
 'nextAction','Inventariază și reutilizează materialele nepublicate înaintea unei generări noi.'),updated_at=unixepoch()*1000
WHERE project_id='aip_avyron_web' AND strategy_json='{}';

-- Version the social agent without changing its model, budgets or other agents.
INSERT INTO ai_agent_versions(id,agent_slug,version,status,model,temperature,max_tokens,autonomy,system_prompt,guardrails,tools_json,change_note,created_at,approved_at)
SELECT 'agent_version_social_workflow_0105',a.slug,(SELECT max(version)+1 FROM ai_agent_versions WHERE agent_slug=a.slug),v.status,v.model,v.temperature,v.max_tokens,v.autonomy,
 v.system_prompt||char(10)||'FLUX EDITORIAL: citește agenda -24h/+24h și strategia nativă. Reutilizează întâi un pachet nepublicat, cu proveniență și revizie. Persistă materialul real și variantele prin handoff, nu doar un job gol. Aprobările dashboard/Codex vizează exact aceeași înregistrare și revizie. Aprobarea editorială nu dovedește publicarea. Un composer vechi nu rezervă permanent browserul. Un material vechi în așteptare nu blochează producția zilei. Story are numai numărul de cadre justificat de mesaj. Fără prospectare, lead_handoff sau DM comercial.',
 v.guardrails,v.tools_json,'User-requested social workflow, reusable drafts and shared human review; models and Free budgets unchanged.',unixepoch()*1000,CASE WHEN v.status='approved' THEN unixepoch()*1000 ELSE NULL END
FROM ai_agents a JOIN ai_agent_versions v ON v.agent_slug=a.slug AND v.version=a.current_version WHERE a.slug='ai-prod-content';
INSERT INTO ai_agent_tool_policies(agent_version_id,tool_slug,mode,allowed_scopes_json,max_calls_per_run)
SELECT 'agent_version_social_workflow_0105',p.tool_slug,p.mode,p.allowed_scopes_json,p.max_calls_per_run
FROM ai_agents a JOIN ai_agent_versions v ON v.agent_slug=a.slug AND v.version=a.current_version JOIN ai_agent_tool_policies p ON p.agent_version_id=v.id WHERE a.slug='ai-prod-content';
UPDATE ai_agents SET current_version=(SELECT version FROM ai_agent_versions WHERE id='agent_version_social_workflow_0105'),updated_at=unixepoch()*1000 WHERE slug='ai-prod-content';
UPDATE agent_execution_routes SET notes=notes||' Citește agenda și handoff-ul versionat; reutilizează materialele reale; nu echivala un placeholder cu un artefact.',updated_at=unixepoch()*1000 WHERE agent_slug='ai-prod-content';
PRAGMA optimize;
