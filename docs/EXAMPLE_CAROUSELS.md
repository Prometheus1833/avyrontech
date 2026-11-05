# Carusele Exemple și notificări — 06.11.2026

Stare: implementare și verificare locală pe `codex/example-carousels-notifications-2026-11-06`, de la `520c42e`. Push, PR, merge, migrații remote și deploy sunt amânate până la finalul lotului, conform utilizatorului. Funcționalitatea nu este încă în producție.

## Utilizare

Platformă → **Carusele Exemple**, ruta `/profil?tab=example-carousels`, deschide registrul căutabil al celor zece pagini native de servicii. Contextul unei pagini se poate deschide direct prin `&carousel=<cheie>`. Lista folosește registrul existent `SERVICE_PAGES`; extinderea unei pagini noi se face acolo și prin includerea componentei publice în pagina respectivă.

Fiecare carusel are trei zone compacte:

- **Exemple**: adăugare, editare RO/EN, link public, imagine existentă sau URL HTTPS public, text alternativ, ordine, vizibilitate, arhivare și eliminare din ciornă; previzualizare cu componenta publică.
- **Setări**: activare, titlu/subtitlu/descriere RO/EN opționale, redare automată, viteză, lățime card, spațiere, încadrarea imaginilor și săgeți. Câmpurile de titlu goale păstrează textele existente ale paginii.
- **Istoric**: versiuni imuabile, restaurare ca o ciornă nouă și jurnalul acțiunilor cu autor/data.

Sunt păstrate cele 18 exemple existente de la Site Prezentare Profesional. Celelalte servicii nu afișează o secțiune goală; devin vizibile după configurare și publicare. Ascunderea/arhivarea/ștergerea sunt modificări de ciornă și ajung pe site numai prin publicarea explicită a versiunii aprobate.

## Flux și integrare

`Ciornă → În verificare → Aprobat → Publicat`, cu ramura `De revizuit` după respingere. Fiecare modificare de conținut creează o revizie nouă și invalidează aprobarea pentru acea ciornă. Versiunea publicată rămâne activă până la publicarea unui înlocuitor; dezactivarea întregului carusel trece prin același flux. Salvarea nu publică.

Trimiterea la verificare adaugă sursa `carousel` în centrul de aprobări existent și notificări native deduplicate pentru proprietarii/administratorii platformei eligibili. Verificarea se deschide în contextul caruselului; aprobarea și publicarea sunt acțiuni distincte, cu confirmare explicită. Nu există publicare externă automată sau furnizor nou.

Salvarea explicită și salvarea la navigare folosesc revizia de bază și chei de idempotentă. Conflictele nu suprascriu versiunile altui editor. La eșecul salvării, navigarea este blocată și editările rămân în memorie, izolate după cont/pagină; se poate descărca recuperarea JSON sau reîncărca explicit. Memoria de recuperare nu persistă după închiderea/reîncărcarea browserului. Formularul unui exemplu trebuie confirmat sau închis înainte de navigare.

## Date, API și acces

Migrarea aditivă `0088_example_carousels.sql` creează `example_carousel_configs` și `example_carousel_versions`, cu FK, index de verificare și triggeri pentru istoricul imuabil. Se aplică înainte de API; nu modifică servicii, CRM, fișiere private sau prețuri. Nu sunt necesare bindinguri sau abonamente noi.

API:

- `GET /api/public/example-carousels/:key`: numai proiecția versiunii publicate, fără ciorne, exemple ascunse/arhivate, istoric sau autori.
- `GET /api/admin/example-carousels`, `GET /:key`, `GET /:key/versions/:revision`: registru, context, istoric.
- `PUT /api/admin/example-carousels/:key`: salvare `{revision,config}`, cu `Idempotency-Key`.
- `POST /api/admin/example-carousels/:key/{submit|approve|reject|publish}`: `{revision,confirmed:true}`, cu `Idempotency-Key`.

Se reutilizează autentificarea, rangurile, politica MFA și acordurile existente. Owner/Super Admin au acces complet. Staff legacy poate consulta; staff gestionat primește explicit `examples.read`, iar `examples.edit`, `examples.approve`, `examples.publish` sunt independente și necesită citire. Revocarea se verifică în backend inclusiv înaintea reluării unei operațiuni idempotente. Nu se acordă automat drepturi suplimentare rangurilor inferioare. Clienții nu accesează API-ul de administrare. Răspunsurile administrative sunt `private, no-store`.

Validare strictă, maximum 80 de exemple/configurație, corp de maximum 200 KiB, limitare cereri, CAS și batch D1 atomic pentru configurație/versiune/audit/idempotentă. Adresele acceptă numai destinații publice HTTPS sau căi publice permise; sunt respinse URL-uri cu credențiale/tokenuri, destinații locale/IP și fișierele/API-urile private AVYRON. Serverul nu descarcă URL-urile furnizate. Nu se publică implicit resurse Media private. Încărcarea unei imagini noi se face prin fluxul existent; acest modul acceptă referințe către imagini deja publice, fără a crea un bucket public.

## HTML public și performanță

Worker-ul API și adaptorul Pages/Worker rescriu la cerere doar secțiunea opțională și bootstrapul ei cu versiunea curentă publicată. Exemplele retrase nu rămân în HTML-ul prerandat și nu reapar la inițializarea React. La indisponibilitatea datelor, secțiunea este ascunsă; restul paginii rămâne disponibil. `max-age=0, must-revalidate` evită publicarea unui snapshot vechi. Un refresh necesită citirea versiunii din D1 existent; nu este introdus un serviciu plătit.

Prerandarea statică rămâne compatibilă și păstrează exemplele inițiale în artefactul de build. Publicarea dinamică este garantată de Worker-ul AVYRON, nu de un host care servește exclusiv fișiere statice fără adaptor. Într-o filă deja deschisă, React verifică actualizările la revenirea în focus și periodic, la 60 s. Imaginile se încarcă lazy, fără referrer. Mișcarea se oprește în afara ecranului, în tab ascuns și la preferința de mișcare redusă; sunt păstrate swipe-ul, tastatura și săgețile. Nu se adaugă efecte 3D.

## Notificări

Clopoțelul deschide un popover nemodal ancorat dedesubt, aliniat la margine și limitat la viewport. Fără overlay sau blocarea paginii. Păstrează filtrele, necititele, marcarea citirii și navigarea către destinațiile permise. Include închidere explicită, Escape, click exterior, focus returnat și scroll interior. Cererile sunt anulate la schimbarea contului/demontare; sursele sunt citite numai când există dreptul relevant. Erorile parțiale sunt afișate fără a pretinde că lista este goală.

## Lansare și limite

Se folosesc strategia D1 și auditul existente; configurațiile și istoricul trebuie incluse în backupul bazei. Imaginile publice externe rămân în responsabilitatea sursei; nu sunt copiate în R2 și nu primesc backup automat în acest modul. Nu sunt emise notificări e-mail sau mesaje sociale. Exemplele noi și textele lor se completează de către operator; nu sunt inventate proiecte pentru servicii fără exemple.

Înainte de lansare: review-ul lotului, actualizarea cu `main`, backup D1 verificat, migrațiile locale neaplicate în ordine (acum 0078–0088), verificările de build/API, deploy pe destinațiile existente și testul în cont real pe care utilizatorul îl va efectua ulterior. Nu considera testele locale echivalente cu acceptanța în producție.

## Verificări locale

- TypeScript aplicație/Worker: trecut; ESLint: zero erori și cele patru avertismente Fast Refresh preexistente.
- Build static (inclus în Pages), Pages, Worker standalone și API dry-run: trecute. Audit SEO: 77 pagini indexabile, 212 pagini publice noindex, 11 URL-uri strategice de produse. Aceste cifre nu dovedesc indexarea Google.
- Suita completă Vitest: 93 fișiere, **765 teste trecute**, un benchmark sintetic de limitare publică omis implicit (necesită `AVYRON_BENCH_PUBLIC_LIMITS=1`). Testele includ separarea drepturilor, MFA, revocare, retry idempotent, CAS concurent, integritatea migrărilor, istoricul imuabil, validarea URL-urilor și proiecția publică.
- Worker local real, cu toate migrările în D1 izolat și autentificare nativă: salvare/verificare/aprobare/publicare, versiune publicată distinctă de ciornă, notificări, istoric, refuzul accesului clientului la registru/ciornă/versiuni, HTML/bootstrap actualizate și lipsa exemplelor ascunse/arhivate/șterse. Adăugarea și publicarea unui carusel SEO nu schimbă caruselul website.
- Indisponibilitate simulată exclusiv local: pagina răspunde 200 și ascunde secțiunea, cu bootstrap null. Schema a fost restaurată. Comanda PRAGMA prin emulatorul Wrangler a returnat `SQLITE_NOMEM`; verificarea directă, read-only, a fișierului SQLite după oprirea Workerului a confirmat `quick_check=ok`, zero erori FK și restaurarea tabelelor.
- Browser pe Worker local: datele publicate se păstrează după inițializarea React; layout mobil fără overflow; contrastul titlului pe pagina SEO corectat și inspectat vizual. Panoul notificărilor este verificat și capturat la 320, 390 și 1440 px, sub clopoțel, fără blocarea paginii.
- Playwright: **86 scenarii distincte verificate** în total: 76 de regresii existente trecute în rularea extinsă, apoi toate cele 9 scenarii noi și scenariul de redirecționare Portofoliu trecute împreună (10/10). Au fost corectate două condiții ale testelor: clickul exterior nu trebuie să lovească scrollbarul nativ, iar serverul static de preview necesită fixture pentru noul API public în navigarea SPA din rutele legacy. Nu s-a introdus un fallback public care să readucă exemple ascunse. Pe Worker-ul nativ, `/portofoliu`, `/despre-si-portofoliu`, `/index.html` și varianta `.html` ale serviciului au fost verificate separat: toate ajung la caruselul curent publicat, inclusiv după pornirea React.
