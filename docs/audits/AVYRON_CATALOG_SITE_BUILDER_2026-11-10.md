# Registru comercial și Site Builder · 10 noiembrie 2026

## Scop și bază

Bază: `6af0c1b3b8c272334e6713e4dcbeaf2a4b17afe6` (`origin/main`). Ramură dedicată: `codex/catalog-site-builder-2026-11-10`. Codul, D1, autentificarea și infrastructura Cloudflare existente rămân sursele operaționale. Suprafețe: registrul comercial și Site Builder din AVYRON OS. Fără modificări în proiectele Retuvo, Cutiuța Magică sau cabinetul de avocatură; fără schimbări vizuale ale site-ului public.

## Constatări verificate

Citire D1 de producție înaintea remedierii: 17 înregistrări de servicii, una fără SKU/articol; 87 produse în `product_items`, toate fără înregistrare în registrul comercial. Site Builder avea masterul inițial v1, revizia 1. Ultima migrare aplicată era 0116. Nu sunt incluse date personale, briefuri sau secrete în acest raport.

Interfața codurilor folosea o copie statică a surselor și ascundea înregistrările proprii/istorice fără corespondent în lista statică. Indicatorul de completare amesteca prezența codurilor cu verificarea TVA. Sincronizarea Site Builder citea numai caruselele, nu și Biblioteca Artefacte internă ori descriptorii instrumentelor native.

## Implementare

### Registru unic

- Servicii: catalogul existent, pachetele și abonamentele din catalogul checkoutului, inclusiv moneda originală; planurile AVY Partener/Studio provin din D1, cu perioadă anuală conform fluxului existent. Produse: `product_items`, cu identificatori stabili.
- Catalogul de servicii vizibil clienților rămâne separat de inventarul comercial de referință. Înregistrarea pachetelor istorice nu le promovează automat în lista publică de servicii.
- Migrarea **0117** completează identitățile lipsă. Păstrează SKU/articolele existente, ID-urile, prețurile revizuite, fiscalitatea, configurările procesatorilor și documentele istorice. Numerotarea evită coliziunile; jurnalul marchează completările. Reexecutarea pe aceleași date nu produce duplicate.
- Produsele noi și înregistrările nou introduse nu devin automat vandabile: fiscalitatea, licența și conectorii păstrează verificările existente. Codul de articol nu este cont de registru contabil.
- `GET /api/finance/commercial-codes` livrează sursele actuale. `POST .../sync` completează lipsurile viitoare. `GET .../journal?offset=N` oferă istoric paginat, fără JSON brut, date de cont sau identitatea expeditorului.
- UI: liste separate servicii/produse, căutare comună, filtre distincte pentru coduri lipsă/TVA, copiere, export JSON, configuratorul existent și jurnal. Include și articolele proprii/istorice. Acces backend exclusiv Owner/Super Admin.
- Document Center, vânzările produselor, comenzile și facturarea folosesc registrul existent. Checkoutul planurilor păstrează acum și SKU/articolul din același registru, fără schimbarea prețului sau a perioadei.

### Site Builder

- Panou compact de lucru, criterii de livrare și acces direct la etape, instrucțiuni și resurse. Adaptare la mobil fără a impune lecturarea întregii biblioteci înainte de brief.
- Contract comun și instrucțiuni: eficiența privește organizarea internă și contextul; produsul clientului, imaginile, personalizarea și rafinarea au prioritate de calitate față de timp/tokens. Citirea inițială a trei referințe este un punct de pornire, nu un plafon al documentării pentru livrare.
- Criterii comune: identitate proprie, mastere premium, experiență completă și predare verificată. Modelele și resursele se aleg din furnizorii autorizați; blocajele se raportează, fără degradare tacită ori activarea automată a serviciilor plătite.
- Atelierul determinist și modelul text pregătesc materiale interne, nu un site final certificat automat. Instrucțiunile complete și contractul de calitate sunt păstrate în snapshotul/handofful versiunii; compresia contextului AI privește numai pregătirea internă.
- Carusele publicate + catalogul de efecte cu coduri + capabilități AVY Core/Media Generate/registru comercial + resurse active din Biblioteca Artefacte internă. Inventarul intern brut este disponibil numai Owner/Super Admin; operatorii limitați folosesc referințele aprobate.
- Importurile sunt drafturi idempotente, cu versiuni; retragerea sursei o arhivează pentru contextul viitor. Modificarea concurentă a surselor produce conflict și rollback, fără import parțial. Nu se preiau automat fișiere, URL-uri externe, date de client sau secrete.
- Legăturile cu instrumentele exprimă disponibilitatea lor în repository; nu declară un furnizor conectat sau un proiect verificat. Drepturile AVY Core/Financiar sunt păstrate.
- Migrarea adaugă masterul v2 numai dacă seedul inițial este nemodificat; masterele personalizate și snapshoturile istorice rămân intacte. Opt workflowuri actualizate sunt adăugate ca drafturi pentru aprobare separată. Bootstrapul skillului și documentele pentru agenți sunt sincronizate cu sursele.

## Verificări

Verificări locale executate:

| Verificare | Rezultat |
| --- | --- |
| Tipuri aplicație și Worker | PASS |
| ESLint repository | PASS, 0 erori; 4 avertismente preexistente Fast Refresh în alte fișiere |
| Registru + migrare + finanțe + Site Builder + catalog servicii | PASS, 90 teste |
| Browser Chromium, 320/390/1440 px | PASS, 32 scenarii + recuperare eroare în serverul de dezvoltare |
| WebKit/Safari emulat, 320/1440 px | PASS, 12 scenarii + recuperare eroare în serverul de dezvoltare |
| axe-core, registru și atelier, 320/1440 px | PASS, 0 încălcări automate în suprafețele analizate; nu certifică WCAG integral |
| Audit D1, toate migrările și integritatea relațiilor | PASS |
| Secret hygiene și inventar securitate | PASS, fără secrete identificate; auditul general păstrează riscurile sale deschise |
| Build static / Cloudflare Pages | PASS |
| Build standalone Worker | PASS |
| API Worker, tipuri generate și dry-run | PASS |
| Bootstrap / contract comun / snapshot migrare | PASS, sincronizate |

Capturile Chromium au fost inspectate la 320 px pentru registru și 1440 px pentru criteriile și resursele Site Builder. Bazele locale rezultate au 87 produse și 49 servicii/pachete cu identități complete. Migrarea este testată și cu articole proprii, coliziuni de numere/SKU, master personalizat și reexecutare fără duplicate. Scenariile acoperă drafturi și aprobare, retragerea surselor, revocarea accesului, protecția inter-clienți existentă și conflicte concurente de sincronizare.

 Testele folosesc baze SQLite de unică folosință și conturi sintetice; nu creează plăți, facturi, mesaje sau consum AI real.

## Operare și revenire

Pentru servicii/produse noi: actualizează sursa nativă și folosește „Sincronizează codurile”; verifică separat condițiile comerciale și licența înainte de vânzare. Pentru resurse noi: actualizează biblioteca/caruselele, sincronizează și aprobă explicit referințele potrivite reutilizării. Nu aproba materiale cu date private sau secrete.

0117 este append-only. Nu șterge codurile după utilizarea comercială și nu rescrie migrarea după aplicare. Revenirea codului se face la versiunea Worker anterioară; păstrează schema și identitățile noi, sau pregătește o migrare compensatorie verificată. Versiunile Site Builder istorice rămân disponibile pentru selecție prin fluxul existent. Pipeline-ul existent înregistrează punctul de recuperare D1 Time Travel înainte de migrare; acesta nu este o copie offsite separată. Această modificare nu mută fișiere R2 și nu introduce stocări sau abonamente.

## Limite reale

Revizuirea vizuală și acceptanța clientului rămân umane. Modulul nu certifică automat originalitatea, licențele sau calitatea unui site. Interfața administrativă reală autentificată necesită sesiunea utilizatorului; testele browser sintetice nu înlocuiesc acest test. Configurările restante de furnizori, inclusiv Access/Bouncer/registrar ori conturile financiare, nu sunt declarate finalizate prin această lucrare.
