# Domenii .ro și Avyron Quality Standard

Bază: `01acfb909a7026731f2542f17da00bb3391f99a3` (`origin/main`). Ramură independentă de PR-urile 113–118. Acest document nu confirmă merge, migrare remote, configurarea unui cont API sau deploy.

## Auditul surselor, 8 noiembrie 2026

[IANA](https://www.iana.org/domains/root/db/ro.html) indică `whois.rotld.ro` și nu publică un endpoint RDAP pentru `.ro`. Două interogări TCP punctuale au confirmat că serviciul răspunde. Bannerul WHOIS restricționează utilizarea în scop publicitar/domain hunting și extragerea/reutilizarea comercială; nu se activează un proxy comercial automat pentru acel serviciu și nu se ocolește formularul web. Nu sunt păstrate date WHOIS, contacte sau înregistrări brute în cod/loguri.

DoH Cloudflare poate confirma o delegare NS exactă pentru un domeniu. NXDOMAIN, SOA-ul părintelui, erorile sau lipsa unei delegări nu dovedesc disponibilitatea. [DoH JSON](https://developers.cloudflare.com/1.1.1.1/encryption/dns-over-https/make-api-requests/dns-json/).

Openprovider publică [acces API cu înscriere gratuită](https://www.openprovider.com/blog/domain-reseller-api), [suport .ro](https://openprovider.help/books/domains/page/ro), [autentificare](https://developer.openprovider.com/api-keys.html) și [verificare de disponibilitate](https://developer.openprovider.com/get-started.html). Endpointul curent este `/v1`, nu vechiul `/v1beta`. Schema oficială consultată: `https://developer.openprovider.com/data/swagger.spec.js`, `domainCheckDomainResult.status` = `free` / `active`. Înregistrarea și produsele pot avea costuri; acest adaptor nu le apelează. Înainte de activare trebuie confirmate condițiile contului, accesul API și eventualele contracte de registru pentru .ro. Nu s-a creat un cont, alimentat un sold sau activat un abonament.

who.is Free a fost evaluat și exclus pentru această cerință de verificare curentă: [documentația](https://who.is/docs/api) permite în Free numai snapshoturi cache, fără live refresh. Absența unui domeniu dintr-o bază agregată nu dovedește disponibilitatea sa. Nu se folosesc endpointuri ascunse ale altor website-uri sau liste parțiale de domenii ca verdict de registru.

Inventarul secretelor Workerului `avyrontech` a fost citit fără valori: nu au fost găsite chei pentru Openprovider/registrar. Integrarea rămâne neconfigurată până la furnizarea securizată a credențialelor și verificarea contului real.

## Implementare

Aceleași rute publice GET/POST `/api/public/domain-check` și ruta internă `/api/workspace/domains` folosesc `lookupDomain(domain, env)`. Pentru `.ro`, se încearcă adaptorul configurat, apoi fallback conservator RDAP/DoH. Fără confirmare, răspunsul rămâne `unknown`. Un răspuns `free` nu rezervă domeniul; reconfirmarea la comandă rămâne obligatorie.

Adaptorul are numai două destinații fixe HTTPS: `POST https://api.openprovider.eu/v1/auth/login` și `POST .../domains/check`. Verifică un singur nume valid `.ro`, cu `with_price=false`; nu poate rezerva, cumpăra, reînnoi sau transfera. Validează codul furnizorului, domeniul exact și starea; un răspuns premium, cu claims, eronat sau ambiguu nu este declarat disponibil. Body-urile sunt limitate, redirecturile refuzate și cererile au timeout.

Tokenul este reutilizat și reîmprospătat o singură dată la 401. Cache-ul său folosește KV-ul și vaultul AES-GCM existente, cu referință legată de fingerprintul credențialelor. Tokenurile și parolele nu sunt expuse în UI sau loguri. Cache-ul rezultatelor folosește Cache API existent, fără stocare redundantă: 120 secunde pentru disponibilitate și 900 pentru înregistrare, cu timestampul verificării păstrat. Nu se permite extrapolarea unei cote Free inexistente.

Limitele publice și interne existente rămân active. Protecția suplimentară a furnizorului: 30 verificări/minut global, 3 autentificări/minut și maximum 200 autentificări/zi, pentru a limita scrierile KV și rafalele de login. Acestea sunt bugete tehnice ale modulului, nu cote contractuale pretinse ale furnizorului. Nu se activează overage sau upgrade automat. Consumul total al contului Cloudflare rămâne de monitorizat împreună cu celelalte module.

Se elimină fraza RoTLD cerută și butonul extern din interfața publică. Răspunsul API păstrează câmpul legacy de link pentru compatibilitate. Nu se afirmă că verificarea rezervă automat domeniul. UI protejează retry-ul/dublul Enter, timeoutul și rezultatul întârziat: verdictul rămâne legat de numele trimis, chiar dacă utilizatorul editează câmpul. Starea furnizorului este vizibilă în Domenii din OS; „configurat” nu echivalează cu un apel real verificat.

## Configurare securizată ulterioară

1. Reutilizați un cont Openprovider real, confirmați că accesul de verificare API este gratuit, activați API pe un contact dedicat și îndepliniți condițiile registrului.
2. În Workerul AVYRON setați secretele `OPENPROVIDER_USERNAME`, `OPENPROVIDER_PASSWORD` și valoarea `DOMAIN_OPENPROVIDER_ENABLED=true`. Nu le puneți în Git, chat sau frontend. Se reutilizează KV și `MFA_ENCRYPTION_KEY`; nu se adaugă servicii.
3. Aplicați migrarea 0109 după backup, apoi deploy API înainte de frontend. Verificați un domeniu cunoscut înregistrat și unul neînregistrat, fără vreo comandă de înregistrare. Confirmați sursa `openprovider`, timestampul și istoricul comun OS/public.
4. Lipsa configurării, expirarea sesiunii, rate-limitul și erorile păstrează un rezultat conservator. Nu le prezentați ca test de succes.

Migrarea `0109_domain_registrar_source.sql` lărgește CHECK-ul sursei din `public_domain_checks`, prin copiere atomică a tuturor coloanelor într-o schemă echivalentă. Identificatorii, înregistrările și cele două indexuri sunt păstrate; testul compară fiecare câmp înainte/după, verifică integritatea și FK. Nu există FK sau trigger dependent de tabel în schema auditată. Migrarea nu depinde de 0105–0108 și nu a fost aplicată remote. Pentru rollback de cod păstrați schema lărgită; nu ștergeți istoricul.

## Avyron Quality Standard

Secțiune compactă sub „Ce câștigi cu un site bine făcut”, titlu RO „Standardul de calitate Avyron”, cu cinci criterii: SEO, Securitate, Performanță, Conversie, Design. Identitatea vizuală folosește panouri și bare segmentate proprii, fără sigle sau cercuri copiate de la Google. Indicatorii sunt prezentați explicit ca obiectiv de calitate / mini-prezentare, nu rezultate de Lighthouse, certificare sau audit efectiv.

Animația pornește la intrarea în viewport, rulează o singură dată și se oprește la final, la ascunderea tabului sau ieșirea din ecran. Reduced-motion primește starea statică. Cifrele animate nu produc anunțuri repetate în cititorul de ecran. Titlul și descrierea sunt localizate RO/EN, iar prerenderul păstrează conținutul semantic.

## Verificări și limite

Testele locale folosesc API simulat, SQLite cu schema/migrările reale, KV/cache simulate și Chromium/WebKit pentru UI. Sunt distincte de verificarea contului real și de producție. Niciun rezultat .ro `available` live prin noul adaptor nu este declarat înainte de configurarea credențialelor. Proiectul cabinetului și PR #110 nu sunt modificate. Fără deploy sau servicii plătite activate.

Înainte de migrarea de producție, verificați numărul și dimensiunea înregistrărilor din tabel și consumul D1 al zilei; copia de schemă trebuie să rămână în cotele Free disponibile. Acest task nu execută migrarea și nu activează facturarea pentru a o forța.

### Rezultate locale finale

- 32 teste native trecute; 1 benchmark existent omis intenționat. Acoperă adaptorul, limitarea, răspunsurile malformate, istoricul real SQLite, migrarea și animația.
- 43 teste de prerender trecute, inclusiv ordinea secțiunii și textele RO/EN.
- 14 teste browser trecute în Chromium și WebKit, la 320 și 1440 px: animație, reduced-motion, localizare, lipsa overflowului, cereri duplicate, verdict întârziat și recuperare după 503. Exporturile de capturi au fost inspectate vizual.
- Typecheck aplicație/Worker, lint și buildurile static/Pages/Worker/API validate. Lintul complet are 4 avertismente Fast Refresh preexistente, fără erori. Auditul D1 local are integritate OK și nicio încălcare FK. Snapshotul comercial a fost omis explicit la build (`SERVICE_CONTENT_SNAPSHOT_SKIP=1`); buildul nu trebuie să sincronizeze implicit date comerciale remote.

Activarea și testul .ro cu un cont real rămân pas separat: lipsesc credențialele registrarului. Nu se declară disponibilitate live funcțională în producție și nu se aplică migrarea remote în acest task.
