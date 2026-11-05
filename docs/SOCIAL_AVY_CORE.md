# Manager Social Media și AVY Core

Stare la 5 noiembrie 2026: implementare locală pe `codex/social-avy-core-2026-11-05`, bazată pe `631a12739a4e0a5156651da96a421ef1670251d1`. Push, PR, migrarea remote și deployul sunt amânate prin instrucțiunea utilizatorului până la încheierea taskurilor. Nicio înregistrare comercială reală și niciun mesaj/post extern nu au fost create pentru aceste verificări.

## Suprafețe

- `/profil?tab=social-manager`: listă editorială pe proiect, filtre și paginare, previzualizare completă, trimitere la aprobare, aprobare/respingere confirmată și redeschidere ciornă conform permisiunilor existente. Mini-dashboardul „Activități viitoare” deschide activitățile și materialele programate, cu blocaje și întârzieri explicite.
- `/profil?tab=maintenance`: AVY Core, subsecțiunea „Mentenanța clienților”. Proiecte, abonamente lunare existente sau noi, planuri, specificații, produse interne/externe și staff. Parametrul `project` selectează proiectul și activitățile sale.
- `/profil?tab=maintenance&core=system`: instrumentele AVYRON existente, rezervate Super Admin; scurtătura din Control platformă păstrează această destinație.
- Abonamentele clientului și administrarea abonamentelor reutilizează aceeași înregistrare. Un abonament Core se editează în Core, evitând divergența cu vechiul formular.
- „Fluxuri și pipeline” eliminat; vechea destinație `tab=workflows` afișează proiectele. Categoriile din meniu și categoriile proiectelor sunt pliabile și accesibile prin tastatură. Site-ul public neautentificat păstrează designul existent.

## Date și API

`GET /api/ai-projects/:slug/social-manager` citește o proiecție compactă și paginată din `ai_content_items` și `ai_social_jobs`. Expirarea conținutului, scope-ul proiectului și permisiunile sunt cele originale. Interfața reîncarcă la revenirea în fereastră, evenimentele de aprobare și la 30 de secunde când este vizibilă; datele precedente rămân disponibile la o eroare recuperabilă.

Deciziile folosesc API-ul editorial existent, cu revizie, audit atomic și trigger de sincronizare a activității. Aprobarea materialului nu publică pe un canal, nu aprobă implicit variantele de canal și nu confirmă livrarea externă. Activitățile încheiate istoric nu sunt rescrise.

API-uri Core:

- `GET /api/workspace/maintenance/config`: proiecte autorizate; clienți/produse/staff pentru administratorii platformei; planuri reale.
- `GET /api/workspace/maintenance`: abonamente autorizate și metadate, fără cache comun.
- `POST /api/workspace/maintenance`: configurare nouă idempotentă.
- `PATCH /api/workspace/maintenance/:id`: actualizare cu revizie și cheie de idempotență.
- API-urile existente `/api/workspace/subscriptions` și `/api/workspace/work-items/:projectId?kind=maintenance` asigură vizualizarea clientului și activitățile.

Catalog: cele 21 de planuri existente din `subscriptionPlans.ts` și cele 3 înregistrări citite din `partnership_plans` la audit. Prețurile și SKU-urile produselor nu sunt rescrise; configurarea păstrează o copie explicită a tarifului și specificațiilor abonamentului. Modificările viitoare ale catalogului nu schimbă automat abonamentele configurate. Licențierea și facturarea furnizorului rămân guvernate de fluxurile comerciale existente.

Un produs extern primește un proiect canonic `external_asset`, asociat clientului existent și entității sale juridice, în aceeași tranzacție cu serviciul și abonamentul. URL-ul extern este validat HTTP/HTTPS fără credențiale și nu este accesat automat. Nu se creează CRM, autentificare sau motor de billing paralel.

## Migrare și securitate

`0078_avy_core_subscriptions.sql` este aditivă: extinde `subscriptions`, creează `subscription_staff`, indexuri și trigger-ele de consistență. Datele vechi primesc `maintenance_enabled=0`; abonamentele vechi se pot configura în loc, păstrând identificatorii. Câmpurile de timp necunoscute rămân zero/null în afișare, fără date istorice inventate.

Scrierea Core cere principal de platformă și politica MFA existentă. Tariful în bani întregi, planul, produsul, stafful activ, proiectul și beneficiarul sunt validate server-side. Rezervarea idempotentă, serviciul, abonamentul, stafful, proiectul și auditul folosesc același D1 batch. Conflictul de revizie sau eșecul auditului anulează întregul batch. Editorul vechi verifică revizia și apartenența Core în tranzacție, inclusiv dacă un abonament este convertit între citire și scriere. Indexul unic împiedică două asocieri active identice pentru aceeași țintă.

Clientul citește numai proiectele/entitățile autorizate. Grantul pe client acoperă un proiect tenant numai dacă organizația este mapată aceleiași entități juridice. Stafful desemnat pentru mentenanță primește activitățile de mentenanță, fără acces implicit la toate materialele, documentele sau taskurile generale ale proiectului. Materialele existente folosesc în continuare autorizarea originală a proiectului. Revocarea desemnării, suspendarea abonamentului ori pierderea rolului sunt reevaluate la cerere, inclusiv înaintea răspunsurilor idempotente pentru scrieri.

## Verificare și lansare ulterioară

Testele runtime folosesc SQLite cu toate migrațiile și verifică beneficiari diferiți, granturi tenant, creare atomică, actualizare în loc, produse, active externe, staff, revizie, retry, revocare și rollback la eșecul auditului. Testele browser au date simulate explicit; suplimentar, Workerul local real și D1 local au fost verificate prin interfață cu conturi sintetice: aprobare editorială → activitate aprobată; abonament → clientul A cu specificații/staff; clientul B fără acces. Interfața a fost inspectată pe desktop și mobil; capturile nu conțin date de producție.

Auditul de producție din această sesiune a fost numai de citire: zero abonamente în tabela existentă, zero neconcordanțe beneficiar serviciu/proiect și zero materiale recente AVYRON WEB în fereastra de trei zile. Aceste numere sunt o fotografie datată, nu o garanție pentru lansare. Nicio bază de date sau integrare plătită nu a fost activată.

Înainte de release: reîmprospătare `origin/main`, PR și CI, verificarea istoricului D1, backup/bookmark și aplicarea 0078 prin `scripts/release-api.mjs`, integritate/FK, Worker/Pages și verificarea interfeței autentificate. Migrarea este forward-only; nu se elimină coloane sau date la revenirea codului. Backupul D1 existent protejează metadatele; fișierele proiectelor rămân în stocarea și strategia R2 existente. Nu este introdus un nou mecanism sau o nouă garanție de backup.

Testul final în conturile reale este amânat de utilizator. Starea locală, preview, PR și live trebuie raportate separat. Configurarea unui abonament nu înseamnă debitare, factură, drept de licență nou sau notificare automată.

Rezultate locale confirmate: `npm test` — 79 fișiere, 630 teste trecute și un test preexistent omis; typecheck aplicație/Worker valid; lint zero erori și patru avertismente React Refresh preexistente. Cele 32 de cazuri browser pentru dashboard/Social/Core au trecut înainte de verificarea completă finală. Capturi cu date sintetice: [desktop](./qa/social-core-2026-11-05/core-desktop.png), [mobil](./qa/social-core-2026-11-05/core-mobile.png), [activități sociale](./qa/social-core-2026-11-05/social-upcoming.png).

Buildurile static/Pages, standalone Worker, API și e-mail au trecut; auditul SEO rămâne la 77 de pagini indexabile și 212 publice noindex. `audit:d1` și `git diff --check` au trecut. Bundle-urile finale nu includ API-ul localhost. În prima rulare completă Playwright: 118 cazuri trecute și un eșec de tranziție laptop→telefon la 1280×720 în scena publică existentă; toate cele 32 de cazuri dashboard/Social/Core au trecut, inclusiv categoriile în ambele vizualizări. Cazul public a trecut apoi separat, fără modificări de cod: 1/1, 13 secunde total. Prima rulare completă nu este raportată drept integral verde; eșecul inițial și rerularea sunt păstrate distinct. Nu rămân cazuri eșuate nereverificate în această sesiune.
