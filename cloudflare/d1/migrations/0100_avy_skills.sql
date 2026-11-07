-- Private reusable agency knowledge; business entities and auth remain native.
PRAGMA foreign_keys=ON;
CREATE TABLE avy_skills (
 slug TEXT PRIMARY KEY, name TEXT NOT NULL, summary TEXT NOT NULL,
 current_version INTEGER NOT NULL DEFAULT 1, published_version INTEGER NOT NULL DEFAULT 1,
 paused INTEGER NOT NULL DEFAULT 0 CHECK(paused IN(0,1)), revision INTEGER NOT NULL DEFAULT 1,
 updated_at INTEGER NOT NULL
);
CREATE TABLE avy_skill_versions (
 skill_slug TEXT NOT NULL REFERENCES avy_skills(slug), version INTEGER NOT NULL,
 instructions TEXT NOT NULL CHECK(length(instructions) BETWEEN 100 AND 14000),
 summary TEXT NOT NULL, created_by TEXT REFERENCES users(id), created_at INTEGER NOT NULL,
 PRIMARY KEY(skill_slug,version)
);
CREATE TRIGGER avy_skill_version_immutable BEFORE UPDATE ON avy_skill_versions BEGIN SELECT RAISE(ABORT,'skill_version_immutable'); END;
CREATE TRIGGER avy_skill_version_preserved BEFORE DELETE ON avy_skill_versions BEGIN SELECT RAISE(ABORT,'skill_version_preserved'); END;
CREATE TABLE avy_skill_resources (
 id TEXT PRIMARY KEY, skill_slug TEXT NOT NULL REFERENCES avy_skills(slug),
 title TEXT NOT NULL, domain TEXT NOT NULL DEFAULT 'general', body TEXT NOT NULL,
 source_url TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN('draft','approved','archived')),
 revision INTEGER NOT NULL DEFAULT 1, created_by TEXT REFERENCES users(id), approved_by TEXT REFERENCES users(id),
 object_key TEXT UNIQUE, file_name TEXT, content_type TEXT, size_bytes INTEGER NOT NULL DEFAULT 0 CHECK(size_bytes BETWEEN 0 AND 25000000),
 checksum TEXT, backup_key TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
);
CREATE INDEX avy_skill_resources_context ON avy_skill_resources(skill_slug,status,domain,created_at);
CREATE TABLE avy_skill_runs (
 id TEXT PRIMARY KEY, skill_slug TEXT NOT NULL, skill_version INTEGER NOT NULL,
 created_by TEXT NOT NULL REFERENCES users(id), project_id TEXT REFERENCES projects(id), lead_id TEXT REFERENCES leads(id),
 brief_json TEXT NOT NULL CHECK(json_valid(brief_json)), context_md TEXT NOT NULL,
 mode TEXT NOT NULL CHECK(mode IN('template','ai','image')), status TEXT NOT NULL DEFAULT 'queued' CHECK(status IN('queued','preparing','ready','approved','blocked','failed','archived')),
 output_md TEXT, preview_html TEXT, model TEXT, error_code TEXT,
 input_characters INTEGER NOT NULL DEFAULT 0, output_characters INTEGER NOT NULL DEFAULT 0,
 idempotency_key TEXT NOT NULL, request_hash TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 1,
 created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, started_at INTEGER, completed_at INTEGER,
 FOREIGN KEY(skill_slug,skill_version) REFERENCES avy_skill_versions(skill_slug,version),
 UNIQUE(created_by,idempotency_key), CHECK(project_id IS NULL OR lead_id IS NULL)
);
CREATE INDEX avy_skill_runs_queue ON avy_skill_runs(status,created_at);
CREATE INDEX avy_skill_runs_actor ON avy_skill_runs(created_by,skill_slug,created_at DESC);
CREATE TABLE avy_skill_generated_files (
 run_id TEXT PRIMARY KEY REFERENCES avy_skill_runs(id), object_key TEXT NOT NULL UNIQUE,
 mime_type TEXT NOT NULL CHECK(mime_type IN('image/png','image/jpeg','image/webp')),
 size_bytes INTEGER NOT NULL CHECK(size_bytes BETWEEN 1 AND 25000000), checksum TEXT NOT NULL,
 etag TEXT NOT NULL, object_version TEXT NOT NULL, backup_key TEXT, created_at INTEGER NOT NULL
);
CREATE TRIGGER avy_skill_generated_file_immutable BEFORE UPDATE ON avy_skill_generated_files
 BEGIN SELECT RAISE(ABORT,'skill_generated_file_immutable'); END;
CREATE TRIGGER avy_skill_generated_file_preserved BEFORE DELETE ON avy_skill_generated_files
 WHEN EXISTS(SELECT 1 FROM avy_skill_runs WHERE id=OLD.run_id AND status IN('ready','approved','archived'))
 BEGIN SELECT RAISE(ABORT,'skill_generated_file_preserved'); END;
CREATE TABLE avy_skill_events (
 id TEXT PRIMARY KEY, skill_slug TEXT NOT NULL REFERENCES avy_skills(slug), run_id TEXT REFERENCES avy_skill_runs(id),
 actor_id TEXT REFERENCES users(id), action TEXT NOT NULL, detail_json TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(detail_json)), created_at INTEGER NOT NULL
);
CREATE INDEX avy_skill_events_recent ON avy_skill_events(skill_slug,created_at DESC);
CREATE TRIGGER avy_skill_event_immutable BEFORE UPDATE ON avy_skill_events BEGIN SELECT RAISE(ABORT,'skill_event_immutable'); END;
CREATE TRIGGER avy_skill_run_result_immutable BEFORE UPDATE ON avy_skill_runs
 WHEN OLD.status IN('ready','approved','archived') AND (NEW.output_md IS NOT OLD.output_md OR NEW.preview_html IS NOT OLD.preview_html OR NEW.brief_json IS NOT OLD.brief_json OR NEW.context_md IS NOT OLD.context_md OR NEW.skill_version IS NOT OLD.skill_version)
 BEGIN SELECT RAISE(ABORT,'skill_result_immutable'); END;

INSERT INTO avy_skills(slug,name,summary,updated_at) VALUES('site-builder','Site Builder','Mockupuri vizuale și briefuri Codex adaptate domeniului, pornind din componente și lecții reutilizabile aprobate.',CAST(strftime('%s','now') AS INTEGER)*1000);
INSERT INTO avy_skill_versions(skill_slug,version,instructions,summary,created_at) VALUES('site-builder',1,'Folosește pentru un mockup vizual de website sau pentru pregătirea implementării unui site AVYRON pentru un client nou ori existent. Nu publica, nu trimite și nu activa furnizori din acest skill.

1. Brief minim: denumirea afacerii, activitatea și obiectivul. Preferințele vizuale sunt opționale. Proiectul sau leadul existent oferă context numai după autorizare. Nu cere CNP, parole sau date fiscale pentru un mockup.
2. Citește cel mult trei referințe aprobate potrivite domeniului; rezumă structura, nu copia marca, textele sau activele altui client. Datele comerciale private și briefurile nu devin automat cunoștințe comune.
3. Propune cel puțin cinci secțiuni utile: hero, servicii/beneficii, proces/diferențiatori, întrebări/contact și urmărește-ne. Adaptează structura nișei; fără testimoniale, prețuri, rezultate sau certificări inventate. Identifică explicit macheta drept concept, nu site final.
4. Upbar compact cu liquid glass progresiv, contrast solid ca fallback, logo lizibil, navigare simplă și user menu numai când există conturi reale. CTA principal clar; linkuri ancoră și tastatură funcționale. Pe mobil, meniul nu acoperă CTA-urile.
5. Hero cu fundal cinematic profund, lumină și compoziție specifice domeniului. Text vizibil imediat în HTML; fără așteptarea canvasului. Poster static de calitate maximă disponibilă; WebGL/3D numai când explică produsul. Nu reduce calitatea imaginii master pentru economie de tokens: economisește prin reutilizare, context scurt, cache și variante de livrare AVIF/WebP.
6. Landing compact, fără ecrane goale sau padding excesiv. Carduri cu hover și focus echivalente; mișcare redusă, scroll discret, fără scroll-jacking. Footer profund/cinematic, cu date reale și linkuri legale potrivite activității; nu pretinde conformitate juridică automată.
7. Trei acțiuni flotante: apel, WhatsApp și email, numai cu contacte validate. Pentru mockupul comercial, folosește explicit contactele AVYRON pentru discuția despre concept dacă lipsesc contactele beneficiarului. Mesajul WhatsApp și subiectul emailului includ denumirea proiectului, fără informații sensibile. Nu trimite mesaje automat.
8. Spre final: urmărește-ne cu Facebook, Instagram și TikTok, doar pentru URL-uri confirmate; altfel arată că lipsesc, fără linkuri fictive. Personalizează paleta, tipografia, fotografiile, iconografia și tonul pentru nișă, fără a transfera automat identitatea AVYRON.
9. Construcție: componente reutilizabile, HTML semantic, un H1, headinguri logice, contrast și focus vizibil, ținte tactile de minimum 44px. Desktop și 320/390/768px, fără overflow orizontal. Imagini responsive, dimensiuni rezervate, încărcare leneșă sub fold, fonturi limitate. Verifică reduced-motion și fallback fără WebGL.
10. SEO numai pe site-ul final autorizat: canonical, metadata/OG specifice, sitemap, robots și date structurate conforme cu textul vizibil. Mockupurile și informațiile private rămân noindex. Nu promite indexare sau trafic.
11. Înainte de livrare: verifică linkurile, formularul real sau starea neconfigurată, layoutul mobil, tastatura și conținutul factual. Păstrează snapshotul skillului și al brief-ului; aprobarea internă nu reprezintă publicare.

Economie: pornește din profilul de nișă și mockupul determinist fără AI; cere rafinare doar dacă ajută. Folosește modelul text primary din registrul AI Core existent și limitele sale. Modelele suplimentare sau imaginile plătite cer autorizare separată; nu activa overage. Output: plan de secțiuni, direcție vizuală, componente de reutilizat, instrucțiuni Codex și lista datelor lipsă.','Mockupuri vizuale și briefuri Codex adaptate domeniului, pornind din componente și lecții reutilizabile aprobate.',CAST(strftime('%s','now') AS INTEGER)*1000);

INSERT INTO avy_skills(slug,name,summary,updated_at) VALUES('logo-engine','Logo Engine','Brief de identitate, direcții vizuale și handoff pentru produsul Logo Studio, fără a schimba tarifele sau licențele.',CAST(strftime('%s','now') AS INTEGER)*1000);
INSERT INTO avy_skill_versions(skill_slug,version,instructions,summary,created_at) VALUES('logo-engine',1,'Folosește pentru pregătirea identității unui brand, pornind de la nume, activitate, public și preferințe. Nu confunda simulatorul 2D gratuit cu produsul Logo Studio 3D și livrarea asistată AI tarifată.
Pregătește un brief concis: utilizări principale, caracterul mărcii, simboluri de explorat/evitat, lizibilitate mică, culoare și monocrom. Propune trei direcții distincte; nu copia mărci ori portofolii ale altor clienți și nu pretinde unicitate juridică sau verificare de marcă.
Simularea monogramei este numai un reper de compoziție, nu logo original final. Livrarea finală trebuie verificată uman: contururi vectoriale curate, proporții, contrast, avatar, print și favicon. Pentru 3D, definește material, lumină, mișcare, fundal transparent și fallback static; nu adăuga 3D fără scop.
Reutilizează fluxurile existente de creare logo, catalog, achiziție, licență și aprobare. Nu produce drepturi de utilizare mai largi decât licența efectivă; nu modifica prețuri, nu trimite și nu publica automat.
Folosește primary din AI Core pentru structură și copy scurt. Pentru randări, păstrează calitatea master maximă permisă de furnizorul aprobat; economisește prin reutilizare și brief scurt. Dacă modelul sau bugetul nu permit operația, raportează starea blocată. Păstrează versiunea, brief-ul și observațiile de aprobare.','Brief de identitate, direcții vizuale și handoff pentru produsul Logo Studio, fără a schimba tarifele sau licențele.',CAST(strftime('%s','now') AS INTEGER)*1000);

INSERT INTO avy_skills(slug,name,summary,updated_at) VALUES('media-generate','Media Generate','Direcție de artă, prompturi și resurse vizuale reutilizabile, cu politici de calitate și cost transparente.',CAST(strftime('%s','now') AS INTEGER)*1000);
INSERT INTO avy_skill_versions(skill_slug,version,instructions,summary,created_at) VALUES('media-generate',1,'Folosește pentru briefuri de imagini, fundaluri cinematice, campanii și resurse vizuale. Cere numai afacerea/activitatea, scopul imaginii și preferințele relevante; nu prelua automat documente confidențiale în modele externe.
Definește subiectul, compoziția, perspectiva, iluminarea, materialele, profunzimea, spațiul pentru text, paleta, formatul și utilizarea. Prompturile trebuie adaptate nișei, fără afirmații factuale inventate, mărci copiate sau persoane prezentate fals drept clienți/angajați. Pentru hero rezervă o zonă calmă pentru heading și CTA.
Masterul vizual are calitate maximă disponibilă în planul aprobat; comprimarea AVIF/WebP este derivată pentru web, păstrând masterul. Nu reduce calitatea generării pentru a economisi tokens. Economisește prin reutilizarea activelor aprobate, context progresiv, planificarea variantelor și evitarea regenerărilor identice.
Modelele text medii din AI Core pregătesc structura; modelul image este utilizat numai când este configurat, autorizat și încadrat în buget. Niciun model plătit, overage sau serviciu nou nu se activează automat. Promptul pregătit nu înseamnă imagine generată.
Atașamentele folosesc R2 privat și poarta antivirus existente; fișierele neverificate nu se deschid și nu intră în contextul AI. Stochează titlu, nișă, proveniență, drepturi declarate și scopul reutilizării. Nu redistribui resurse cu licență necunoscută.
Verifică diacriticele/textul separat de imagine, contrastul, cropul desktop/mobil, proporțiile și absența detaliilor sensibile. Propunerile rămân interne până la aprobare; publicarea și distribuirea sunt acțiuni distincte.','Direcție de artă, prompturi și resurse vizuale reutilizabile, cu politici de calitate și cost transparente.',CAST(strftime('%s','now') AS INTEGER)*1000);
INSERT INTO avy_skill_resources(id,skill_slug,title,domain,body,status,created_at,updated_at) VALUES('skill_ref_general','site-builder','General / personalizat','general','Tipar din codul AVYRON: docs/VISUAL_TECHNIQUES.md. Structură: Servicii și beneficii → Cum lucrăm → Întrebări și contact. Reutilizează arhitectura și interacțiunile, nu identitatea sau afirmațiile proiectului original. Paleta este punct de pornire adaptabil, nu obligație. Fără copierea datelor clienților; verifică licențele activelor separat.','approved',CAST(strftime('%s','now') AS INTEGER)*1000,CAST(strftime('%s','now') AS INTEGER)*1000);
INSERT INTO avy_skill_resources(id,skill_slug,title,domain,body,status,created_at,updated_at) VALUES('skill_ref_beauty','site-builder','Beauty / wellness','beauty','Tipar din codul AVYRON: src/assets/example-flawlesstudio.jpg; src/components/site/mockups/index.tsx. Structură: Tratamente și servicii → Experiența ta → Programări și întrebări. Reutilizează arhitectura și interacțiunile, nu identitatea sau afirmațiile proiectului original. Paleta este punct de pornire adaptabil, nu obligație. Fără copierea datelor clienților; verifică licențele activelor separat.','approved',CAST(strftime('%s','now') AS INTEGER)*1000,CAST(strftime('%s','now') AS INTEGER)*1000);
INSERT INTO avy_skill_resources(id,skill_slug,title,domain,body,status,created_at,updated_at) VALUES('skill_ref_recycling','site-builder','Reciclare / economie circulară','recycling','Tipar din codul AVYRON: src/assets/example-retuvo.jpg; src/components/site/mockups/index.tsx. Structură: Soluții și utilizatori → Cum funcționează → Contact și implementare. Reutilizează arhitectura și interacțiunile, nu identitatea sau afirmațiile proiectului original. Paleta este punct de pornire adaptabil, nu obligație. Fără copierea datelor clienților; verifică licențele activelor separat.','approved',CAST(strftime('%s','now') AS INTEGER)*1000,CAST(strftime('%s','now') AS INTEGER)*1000);
INSERT INTO avy_skill_resources(id,skill_slug,title,domain,body,status,created_at,updated_at) VALUES('skill_ref_hospitality','site-builder','Turism / ospitalitate','hospitality','Tipar din codul AVYRON: src/examples/pensiuneacerbul.tsx. Structură: Experiențe și facilități → Sejurul tău → Disponibilitate și contact. Reutilizează arhitectura și interacțiunile, nu identitatea sau afirmațiile proiectului original. Paleta este punct de pornire adaptabil, nu obligație. Fără copierea datelor clienților; verifică licențele activelor separat.','approved',CAST(strftime('%s','now') AS INTEGER)*1000,CAST(strftime('%s','now') AS INTEGER)*1000);
INSERT INTO avy_skill_resources(id,skill_slug,title,domain,body,status,created_at,updated_at) VALUES('skill_ref_food','site-builder','Gastronomie / cofetărie','food','Tipar din codul AVYRON: src/examples/cofetariadulcedor.tsx. Structură: Colecții și specialități → De la idee la masă → Comenzi și întrebări. Reutilizează arhitectura și interacțiunile, nu identitatea sau afirmațiile proiectului original. Paleta este punct de pornire adaptabil, nu obligație. Fără copierea datelor clienților; verifică licențele activelor separat.','approved',CAST(strftime('%s','now') AS INTEGER)*1000,CAST(strftime('%s','now') AS INTEGER)*1000);
INSERT INTO avy_skill_resources(id,skill_slug,title,domain,body,status,created_at,updated_at) VALUES('skill_ref_design','site-builder','Design / arhitectură','design','Tipar din codul AVYRON: src/examples/studiomaradesign.tsx. Structură: Servicii și direcții → Proces și colaborare → Discută proiectul. Reutilizează arhitectura și interacțiunile, nu identitatea sau afirmațiile proiectului original. Paleta este punct de pornire adaptabil, nu obligație. Fără copierea datelor clienților; verifică licențele activelor separat.','approved',CAST(strftime('%s','now') AS INTEGER)*1000,CAST(strftime('%s','now') AS INTEGER)*1000);
