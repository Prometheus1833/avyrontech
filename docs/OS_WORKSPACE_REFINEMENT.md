# AVYRON OS — Financiar, Centre, AVY Engine și Media

Implementare locală pe `codex/os-workspace-refinement-2026-11-05`, de la `3aa2ead`. `origin/main` verificat la început: `631a127`. Push, PR, merge, migrare remote și deploy sunt amânate până la finalul lotului, conform utilizatorului. Nicio activare de furnizor sau serviciu plătit.

## Navigare și accesibilitate

- AVY Engine este în categoria AVYRON OS. Cariere și Biblioteca Artefacte sunt în Platformă, după Configurator; Domenii este înainte de Surveys. Altele este ultima categorie.
- Control platformă este eliminat din meniu. URL-ul vechi `tab=platform-control` deschide centrul unic, păstrând compatibilitatea linkurilor.
- Profil nu mai afișează cardurile AI AVY Prod / AVY Engine de jos. Intrarea contextuală AI din prezentarea generală rămâne.
- Meniul folosește butoane native cu `aria-current`, focus vizibil și navigare cu săgeți/Home/End. Conținutul este etichetat ca regiune; categoriile pliabile își păstrează semantica de butoane.
- Scrollurile native și Radix sunt plate, discrete și consistente în dashboard, inclusiv dialogurile portate. Stilul este activ numai pe suprafața internă; navigarea înapoi restabilește atributul anterior. Culorile de sistem sunt respectate în forced-colors. Stilul public existent este păstrat.

## Financiar

Ruta `/profil?tab=finance` păstrează toate cele zece instrumente și API-urile native, grupate în cinci zone:

| Grupă | Instrumente |
| --- | --- |
| Situație și rapoarte | Prezentare generală, Statistici |
| Venituri și încasări | Venituri, Încasări |
| Cheltuieli și limite | Cheltuieli, Abonamente, Bugete |
| Conturi și facturare | Conturi, integrarea existentă de facturare |
| Alerte și audit | Alerte, Audit |

Patru indicatori principali, detalii secundare pliabile și acțiuni către registrele reale. Panoul conturilor/facturării nu se mai dublează în prezentare. Linkurile `view=receipts`, etc. funcționează în continuare și respectă permisiunile. Răspunsurile întârziate nu suprascriu perioada curentă; evenimentul local de încasare actualizează situația. Perioadele și bugetele folosesc calendarul Europe/Bucharest, inclusiv zilele de 23/25 ore. Intervalele invalide au eroare explicită. Nicio modificare de plată sau emitere fiscală externă.

## Centre AVYRON OS

`/profil?tab=os-centers`: antetul operațional este primul element, fără inventarul de carduri de deasupra. Directorul caută tolerant la diacritice și filtrează pe categorii, exclusiv în destinațiile permise utilizatorului. Butoanele deschid secțiunea canonică și, unde este util, instrumentul relevant: Generator, Încasări, Fluxuri Engine. Nu copiază formulare sau date.

Registrele operaționale, automatizările, integrările, evaluările și notificările existente sunt păstrate pentru rolurile autorizate. Contractele operaționale istorice rămân accesibile; crearea unui document contractual nou deschide generatorul Document Center.

## AVY Engine

`/profil?tab=avy-engine`, cu `engineView` pentru subpagină. Căutare, filtru de stare, editare surse și instrumentele existente. Punerea unei surse în pauză oprește și discovery pentru sursa respectivă.

Owner și Super Admin activi au drepturi complete, conform mandatului curent. Eticheta generică Admin nu acordă acces implicit la documentația privată Engine; celelalte accesuri necesită capabilități explicite. Politica MFA nativă este păstrată.

`POST /api/engine/bindings/reconcile`, cu confirmare, limitare și audit, pune în pauză legăturile active neeligibile. Eligibilitatea cere capabilitate ready, sursă activă, securitate reviewed și verificările robots/terms. Aceleași condiții sunt reverificate la activare și proiecție, astfel încât o schimbare de stare este aplicată imediat la citire. Sincronizarea nu reactivează legături, nu apelează furnizori, AI sau discovery și raportează numărul real de legături puse în pauză.

## Media — resurse vizuale private

`/profil?tab=media`: biblioteci Resurse AVYRON și Resurse clienți, categorii logo/identitate/icon/imagine/ghid/altele, căutare, filtre, paginare, metadate, previzualizare la cerere, descărcare, arhivare/restaurare. Contextul beneficiarului și fișierul original sunt imuabile; metadatele au revizie pentru a preveni suprascrierile concurente. Atașamentele legacy rămân în proiectele existente, fără copiere sau ștergere.

Migrarea aditivă `0085_visual_assets.sql` creează `visual_assets` și `visual_asset_backups`, cu FK spre CRM, proiecte și utilizatori existenți. Blocarea schimbării beneficiarului unui proiect include aceste resurse. API tipizat `/api/visual-assets`: options/context, listare, upload, PATCH metadate, content, backups, backup și restore. Autentificare nativă, rol/capabilitate, autorizare la resursă și verificarea curentă a proiectului la fiecare operațiune; cache privat no-store. Scrierile respectă MFA nativ și limitele de rată.

Fișierele folosesc `FILES` privat existent, chei opace și checksum. Upload de maximum 15 MiB, SVG maximum 2 MiB, tipuri explicite și verificare de semnătură pentru raster/PDF. Retry-ul uploadului este idempotent; erorile curăță obiectele neînregistrate. Previzualizările se cer doar la deschidere, fără descărcarea tuturor imaginilor din listă. Blob URL-urile sunt revocate.

**Scannerul antimalware nu este configurat.** Toate încărcările noi rămân în carantină; nu există buton/API care să le declare curate. Inspectarea în carantină este permisă principalilor activi; pentru resursele clientului, și autorului încă autorizat în context. Revocarea proiectului sau statutului de principal revocă imediat acest acces. SVG și PDF se descarcă exclusiv ca atașamente, cu sandbox CSP/nosniff; numai rasterul are previzualizare. Nu se publică automat și nu există linkuri anonime sau acces AI nou. Biblioteca Media este o suprafață staff; nu introduce un portal Media separat pentru client.

## Backup și restaurare

Sunt reutilizate destinațiile private existente: `DOCUMENT_COMPANY_BACKUPS` pentru AVYRON, `DOCUMENT_BACKUPS` pentru clienți. Funcția este disponibilă doar Owner/Super Admin când flagurile existente confirmă confidențialitatea și izolarea. Nu sunt create bucketuri ori abonamente.

Backupul manual copiază fișierul și un manifest JSON al metadatelor într-o destinație separată; verifică ambele checksumuri după scriere. O copie validă identică pentru aceeași resursă și aceleași metadate este reutilizată, fără deduplicare între beneficiari. Modificarea metadatelor produce o copie nouă, chiar când originalul are același checksum. Copiile incomplete sunt curățate; erorile de curățare au log cu identificatori opaci. Înregistrarea verificată și auditul se salvează atomic în D1.

Restaurarea verifică fișierul și manifestul, rescrie numai originalul cu același checksum și verifică rezultatul. Păstrează metadatele curente, arhivarea, carantina și accesul curent; nu reintroduce permisiuni revocate. Necesită rândul D1 curent. Manifestul ajută recuperarea autorizată a metadatelor, dar această funcție nu este restaurare automată completă D1 în caz de dezastru. Strategia existentă de backup D1 trebuie păstrată separat. Nu există reguli noi de expirare/ștergere sau job automat de backup Media.

## Verificare și lansare

Verificarea locală workerd/D1/KV/R2 a trecut opt scenarii: autentificare, upload/retry, carantină și bytes private, backup fișier+manifest/reutilizare, restaurare, metadate concurente/arhivare, păstrarea metadatelor la restaurarea copiei vechi și sincronizare Engine fără apeluri externe. Toate migrațiile au fost aplicate numai în fixture izolată. Verificările readonly SQLite ale celor două fișiere D1 locale confirmă integritatea și lipsa erorilor FK; Wrangler refuză aceste PRAGMA cu `SQLITE_AUTH`, de aceea verificarea a fost făcută direct pe stocarea locală.

- TypeScript app + Worker: trece. Tipurile Cloudflare verificate; build API `--dry-run`: trece, fără deploy.
- `npm run build:pages` (include buildul static) și `npm run build:worker`: trec pe versiunea finală. Adaptorul Pages este regenerat după buildul Worker.
- Audit static SEO: 77 pagini indexabile, 212 noindex, 11 URL-uri strategice de produse. Acesta verifică buildul, nu indexarea live Google.
- Vitest complet: **87 fișiere, 733 teste trecute, 1 benchmark opțional omis**.
- ESLint complet: zero erori, patru avertismente Fast Refresh existente în componentele Logo; fișierele modificate ulterior au verificare suplimentară fără erori.
- Capturi verificate vizual la 320, 390 și 1440 px pentru Financiar, Centre, Engine și Media; fără overflow orizontal. Verificarea axe a suprafeței Media, inclusiv meniul, nu raportează probleme serioase/critice. Capturi locale: `/tmp/avyron-os-refine-local/screenshots/`.
- Browser complet inițial: 178/182 trecute; patru teste foloseau intrări/carduri eliminate sau navigarea financiară anterioară. Așteptările au fost actualizate pentru butoanele native și destinațiile canonice, păstrând aserțiunile de funcționalitate. Cele trei teste AI/Engine/Financiar au trecut separat după corectare. Lotul final pe buildul curent: **30/30 trecute**, acoperind Servicii (inclusiv al patrulea test corectat), Clienți și toate noile suprafețe. Cele 182 de scenarii distincte au astfel rezultate trecute; nu există eșecuri nerezolvate. Scrollurile sunt verificate și pe `/intern/servicii` și `/finance`, cu păstrarea stilului public.

La lansarea autorizată: integrează ultimul main pe ramura de task, rezolvă eventualele conflicte, rulează din nou verificările relevante, deschide PR, aplică 0085 după migrările anterioare și înainte de API, apoi livrează interfața. Verifică bindingurile/flagurile private reale, autentificarea, permisiunile și scenariile cu conturi reale. Utilizatorul a ales să facă testul final în cont ulterior. Testele locale nu dovedesc livrarea în producție sau configurarea unui scanner.
