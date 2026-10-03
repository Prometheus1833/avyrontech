-- 0039_social_facebook_canonical_links.sql
-- Linkuri de conversie AVYRON scurte si canonice, in special pe Facebook.

PRAGMA foreign_keys = ON;

UPDATE ai_social_design_profiles
   SET status='retired',updated_at=CAST(strftime('%s','now') AS INTEGER)*1000
 WHERE project_id='aip_avyron_web' AND status='approved';

INSERT INTO ai_social_design_profiles
  (id,project_id,version,status,profile_json,created_at,approved_at,updated_at)
SELECT 'asdp_avyron_web_4',id,4,'approved',
  '{"schemaVersion":4,"tone":["premium","tech","minimalist","clar","uman","profesionist"],"story":{"canvas":{"width":1080,"height":1920},"safeZone":{"top":180,"bottom":250,"left":72,"right":72},"maxInteractiveElements":1,"maxSecondaryAccents":1},"links":{"defaultUrl":"https://avyron.ro","defaultServiceUrl":"https://avyron.ro/servicii/website-prezentare-profesional","allowedConversionRoots":["/","/servicii","/produse","/blog"],"facebook":{"maximumVisibleLinks":1,"stripQueryAndFragment":true,"forbidExampleUrls":true,"forbidExternalConversionUrls":true,"placement":"caption_end","selectionOrder":["exact_service_or_product","service_category","professional_website_service","homepage"]}},"contact":{"email":"contact@avyron.ro","phone":"0734 605 055","useWhenRelevant":true},"quality":{"minimumScore":90,"liveMobilePreviewRequired":true},"freeOnly":true}',
  CAST(strftime('%s','now') AS INTEGER)*1000,
  CAST(strftime('%s','now') AS INTEGER)*1000,
  CAST(strftime('%s','now') AS INTEGER)*1000
FROM ai_projects WHERE id='aip_avyron_web';

INSERT OR IGNORE INTO ai_agent_versions
  (id,agent_slug,version,status,model,temperature,max_tokens,autonomy,system_prompt,
   guardrails,tools_json,change_note,created_at,approved_at)
SELECT 'agent_version_ai_prod_content_4',slug,4,'approved',model,0.4,1800,'assist',
  'Esti creierul editorial AVYRON Social Studio. Creezi continut original, premium, tech, minimalist si orientat spre conversie, in care serviciul de website sau produs digital este evident. Adaptezi nativ textul, vizualul, CTA-ul, linkul, muzica si efectele pentru fiecare canal. Pe Facebook folosesti maximum un URL canonic AVYRON, fara query, fragment sau UTM vizibil; alegi serviciul ori produsul exact, pagina serviciilor, serviciul website de prezentare profesional sau avyron.ro. Nu folosesti URL-uri de exemple ori demo ca destinatie de conversie. Pentru Story protejezi zonele sigure si livrezi un CTA clar.',
  'Nu publica, nu trimite mesaje, nu interactiona si nu modifica audiente fara aprobare umana si conector verificat. Nu consuma servicii platite: politica este free_only. Nu inventa clienti, rezultate, cifre sau capabilitati si nu prezenta lucrari demonstrative drept proiecte reale. Nu include secrete, sesiuni sau conversatii private in backupuri.',
  '["knowledge_search","social_research","platform_adaptation","seo_caption","canonical_link_review","visual_brief","video_brief","native_effects_brief","safe_zone_review","live_preview_review","quality_review","backup_manifest","lead_signal_handoff"]',
  'Linkuri Facebook canonice si scurte, fara demo, query sau UTM vizibil.',
  CAST(strftime('%s','now') AS INTEGER)*1000,
  CAST(strftime('%s','now') AS INTEGER)*1000
FROM ai_agents WHERE slug='ai-prod-content';

UPDATE ai_agents
   SET current_version=4,
       system_prompt=(SELECT system_prompt FROM ai_agent_versions WHERE id='agent_version_ai_prod_content_4'),
       guardrails=(SELECT guardrails FROM ai_agent_versions WHERE id='agent_version_ai_prod_content_4'),
       tools_json=(SELECT tools_json FROM ai_agent_versions WHERE id='agent_version_ai_prod_content_4'),
       updated_at=CAST(strftime('%s','now') AS INTEGER)*1000
 WHERE slug='ai-prod-content';

UPDATE ai_project_agents
   SET capabilities_json='["post","story","reel","carousel","article","seo_caption","canonical_link_review","visual_brief","video_brief","platform_variants","native_effects_brief","safe_zone_review","live_preview_review","quality_review","backup_manifest"]',
       instructions='Genereaza ciorne si variante native folosind profilul de design aprobat. Pe Facebook pastreaza maximum un link canonic AVYRON, fara query, fragment, UTM vizibil sau URL de exemplu/demo. Implicit foloseste serviciul website de prezentare profesional cand nu exista o destinatie mai exacta.',
       updated_at=CAST(strftime('%s','now') AS INTEGER)*1000
 WHERE project_id='aip_avyron_web' AND agent_slug='ai-prod-content';

PRAGMA optimize;
