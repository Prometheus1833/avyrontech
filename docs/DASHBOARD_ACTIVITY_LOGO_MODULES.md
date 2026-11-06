# Activitate în dashboard și separarea fluxurilor Logo

Task din 6 noiembrie 2026. Ramură `codex/dashboard-activity-logo-products-2026-11-06`, pornită din `c6f28652f2c08045a3fa93629ffc86d1ff6d7320` (PR #95, inclusiv #94). La începutul taskului, `main` era `dcfd638`; această documentație nu reprezintă un release în producție.

## Navigare

- Activitate: Manager Social Media, solicitări clienți, chat și anunțuri.
- AVYRON OS: Cariere, Biblioteca Artefacte și Antivirus, împreună cu modulele OS existente.
- AVY STAFF înlocuiește denumirea Membrii Agenției în meniu și pagină.
- Produse AVYRON → Simulări Logo 3D (`logo-simulations`, identificatorul URL existent).
- Platformă → Simulări Logo 2D (`logo-2d-simulations`).

Desktopul, meniul mobil și comenzile folosesc același registru de secțiuni/RBAC. Nu sunt create conturi sau sisteme de autorizare paralele.

## Numerele de activitate

`GET /api/workspace/activity-counts` întoarce numai agregate autorizate, cu `private, no-store`. Contoarele apar lângă iconițe în meniul desktop, în meniul și scurtăturile mobile, precum și pe Chat în bara dashboardului. Afișarea este plafonată vizual la 99+; zero și erorile de încărcare nu produc un badge fictiv.

Semantica este explicită:

- Chat: mesaje primite necitite din canalele comune, propriile mesaje directe și proiectele autorizate. Se reutilizează cursorul `(created_at,id)` și aria nativă de proiecte. Mesajele proprii și conversațiile altora sunt excluse.
- Anunțuri: elemente active ale altor autori, fără confirmare individuală. **Am citit** / **Marchează citită** salvează o confirmare pentru exact acel anunț. Deschiderea secțiunii nu confirmă în masă elemente viitoare.
- Solicitări clienți: tichete deschise/în lucru; acesta este un volum de procesat, nu o dovadă de necitire.
- Leaduri și fluxurile Logo: leaduri în etapa nouă, active și neșterse, cu același predicat de acces ca lista centrală. Arhivarea și revocarea alocării elimină activitatea din agregatul următoarei cereri.
- Solicitări demo și recenzii: intrări noi, respectiv recenzii în așteptare în aria permisă.
- Social: conținut pentru Avyron WEB aflat în aprobare, cu aceleași limite de valabilitate ca managerul social, plus planurile viitoare încă revizuibile (queued / awaiting_budget / failed, fără conținut deja atașat). Planurile aprobate sau în generare nu cresc artificial contorul.
- Alte destinații: notificările necitite ale contului. Notificările documentelor trec întâi prin filtrul nativ de acces la resursă, inclusiv izolarea Documente SC. Feedul derivat este limitat la 1.000 notificări recente.

Un singur query al dashboardului reîmprospătează contoarele la 30 secunde, la focus și după mutațiile workspace/citirile relevante. Cheia cache-ului include contul și profilul curent de autorizare; datele nu sunt comune între conturi sau privilegii. Se oprește pollingul în fundal. Nu sunt adăugate WebSockets, Durable Objects ori servicii noi.

Migrarea **0094** adaugă `staff_announcement_reads` și un index al activităților din leaduri; istoricul și mesajele existente nu sunt modificate.

## Produsul Logo Studio 3D

Produsul digital `logo-studio-3d` este separat de serviciul profesional de logo dinamic și de simulatorul 2D. Previzualizarea motorului 3D în browser rămâne gratuită. Pachetul este plătit sau accesibil printr-un plan eligibil; o simplă previzualizare/copiere nu acordă o licență.

Migrarea **0095** transformă numai accesul Free al acestui produs în Pro și oprește trecerea automată în Free; păstrează un nivel Studio deja configurat, prețul real, achizițiile, drepturile și versiunile. Catalogul sursă păstrează valoarea existentă de 75 lei. Downloadul verifică server-side accesul plătit chiar și în cazul unui rând Free vechi/neactualizat. R2, versiunea și verdictul antivirus se verifică prin fluxul existent; existența metadatelor unei versiuni nu dovedește disponibilitatea pachetului.

`POST /api/logo-studio/product-interest` salvează configurația atunci când un utilizator autentificat adaugă pachetul în coș. Citește prețul din `product_items`, validează textul/materialul/culorile/proporțiile și folosește idempotency și limitare la 30 intenții/cont/zi. Înregistrarea este un lead `source=logo-product:3d`, `product=logo-studio-3d`; nu reprezintă plată, factură sau livrare. Pentru vizitatorii anonimi, previzualizarea rămâne locală; checkoutul cere autentificarea nativă. Erorile salvării configurației sunt afișate fără a pretinde reușita.

Pagina internă arată prețul/statusul din catalogul actual, versiunea înregistrată, infrastructura utilizată și pipeline-ul CRM corect filtrat. Configurarea catalogului/versiunilor trimite la modulul existent și apare numai principalilor autorizați. Situația comercială este rezervată principalilor sau dreptului financiar explicit; MFA și politica nativă rămân active. Folosește `commerce_orders`, păstrează monedele, exclude intențiile din totalurile paid și alocă reducerile pe linia produsului în comenzile mixte. Lista are maximum 100 comenzi recente din checkoutul curent (`commerce_orders`). Vechiul registru `product_orders` rămâne în Produse AVYRON și nu este inclus în aceste agregate; nu se însumează două surse care pot dubla aceeași plată. Rambursările și facturarea rămân în Financiar.

## Simulatorul 2D și variantele AI

- Patru variante standard, fără AI; export SVG/PNG standard gratuit cu cont.
- Patru variante generate cu AI în cotele existente. Un răspuns incomplet nu este etichetat ca patru variante AI.
- Livrarea asistată AI păstrează tariful existent de 150 lei, conform răspunsului explicit al utilizatorului. Generarea/previzualizarea nu constituie plată.
- Dacă AI sau salvarea nu este disponibilă, fallbackul este standard local, explicit etichetat; nu este prezentat drept AI sau istoric salvat.

`POST /api/logo-studio/simulations` generează și păstrează metadatele variantelor standard ale unui cont autentificat. Generarea AI reușită înregistrează sursa AI reală în aceeași tabelă. Cotele AI existente nu sunt extinse și niciun furnizor nu este activat. Standardul este limitat la 60 cereri/oră și 200/zi/cont, plus 2.000/zi global; previzualizarea anonimă locală nu consumă aceste scrieri.

Migrarea **0096** adaugă numai `logo_studio_simulations`: cont, tip, sursă, brief, număr de variante, legătură opțională la lead, dată și expirare. Nu se stochează imagini, binare sau copii ale CRM-ului. Metadatele sunt private, păstrate 90 de zile, cu curățare limitată în cronul orar existent și la generare. Cererile trimise păstrează snapshotul propriu în CRM, independent de expirarea istoricului de simulare. Briefurile sunt disponibile principalilor/deținătorilor dreptului global leads.read sau doar contului propriu în celelalte cazuri autorizate. Paginarea este de 50, iar căutarea din UI este etichetată pentru înregistrările încărcate.

Cererile 2D trimise explicit sunt afișate separat de istoricul generării. Inserarea snapshotului CRM și asocierea opțională a simulării sunt atomice în D1. Formularul poate lega numai o simulare a contului autentificat; un ID furnizat de alt cont nu acordă acces. Cererile istorice dinamice ale serviciului profesional rămân în Leaduri și nu sunt transformate automat în achiziții ale produsului 3D. Fișa CRM afișează briefurile și configurațiile în câmpuri lizibile.

## Infrastructură, verificare și lansare

Se reutilizează Workerul, D1, R2 privat, CRM, checkoutul, RBAC și cronurile existente. Nu sunt adăugate abonamente sau furnizori. Nu s-au făcut mesaje externe, plăți reale ori generări AI reale în teste. Antivirusul nu este activat prin acest task; configurarea și conformitatea Bouncer rămân pași separați, cu blocajele existente păstrate.

Citirea directă a D1 remote a fost refuzată de Cloudflare cu **7403** în această sesiune. Prin urmare, prețurile, fișierele, cheile și integrările live nu sunt prezentate ca reverificate; UI le citește din API la utilizare. Nicio migrare remote nu a fost executată.

Pentru un release ulterior autorizat: revizuiți și integrați întregul lot, aplicați migrațiile restante 0091–0096 în ordine înainte de API, validați RBAC și contoarele într-un cont real și verificați separat checkoutul/pachetul 3D/antivirusul. Push/PR și buildurile locale nu reprezintă merge sau deploy.


## Dovezi locale de verificare

- Schema D1 completă și catalogul efectiv (87 produse / 3 planuri) au trecut auditul. 0094–0096 au fost aplicate doar într-un D1 local existent până la 0093; verificarea nativă a confirmării individuale, a JSON-ului briefurilor, a expirării metadatelor și a FK a trecut.
- 146 teste țintite au trecut în opt fișiere (un benchmark opțional omis), pentru ranguri, mesaje, ACL-uri, arhivă, catalog, pipeline și limitarea abuzului. Cazul suplimentar „răspuns AI incomplet” a fost verificat separat și a trecut.
- Typecheck app/Worker și lint fără erori; patru avertismente 3D preexistente. Build static/Pages, site Worker și API dry-run trecute; audit SEO: 77 indexabile, 212 noindex publice, 11 URL-uri strategice. Aceste numere nu dovedesc indexarea Google.
- Browserul folosește API-uri simulate; runtime-ul verifică handler-ele Hono cu SQLite real și testele D1 locale sunt separate. Nu reprezintă acceptanță în contul real sau tranzacție/scanare/model AI live.
- Inspecție vizuală: meniul și badge-urile pe mobil/desktop, pagina produsului 3D, briefurile 2D și imaginile sociale bilingve actualizate pentru clasificarea Pro.

- Browser: 75 scenarii distincte acoperite cu succes pentru meniuri/badge-uri, logo, chat, staff, notificări, carusele și leaduri. Rularea amplă a avut 72 trecute; cele trei fixture-uri nealiniate (selector de input, denumirea AVY STAFF și persistența citirii simulate) au fost corectate, apoi toate cele zece scenarii finale selectate au trecut, inclusiv cele trei și contrastul efectiv de minimum 4,5:1 al badge-urilor.
- Verificări runtime finale suplimentare: răspunsul AI incomplet nu produce istoric AI fals; asocierea simulării verifică titularul contului și este atomică cu inserarea în CRM; contorul social include planurile viitoare revizuibile și exclude planuri aprobate/în generare. Toate au trecut.
- Pages a fost refăcut după ajustarea contrastului; API dry-run a fost refăcut după ultima verificare de atomicitate și contor social. Nicio operațiune de producție nu a fost executată.
