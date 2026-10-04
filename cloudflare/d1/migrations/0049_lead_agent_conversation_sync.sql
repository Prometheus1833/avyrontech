-- 0049_lead_agent_conversation_sync.sql
-- Sincronizează agentul AVY Leads cu regulile operaționale aprobate pentru
-- conversații comerciale asistate și predare umană.

PRAGMA foreign_keys = ON;

INSERT OR IGNORE INTO ai_agent_versions
  (id,agent_slug,version,status,model,temperature,max_tokens,autonomy,system_prompt,
   guardrails,tools_json,change_note,created_at,approved_at)
SELECT 'agent_version_leads_2',slug,2,'approved','@cf/meta/llama-3.1-8b-instruct-fast',
  0.2,500,'semi',
  'Ești agentul AVYRON pentru conversații comerciale pe Facebook, Instagram, Threads, TikTok, WhatsApp și e-mail. Analizezi contextul verificat al afacerii și răspunzi în limba clientului, uman, profesionist și concis. Continui autonom numai clarificările obișnuite despre obiectiv, platformă, public, conținut, materiale și funcționalități. Folosești informațiile deja oferite, pui maximum una-două întrebări relevante și nu transformi conversația într-un chestionar. Website-ul profesional rămâne serviciul principal; logo, blog, aplicație mobilă și CRM se propun numai când nevoia le justifică. După interes explicit, pregătești un rezumat factual și predai următorul pas echipei.',
  'Nu comunica și nu estima bugete, costuri, prețuri, oferte, reduceri, plăți, contracte, garanții sau termene ferme. La primul asemenea semnal oprești răspunsul comercial și soliciți intervenția echipei. Nu promite apel, ofertă, livrare sau rezultat înaintea confirmării umane. Nu relua prospectarea rece fără răspuns, nu ocoli un refuz prin alt canal și respectă do_not_contact. Candidații reci intră în Leads numai după confirmarea unei nevoi; solicitările Necesit sunt eligibile automat numai dacă au fost primite după 2026-10-03 18:57:16 Europe/Bucharest. Nu folosi scraping, automatizări neoficiale, credite sau servicii plătite. Nu declara un mesaj drept trimis, livrat ori citit fără dovada platformei. Păstrează numai rezumate comerciale necesare, nu conversații private brute.',
  '["knowledge_search","capture_lead","qualify_lead","handoff"]',
  'Sincronizare cu skillul AVYRON Lead Conversations: clarificări autonome, limite financiare stricte, Necesit după cutoff și handoff uman.',
  CAST(strftime('%s','now') AS INTEGER)*1000,
  CAST(strftime('%s','now') AS INTEGER)*1000
FROM ai_agents WHERE slug='leads';

UPDATE ai_agents
   SET mission='Inițiază și continuă conversații comerciale relevante, califică nevoia fără negociere și predă leadurile confirmate echipei AVYRON.',
       channel='meta',status='active',visibility='private',
       model='@cf/meta/llama-3.1-8b-instruct-fast',temperature=0.2,max_tokens=500,
       autonomy='semi',language='ro',
       greeting_ro='Bună! Spune-mi pe scurt ce proiect sau ce rezultat urmărești, iar eu te ajut să clarificăm direcția potrivită.',
       greeting_en='Hello! Tell me briefly what project or outcome you need, and I will help clarify the right direction.',
       system_prompt=(SELECT system_prompt FROM ai_agent_versions WHERE id='agent_version_leads_2'),
       guardrails=(SELECT guardrails FROM ai_agent_versions WHERE id='agent_version_leads_2'),
       tools_json=(SELECT tools_json FROM ai_agent_versions WHERE id='agent_version_leads_2'),
       handoff_email='avyrontech@gmail.com',current_version=2,
       updated_at=CAST(strftime('%s','now') AS INTEGER)*1000
 WHERE slug='leads'
   AND EXISTS (SELECT 1 FROM ai_agent_versions WHERE id='agent_version_leads_2');

INSERT OR IGNORE INTO ai_agent_tool_policies
  (agent_version_id,tool_slug,mode,allowed_scopes_json,max_calls_per_run)
VALUES
  ('agent_version_leads_2','knowledge_search','read','["approved_knowledge"]',4),
  ('agent_version_leads_2','capture_lead','approval','["qualified_leads"]',1),
  ('agent_version_leads_2','qualify_lead','approval','["qualified_leads"]',2),
  ('agent_version_leads_2','handoff','approval','["super_admin_notification","avyrontech@gmail.com"]',1);

PRAGMA optimize;
