# Logo Studio 3D, mentenanță și documente — 8 noiembrie 2026

Bază: `01acfb909a7026731f2542f17da00bb3391f99a3` (PR #112). Lucru exclusiv în repository-ul AVYRON, fără schimbări în proiectul cabinetului de avocatură sau PR #110.

## Comportament

- Simulări Logo 3D: Owner/Super Admin, cu MFA conform politicii existente, poate edita prețul în RON, aplica ±10% și confirma salvarea. Control concurent și audit; comenzile istorice păstrează prețurile lor. Nomenclatorul existent este actualizat, sau completat minimal dacă lipsește. Configurarea fiscală/comercială nu este declarată aprobată automat. Prețurile pentru serviciul profesional și livrarea asistată 2D nu se modifică.
- Prețul public, cardul produsului, pagina detaliată, modalul și coșul Logo 3D citesc noul endpoint public limitat la preț/monedă/revizie. Checkoutul rămâne autoritatea. Dacă citirea eșuează, nu se afișează prețul static ca valoare confirmată. Datele structurate ale produsului folosesc RON pentru prețul său real.
- Asistență flux AI Free: creează un run nativ `logo-engine`, cu brief compact, versiunea aprobată a skillului și `free_only=1`. Reutilizează Workers AI, coada, AI Core, bugetele, kill switches și auditul existente. Selecția folosește exclusiv un model text/vision Free deja înregistrat, primary sau secondary, în funcție de buget. AI Core revalidează interdicția modelelor plătite chiar dacă setările se schimbă între selecție și execuție. Fără cote ridicate/resetate, furnizori noi, generare de imagini sau publicare automată. Rezultatul este o ciornă internă descărcabilă.
- Mentenanță Clienți: selectori cu căutare pentru proiecte, clienți, servicii, planuri, produse, stare și periodicitate; navigare prin tastatură și controale mobile. Creare directă pe proiect existent sau pe un proiect/activ extern al clientului. Clientul nou este creat prin CRM-ul nativ, fără cont paralel. Asocierea serviciului canonic se păstrează în abonament; planurile lunare și anuale își păstrează periodicitatea. Datele de facturare se confirmă în formular; crearea unei fișe nu inițiază debitări.
- Centru Documente: Generator → Tipizate → Documente STAFF → Documente SC → Bibliotecă Agenție; Documents Hub istoric rămâne ulterior. Generatorul este intrarea implicită pentru utilizatorii cu drept de creare; Documente SC rămâne condiționat de permisiune. Portalul clientului și intrarea explicită pentru resurse staff își păstrează aria.

## Migrare și lansare

`0107_logo_maintenance_workflows.sql` este aditivă: `avy_skill_runs.free_only` (implicit 0) și `subscriptions.maintenance_service_key` (nullable). Nu depinde de 0106 din PR #115, nu rescrie abonamente sau documente și nu schimbă prețuri la migrare.

La lansarea autorizată: backup D1 conform procedurii existente, verificarea migrațiilor remote, aplicarea 0107 înainte de Worker API și frontend. Nu elimina coloanele la rollback; se poate reveni la codul anterior păstrând datele. Nu sunt necesare credențiale noi pentru modelul Workers AI deja configurat. Fără modificări remote, activări comerciale, mesaje externe sau deploy în această etapă.

## Limite de verificare

Testele API rulează handler-ele reale pe SQLite cu toate migrațiile; browserul folosește conturi/date sintetice și răspunsuri de furnizor controlate. Acestea nu dovedesc o inferență Cloudflare reală sau validarea finală în contul de producție. Execuția efectivă a ciornelor depinde de bindingul AI, coada și bugetele live existente; blocajele sunt păstrate ca stări reale.

Fișele integrate ale clienților continuă să deschidă lista documentelor clientului, nu generatorul implicit al centrului complet.

## Verificări locale

- 122 teste de handler/integritate/politici, cu toate migrațiile locale; test separat pentru refuzul unui model devenit plătit chiar cu overage activat.
- 40 teste de catalog public, inclusiv preț Logo 3D în RON și lipsa unui preț inventat când sursa nu răspunde; regresii pentru Logo Studio, formatele AI și navigarea privată a documentelor.
- Typecheck aplicație și Worker; ESLint fără erori, patru avertismente React Refresh preexistente.
- Build static/Pages, build standalone Worker și API dry-run. Audit SEO: 78 pagini indexabile, fără afirmații despre indexarea efectivă în motoare.
- Browser: Chromium și WebKit, desktop 1440 px și mobil 320 px; configurare preț cu confirmare, ciornă AI Free, mentenanță cu client nou/plan anual, biblioteca și generatorul documentelor. Rezultatele exacte ale lotului final sunt în PR.

Lotul pe build: 20 scenarii trecute. Lot suplimentar pe sursă: izolarea Documente SC și mini-dashboard-ul clientului au trecut pe Chromium/WebKit. Un clic ratat în WebKit a dus la mărirea țintei pentru alocarea staffului (etichetă minimum 44 px, checkbox 20 px); fluxul complet a trecut apoi de șase ori consecutiv. Capturile au fost inspectate vizual. Nu reprezintă un test pe un telefon fizic.

Buildul Pages final a fost regenerat după ajustarea țintelor tactile; fluxul complet de mentenanță a trecut încă o dată în Chromium și WebKit pe acest build final. Serverele și sesiunile de browser deschise pentru QA au fost închise.
