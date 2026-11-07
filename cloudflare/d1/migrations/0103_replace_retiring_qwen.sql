-- Replace only the retiring Qwen model. Preserve all quotas, usage, pauses,
-- financial controls, custom models and historical approved snapshots.
INSERT INTO audit_log(action,meta_json,created_at)
SELECT 'ai.model.replaced',json_object('from','@cf/qwen/qwen3-30b-a3b-fp8',
  'to','@cf/mistralai/mistral-small-3.1-24b-instruct','source','migration_0103',
  'authorization','user_requested_model_replacement'),unixepoch()*1000
WHERE EXISTS(SELECT 1 FROM ai_model_registry WHERE role='primary' AND model_id='@cf/qwen/qwen3-30b-a3b-fp8');
UPDATE ai_model_registry
SET model_id='@cf/mistralai/mistral-small-3.1-24b-instruct',updated_at=unixepoch()*1000
WHERE role='primary' AND model_id='@cf/qwen/qwen3-30b-a3b-fp8';

INSERT OR IGNORE INTO ai_agent_versions
  (id,agent_slug,version,status,model,temperature,max_tokens,autonomy,
   system_prompt,guardrails,tools_json,change_note,created_at,approved_at)
SELECT 'agent_version_mistral_0103_'||a.slug,a.slug,
  (SELECT MAX(version)+1 FROM ai_agent_versions WHERE agent_slug=a.slug),v.status,
  '@cf/mistralai/mistral-small-3.1-24b-instruct',v.temperature,v.max_tokens,v.autonomy,
  v.system_prompt,v.guardrails,v.tools_json,
  'User-authorized replacement of retiring Qwen through existing Cloudflare Workers AI; no policy or budget change.',
  unixepoch()*1000,CASE WHEN v.status='approved' THEN unixepoch()*1000 ELSE NULL END
FROM ai_agents a JOIN ai_agent_versions v ON v.agent_slug=a.slug AND v.version=a.current_version
WHERE a.model='@cf/qwen/qwen3-30b-a3b-fp8' AND v.model IN
  ('@cf/qwen/qwen3-30b-a3b-fp8','@cf/meta/llama-3.1-8b-instruct','@cf/meta/llama-3.1-8b-instruct-fast');

INSERT OR IGNORE INTO ai_agent_tool_policies
  (agent_version_id,tool_slug,mode,allowed_scopes_json,max_calls_per_run)
SELECT 'agent_version_mistral_0103_'||a.slug,p.tool_slug,p.mode,p.allowed_scopes_json,p.max_calls_per_run
FROM ai_agents a JOIN ai_agent_versions v ON v.agent_slug=a.slug AND v.version=a.current_version
JOIN ai_agent_tool_policies p ON p.agent_version_id=v.id
WHERE a.model='@cf/qwen/qwen3-30b-a3b-fp8' AND EXISTS
  (SELECT 1 FROM ai_agent_versions WHERE id='agent_version_mistral_0103_'||a.slug);

UPDATE ai_agents SET model='@cf/mistralai/mistral-small-3.1-24b-instruct',
  current_version=(SELECT version FROM ai_agent_versions WHERE id='agent_version_mistral_0103_'||ai_agents.slug),
  updated_at=unixepoch()*1000
WHERE model='@cf/qwen/qwen3-30b-a3b-fp8' AND EXISTS
  (SELECT 1 FROM ai_agent_versions WHERE id='agent_version_mistral_0103_'||ai_agents.slug);

-- A pre-existing destination route keeps its own status and settings.
UPDATE ai_social_model_routes AS old
SET model_id='@cf/mistralai/mistral-small-3.1-24b-instruct',
  source_url='https://developers.cloudflare.com/workers-ai/models/mistral-small-3.1-24b-instruct/',
  notes=substr(notes,1,1000)||' Qwen replacement 0103; existing Free controls retained.',
  last_verified_at=NULL,updated_at=unixepoch()*1000
WHERE old.model_id='@cf/qwen/qwen3-30b-a3b-fp8' AND NOT EXISTS
  (SELECT 1 FROM ai_social_model_routes existing WHERE existing.project_id=old.project_id
   AND existing.route_key=old.route_key AND existing.model_id='@cf/mistralai/mistral-small-3.1-24b-instruct');
UPDATE ai_social_model_routes SET status='disabled',updated_at=unixepoch()*1000
WHERE model_id='@cf/qwen/qwen3-30b-a3b-fp8' AND status='available';
