# Lansare integrată AVYRON OS — 6 noiembrie 2026

Utilizatorul a autorizat explicit push, integrare și deploy pentru întregul lot. Configurarea cheilor rămase este rezervată pasului următor. Acest document inventariază pachetul; dovezile efective de publicare sunt consemnate în PR și raportul de livrare.

## Identitatea și întinderea lotului

Bază verificată: `631a12739a4e0a5156651da96a421ef1670251d1`, cu centrul de aprobări și dashboardul compact deja integrate. Cele 12 commituri funcționale ulterioare sunt păstrate împreună, până la `63f4e029f7dde3e21711e7ac71b4d2ada04d5197`.

| Commit | Suprafețe incluse |
| --- | --- |
| `01c12f3` | Social Media Manager, aprobare/respingere și activități viitoare; AVY Core și mentenanță asociată proiectelor. |
| `8fa9b41` | Leaduri, motive de retragere, pipeline și configurarea catalogului/paginilor serviciilor. |
| `24b8957` | Abonamente Clienți, alocare, monitorizare și evidența abonamentelor interne AVYRON. |
| `27a66a3` | Centru Documente, Documente SC/STAFF, bibliotecă, tipizate și generator separate, personalizare și precompletare. |
| `51960ce` | Chat intern, Membrii Agenției, ranguri și permisiuni granulare; Owner/Super Admin inclusiv Documente SC și backupuri. |
| `3aa2ead` | Fișă client, conturi native, schimbarea parolei, proiecte multiple, abonamente și documente contextuale. |
| `9940346` | Financiar, centre OS, navigare, AVY Engine și Media cu resurse AVYRON/client. |
| `faf94f8` | INTERN OS, upbar, chat pe proiect, resurse și proiecte cu acces diferențiat, responsive. |
| `520c42e` | 26 de coperte RO/EN pentru linkurile serviciilor, metadate, shelluri private și verificări de lansare. |
| `1397ce3` | Carusele Exemple editabile/publicabile și notificări într-un panou ancorat butonului. |
| `0dd2286` | Antivirus Bouncer, carantină, cote Free și verificări obligatorii pe upload/download. |
| `63f4e02` | Colaboratori/Parteneri, fișă, cod intern, cont asociat opțional, badge și trei documente controlate. |

Nu se integrează alte ramuri sau modificări neasociate acestei sesiuni. PR #69 rămâne distinct: implementarea Bouncer înlocuiește abordarea scannerului generic, dar acceptanța reală a furnizorului nu este îndeplinită.

## Date și destinații

Migrații ordonate **0078–0090**, în infrastructura existentă: D1 `avyron-db`, Worker API `avyrontech`, R2 FILES/MEDIA și destinațiile private Document Center existente. Migrațiile sunt aditive, cu actualizări limitate de stare/etichete; nu mută obiecte R2, nu șterg originale și nu modifică prețurile generale. Migrarea antivirus marchează încărcările istorice ca neverificate și rotește URL-urile media istorice. Aceste fișiere rămân inaccesibile până la un verdict CLEAN verificat.

Frontendul real pe domeniile AVYRON este livrat împreună cu API-ul și activele Workerului `avyrontech`. Se reconstruiește un director static curat cu adaptorul Pages; un build standalone `avyron-site` nu este substituit automat destinației reale. Compatibilitatea Pages și Worker standalone rămâne verificată.

Înainte de migrare: bookmark Time Travel, export privat D1 și restaurare izolată cu verificări de integritate. Exportul trebuie să trateze explicit tabelele virtuale FTS reconstruibile. Time Travel nu constituie backup R2. Fără acces actual de administrare R2 nu se revendică o copie nouă a obiectelor sau o reverificare a politicilor publice. Lansarea nu mută și nu șterge obiecte.

## Verificări locale disponibile pe întregul arbore

- Vitest: **818 trecute, un benchmark opțional omis**, în 95 de fișiere; backendul colaboratorilor, 23/23, reluat după ultima corecție.
- Playwright pe buildul final: **86/86** în lotul documente/dashboard/roluri/upbar/Media/antivirus/colaboratori; verificări responsive și accesibilitate. Loturile publice și celelalte module au și dovezi în documentele lor de implementare.
- Workerd + D1/R2 locale: opt verificări ale colaboratorilor și 17 ale antivirusului, date sintetice și furnizor controlat. Nu reprezintă scanare reală Bouncer.
- TypeScript aplicație/Worker, ESLint fără erori (patru avertismente Fast Refresh preexistente), build static/Pages, Worker standalone și API dry-run trecute.
- Integritate locală: 88 de fișiere de migrare până la 0090, `quick_check=ok`, zero încălcări FK.
- Verificările GitHub se rulează separat pe PR-ul acestui lot; rezultatul lor nu este presupus din testele locale.

Prima verificare GitHub a primit HTTP 403 de la protecția publică Cloudflare la citirea textelor serviciilor. CI folosește acum explicit snapshotul public versionat, prin opțiunea existentă `SERVICE_CONTENT_SNAPSHOT_SKIP=1`, numai în pasul de build de verificare. Buildul efectiv de lansare continuă să citească textele publicate. Nu sunt relaxate WAF, autorizarea sau validarea câmpurilor; testele snapshotului folosesc în continuare furnizorul local controlat.

Suita completă următoare a trecut 220/224 scenarii și a identificat patru regresii. Au fost corectate restrângerea titlului colaboratorilor, încadrarea butoanelor de abonamente, butoanele lungi din directorul OS și lățimea intrinsecă a cardurilor AVY Engine. Verificările responsive includ suplimentar 304 px pentru a acoperi spațiul disponibil redus de barele native de scroll și diferențele de font. Testul public al caruselului primește acum configurația publică locală controlată, fără a depinde de API-ul de producție încă nelansat; comportamentul fail-closed al caruselului rămâne neschimbat.

Review-ul automat a identificat și trei probleme corectate înainte de merge: maparea rutelor Media la permisiunile de proiect, marcarea clienților vechi/noi ca gestionați în aceeași tranzacție cu înlocuirea asocierilor staff (pentru ca o revocare să nu fie anulată de asocierea legacy prin e-mail) și reîmprospătarea snapshotului public în buildul Worker standalone. Regresiile folosesc handler-ele Hono, verificarea permisiunilor și SQLite reale, inclusiv o demotare urmată de accesarea facturilor/abonamentelor. Decodarea entităților SVG este într-o singură trecere; metadatele shellului privat folosesc atribute escapate și substituții literale, iar eliminarea JSON-LD se repetă până la stabilizare. Cele 70 de teste țintite au trecut înaintea reluării buildurilor și CI.

Suita GitHub se execută pe PR și pe `main`, eliminând dublarea aceleiași verificări la fiecare push pe o ramură cu PR. Buildurile și testele obligatorii rămân în aceeași suită. Testul suplimentar de 304 px a identificat și butoanele formularului de alocare; acestea se încadrează acum pe mai multe rânduri, ca în evidența abonamentelor interne.

## Configurare amânată și limite explicite

Utilizatorul a confirmat că **nu există încă un cont Bouncer și nici DPA/evaluare aprobată a transferului**. Cheia, aprobarea procesării sensibile și verificarea confidențialității stocării rămân neconfigurate. Nicio scanare reală și niciun document al clientului nu au fost trimise furnizorului. Uploadurile care necesită aceste verificări rămân blocate; încărcările istorice nu devin CLEAN prin migrare. Limitele Free sunt plafonate la 500/lună și 25.000.000 bytes/fișier, fără depășire automată ori abonament nou.

E-mail/WhatsApp/Telegram folosesc numai integrările existente și raportează configurarea reală; deschiderea unei aplicații nu echivalează cu livrarea. Nu se fac trimiteri către terți, activări plătite, schimbări ale politicii MFA/Turnstile sau teste cu documente confidențiale în cadrul lansării. Backupurile manuale Document Center nu înseamnă politică automată de backup continuu activată.

Testul final autentificat în conturile reale a fost rezervat de utilizator pentru mai târziu. Verificările publice după deploy vor acoperi disponibilitatea, activele exacte, rutele private și metadatele; nu vor fi prezentate ca acceptanță completă a tuturor rolurilor sau ca dovadă de indexare Google.

## Ordinea de publicare și recuperare

1. Reconfirmare `origin/main`, inventar complet, push pe ramura de task, PR și CI.
2. Export/bookmark privat, restaurare izolată și verificarea istoricului de migrare; niciun restore de probă peste producție.
3. Integrare autorizată în `main` după verificări; build static curat al reviziei integrate.
4. Fluxul existent `scripts/release-api.mjs`: verificare destinație și prefix D1, bookmark, migrații, FK/integritate și interogări de schemă/FTS, apoi deploy Worker cu activele aceluiași arbore.
5. Verificare independentă a domeniilor site/app/API, a metadatelor și protecțiilor HTTP, a istoricului D1 și a versiunii active. Orice eșec oprește publicarea următoare și este raportat.
6. Recuperarea codului folosește versiunea Worker precedentă; schema nouă nu este eliminată automat. Recuperarea datelor cere bookmarkul/exportul verificat și reconcilierea scrierilor ulterioare, fără restaurare distructivă automată.

Documentație detaliată: [Document Center](./DOCUMENT_CENTER.md), [Bouncer](./security/ANTIVIRUS_BOUNCER.md), [Colaboratori](./COLLABORATORS_PARTNERS.md), [previzualizări și verificări](./LINK_PREVIEWS_RELEASE_READINESS.md).
