-- Public AVY presentation settings, editable from AI OS and consumed by the site widget.
-- Conversation bodies remain in ai_messages; these columns contain only public UI copy.
ALTER TABLE ai_agents ADD COLUMN starter_questions_ro TEXT NOT NULL DEFAULT '[]';
ALTER TABLE ai_agents ADD COLUMN starter_questions_en TEXT NOT NULL DEFAULT '[]';
ALTER TABLE ai_agents ADD COLUMN proactive_prompts_ro TEXT NOT NULL DEFAULT '[]';
ALTER TABLE ai_agents ADD COLUMN proactive_prompts_en TEXT NOT NULL DEFAULT '[]';

UPDATE ai_agents
SET starter_questions_ro = '["Vreau un site","Ce produs mi se potrivește?","Cât costă un proiect?","Pot primi un audit gratuit?"]',
    starter_questions_en = '["I need a website","Which product fits my project?","How much does a project cost?","Can I get a free audit?"]',
    proactive_prompts_ro = '["Ai nevoie de un site?","Vrei să afli ce produs ți se potrivește?","Vrei o estimare rapidă?"]',
    proactive_prompts_en = '["Do you need a website?","Want to find the right product for your project?","Would you like a quick estimate?"]',
    updated_at = CAST(strftime('%s','now') AS INTEGER) * 1000
WHERE slug = 'avy';
