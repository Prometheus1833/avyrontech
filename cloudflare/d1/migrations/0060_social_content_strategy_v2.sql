-- 0060_social_content_strategy_v2.sql
-- Integreaza compact lectiile editoriale aprobate in AVYRON OS si instruieste
-- agentii de continut/cercetare fara a stoca PDF-uri, capturi sau texte brute.

PRAGMA foreign_keys = ON;

UPDATE ai_social_design_profiles
   SET status='retired',updated_at=CAST(strftime('%s','now') AS INTEGER)*1000
 WHERE project_id='aip_avyron_web' AND status='approved';

INSERT INTO ai_social_design_profiles
  (id,project_id,version,status,profile_json,source_sha256,created_at,approved_at,updated_at)
SELECT 'asdp_avyron_web_5',id,5,'approved',
  '{"schemaVersion":5,"tone":["premium","tech","minimalist","clar","uman","profesionist","orientat_spre_conversii"],"contentSystem":{"sourceQuestionRequired":true,"editorialMechanisms":["information_gap","self_reference","proof_story","immediate_value"],"longCaption":["hook","diagnostic","concrete_value","avyron_connection","single_cta","specific_target_url"],"story":{"defaultFrameCount":3,"sequence":["recognition","mechanism_or_proof","action"],"microcopyRequiredPerFrame":true,"specificLinkStickerPreferred":true},"shortVideo":{"hookWindowSeconds":[0,2],"framesFor15To30Seconds":[5,8],"framesFor30To45Seconds":[7,12],"singleStaticImageVideoForbidden":true,"photoModeFallbackFrames":[4,7],"requiredFieldsPerFrame":["duration","purpose","visual","screen_text","voice_over","transition","audio_cue","safe_zone"]},"learning":{"reviewWindowsHours":[24,72,168],"singleVariableTests":["hook","frame_count","cta","cover","duration","time"],"minimumComparablePosts":2}},"story":{"canvas":{"width":1080,"height":1920},"safeZone":{"top":180,"bottom":250,"left":72,"right":72},"maxInteractiveElements":1,"maxSecondaryAccents":1},"links":{"defaultUrl":"https://avyron.ro","defaultServiceUrl":"https://avyron.ro/servicii/website-prezentare-profesional","specificTargets":{"services":"https://avyron.ro/servicii","professionalWebsite":"https://avyron.ro/servicii/website-prezentare-profesional","onlineStore":"https://avyron.ro/servicii/magazin-online","professionalBlog":"https://avyron.ro/servicii/blog-profesional","applications":"https://avyron.ro/servicii/aplicatii-si-platforme","automationAi":"https://avyron.ro/servicii/automatizari-si-ai","qa":"https://avyron.ro/servicii/qa-testing-web-mobile","socialIdentity":"https://avyron.ro/servicii/identitate-social-media","dynamicLogo":"https://avyron.ro/servicii/creare-logo-3d-dinamic-cinematic","articlePattern":"https://avyron.ro/blog/<slug>"},"allowedConversionRoots":["/","/servicii","/produse","/blog"],"maximumVisibleLinks":1,"forbidExampleUrls":true,"forbidExternalConversionUrls":true},"quality":{"minimumScore":90,"liveMobilePreviewRequired":true,"checks":["brand_fit","clarity","website_offer_visible","mobile_legibility","safe_zones","native_adaptation","story_microcopy","video_progression","specific_target_url","cta","accessibility","truthfulness","originality"]},"freeOnly":true,"storagePolicy":"metadata_only"}',
  '7a5c27dff0dd800f46e0907e56b9e2e4f3074fe5233695c16564ef99f0763e0f',
  CAST(strftime('%s','now') AS INTEGER)*1000,
  CAST(strftime('%s','now') AS INTEGER)*1000,
  CAST(strftime('%s','now') AS INTEGER)*1000
FROM ai_projects WHERE id='aip_avyron_web';

INSERT OR IGNORE INTO ai_social_sources
  (id,project_id,kind,title,canonical_url,source_label,scope,evidence_hash,evidence_json,
   insight,status,observed_at,expires_at,approved_at,created_at,updated_at)
VALUES
  ('aiss_content_lessons_2026','aip_avyron_web','pdf_book','7 lectii despre continutul care functioneaza in 2026',NULL,'Material atasat de operator','internal',
   '7a5c27dff0dd800f46e0907e56b9e2e4f3074fe5233695c16564ef99f0763e0f',
   '{"storage":"metadata_only","pages":14,"mechanisms":["information_gap","self_reference","proof_story","immediate_value","low_cognitive_load","varied_repetition","human_rewrite"]}',
   'Porneste de la o intrebare reala, livreaza motivul atentiei in prima propozitie sau in primele doua secunde, variaza mecanismul intre canale si rescrie uman fiecare iesire.',
   'approved',CAST(strftime('%s','now') AS INTEGER)*1000,CAST(strftime('%s','now','+365 days') AS INTEGER)*1000,CAST(strftime('%s','now') AS INTEGER)*1000,CAST(strftime('%s','now') AS INTEGER)*1000,CAST(strftime('%s','now') AS INTEGER)*1000),
  ('aiss_baboon_promotion_2026','aip_avyron_web','website','Promovare Online: ghid complet pentru cresterea vizibilitatii','https://www.baboon.ro/promovare-online-ghid-2025-pentru-cresterea-vizibilitatii-in-online','Baboon','national',NULL,
   '{"storage":"metadata_only","reviewed":"2026-10-10","topics":["audience_research","hook_content_cta_visual","native_video","measurement","human_supervision"]}',
   'Structureaza continutul in hook, continut, CTA si vizual; prioritizeaza primele doua propozitii si primele trei secunde video, formatul nativ si masurarea traficului, comportamentului si conversiilor.',
   'approved',CAST(strftime('%s','now') AS INTEGER)*1000,CAST(strftime('%s','now','+180 days') AS INTEGER)*1000,CAST(strftime('%s','now') AS INTEGER)*1000,CAST(strftime('%s','now') AS INTEGER)*1000,CAST(strftime('%s','now') AS INTEGER)*1000),
  ('aiss_gomag_blog_2026','aip_avyron_web','website','Mega Ghid: blogul si vanzarile online','https://www.gomag.ro/blog/idei-pentru-blog-incepatori-vanzari-online/','Gomag','national',NULL,
   '{"storage":"metadata_only","reviewed":"2026-10-10","topics":["client_questions","search_intent","seo","internal_links","repurposing","measurement"]}',
   'Alege subiecte din intrebarile clientilor si intentia de cautare; foloseste structura scanabila, SEO natural, linkuri interne si reutilizeaza articolul in carusel, Story si video cu CTA unic.',
   'approved',CAST(strftime('%s','now') AS INTEGER)*1000,CAST(strftime('%s','now','+180 days') AS INTEGER)*1000,CAST(strftime('%s','now') AS INTEGER)*1000,CAST(strftime('%s','now') AS INTEGER)*1000,CAST(strftime('%s','now') AS INTEGER)*1000);

INSERT OR IGNORE INTO ai_project_memories
  (id,project_id,kind,summary,source_url,source_hash,confidence,status,observed_at,expires_at,approved_at,created_at)
VALUES
  ('aipm_avyron_content_system_v2','aip_avyron_web','learning',
   'Continutul AVYRON porneste de la o intrebare sau obiectie reala si foloseste un mecanism editorial explicit. Captionul amplu include hook, diagnostic, valoare concreta, legatura AVYRON, CTA unic si URL specific. Story-ul explicativ are implicit trei cadre cu microcopy separat. Video de 15-30 secunde are 5-8 cadre, iar cel de 30-45 secunde are 7-12; o singura imagine intinsa pe durata clipului este interzisa.',
   NULL,'7a5c27dff0dd800f46e0907e56b9e2e4f3074fe5233695c16564ef99f0763e0f',0.95,'approved',
   CAST(strftime('%s','now') AS INTEGER)*1000,CAST(strftime('%s','now','+365 days') AS INTEGER)*1000,CAST(strftime('%s','now') AS INTEGER)*1000,CAST(strftime('%s','now') AS INTEGER)*1000),
  ('aipm_avyron_content_measurement_v2','aip_avyron_web','performance',
   'Evalueaza continutul dupa obiectiv la 24-72 de ore si la 7 zile. Testeaza in principal o singura variabila: hook, numar de cadre, CTA, coperta, durata sau ora. Nu transforma un singur rezultat intr-o regula si nu atribui conversii fara dovada.',
   'https://avyron.ro','content-performance-system-v2',0.9,'approved',
   CAST(strftime('%s','now') AS INTEGER)*1000,CAST(strftime('%s','now','+365 days') AS INTEGER)*1000,CAST(strftime('%s','now') AS INTEGER)*1000,CAST(strftime('%s','now') AS INTEGER)*1000);

INSERT OR IGNORE INTO ai_agent_versions
  (id,agent_slug,version,status,model,temperature,max_tokens,autonomy,system_prompt,
   guardrails,tools_json,change_note,created_at,approved_at)
SELECT 'agent_version_ai_prod_content_8',slug,8,'approved',model,0.38,1800,'assist',
  'Esti creierul editorial AVYRON Social Studio si scrii implicit in romana cu diacritice. Pornesti fiecare continut de la o intrebare, nevoie sau obiectie reala si alegi explicit information_gap, self_reference, proof_story sau immediate_value. Descrierea ampla are hook, diagnostic, doua-patru idei concrete, legatura factuala cu AVYRON, un singur CTA si URL-ul AVYRON cel mai specific. Story-ul explicativ are implicit trei cadre, fiecare cu microcopy separat, rol si element nativ. Reel/TikTok de 15-30 secunde are 5-8 cadre distincte, iar cel de 30-45 secunde are 7-12; demonstrezi prin capturi reale, mobil/desktop, proces sau motion design cu progres informational. Cand video nu este justificat, livrezi Photo Mode sau carusel de 4-7 cadre. Adaptezi nativ textul, ritmul, CTA-ul, muzica si efectele fiecarui canal si propui KPI-ul plus ipoteza de test.',
  guardrails || ' Nu declara o tendinta sau regula dintr-un singur rezultat. Nu transforma o imagine statica intr-un clip lung doar pentru durata. Nu lasa Story fara microcopy si nu descrie drept clicabil un URL Instagram care nu este activ. Nu folosi URL-uri demo ori preview ca destinatie si nu publica fara revizia exacta aprobata, identitate verificata si conector oficial.',
  '["knowledge_search","social_research","platform_adaptation","seo_caption","specific_link_review","story_sequence","short_video_storyboard","photo_mode_brief","native_effects_brief","safe_zone_review","live_preview_review","performance_hypothesis","quality_review","backup_manifest","remote_model_routing"]',
  'Sistem editorial v2: descrieri complete, Story cu microcopy, video multi-cadru, linkuri specifice si invatare controlata.',
  CAST(strftime('%s','now') AS INTEGER)*1000,
  CAST(strftime('%s','now') AS INTEGER)*1000
FROM ai_agents WHERE slug='ai-prod-content';

UPDATE ai_agents
   SET current_version=8,
       mission='Planifica, creeaza si optimizeaza continut AVYRON complet, nativ si masurabil, cu descrieri de impact, Story-uri utile si video multi-cadru.',
       system_prompt=(SELECT system_prompt FROM ai_agent_versions WHERE id='agent_version_ai_prod_content_8'),
       guardrails=(SELECT guardrails FROM ai_agent_versions WHERE id='agent_version_ai_prod_content_8'),
       tools_json=(SELECT tools_json FROM ai_agent_versions WHERE id='agent_version_ai_prod_content_8'),
       updated_at=CAST(strftime('%s','now') AS INTEGER)*1000
 WHERE slug='ai-prod-content';

UPDATE ai_project_agents
   SET status='ready',
       capabilities_json='["post","story","reel","carousel","article","seo_caption","specific_link_review","story_sequence","short_video_storyboard","photo_mode_brief","platform_variants","native_effects_brief","safe_zone_review","live_preview_review","performance_hypothesis","quality_review","backup_manifest","remote_model_routing"]',
       instructions='Scrie implicit in romana cu diacritice si foloseste numai fapte, surse si memorii aprobate. Porneste de la o intrebare reala si livreaza caption complet, CTA unic si URL AVYRON specific. Story-ul explicativ are implicit trei cadre cu microcopy separat. Reel/TikTok are progres informational si minimum 5 cadre pentru 15-30 secunde; daca nu exista material, foloseste Photo Mode sau carusel. Marcheaza mecanismul editorial, ipoteza, KPI-ul si fereastra de masurare. Pastreaza free_only, draft-first si aprobarea externa.',
       updated_at=CAST(strftime('%s','now') AS INTEGER)*1000
 WHERE project_id='aip_avyron_web' AND agent_slug='ai-prod-content' AND role='content';

UPDATE ai_project_agents
   SET capabilities_json='["approved_sources","source_distillation","competitor_mechanisms","search_intent_questions","performance_hypotheses","provenance_review"]',
       instructions='Cerceteaza exclusiv surse aprobate si intrebari reale relevante pentru AVYRON. Extrage mecanisme, intentii de cautare si goluri editoriale, nu texte de copiat. Pastreaza URL-ul, data, increderea si separa confirmat, observat, ipoteza si necunoscut. Nu cauta si nu contacteaza leaduri; nu colecta date personale si nu stoca materiale integrale.',
       updated_at=CAST(strftime('%s','now') AS INTEGER)*1000
 WHERE project_id='aip_avyron_web' AND agent_slug='avy' AND role='research';

INSERT OR REPLACE INTO agent_execution_routes
  (agent_slug,task_key,action_class,executor,requires_approval,max_daily_runs,status,notes,updated_at)
VALUES
  ('ai-prod-content','content_cluster_design','draft','workers_ai',0,12,'active','O intrebare reala devine variante native cu mecanism editorial si URL AVYRON specific.',CAST(strftime('%s','now') AS INTEGER)*1000),
  ('ai-prod-content','story_sequence_draft','draft','workers_ai',0,12,'active','Story explicativ cu trei cadre, microcopy separat si link sticker relevant.',CAST(strftime('%s','now') AS INTEGER)*1000),
  ('ai-prod-content','short_video_storyboard','draft','workers_ai',0,8,'active','Storyboard multi-cadru cu hook 0-2 secunde, subtitrari, coperta, audio si safe-zone.',CAST(strftime('%s','now') AS INTEGER)*1000),
  ('ai-prod-content','performance_learning_review','review','codex_review',0,8,'active','Compara metrici la 24-72 ore si 7 zile; propune o singura variabila de test.',CAST(strftime('%s','now') AS INTEGER)*1000),
  ('avy','social_source_distillation','research','workers_ai',0,8,'active','Rezuma mecanisme si intentii din surse aprobate, cu provenance si fara copiere.',CAST(strftime('%s','now') AS INTEGER)*1000),
  ('avy','content_hypothesis_review','review','codex_review',0,6,'active','Verifica dovada si separa observatia de ipoteza inainte de memorare.',CAST(strftime('%s','now') AS INTEGER)*1000);

UPDATE ai_projects
   SET memory_status='ready',
       agent_instructions='Continut in romana cu diacritice, premium, tech, minimalist si orientat spre conversie. Porneste de la intrebari reale, foloseste mecanisme editoriale explicite, descrieri complete si un singur URL AVYRON specific. Story-urile explicative au microcopy si secventa de trei cadre; video-urile scurte au progres informational multi-cadru. Adapteaza nativ fiecare canal, masoara la 24-72 ore si 7 zile si schimba o singura variabila per test. Nu duplica activitatea agentului Leads.',
       updated_at=CAST(strftime('%s','now') AS INTEGER)*1000
 WHERE id='aip_avyron_web';

PRAGMA optimize;

