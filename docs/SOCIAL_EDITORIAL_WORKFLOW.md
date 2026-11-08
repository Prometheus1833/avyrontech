# Manager Social Media — flux editorial

Bază: `01acfb909a7026731f2542f17da00bb3391f99a3`. Taskul nu modifică proiectul cabinetului, autentificarea, modelele sau cotele gratuite.

## Audit și cauze

Auditul D1 din 07.11.2026 a găsit zero `ai_content_items` și zero `ai_social_assets` pentru `aip_avyron_web`, dar 396 de joburi: 274 analize fără artefact, 104 pregătiri eșuate, 17 resurse indisponibile și o pregătire în curs. În acea citire, agentul social era activ, v11, pe Mistral Small, cu asociere operator activă. Aceste valori sunt un snapshot, nu monitorizare live.

Pachetele reale Codex au rămas locale, fără handoff în OS. Managerul filtra numai materiale, iar limita de 60 de joburi lua cele mai vechi activități. Planificatorul crea activități numai după ora vizată. Curățarea editorială ștergea ciornele după trei zile, inclusiv surse potențial reutilizabile. Erorile din pregătirea contextului sau rezervarea financiară se produceau în afara blocului `try`, putând lăsa jobul `generating` până la expirarea lease-ului. Reproducerea pe o copie privată a backupului a confirmat o eroare FOREIGN KEY: rezervarea folosea ID-ul ai_projects în financial_usage_events.project_id, care referă projects. 0105 adaugă ai_project_id separat, iar rezervarea/replay-ul păstrează namespace-ul explicit. Câmpul CRM existent și toate limitele rămân neschimbate.

## Experiență și evidență

Managerul afișează imediat **Acum · 24h**: ultimele 24 de ore și următoarele 24. **Viitoare**, **Reutilizabile** și **Istoric** separă scopurile; nu duplică înregistrările. Căutarea și starea editorială se aplică proiectului autorizat. Temele fără material sunt identificate explicit și nu sunt prezentate drept ciorne aprobabile.

Materialul poate fi introdus manual ori importat ca pachet JSON, editat, trimis la aprobare, aprobat sau respins. Editarea redeschide ciorna, invalidează decizia versiunii vechi și folosește `updated_at` ca CAS. Materialul aprobat/programat/publicat nu este editat în loc. Reutilizarea creează o ciornă nouă, fără aprobare moștenită, care referă fișierele existente în același proiect.

0105 este aditivă: proveniență și revizie de sursă, păstrare explicită `reusable`, legătură `reused_from_id`, arhivare logică și strategie în politica existentă. Joburile trecute ies din lista activă fără pierderea auditului. Sursele marcate reutilizabile sunt exceptate de la curățarea temporară de trei zile; aceasta rămâne valabilă pentru ciornele temporare obișnuite. Activele partajate nu sunt șterse când dispare o instanță temporară.

Planificarea și pregătirea ciornelor acoperă fereastra -24h/+24h înaintea orei scadente, idempotent pe cheia de calendar, inclusiv la schimbarea fusului de vară/iarnă. Pregătirea caută mai întâi o sursă reutilizabilă potrivită serviciului și formatului; nu consumă AI pentru copiere și nu aprobă automat. Resursele indisponibile și limitele AI Core rămân blocaje explicite, fără bugete resetate sau servicii plătite activate.

## Handoff și aprobare Codex

- `GET /api/ai-projects/avyron-web/social-manager?view=focus|upcoming|library|history&status=...&q=...`
- `POST /api/ai-projects/PROJECT/social-manager/drafts`: pachet validat, `Idempotency-Key` stabilă; numai draft/pending approval. Un pachet care a trecut QA folosește `requestApproval: true`, pentru ca operatorul să poată cere decizia umană asupra materialului real.
- `PUT /api/ai-projects/PROJECT/social-manager/drafts/CONTENT`: editare cu revizia așteptată.
- `POST .../drafts/CONTENT/reuse`: instanță nouă, cheie idempotentă.
- `PATCH /api/ai-projects/PROJECT/content/CONTENT`: traseul nativ comun de decizie; `expectedUpdatedAt`, `origin=dashboard|codex_chat`, `approvalReference` către mesajul uman exact.
- `POST /api/ai-projects/PROJECT/social-jobs/JOB/reschedule`: schimbare dată, resetarea aprobării planului, CAS.
- `POST .../social-manager/sync` și `.../archive`: reconciliere/curățare fără publicare ori inferență.
- `GET .../social-assets/ASSET`: membru autorizat al proiectului, fișier intern înregistrat, R2 privat, no-store/noindex. Uploadurile externe continuă să folosească verificările antivirus native; o cerere client nu poate înregistra un fișier ca generare internă.

`scripts/social-editorial-operator.mjs` este client pentru aceste API-uri, nu sistem de autentificare separat. Utilizează o sesiune nativă temporară din mediul securizat `AVYRON_ACCESS_TOKEN`, niciodată token în chat sau fișier de proiect. Operatorul editor poate importa; aprobarea cere sesiunea unui reviewer nativ autorizat și politica MFA existentă. Dacă această sesiune nu este disponibilă, mesajul de aprobare rămâne dovadă în chat, iar sincronizarea se marchează în așteptare. Nu se revendică o aprobare persistată înaintea unui răspuns și a citirii înapoi.

`scripts/import-social-package.mjs` este un instrument privilegiat de mentenanță, cu identitatea Cloudflare existentă. Implicit face doar dry-run. `--apply --upload-assets` importă un pachet intern cu checksum verificat, prin operatorul social nativ existent, numai în proiectul AVYRON WEB. Sursele externe sunt refuzate. Încarcă exporturi native în FILES privat și creează materialul în așteptarea aprobării; nu publică și nu aprobă. Pachetele private și fișierele locale nu se comit în Git. Acest instrument este compatibil și cu schema de dinainte de 0105; proveniența se păstrează în eveniment și este preluată de migrare.

La pregătirea acestei livrări, scrierea obiectelor R2 cu identitatea disponibilă a răspuns **403 / Authentication error**. Au fost importate șase materiale prin `--apply --metadata-only`, cu `assetState=awaiting_r2_authorization`, manifeste și checksumuri, fără a declara imaginile încărcate. Cele 14 exporturi native rămân în pachetele locale originale. După restabilirea autorizării R2, reluați aceleași pachete cu `--apply --upload-assets`; scriptul păstrează identitatea sursei, verifică starea editabilă și înregistrează sincronizarea. Verificați apoi descărcarea privată și numărul real de active înaintea aprobării finale/publicării. Nu aplicați autorizare generală sau bucket public pentru a ocoli blocajul.

## Strategia începând cu 07.11.2026

O temă utilă pe zi, cu resurse reale reutilizate prioritar. Rotație: website și conversii; magazin și operațiuni; aplicații/automatizare; identitate/social; QA/mentenanță. Story numai când ajută tema, cu numărul de cadre justificat; Reel la trei zile numai când există video real; articol vineri la 16:00. Orele sunt ipoteze editoriale, nu rezultate validate de Insights.

Pentru fiecare revizie: problemă concretă → demonstrație/dovadă → serviciul potrivit → un CTA → variante native → QA → aprobare. Măsurare la 24–72h și 7 zile: accesări ale destinației, salvări, conversații relevante, solicitări confirmate. Lipsa metricilor este necunoscută, nu zero. Fără promisiuni de trafic sau clienți inventați.

Automatizările Codex existente sunt actualizate fără programe noi: aceeași evidență ID/revizie, reutilizare, sesiune browser ocupată numai de o operațiune efectiv în curs și închiderea taburilor proprii după rulare. Un composer sau o revizie veche nu suspendă zilele următoare. Codex local nu rulează cu Macul închis; Workers pregătește numai etapele permise de infrastructura și bugetele existente.

Publicarea/programarea necesită revizie, cont și placement aprobate explicit și dovadă live. Aprobarea editorială și un conector etichetat «connected» nu dovedesc o publicare. Nu se reproduc feedurile R1 publicate din revizia R2 fără o decizie distinctă de înlocuire.

## Lansare

Verifică testele SQL/API, autorizarea între proiecte și scenariile desktop/Android/WebKit. Fă backup și aplică 0105 înaintea codului nou, prin fluxul existent de release. Verifică separat datele importate, agentul versionat, bundle-ul live și stările furnizorilor. Pregătit local, PR, migrare și deploy sunt stări distincte; raportul din PR consemnează dovezile efective.
