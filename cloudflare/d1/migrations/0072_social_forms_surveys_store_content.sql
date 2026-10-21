-- 0072_social_forms_surveys_store_content.sql
-- Extinde Social Studio cu formular post-Story, Smart Surveys, domenii universale,
-- modul editorial magazin online si specificatii de randare verificabile.

PRAGMA foreign_keys = ON;

ALTER TABLE ai_social_variants ADD COLUMN form_ux_json TEXT NOT NULL DEFAULT '{}'
  CHECK (json_valid(form_ux_json));
ALTER TABLE ai_social_variants ADD COLUMN survey_json TEXT NOT NULL DEFAULT '{}'
  CHECK (json_valid(survey_json));
ALTER TABLE ai_social_variants ADD COLUMN render_spec_json TEXT NOT NULL DEFAULT '{}'
  CHECK (json_valid(render_spec_json));
ALTER TABLE ai_social_variants ADD COLUMN universal_domain_json TEXT NOT NULL DEFAULT '{}'
  CHECK (json_valid(universal_domain_json));

UPDATE ai_social_design_profiles
   SET status='retired',updated_at=CAST(strftime('%s','now') AS INTEGER)*1000
 WHERE project_id='aip_avyron_web' AND status='approved';

INSERT INTO ai_social_design_profiles
  (id,project_id,version,status,profile_json,source_sha256,created_at,approved_at,updated_at)
SELECT 'asdp_avyron_web_7',id,7,'approved',
  '{"schemaVersion":7,"tone":["premium","tech","minimalist","clar","uman","profesionist","orientat_spre_conversii"],"contentSystem":{"sourceQuestionRequired":true,"editorialMechanisms":["information_gap","self_reference","proof_story","immediate_value"],"story":{"defaultFrameCount":3,"sequence":["recognition","mechanism_or_proof","action_or_conversion"],"microcopyRequiredPerFrame":true,"storyCaptionRequiredWhenSupported":true,"finalConversionFrame":{"optional":true,"cta":"Cere o cotație","fields":["name","email"],"actualFormOpensAfterTap":true,"fakeInteractiveFieldsForbidden":true}},"serviceModules":{"professionalWebsite":{"targetUrl":"https://avyron.ro/servicii/website-prezentare-profesional"},"onlineStore":{"targetUrl":"https://avyron.ro/servicii/magazin-online","problemFamilies":["descoperirea_produsului","variante","stoc_si_livrare","retur","filtre","cos_si_checkout","confirmarea_comenzii"],"defaultCta":"Evaluează magazinul"}},"shortVideo":{"hookWindowSeconds":[0,2],"framesFor15To30Seconds":[5,8],"framesFor30To45Seconds":[7,12],"singleStaticImageVideoForbidden":true,"nativeVariants":["instagram_reel","facebook_reel","tiktok"]},"production":{"realAssetsFirst":true,"criticalTextGeneratedInImage":false,"preferredMasterPortrait":{"width":2160,"height":3840},"allow8kStillMasterOnlyWhenSourceSupports":true,"forbidSyntheticUpscaleClaim":true,"nativeStoryExport":{"width":1080,"height":1920},"threePassQa":["editorial_factual","visual_mobile","native_conversion"]},"conversion":{"freeOnly":true,"modes":["native_organic_form","verified_hosted_form","link_sticker","action_button"],"formFields":["name","email"],"formStatuses":["form_candidate","form_unverified","ready","unsupported","awaiting_connection"],"formUx":{"persistentLabels":true,"minimumTouchTargetPx":44,"correctInputTypesAndAutocomplete":true,"errorsAfterInteraction":true,"loadingAndSuccessStates":true,"doubleSubmitProtection":true,"readBackTestRequired":true},"survey":{"publicRoot":"https://surveys.avyron.ro/","eligibleIntents":["diagnostic","brief","service_selection","self_assessment"],"questionRange":[3,5],"exactPublicRouteAndSubmissionTestRequired":true},"universalDomains":{"allowedPatterns":["*.test","example.com","example.org"],"illustrativeOnly":true,"neverConversionDestination":true},"noLeadDataInCommentsPollsOrDm":true},"learning":{"reviewWindowsHours":[24,72,168],"singleVariableTests":["hook","frame_count","cta","cover","duration","time"],"minimumComparablePosts":2}},"links":{"specificTargets":{"professionalWebsite":"https://avyron.ro/servicii/website-prezentare-profesional","onlineStore":"https://avyron.ro/servicii/magazin-online","surveys":"https://surveys.avyron.ro/"},"maximumVisibleLinks":1,"forbidExampleUrls":true,"forbidExternalConversionUrls":true},"quality":{"minimumScore":90,"liveMobilePreviewRequired":true,"checks":["brand_fit","clarity","service_offer_visible","mobile_legibility","safe_zones","native_adaptation","story_microcopy","story_caption","video_progression","specific_target_url","cta","form_verification","form_ux","survey_route","universal_domain_truthfulness","render_spec","source_resolution","asset_provenance","visual_artifacts","accessibility","truthfulness","originality"]},"freeOnly":true,"storagePolicy":"metadata_only"}',
  'e2cc7053ac745bde843c3a4f66ac95a35932944267651287175206168dbe16ce',
  CAST(strftime('%s','now') AS INTEGER)*1000,
  CAST(strftime('%s','now') AS INTEGER)*1000,
  CAST(strftime('%s','now') AS INTEGER)*1000
FROM ai_projects WHERE id='aip_avyron_web';

INSERT OR IGNORE INTO ai_project_memories
  (id,project_id,kind,summary,source_url,source_hash,confidence,status,observed_at,expires_at,approved_at,created_at)
VALUES
  ('aipm_avyron_social_form_ux_v1','aip_avyron_web','learning',
   'Un Story organic free_only nu simuleaza formularul unei reclame sponsorizate. Cadrul final formuleaza promisiunea si CTA-ul, iar formularul real nume plus email se deschide dupa tap prin ruta AVYRON ori functia nativa verificata. Formularul foloseste label-uri persistente, validare dupa interactiune, stari loading/success, confidentialitate, protectie la dublu submit si test de persistenta/citire.',
   'https://surveys.avyron.ro/','e2cc7053ac745bde843c3a4f66ac95a35932944267651287175206168dbe16ce',0.98,'approved',
   CAST(strftime('%s','now') AS INTEGER)*1000,CAST(strftime('%s','now','+365 days') AS INTEGER)*1000,CAST(strftime('%s','now') AS INTEGER)*1000,CAST(strftime('%s','now') AS INTEGER)*1000),
  ('aipm_avyron_online_store_editorial_v1','aip_avyron_web','learning',
   'Continutul despre magazin online porneste de la o problema reala a unei nise: descoperirea produsului, variante, filtre, stoc si livrare, retur, cos si checkout, confirmare ori operatiuni fragmentate. Demonstreaza situatia prin cadre mobile/desktop si nu inventeaza clienti, conversii, integrari, metode de plata sau stoc.',
   'https://avyron.ro/servicii/magazin-online','online-store-editorial-v1',0.96,'approved',
   CAST(strftime('%s','now') AS INTEGER)*1000,CAST(strftime('%s','now','+365 days') AS INTEGER)*1000,CAST(strftime('%s','now') AS INTEGER)*1000,CAST(strftime('%s','now') AS INTEGER)*1000);

INSERT OR IGNORE INTO ai_agent_versions
  (id,agent_slug,version,status,model,temperature,max_tokens,autonomy,system_prompt,
   guardrails,tools_json,change_note,created_at,approved_at)
SELECT 'agent_version_ai_prod_content_10',slug,10,'approved',model,0.34,2400,'assist',
  'Esti autoritatea editoriala si de productie AVYRON Social Studio si scrii implicit in romana cu diacritice. Pornesti de la o problema verificabila a unei nise concrete si alegi serviciul relevant, inclusiv magazin online. Construiesti tool_plan, provenance si variante native. Story-ul are microcopy, descriere cand este suportata si poate avea un ultim cadru cu CTA; formularul real nume plus email se deschide dupa tap, foloseste UX accesibil si trebuie testat pana la persistenta/citire. Smart Surveys se foloseste numai pentru diagnostic, brief, selectie de serviciu sau autoevaluare, pe ruta publica exacta verificata. Domeniile .test ori example.com sunt strict ilustrative. Pentru imagine/video preferi active reale si master 4K autentic cand sursa il permite; 8K este optional pentru cadre statice utile, niciodata un upscale etichetat fals. Reel/TikTok de 15-30 secunde are 5-8 cadre distincte, nu o singura imagine animata. Livrezi caption complet, un CTA, URL AVYRON specific, render_spec si QA editorial, vizual mobil si de conversie.',
  guardrails || ' Nu inventa clienti, rezultate, interfete, domenii publicate, formulare, integrari, metode de plata ori functionalitati native. Nu desena inputuri false in asset si nu confunda un formular sponsorizat cu o functie organica gratuita. Nu numi 4K/8K un upscale al unei surse slabe. Nu colecta nume sau email prin comentarii, poll-uri ori DM. Nu activa formulare, Surveys, butoane, profiluri, publicari ori programari fara aprobarea reviziei exacte, identitate verificata si conector oficial. Social Studio nu contacteaza leaduri.',
  '["knowledge_search","social_research","tool_plan","asset_provenance","real_asset_capture","visual_asset_generation","visual_artifact_review","platform_adaptation","seo_caption","specific_link_review","story_sequence","story_caption","conversion_path","native_form_review","post_story_form_plan","form_ux_review","survey_route_review","universal_domain_review","online_store_content_brief","render_spec","short_video_storyboard","photo_mode_brief","native_effects_brief","platform_finish_plan","safe_zone_review","live_preview_review","performance_hypothesis","quality_review","backup_manifest","remote_model_routing"]',
  'Sistem editorial v4: formulare post-Story accesibile, Smart Surveys verificat, domenii universale sigure, magazin online si mastere 4K/8K reale cu export nativ.',
  CAST(strftime('%s','now') AS INTEGER)*1000,
  CAST(strftime('%s','now') AS INTEGER)*1000
FROM ai_agents WHERE slug='ai-prod-content';

UPDATE ai_agents
   SET current_version=10,
       mission='Orchestreaza continut AVYRON specific nisei, formulare post-Story, Smart Surveys, magazin online, productie vizuala premium si invatare, free_only.',
       system_prompt=(SELECT system_prompt FROM ai_agent_versions WHERE id='agent_version_ai_prod_content_10'),
       guardrails=(SELECT guardrails FROM ai_agent_versions WHERE id='agent_version_ai_prod_content_10'),
       tools_json=(SELECT tools_json FROM ai_agent_versions WHERE id='agent_version_ai_prod_content_10'),
       updated_at=CAST(strftime('%s','now') AS INTEGER)*1000
 WHERE slug='ai-prod-content';

UPDATE ai_project_agents
   SET status='ready',
       capabilities_json='["post","story","reel","carousel","article","tool_plan","asset_provenance","real_asset_capture","visual_asset_generation","visual_artifact_review","seo_caption","specific_link_review","story_sequence","story_caption","conversion_path","native_form_review","post_story_form_plan","form_ux_review","survey_route_review","universal_domain_review","online_store_content_brief","render_spec","short_video_storyboard","photo_mode_brief","platform_variants","native_effects_brief","platform_finish_plan","safe_zone_review","live_preview_review","performance_hypothesis","quality_review","backup_manifest","remote_model_routing"]',
       instructions='Scrie in romana cu diacritice si porneste de la o problema reala a unei nise. Rotește serviciul de website si magazin online, cu CTA si URL exact. Story-ul are microcopy, descriere si formular real dupa tap numai daca ruta este verificata; Smart Surveys este eligibil numai pentru diagnostic/brief/autoevaluare. Domeniile universale sunt doar ilustrative. Produce master 4K real cand sursa permite, 8K numai justificat, apoi export nativ. Pastreaza free_only, draft-first, QA complet si aprobarea externa.',
       updated_at=CAST(strftime('%s','now') AS INTEGER)*1000
 WHERE project_id='aip_avyron_web' AND agent_slug='ai-prod-content' AND role='content';

INSERT OR REPLACE INTO agent_execution_routes
  (agent_slug,task_key,action_class,executor,requires_approval,max_daily_runs,status,notes,updated_at)
VALUES
  ('ai-prod-content','post_story_form_plan','draft','workers_ai',0,12,'active','Planifica promisiunea, CTA-ul si ruta reala a formularului dupa tap, fara inputuri false in asset.',CAST(strftime('%s','now') AS INTEGER)*1000),
  ('ai-prod-content','form_ux_review','review','codex_review',1,12,'active','Verifica label-uri, input/autocomplete, validare, loading/success, confidentialitate, submit, persistenta si citire.',CAST(strftime('%s','now') AS INTEGER)*1000),
  ('ai-prod-content','survey_route_review','review','codex_review',1,8,'active','Permite Smart Surveys numai cu intentie eligibila, ruta publica exacta si test de trimitere.',CAST(strftime('%s','now') AS INTEGER)*1000),
  ('ai-prod-content','online_store_content_brief','draft','workers_ai',0,8,'active','Construieste continut de nisa despre descoperire produs, stoc/livrare, filtre, checkout ori operatiuni, fara rezultate inventate.',CAST(strftime('%s','now') AS INTEGER)*1000),
  ('ai-prod-content','render_spec_review','review','codex_review',0,12,'active','Verifica rezolutia sursei/masterului, 4K/8K real, downsample, export nativ, compresie si artefacte.',CAST(strftime('%s','now') AS INTEGER)*1000);

UPDATE ai_projects
   SET memory_status='ready',
       agent_instructions='Continut AVYRON in romana, premium, tech, minimalist, uman si specific unei nise. Rotește website de prezentare si magazin online; trateaza o singura problema reala si un avantaj demonstrabil. Story-urile au microcopy, descriere si, cand conversia o cere, un ultim cadru care deschide dupa tap un formular AVYRON accesibil si verificat. Smart Surveys se foloseste numai pentru diagnostic/brief/autoevaluare. Domeniile .test/example.com sunt strict ilustrative. Masterele 4K/8K trebuie sa fie reale si urmate de export nativ. Salveaza tool_plan, provenance, form_ux, survey, universal_domain, render_spec si QA; nu duplica agentul Leads.',
       updated_at=CAST(strftime('%s','now') AS INTEGER)*1000
 WHERE id='aip_avyron_web';

PRAGMA optimize;
