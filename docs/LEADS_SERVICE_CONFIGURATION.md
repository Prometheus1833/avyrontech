# Leaduri și configurarea serviciilor

Implementare locală, 5 noiembrie 2026, pe `codex/leads-services-config-2026-11-05`. Punctul de plecare este commitul local `01c12f3`, care păstrează lucrările Social Media/AVY Core; baza GitHub verificată este `631a127`. Push, PR, migrarea remote și deployul sunt amânate prin instrucțiunea utilizatorului până la încheierea taskurilor. Nu au fost editate conturi, leaduri sau pagini în producție.

## Leaduri

Navigarea internă și scurtăturile folosesc numele „Leaduri”. Dialogul este „Elimină lead-ul”, fără adaosul „din pipeline”. Eliminarea rămâne recuperabilă: fișa și autorul/motivul operației se păstrează, iar leadul nu mai apare în listele active.

Motive comerciale noi: „S-a răzgândit”, „Nu dorește să plătească”, „Nu îndeplinește condițiile”. Alegerea rămâne umană; o stare de respingere nu este interpretată automat drept cauză a închiderii. Motivele istorice rămân disponibile. Migrarea aditivă `0080_lead_commercial_removal_reasons.sql` adaugă `deletion_reason_key`, deoarece coloana veche are un CHECK pe cele șapte coduri istorice. Pentru motivele noi, cititorii vechi primesc `other`; API-ul/jurnalul actual citesc cheia exactă, iar evenimentul de audit păstrează motivul complet. Nu se reconstruiește și nu se șterge tabela `leads`.

Pipeline-ul are etape filtrabile, afișare implicită a leadurilor în lucru, acces separat la etapele finalizate, ordonare după urgență/revenire sau dată, reveniri depășite și următorul pas comercial. Cardurile nu impun o bandă de 1.320 px; pe mobil se așază pe o coloană. Conversia în proiect folosește în continuare fluxul existent din fișă.

## Servicii

- `/profil?tab=servicii-avyron` și `/intern/servicii`: titlul „Servicii”, mini-listă de pagini și lista completă cu textele prezentării comune.
- `service=overview`: configurarea paginii publice „Toate serviciile”, inclusiv prezentarea cardurilor și textele comune.
- `service=<cheia existentă>`: pagina proprie de configurare a serviciului. Cele 11 chei sunt cele existente în catalog/publicare: website, magazin, aplicații, AI, SEO, Ads, logo, blog, identitate socială, QA și audit.
- `serviceGroup=...`: acces direct la prezentarea unui card, din lista comună.

Auditul este o secțiune în pagina serviciilor, cu formularul existent; nu se inventează o pagină publică de audit separată. Rutele celorlalte pagini sunt preluate din `serviceRoutes.ts`. Această listă este un registru al paginilor configurabile, nu un catalog comercial paralel.

Editorul oferă grupuri de conținut, limbă RO/EN, căutare, câmpuri text normale, revenire la original pe câmp, indicii SEO, ciornă, previzualizare reală desktop/mobil, istoric și pregătirea restaurării. Configurarea comună și cea individuală sunt independente: modificarea titlului unui card din `/servicii` nu rescrie pagina detaliată. Setările comerciale și configuratorul existent sunt accesibile din pagina serviciului.

Sursele originale au fost extrase în module de date, păstrând textele și designul public implicit. `serviceContentRegistry.ts` proiectează câmpurile efectiv utilizate; `serviceContentManifest.json` este generat și verificabil prin `npm run service-content:check`. Sunt configurabile textele comerciale, etichetele, metadatele SEO, beneficiile, livrabilele, procesul, întrebările și conținutul specific paginilor. Identificatorii, rutele, codul, stilurile, iconurile, prețurile și SKU-urile nu sunt câmpuri text editabile. Nu se oferă editare arbitrară HTML/JavaScript. Prețurile și achizițiile păstrează mecanismele comerciale originale.

## Persistență, publicare și securitate

Migrarea `0079_service_page_configuration.sql` folosește D1 existent:

- `service_page_configs`: ciorna curentă, revizia și referința la versiunea publicată.
- `service_page_versions`: copii istorice nemodificabile, cu autor și dată; trigger-ele resping UPDATE/DELETE.
- `idempotency_keys` și `security_events` existente: retry și audit în aceeași tranzacție cu salvarea.

Scrierile cer un principal de platformă autorizat și politica MFA existentă. Stafful poate consulta, dar nu primește automat dreptul de salvare/publicare; clienții nu accesează API-ul privat. Payloadul este limitat la 128 KiB, câmpurile sunt validate față de manifest, iar scrierile sunt limitate. O revizie veche produce 409 și rollback, fără pierderea textului din editor. Cache-ul previzualizărilor este separat pe identitatea utilizatorului; la pierderea rolului sau la o verificare de acces respinsă, conținutul privat nu rămâne afișat din cache.

Publicarea cere confirmarea unei versiuni salvate; nu publică o ciornă nesalvată. Repetarea aceleiași publicări este idempotentă. API-ul public returnează numai câmpurile versiunii publicate, fără ciorne, autori sau istoric. API-urile private folosesc `private, no-store`. Previzualizarea are noindex, acces autentificat, un banner explicit, fără widgeturi globale/analytics; scrierile prin clientul autentificat sunt oprite în această stare.

Modificările nesalvate se salvează în ciornă înaintea navigării interne, când există acces și salvarea reușește. La conflict navigarea este blocată și textul rămâne disponibil. O copie temporară în memoria aplicației, separată pe utilizator/pagină/revizie, permite recuperarea la revenirea în cadrul sesiunii. Închiderea filei cu modificări nesalvate folosește avertizarea browserului; această memorie temporară nu este backup și nu înlocuiește salvarea server-side.

API-uri:

- `GET /api/public/service-pages/:key`: numai versiunea publicată, ETag și revalidare.
- `GET /api/admin/service-pages/:key`: configurare și ultimele 30 de versiuni.
- `GET /api/admin/service-pages/:key/versions/:revision`: versiune privată autorizată.
- `PUT /api/admin/service-pages/:key`: ciornă cu revizie și cheie de idempotență.
- `POST /api/admin/service-pages/:key/publish`: confirmarea publicării reviziei exacte.

## Prerandare și lansare ulterioară

În aplicație, textele publicate se citesc din endpointul public; la publicare se invalidează cache-ul local și filele conectate prin BroadcastChannel. Cererile sunt deduplicate per pagină. Conținutul original rămâne fallback la indisponibilitatea serviciului.

`npm run build` preia înaintea compilării un snapshot **public**, fără credențiale, prin `service-content:snapshot`. Snapshotul conține numai versiuni publicate și alimentează prerandarea; niciun draft nu este introdus în HTML-ul static. Endpointuri inexistente la prima instalare folosesc sursele originale, dar un snapshot deja cunoscut nu este înlocuit silențios dacă citirea lui eșuează. `SERVICE_CONTENT_SNAPSHOT_SKIP=1` este o opțiune explicită pentru lucru offline, nu pentru verificarea unui release. La o publicare ulterioară din OS, varianta statică pentru SEO se actualizează la următorul build/deploy; această acțiune nu declanșează automat o lansare Cloudflare și nu dovedește indexarea Google.

Metadatele și istoricul intră în backupul D1 existent. Nu se introduc fișiere R2, bucketuri publice, furnizori sau abonamente noi. Nu se transmit texte către AI. Migrarea este aditivă și se lansează numai prin fluxul aprobat, după backup și verificările de integritate/FK. Revenirea codului nu justifică ștergerea versiunilor ori a coloanelor noi.

## Verificări

Testele runtime execută handler-ele reale și toate migrațiile SQLite: public/privat, roluri, MFA, retry, CAS, rollback al auditului, istoric nemodificabil, publicare exactă și motivele noi de eliminare. Testele de snapshot verifică lipsa credențialelor și respingerea câmpurilor necunoscute. Testele de cache verifică deconectarea, schimbarea contului/rolului și o verificare de acces respinsă.

Testele browser verifică numele, pipeline-ul, motivele, mini-lista, configurările, editarea, previzualizarea, publicarea confirmată, RO/EN, izolarea listei comune, staff read-only, conflicte, toate paginile și lățimile 320/390 px. API-urile sunt simulate în aceste teste; verificarea separată în Worker/D1 local folosește handler-ele și baza reale, cu date sintetice. Niciuna nu reprezintă o verificare în contul de producție.

Verificări încheiate pe codul curent:

- Vitest: 82 fișiere, 648 teste trecute; benchmarkul opțional de limite publice este omis deoarece `AVYRON_BENCH_PUBLIC_LIMITS` nu este activat.
- Manifest: 12 pagini, 3.094 câmpuri; generarea corespunde surselor.
- Build standalone Worker și Pages, cu build static/prerandare și audit SEO: trecute. Testul homepage confirmă păstrarea celor două preîncărcări critice originale.
- TypeScript aplicație/Worker, integritatea schemei D1 și build API dry-run: trecute; fără deploy sau migrare remote.
- ESLint: zero erori, patru avertismente React Refresh existente în componentele Logo.
- Worker/D1 local, cu autentificarea existentă și date sintetice: salvarea și previzualizarea reviziei 1; API public fără ciornă înainte de publicare; client neautorizat 403; publicare exactă; retry fără versiuni duplicate; un singur istoric păstrat. Snapshotul citit din API-ul local include numai versiunea publicată. Datele sintetice nu au fost introduse în snapshotul urmărit în Git.
- Browser: suita completă de 128 de scenarii a avut 127 trecute și un timeout în testul previzualizării, care aștepta doar 5 secunde încărcarea cadrului și animația publică existentă. După corectarea așteptării și a selectorului bannerului, toate cele 9 scenarii Leaduri/Servicii au trecut la reverificare (38,3 secunde). Codul aplicației nu a fost schimbat între aceste două rulări. Toate cele 128 de scenarii distincte au astfel verificări trecute; suita completă nu a fost repetată după această corecție exclusiv de test.

Capturi sintetice actuale: [pipeline](qa/leads-services-2026-11-05/leads-pipeline.png), [editor](qa/leads-services-2026-11-05/service-editor.png), [previzualizare](qa/leads-services-2026-11-05/service-preview.png), [320 px](qa/leads-services-2026-11-05/service-mobile-320.png), [390 px](qa/leads-services-2026-11-05/service-mobile-390.png).

Migrațiile 0079/0080 au fost aplicate numai în D1 local de test. Verificarea în conturile reale și aplicarea în producție rămân pentru lansarea autorizată la încheierea taskurilor.
