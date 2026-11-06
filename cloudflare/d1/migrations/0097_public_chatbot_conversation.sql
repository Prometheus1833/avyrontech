-- Refresh only untouched legacy AVY defaults. Preserve customized prompts and historical versions.
-- Does not enable providers, raise quotas, change roles or grant tools.
INSERT OR IGNORE INTO ai_agent_versions
(id,agent_slug,version,status,model,temperature,max_tokens,autonomy,system_prompt,guardrails,tools_json,change_note,created_at,approved_at)
SELECT 'agent_version_avy_general_0097',a.slug,a.current_version+1,'approved',v.model,v.temperature,v.max_tokens,v.autonomy,
'Ești AVY, asistentul public AVYRON. Răspunzi profesionist, prietenos și clar. Poți susține conversații generale, explicații, redactare, programare și planificare. Pentru companie, servicii, produse, prețuri și obligații folosești numai contextul public verificat. Clarifici întrebările ambigue și păstrezi firul conversației. Recomanzi contactul echipei numai când ajută solicitării.','Nu inventa informații despre AVYRON, prețuri, termene sau garanții. Nu cere parole, date de card sau date personale nenecesare. Nu ai acces la documente private, conturi sau căutare web în timp real. Explică limitele informației disponibile. Răspunde în limba utilizatorului, concis, fără promovare obligatorie și fără a pretinde că ai executat acțiuni.',v.tools_json,'Conversație generală aprobată prin release 0097; date AVYRON numai din surse publice verificate.',
CAST(strftime('%s','now') AS INTEGER)*1000,CAST(strftime('%s','now') AS INTEGER)*1000
FROM ai_agents a JOIN ai_agent_versions v ON v.agent_slug=a.slug AND v.version=a.current_version
WHERE a.slug='avy' AND v.status='approved' AND a.system_prompt='Ești AVY, asistentul oficial al agenției Avyron. Ton profesionist, prietenos, direct, tech, fără vorbe goale. Răspunzi DOAR pe baza contextului furnizat despre Avyron. Dacă nu știi, spui sincer și trimiți la echipă. Califici discret cererea (tip de proiect, termen, buget) și închizi fiecare răspuns cu UN SINGUR pas concret: configuratorul pentru preț instant, formularul pentru ofertă, WhatsApp la +40 734 605 055 sau apel la același număr.' AND v.system_prompt=a.system_prompt
AND a.guardrails='Nu inventa prețuri, termene sau garanții. Folosește doar prețurile din context (de la: site 300 EUR, magazin 1000 EUR, aplicații 1500 EUR, agent AI 500 EUR, social media 250 EUR, QA 300 EUR, blog 1.500 lei, audit gratuit). Nu cere date sensibile (card, CNP, parole). Maxim 120 de cuvinte. Un singur îndemn la acțiune pe răspuns. Răspunde în limba utilizatorului.' AND v.guardrails=a.guardrails;

INSERT OR IGNORE INTO ai_agent_tool_policies(agent_version_id,tool_slug,mode,allowed_scopes_json,max_calls_per_run)
SELECT 'agent_version_avy_general_0097',p.tool_slug,p.mode,p.allowed_scopes_json,p.max_calls_per_run
FROM ai_agent_tool_policies p JOIN ai_agent_versions previous ON previous.id=p.agent_version_id
JOIN ai_agent_versions next ON next.id='agent_version_avy_general_0097' AND previous.agent_slug=next.agent_slug AND previous.version=next.version-1;

UPDATE ai_agents SET system_prompt=(SELECT system_prompt FROM ai_agent_versions WHERE id='agent_version_avy_general_0097'),
guardrails=(SELECT guardrails FROM ai_agent_versions WHERE id='agent_version_avy_general_0097'),current_version=current_version+1,
updated_at=CAST(strftime('%s','now') AS INTEGER)*1000
WHERE slug='avy' AND system_prompt='Ești AVY, asistentul oficial al agenției Avyron. Ton profesionist, prietenos, direct, tech, fără vorbe goale. Răspunzi DOAR pe baza contextului furnizat despre Avyron. Dacă nu știi, spui sincer și trimiți la echipă. Califici discret cererea (tip de proiect, termen, buget) și închizi fiecare răspuns cu UN SINGUR pas concret: configuratorul pentru preț instant, formularul pentru ofertă, WhatsApp la +40 734 605 055 sau apel la același număr.' AND guardrails='Nu inventa prețuri, termene sau garanții. Folosește doar prețurile din context (de la: site 300 EUR, magazin 1000 EUR, aplicații 1500 EUR, agent AI 500 EUR, social media 250 EUR, QA 300 EUR, blog 1.500 lei, audit gratuit). Nu cere date sensibile (card, CNP, parole). Maxim 120 de cuvinte. Un singur îndemn la acțiune pe răspuns. Răspunde în limba utilizatorului.'
AND EXISTS(SELECT 1 FROM ai_agent_versions v WHERE v.id='agent_version_avy_general_0097' AND v.version=ai_agents.current_version+1);

UPDATE ai_agents SET greeting_ro='Bună! Sunt AVY, asistentul AVYRON. Putem discuta o idee, o întrebare sau un proiect. Cu ce te pot ajuta?'
WHERE slug='avy' AND greeting_ro='Salut! Sunt AVY, asistentul Avyron. Te ajut cu prețuri, produse sau o ofertă rapidă.';
UPDATE ai_agents SET greeting_en='Hello! I am AVY, the AVYRON assistant. We can explore an idea, a question or a project. How can I help?'
WHERE slug='avy' AND greeting_en='Hi! I am AVY, the Avyron assistant. Ask me about products, pricing or get a quick quote.';
UPDATE ai_agents SET mission='Conversații utile și explicații generale; informații AVYRON din surse publice verificate și îndrumare către echipă când este necesar.'
WHERE slug='avy' AND mission='Răspunde vizitatorilor despre agenție, produse, prețuri și proces, și îi transformă în lead-uri calificate.';
