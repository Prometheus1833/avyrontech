# Previzualizări de link și verificări înainte de lansare

Stare: local, ramură de continuare de la `faf94f8`; nu reprezintă push, PR, merge, migrare remote sau deploy. `origin/main` verificat la `631a127`. Domeniile reale sunt servite de Workerul existent `avyrontech`, cu API și active pe aceeași infrastructură. Păstrăm și compatibilitatea Pages/Worker standalone.

## Previzualizări publice

Registrul `src/seo/serviceSocial.ts` leagă rutele canonice existente de coperte pentru website, social media, logo 3D, magazin online, aplicații, AI/automatizări, QA, blog, SEO, Ads, Logo Studio, lista serviciilor și mentenanță. Sunt 13 destinații × două limbi, 26 JPEG-uri de 1200 × 630. Fiecare imagine are compoziție tematică, diacritice și un URL cu checksum al conținutului, fără prețuri înscrise care să devină învechite.

`scripts/generate-service-og.mjs` generează local imaginile din cod, cu fonturile Outfit licențiate și deja incluse în proiect, transformate în contururi. Nu depinde de fonturile sistemului, nu apelează AI sau servicii de randare externe. Rulează în build; elimină numai fișierele vechi care îi aparțin din directorul propriu. Imaginile nu se generează la fiecare cerere și nu sunt încărcate în corpul paginii.

Titlurile și descrierile provin în continuare din textele editabile ale paginilor de servicii și snapshotul public existent. `setPageMeta` completează imaginea specifică rutei și actualizează Open Graph/Twitter, locale, alt, dimensiuni, tip și URL. La navigarea SPA nu mai rămâne imaginea/alt de la serviciul ori articolul anterior. Copertele explicite ale articolelor și produselor sunt păstrate. Prerandarea livrează aceste metadate direct în HTML, fără executarea JavaScript de către crawler.

După lansare, aplicațiile de mesagerie pot păstra previzualizări deja memorate. URL-urile noi ale imaginilor împiedică reutilizarea vechiului fișier, dar nu obligă o platformă terță să recitească imediat HTML-ul unei pagini. Verificarea finală se face pe fiecare URL canonic cu recitirea disponibilă în platforma respectivă; nu se adaugă parametri artificiali în canonical sau sitemap.

## Corecția rutelor private

Auditul live a identificat o neconcordanță: `/profil` și `/intern` aveau antet HTTP `noindex, nofollow`, dar HTML-ul shellului păstra metadatele publice. Modulul comun `src/worker/privateShell.ts` este folosit atât de API Workerul real, cât și de adaptorul Pages/Worker standalone. Returnează titlu/descriere generice, fără canonical, hreflang sau JSON-LD public, `noindex` în HTML și HTTP, `private, no-store`; HEAD nu are corp. Rutele private sunt recunoscute înaintea fallbackului de active. Lipsa shellului returnează 503 cu aceleași restricții, fără substituirea paginii publice.

## Controlul scenei de pe homepage

Regresia extinsă a surprins un selector de dispozitive rămas pe Website după apăsarea Aplicație. Un test nou reproduce determinist întreruperea scrollului nativ și deplasarea ulterioară a conținutului de deasupra scenei. Fallbackul reutiliza coordonata calculată înainte de schimbarea layoutului. `IndustryDeviceShowcase` recalculează geometria și destinația chiar înainte de reîncercare; păstrează designul, mișcarea redusă, controlul prin scroll și cleanupul timerelor. Testul nou a eșuat pe codul anterior, verificând efectiv condiția corectată.

## Cont de test

A fost creat la cererea utilizatorului un cont real de test în autentificarea nativă: `users`, `profiles`, rolul exclusiv `user`, hash scrypt și eveniment de audit `operator.test_account_created` cu actor de sistem. Nu s-a atribuit identitatea unei alte sesiuni administrative. Contul nu are capabilități privilegiate, organizații, proiecte staff, abonamente comerciale sau plăți. Parola temporară se schimbă obligatoriu la prima utilizare. Datele de acces sunt comunicate separat utilizatorului și nu sunt păstrate în repository, PR sau memorie. Nu s-au trimis emailuri, notificări externe și nu s-au activat servicii plătite.

Verificare live: login 200, profil 200 cu rol `user`, operațiunile protejate blocate 428 până la schimbarea parolei, logout 200. Aceasta verifică autentificarea existentă în producție; nu dovedește că funcționalitățile noi locale sunt deja lansate.

## Securitate și date

Alerta moderată GHSA-g3hv-75wg-m249 venea din `minimatch` tranzitiv în instrumentele TypeScript ESLint. Override limitat la `@typescript-eslint/typescript-estree` către versiunea corectată 11.0.1, cu lockfile; nu actualizează frameworkuri ori codul aplicației. Lint și tipurile verifică compatibilitatea. Referință: https://github.com/advisories/GHSA-g3hv-75wg-m249.

D1 producție, citire efectuată în această etapă: 75 de migrări aplicate, ultima `0077_dashboard_approval_indexes.sql`, istoric identic cu prefixul local, `quick_check=ok`, zero erori FK. Cele zece migrări locale `0078`–`0087` rămân neaplicate remote. Singura scriere externă din acest task este contul de test autorizat și sesiunile/auditul verificării sale.

Verificarea suplimentară a catalogului a reconciliat în citire toate cele 87 de produse și trei planuri cu D1. Singura diferență este denumirea română a artefactului cu slug stabil `bara-anpc-sol`: publicul folosește deja SAL, D1 păstrează SOL. Migrarea `0087_catalog_footer_label.sql` modifică exclusiv numele exact vechi și timestampul, fără prețuri, limite, drepturi, identificatori sau achiziții. Un titlu intern personalizat nu este suprascris. Verificatorul compară acum catalogul efectiv după replay-ul tuturor migrațiilor, fără să ceară rescrierea seedului istoric. Generatorul refuză suprascrierea migrațiilor și cere un fișier nou; CI verifică atât catalogul, cât și manifestul textelor editabile. Scanarea de dependențe Vite este oprită în generatorul SSR de manifest pentru a nu porni un scan de browser care este închis imediat.

## Ordinea lansării

1. Reconfirmare ultimul `origin/main`, reconciliere pe ramura de task dacă apare un commit nou, push/PR și verificările GitHub; fără force push. Codul acumulat are zece migrări și schimbări de acces: review-ul trebuie să includă și modulele din taskurile anterioare.
2. Înaintea migrării: bookmark Time Travel/export D1, verificarea destinațiilor R2 private existente și o copie consistentă a obiectelor/metadatelor relevante. Time Travel D1 singur nu protejează fișierele R2. Validarea restaurării se face în mediu izolat; nu se restaurează peste producție ca test.
3. Verificarea identității de release și a drepturilor necesare pe Worker/Pages/R2, fără schimbarea autonomă a permisiunilor ori activarea serviciilor plătite. OAuth-ul local disponibil are acces D1/Workers, dar nu dovedește acces R2/Pages; fluxul de release trebuie verificat cu identitatea sa reală.
4. Pentru release se reconstruiește un `dist` curat cu buildul destinației; nu se publică directorul mixt rezultat din validarea succesivă Pages și Worker standalone. După autorizarea lansării, migrațiile `0078`–`0087` înainte de API, integritate și FK, API, frontend/Pages. `scripts/release-api.mjs` este o operațiune remote și nu se rulează drept test local. Nu se lansează frontendul nou împotriva unei scheme vechi.
5. După deploy: verificare commit/deployment exact, hostname real, rol Owner/Super Admin/staff/client, revocare, Documente SC, upload în carantină/download autorizat, export PDF/DOCX, documente/proiecte/abonamente și chat. Testul vizual în contul real a fost rezervat de utilizator pentru mai târziu; browserul automat local folosește date sintetice.
6. Verificare preview fără JavaScript pentru RO/EN, JPEG-uri accesibile, canonical/hreflang/robots/sitemap, rute private și 404. Auditul live confirmă accesul crawlerelor, nu indexarea Google. Raportul Search Console/URL Inspection trebuie recitit după procesarea lansării; nu s-au solicitat automat indexări în această etapă.

## Limite rămase ale lotului

Nu există scanner malware verificat: uploadurile rămân în carantină; aceasta nu este scanare antivirus. Backupurile manuale au implementare și teste locale, dar nu se revendică o politică automată de retenție/copie continuă activă în producție. E-mailul se verifică cu furnizor și destinatar autorizat înainte de a pretinde livrare; WhatsApp/Telegram păstrează fallbackul manual unde API-ul nu este configurat. Nicio trimitere externă de probă nu a fost făcută aici. Modelele juridice și datele fiscale necesită revizuirea umană deja documentată. Configurația MFA/Turnstile existentă nu a fost schimbată în acest task. Chromium responsive nu este un test pe dispozitive iOS/Android fizice.

## Rezultate finale ale verificărilor locale

| Verificare | Rezultat |
| --- | --- |
| Regresie de cod completă | 92 fișiere, 757 teste trecute, un benchmark opțional neexecutat |
| Acceptanță finală metadate/catalog/Worker | 46/46 teste trecute pe buildul final |
| Browser, acoperire combinată | 197 scenarii distincte validate; lotul complet inițial 194/196, cu cele două eșecuri remediate și reverificate |
| Selector homepage | Toate cele nouă scenarii trecute de două ori: 18/18, inclusiv întrerupere scroll, deplasare layout, desktop/mobil, reverse scroll și reduced motion |
| Previzualizări browser | 2/2, HTML prerandat/JPEG și navigare SPA |
| Lot public final | 48/48: rute, responsive, formulare/autentificare, tier de performanță și integrare dashboard |
| Worker nativ cu activele reale de build | 78 cereri pe URL-uri fără extensie pentru trei user-agents de preview, 26 JPEG-uri reale, șase verificări GET/HEAD private: trecute |
| API privat nativ | Cererile neautentificate refuzate 401; shell privat fără canonical, cu noindex și no-store |
| Builduri | Static, Pages și Worker standalone trecute; API și e-mail dry-run trecute, fără deploy |
| Tipuri/lint | Aplicație și Worker trecute; zero erori ESLint, patru avertismente Fast Refresh preexistente |
| Integritate D1 | Schema locală completă prin 0087 verificată; producție quick_check=ok, zero erori FK |
| Catalog și conținut editabil | 87 produse/trei planuri și 12 pagini/3.094 câmpuri verificate |
| Dependențe | Audit complet root și API: zero vulnerabilități raportate |
| SEO local/live | 77 URL-uri publice indexabile, 212 pagini publice noindex, 11 rute strategice de produse; live 77 URL-uri și două robots.txt verificate |
| Vizual | 26 coperte inspectate; fișă client, bibliotecă, tipizate, header și chat inspectate desktop/mobil; verificări automate de overflow și accesibilitate de bază |

Verificarea HTTP a previzualizărilor folosește Workerul nativ și ASSETS cu `Accept: */*`, pe rutele canonice. Serverul Vite preview folosit de testele UI are alt fallback pentru URL-urile fără extensie; testul de artefacte citește fișierele HTML explicit și le verifică metadatele fără JavaScript. În aceste teste nu se tratează fallbackul Vite ca implementare a rutării de producție.

Nu s-au făcut push, PR, merge, migrări remote sau deploy. Testul contului real final și verificările după lansare rămân separate de rezultatele locale. Contul de test autorizat și autentificarea sa reprezintă singura modificare efectivă în producție din acest task.
