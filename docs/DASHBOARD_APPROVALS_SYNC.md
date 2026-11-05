# Dashboard și aprobări AVYRON OS

Implementare din 5 noiembrie 2026, pornită din `c4403abc`. Documentul distinge codul propus de operațiile Cloudflare deja executate.

## Comportament

Prioritățile folosesc carduri compacte, în două coloane când spațiul permite. Panourile se aliniază la început și nu își întind reciproc înălțimea. Lista de aprobări are acțiuni în același rând cu textul. Interfața păstrează tema AVYRON, navigarea mobilă și accesul prin tastatură.

Centrul citește înregistrările originale, fără o a doua bază de aprobări:

| Sursă | Solicitări incluse | Decizie |
| --- | --- | --- |
| `ai_approvals` | active, neexpirate, cu rulare și pas în așteptare | API-ul existent de aprobare AI; versiune verificată |
| `ai_content_items` | materiale `pending_approval`, neexpirate; regula de trei zile AVYRON WEB se păstrează | numai Owner; verificare `updated_at` |
| `operation_records` | contracte și modificări `pending`, nearhivate | API-ul existent; revizie și idempotency key |
| `document_template_versions` | ultima versiune `review_required`, autorizată prin politica documentului | modelul exact din Document Center; referință obligatorie pentru revizuire |
| `ai_learning_queue` | întrebări `pending` | secțiunea Auto-învățare, cu permisiunile originale |

Ciornele obișnuite și versiunile de documente fără o cerere explicită de aprobare nu sunt transformate automat în solicitări. Aprobarea nu publică și nu transmite materiale. Modelele juridice existente rămân neaprobate.

Lista se reîmprospătează la 30 de secunde când pagina este vizibilă, la revenirea în fereastră și după decizie. Overview se actualizează la 60 de secunde. Răspunsurile întârziate nu suprascriu solicitări mai recente. Erorile păstrează ultimul rezultat și oferă reîncercare. Paginarea folosește cursor stabil, inclusiv când mai multe cereri au aceeași dată. Datele sunt recitite înainte de decizie; versiunile schimbate sunt refuzate.

## API și izolare

- `GET /api/os/approval-center?source=…&cursor=…`
- `GET /api/os/approval-center/:source/:id`
- `GET /api/os/storage`

Rutele folosesc sesiunea și rolurile existente, cu `Cache-Control: private, no-store`. Centrul este rezervat principalilor de platformă autorizați. Politica Document Center filtrează inclusiv modelele provenite din documente private. Detaliile, numele obiectelor R2 și tokenurile nu sunt returnate de verificarea infrastructurii. Datele proiectelor din overview respectă proprietarul, apartenența activă la organizație și alocările/granturile staff, cu revocare la următoarea cerere.

Verificarea surselor face citiri reale prin bindingurile existente: D1, KV, R2 documente, R2 media, R2 backup și SQLite din Durable Object-ul de export. Backupul corporativ apare numai utilizatorilor cu permisiunea sa dedicată. Fiecare probă are timeout de cinci secunde; verificarea este limitată la 12 cereri/utilizator/oră. O probă de citire confirmă accesul resursei, nu recuperabilitatea tuturor backupurilor sau configurarea unui furnizor extern.

Migrarea `0077_dashboard_approval_indexes.sql` adaugă numai indexuri pe sursele originale. Nu modifică înregistrările comerciale și nu introduce un serviciu de stocare nou.

## Audit și sincronizare Cloudflare executată

În contul AVYRON au fost identificate D1 de producție și D1 preview. Baza altui proiect din același cont nu face parte din AVYRON și nu a fost conectată. Producția și preview păstrează date și bindinguri distincte.

Preview avea 24 de migrații aplicate și 51 restante. Înainte de aliniere s-a exportat schema și conținutul, s-a reconstruit indexul FTS local și s-a verificat restaurarea: integritate validă, zero erori FK, 125 de tabele incluzând structurile FTS. Copia privată rămâne local în `.dashboard-sync.local/preview-backup/`, exclusă din Git.

Cele 51 de migrații au fost aplicate exclusiv bazei preview, în mandatul de sincronizare acordat de utilizator. Verificarea remote finală: 75/75 fișiere din istoricul local, `quick_check=ok`, zero erori FK, FTS accesibil, 11 versiuni de modele. Conturile, clienții, proiectele, serviciile și facturile preview au rămas la zero, conform situației de dinainte. Nu s-au copiat date de producție. D1 remote nu acceptă `PRAGMA integrity_check`; s-a folosit `PRAGMA quick_check`, conform scriptului de release existent.

D1, KV, R2 și Durable Objects necesare aplicației sunt deja configurate. Nu s-a activat un plan nou sau serviciu plătit. Vectorize nu are index ori consumator implementat; tokenul CLI actual nu permite administrarea Vectorize/KV/R2. Interfața Cloudflare a confirmat zero indexuri Vectorize. Nu declarăm că această integrare este activă. Hyperdrive ar necesita o bază externă care nu există în arhitectura auditată. Workers AI rămâne sub politica Cost Guard existentă.

Limitele Free documentate la audit sunt 5 milioane de rânduri D1 citite/zi, 100.000 scrise/zi și 5 GB, respectiv 100.000 citiri KV/zi și 1.000 operații zilnice pentru fiecare dintre scrieri/ștergeri/listări. Disponibilitatea unei limite gratuite nu justifică duplicarea datelor ori activarea unui produs fără un consumator. Consultați [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/) și [KV pricing](https://developers.cloudflare.com/kv/platform/pricing/) înainte de schimbări de plan.

Conectorul extern Cloudflare din registrul AI este separat de bindingurile native. Nu există o conexiune autorizată acolo, iar adaptorul actual inventariază DNS, nu bazele de date. Panoul nativ nu pretinde că acest conector extern s-a sincronizat.

## Verificare și release

Datele vizuale de verificare sunt sintetice, într-un Worker local cu D1/KV/R2/DO locale. Aprobarea unui contract local a redus lista de la 13 la 12 fără reîncărcare manuală. Au fost verificate filtrul listei complete, legătura spre modelul juridic exact și legătura spre Auto-învățare. Mobile 390 px nu are overflow orizontal. Capturile sunt în [docs/qa/dashboard-approvals-2026-11-05](./qa/dashboard-approvals-2026-11-05/).

Testele runtime execută handler-ele Hono și SQL-ul real peste toate migrațiile: surse, expirare, paginare, CAS, aprobare operațională, izolare corporativă, roluri, revocare și erori de infrastructură. Testele React verifică revizuirea explicită, polling-ul, oprirea în tab ascuns și blocarea aprobării juridice generice. Playwright verifică decizia și sincronizarea listei, plus cardurile la 1440/390/320 px.

Codul dashboardului și indexul 0077 de producție necesită release-ul ramurii. Alinierea bazei preview nu reprezintă lansarea codului nou în producție. Acceptanța în contul real rămâne la utilizator, conform preferinței exprimate anterior. Nu au fost trimise mesaje și nu au fost aprobate documente reale în timpul testelor.

### Rezultate locale

- `npm run typecheck`: aplicație și Worker valide.
- `npm run lint`: zero erori; patru avertismente React Refresh preexistente în componentele Logo Studio.
- `npm run audit:d1`: toate migrațiile și verificările de consistență au trecut.
- `npm test`: 79 fișiere valide, 616 teste trecute, un test preexistent omis.
- Testele UI ale centrului: cinci trecute, inclusiv recuperarea după eroare în dialogul deschis.
- Build static/Pages, API și e-mail: valide. Auditul dependențelor de producție: zero vulnerabilități raportate.
- Prima rulare Playwright a identificat overflow la 320 px în antet și în lățimea minimă a panourilor existente. Aceste elemente au fost corectate; în verificarea browserului local, lățimea documentului a devenit egală cu lățimea disponibilă (309 px într-un viewport de 320 px cu scrollbar).
- După remedierea responsive: toate cele 24 de teste Playwright ale dashboardului au trecut; cazurile de 1440/390/320 px sunt valide. Restul suitei inițiale a avut 110 teste trecute; cazul de 320 px găsit atunci a trecut la rerularea modulului.
- Handler-ele runtime au fost reverificate după protecția pentru expirarea unui material în timpul revizuirii: 21/21 trecute. Buildul API final este valid.
- Buildul standalone Worker a trecut, cu auditul SEO neschimbat: 77 pagini indexabile și 212 pagini publice noindex. Bundle-urile de producție nu conțin adresa API-ului local.
