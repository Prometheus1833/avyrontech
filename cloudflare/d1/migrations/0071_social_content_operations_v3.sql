-- 0071_social_content_operations_v3.sql
-- Aliniaza AVYRON OS cu fluxul editorial free_only: orchestrare explicita a
-- instrumentelor, productie vizuala realista, Story complet si conversie verificata.

PRAGMA foreign_keys = ON;

ALTER TABLE ai_social_variants ADD COLUMN story_caption TEXT NOT NULL DEFAULT '';
ALTER TABLE ai_social_variants ADD COLUMN tool_plan_json TEXT NOT NULL DEFAULT '[]'
  CHECK (json_valid(tool_plan_json));
ALTER TABLE ai_social_variants ADD COLUMN asset_provenance_json TEXT NOT NULL DEFAULT '[]'
  CHECK (json_valid(asset_provenance_json));
ALTER TABLE ai_social_variants ADD COLUMN visual_qa_json TEXT NOT NULL DEFAULT '{}'
  CHECK (json_valid(visual_qa_json));
ALTER TABLE ai_social_variants ADD COLUMN conversion_json TEXT NOT NULL DEFAULT '{}'
  CHECK (json_valid(conversion_json));

UPDATE ai_social_design_profiles
   SET status='retired',updated_at=CAST(strftime('%s','now') AS INTEGER)*1000
 WHERE project_id='aip_avyron_web' AND status='approved';

INSERT INTO ai_social_design_profiles
  (id,project_id,version,status,profile_json,source_sha256,created_at,approved_at,updated_at)
SELECT 'asdp_avyron_web_6',id,6,'approved',
  '{"schemaVersion":6,"tone":["premium","tech","minimalist","clar","uman","profesionist","orientat_spre_conversii"],"contentSystem":{"sourceQuestionRequired":true,"editorialMechanisms":["information_gap","self_reference","proof_story","immediate_value"],"longCaption":["hook","diagnostic","concrete_value","avyron_connection","single_cta","specific_target_url"],"story":{"defaultFrameCount":3,"sequence":["recognition","mechanism_or_proof","action_or_conversion"],"microcopyRequiredPerFrame":true,"storyCaptionRequiredWhenSupported":true,"unsupportedCaptionMustBeExplicit":true,"specificLinkStickerPreferred":true,"finalConversionFrame":{"optional":true,"cta":"Cere o cotatie","fields":["name","email"],"privacyNoticeRequired":true,"verifiedNativeOrHostedFormOnly":true}},"shortVideo":{"hookWindowSeconds":[0,2],"framesFor15To30Seconds":[5,8],"framesFor30To45Seconds":[7,12],"singleStaticImageVideoForbidden":true,"photoModeFallbackFrames":[4,7],"requiredFieldsPerFrame":["duration","purpose","visual","screen_text","voice_over","transition","audio_cue","safe_zone"],"nativeVariants":["instagram_reel","facebook_reel","tiktok"]},"production":{"realAssetsFirst":true,"criticalTextGeneratedInImage":false,"stages":["research","tool_plan","real_asset_capture","visual_production","copy","platform_finish","visual_qa","approval"],"requiredToolPlanFields":["stage","tool","purpose","input","output","fallback"],"humanRealismChecks":["anatomy","hands","reflections","perspective","screen_ui","lighting"],"threePassQa":["editorial_factual","visual_mobile","native_conversion"]},"conversion":{"freeOnly":true,"modes":["native_organic_form","verified_hosted_form","link_sticker","action_button"],"formFields":["name","email"],"statuses":["verified_available","unsupported","awaiting_connection"],"noLeadDataInCommentsPollsOrDm":true},"learning":{"reviewWindowsHours":[24,72,168],"singleVariableTests":["hook","frame_count","cta","cover","duration","time"],"minimumComparablePosts":2}},"story":{"canvas":{"width":1080,"height":1920},"safeZone":{"top":180,"bottom":250,"left":72,"right":72},"maxInteractiveElements":1,"maxSecondaryAccents":1},"links":{"defaultUrl":"https://avyron.ro","defaultServiceUrl":"https://avyron.ro/servicii/website-prezentare-profesional","specificTargets":{"services":"https://avyron.ro/servicii","professionalWebsite":"https://avyron.ro/servicii/website-prezentare-profesional","onlineStore":"https://avyron.ro/servicii/magazin-online","professionalBlog":"https://avyron.ro/servicii/blog-profesional","applications":"https://avyron.ro/servicii/aplicatii-si-platforme","automationAi":"https://avyron.ro/servicii/automatizari-si-ai","qa":"https://avyron.ro/servicii/qa-testing-web-mobile","socialIdentity":"https://avyron.ro/servicii/identitate-social-media","dynamicLogo":"https://avyron.ro/servicii/creare-logo-3d-dinamic-cinematic","articlePattern":"https://avyron.ro/blog/<slug>"},"allowedConversionRoots":["/","/servicii","/produse","/blog"],"maximumVisibleLinks":1,"forbidExampleUrls":true,"forbidExternalConversionUrls":true},"quality":{"minimumScore":90,"liveMobilePreviewRequired":true,"checks":["brand_fit","clarity","website_offer_visible","mobile_legibility","safe_zones","native_adaptation","story_microcopy","story_caption","video_progression","specific_target_url","cta","form_verification","visual_artifacts","accessibility","truthfulness","originality"]},"freeOnly":true,"storagePolicy":"metadata_only"}',
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
SELECT 'agent_version_ai_prod_content_9',slug,9,'approved',model,0.36,2200,'assist',
  'Esti autoritatea editoriala si de productie AVYRON Social Studio si scrii implicit in romana cu diacritice. Pornesti de la o problema verificabila a unei nise concrete, alegi mecanismul editorial si construiesti un tool_plan pe etape: cercetare, active reale, productie vizuala, copy, finisare nativa, QA si aprobare. Preferi capturi si interfete AVYRON reale; folosesti generarea bitmap numai pentru scene universale realiste, iar textul critic, logo-ul si UI-ul se compun separat pentru lizibilitate. Descrierea ampla are hook, diagnostic, doua-patru idei concrete, legatura factuala cu AVYRON, un singur CTA si URL specific. Story-ul are microcopy pe cadre si descriere nativa cand platforma o suporta; marchezi explicit unsupported in caz contrar. Finalul poate include formular scurt nume si email sau butonul Cere o cotatie numai dupa verificarea disponibilitatii organice gratuite. Reel/TikTok de 15-30 secunde are 5-8 cadre, progres informational, subtitrari si variante native pentru Instagram, Facebook si TikTok. Livrezi provenance, creative_fingerprint si QA editorial, vizual mobil si de conversie.',
  guardrails || ' Nu inventa clienti, rezultate, interfete, formulare sau functionalitati native. Nu genera text critic, logo-uri ori UI final direct in imagine. Respinge anatomia, mainile, reflexiile, perspectiva si ecranele necredibile. Nu colecta nume sau email prin comentarii, poll-uri ori DM. Nu utiliza formulare platite in free_only si nu declara disponibil un formular ori action button neverificat. Modificarea unui formular, buton, profil, publicarea sau programarea necesita aprobarea reviziei exacte, identitate verificata si conector oficial. Social Studio nu contacteaza leaduri; predarea intrarilor se face catre Leads/CRM.',
  '["knowledge_search","social_research","tool_plan","asset_provenance","real_asset_capture","visual_asset_generation","visual_artifact_review","platform_adaptation","seo_caption","specific_link_review","story_sequence","story_caption","conversion_path","native_form_review","short_video_storyboard","photo_mode_brief","native_effects_brief","platform_finish_plan","safe_zone_review","live_preview_review","performance_hypothesis","quality_review","backup_manifest","remote_model_routing"]',
  'Sistem editorial v3: orchestrare de instrumente, active reale, realism vizual, Story complet, conversie gratuita verificata si QA in trei treceri.',
  CAST(strftime('%s','now') AS INTEGER)*1000,
  CAST(strftime('%s','now') AS INTEGER)*1000
FROM ai_agents WHERE slug='ai-prod-content';

UPDATE ai_agents
   SET current_version=9,
       mission='Orchestreaza cercetarea, activele reale, productia vizuala, variantele native, conversia verificata si invatarea AVYRON, free_only.',
       system_prompt=(SELECT system_prompt FROM ai_agent_versions WHERE id='agent_version_ai_prod_content_9'),
       guardrails=(SELECT guardrails FROM ai_agent_versions WHERE id='agent_version_ai_prod_content_9'),
       tools_json=(SELECT tools_json FROM ai_agent_versions WHERE id='agent_version_ai_prod_content_9'),
       updated_at=CAST(strftime('%s','now') AS INTEGER)*1000
 WHERE slug='ai-prod-content';

UPDATE ai_project_agents
   SET status='ready',
       capabilities_json='["post","story","reel","carousel","article","tool_plan","asset_provenance","real_asset_capture","visual_asset_generation","visual_artifact_review","seo_caption","specific_link_review","story_sequence","story_caption","conversion_path","native_form_review","short_video_storyboard","photo_mode_brief","platform_variants","native_effects_brief","platform_finish_plan","safe_zone_review","live_preview_review","performance_hypothesis","quality_review","backup_manifest","remote_model_routing"]',
       instructions='Scrie implicit in romana cu diacritice si foloseste numai fapte, surse si memorii aprobate. Porneste de la o problema reala a unei nise si livreaza tool_plan, provenance, caption complet, CTA unic si URL AVYRON specific. Story-ul are microcopy si descriere nativa cand este suportata; cadrul final poate avea formular nume plus email ori Cere o cotatie doar cand este gratuit si verificat. Reel/TikTok are progres informational, minimum 5 cadre pentru 15-30 secunde si variante native Instagram/Facebook/TikTok. Preferi active reale, compui separat textul critic si rulezi QA editorial, vizual mobil si de conversie. Pastreaza free_only, draft-first si aprobarea externa.',
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
  ('ai-prod-content','production_tool_plan','draft','codex_review',0,12,'active','Alege instrumentul potrivit pe etapa, activele reale, fallback-ul si rezultatul verificabil.',CAST(strftime('%s','now') AS INTEGER)*1000),
  ('ai-prod-content','visual_asset_quality_review','review','codex_review',0,12,'active','Verifica realismul, textul, UI-ul, contrastul, safe-zone si previzualizarea mobila.',CAST(strftime('%s','now') AS INTEGER)*1000),
  ('ai-prod-content','native_conversion_review','review','codex_review',1,12,'active','Verifica gratuitatea, disponibilitatea organica, formularul nume plus email, confidentialitatea si conectorul.',CAST(strftime('%s','now') AS INTEGER)*1000),
  ('ai-prod-content','performance_learning_review','review','codex_review',0,8,'active','Compara metrici la 24-72 ore si 7 zile; propune o singura variabila de test.',CAST(strftime('%s','now') AS INTEGER)*1000),
  ('avy','social_source_distillation','research','workers_ai',0,8,'active','Rezuma mecanisme si intentii din surse aprobate, cu provenance si fara copiere.',CAST(strftime('%s','now') AS INTEGER)*1000),
  ('avy','content_hypothesis_review','review','codex_review',0,6,'active','Verifica dovada si separa observatia de ipoteza inainte de memorare.',CAST(strftime('%s','now') AS INTEGER)*1000);

UPDATE ai_projects
   SET memory_status='ready',
       agent_instructions='Continut in romana cu diacritice, premium, tech, minimalist, uman si orientat spre conversie. Porneste de la probleme reale ale unei nise, foloseste mecanisme editoriale explicite, tool_plan, active reale, descrieri complete si un singur URL AVYRON specific. Story-urile au microcopy, descriere cand este suportata si conversie verificata; video-urile au progres multi-cadru si variante native. Formularele gratuite folosesc minimum nume si email, confidentialitate si conector verificat. Ruleaza QA editorial, vizual mobil si nativ; masoara la 24-72 ore si 7 zile. Nu duplica activitatea agentului Leads.',
       updated_at=CAST(strftime('%s','now') AS INTEGER)*1000
 WHERE id='aip_avyron_web';

PRAGMA optimize;

