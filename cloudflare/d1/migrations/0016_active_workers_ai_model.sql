-- Replace the model retired by Cloudflare on 2026-05-30 while preserving the
-- append-only migration history already applied to preview.

UPDATE ai_agents
   SET model = '@cf/meta/llama-3.1-8b-instruct-fast',
       updated_at = CAST(strftime('%s','now') AS INTEGER) * 1000
 WHERE model = '@cf/meta/llama-3.1-8b-instruct';

UPDATE ai_agent_versions
   SET model = '@cf/meta/llama-3.1-8b-instruct-fast'
 WHERE model = '@cf/meta/llama-3.1-8b-instruct';

-- The original table default is immutable without rebuilding a referenced
-- table. Normalize legacy defaults and explicit writes instead.
CREATE TRIGGER IF NOT EXISTS trg_ai_agents_active_model_insert
AFTER INSERT ON ai_agents
WHEN NEW.model = '@cf/meta/llama-3.1-8b-instruct'
BEGIN
  UPDATE ai_agents
     SET model = '@cf/meta/llama-3.1-8b-instruct-fast'
   WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_ai_agents_active_model_update
AFTER UPDATE OF model ON ai_agents
WHEN NEW.model = '@cf/meta/llama-3.1-8b-instruct'
BEGIN
  UPDATE ai_agents
     SET model = '@cf/meta/llama-3.1-8b-instruct-fast'
   WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_ai_agent_versions_active_model_insert
AFTER INSERT ON ai_agent_versions
WHEN NEW.model = '@cf/meta/llama-3.1-8b-instruct'
BEGIN
  UPDATE ai_agent_versions
     SET model = '@cf/meta/llama-3.1-8b-instruct-fast'
   WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_ai_agent_versions_active_model_update
AFTER UPDATE OF model ON ai_agent_versions
WHEN NEW.model = '@cf/meta/llama-3.1-8b-instruct'
BEGIN
  UPDATE ai_agent_versions
     SET model = '@cf/meta/llama-3.1-8b-instruct-fast'
   WHERE id = NEW.id;
END;
