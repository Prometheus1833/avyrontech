# Proiecte, control social și activități recurente

Implementare din 6 noiembrie 2026, pornită de la `dcfd638f5134ea9d04f148897b423f7ed0fa4500` (release-ul anterior, PR #93). Acest document descrie noua ramură; nu reprezintă confirmarea migrării sau a lansării ei în producție.

## Proiecte

`/profil?tab=projects` și `/intern` folosesc același formular și același API. Câmpul tehnic Slug este înlocuit cu Etapă; identificatorul URL este generat de server, cu sufix opac, fără schimbarea adreselor proiectelor existente.

| Etapă | banner_status | status existent în D1 |
| --- | --- | --- |
| Propus | proposed | lead |
| În dezvoltare | in_progress | in_progress |
| Testare | testing | in_progress |
| Finalizat | online | live |

Pipeline-ul are cele patru coloane. Starea veche `revizuire` intră în Testare, iar `offline` în Propus. Fișa proiectului permite selectarea acelorași etape și actualizează împreună stările tehnice. Nu sunt modificate automat înregistrările istorice.

Clientul poate fi existent, nou sau încă nealocat. Mini-formularul cere denumire și e-mail, plus tip, persoană de contact și telefon opționale. El reutilizează `/api/admin/operations/clients`, cu idempotency key și `account.mode=none`. Nu inventează date fiscale și nu creează automat un cont ori o parolă. Conturile se asociază explicit; potrivirea unei adrese de e-mail nu acordă acces.

Un proiect nealocat are `client_id=NULL`, fără client fictiv. Autorul are alocarea staff existentă; clienții nu primesc acces. Contul clientului și abonamentul nu pot fi atașate înaintea beneficiarului. Asocierea ulterioară din fișa clientului este rezervată dreptului existent de administrare și acceptă proiectul nou cu istoricul intern al etapelor și alocările staffului, dar refuză proiectele cu istoric comercial, documente, mesaje, servicii sau alte date de beneficiar. Verificarea concurentă rămâne atomică, inclusiv pentru NULL; un proiect cu istoric nu se transferă între clienți.

## Manager Social Media

`/profil?tab=social-manager` păstrează politica editorială și permisiunile proiectului AI. Mini-dashboardul activităților conține:

- Aprobă/Respinge planul: temă și calendar, cu confirmare și verificarea reviziei. Respingerea oprește activitatea; aprobarea planului nu aprobă materialul viitor.
- Vezi materialul, Trimite la aprobare, Aprobă/Respinge materialul: aceeași instanță și versiune editorială, inclusiv când filtrul listei principale nu o afișează. Ciorna trece întâi în așteptarea aprobării.
- Reîncearcă pregătirea: numai stări eligibile, în infrastructura existentă, cu verificarea reviziei afișate. Bugetele și politica de aprobare rămân aplicabile.
- Sincronizează stările: reconciliază numai relațiile D1 ale proiectului selectat. Actualizarea editorială sincronizează și activitatea asociată, în aceeași tranzacție.
- Actualizează planul: doar Owner/Super Admin, doar proiectul selectat și politici active. Cheile stabile împiedică dublarea sarcinilor. Nu pornește schedulerul global, generare AI sau apeluri către furnizori.

API-uri noi: `POST /api/ai-projects/:projectId/social-jobs/:jobId/review` și `POST /api/ai-projects/:projectId/social-manager/sync`. Se păstrează autentificarea, MFA, apartenența activă, permisiunea de aprobare și auditul server-side. Conflictele întorc 409. Articolele se revizuiesc prin studioul existent. Publicarea/programarea și mesajele externe nu sunt executate de aceste comenzi.

Coada este limitată la 60 de activități și 60 de programări. Planurile oprite recent apar după activitățile active, timp de șapte zile; istoricul rămâne în baza existentă. Conținutul expirat nu primește butoane de aprobare.

## Navigare

Grupa **Activități Recurente**, înainte de Documente, include Mentenanță Clienți (`tab=client-maintenance`), Abonamente Clienți și Abonamente AVYRON, filtrate prin RBAC existent. Mentenanța reutilizează registrul de abonamente și materialele/echipele alocate.

AVY Core rămâne în AVYRON OS, cu diagnostice și operațiuni de sistem pentru Owner/Super Admin. Legăturile client/subscription/upbar sunt actualizate. Vechile legături `tab=maintenance` pentru clienți și staff duc la mentenanța clienților; pentru proprietari, legăturile vechi cu proiect selectat sunt de asemenea compatibile. `tab=maintenance&core=system` rămâne destinație de sistem. Navigarea mobilă folosește aceleași permisiuni.

## Migrații și lansare

1. `0091_optional_project_client.sql` elimină exclusiv obligativitatea beneficiarului. D1 impune foreign keys și nu permite dezactivarea lor. Migrarea salvează temporar în aceeași tranzacție toate cele 49 de tabele dependente, reconstruiește părintele și restabilește exact rândurile, indexurile și triggerele. Verificările EXCEPT/count/FK întrerup și anulează migrarea dacă datele diferă. Nu rămân tabele auxiliare după succes. Un trigger păstrează interdicția existentă de a elimina beneficiarul unui proiect deja alocat; protejează și vechiul guard CAS care folosea NULL în intervalul dintre migrare și deploy. Se permite proiect nou nealocat și asocierea sa ulterioară, nu dezalocarea implicită. Generatorul reproductibil este `scripts/migrations/generate-optional-project-client.py`; migrațiile lansate nu se regenerează sau editează.
2. `0092_social_plan_review.sql` adaugă exclusiv metadatele aprobării planului, separat de starea editorială.
3. Înaintea aplicării remote: backup privat D1 și manifestul existent R2, verificarea schemei și a triggerelor curente, spațiu disponibil pentru copia tranzacțională a tabelelor dependente, probă pe o copie a datelor actuale, apoi migrațiile prin fluxul existent de release. Nicio modificare a obiectelor sau bindingurilor R2 nu este necesară.
4. După release autorizat: foreign_key_check în D1, integritate pe copia SQLite, verificarea reviziei Worker și test autentificat în conturile autorizate. Un test de browser cu API simulat nu confirmă integrarea în producție.

Verificări pregătite: teste Hono/SQLite pentru etape, idempotency, izolare client, asociere concurentă, planuri sociale, revizii, MFA și revocare; păstrarea datelor și rollback-ul migrării cu chat/documente/backupuri; replay D1 local nativ, inclusiv date sintetice; teste browser desktop și 320/390 px. Rezultatele exacte sunt consemnate în PR.

Nu sunt activate servicii, chei, conturi, abonamente plătite, furnizori AI sau antivirus. Configurarea Bouncer și verificările de conformitate rămân o etapă separată; poarta fail-closed a uploadurilor este păstrată. Testul final în contul real rămâne la utilizator, conform deciziei sale.

## Rezultatele verificării locale

- `npm test -- --maxWorkers=2`: 96 fișiere, 830 teste reușite, un benchmark opțional omis. Rularea separată de browser a păstrat limitele de timp și toate aserțiunile. Cele 27 de teste CRM/migrare au fost reluate cu succes după verificarea suplimentară a alocării unui proiect care și-a schimbat etapa.
- Browser: 238 cazuri verificate. 233 au trecut în rularea extinsă inițială; patru au trecut izolat după încărcarea simultană a mediului, iar testul legăturii de mentenanță a trecut după actualizarea denumirii așteptate. Testul meniului personal a fost reluat și cu noul URL. Cele 19 cazuri Social/Proiecte/Core au trecut, inclusiv 320/390 px, client nou/existent/nealocat și recuperare după eroare. Capturile locale au fost inspectate.
- Typecheck app/Worker, `build:pages` (include buildul static), `build:worker`, `build:api` dry-run și auditul complet D1: reușite. Lint: zero erori, patru avertismente existente în componente 3D; verificările suplimentare ale fișierelor finale: zero erori.
- D1 nativ local: toate migrațiile și o probă populată până la 0092, fără erori FK; mesajul, cele trei asocieri de document, backupul vizual și abonamentul sintetice au rămas prezente, iar triggerul suplimentar a fost creat. Comparația de integritate/egalitate și rollback-ul au trecut separat în SQLite cu foreign keys active.
- Nu au fost aplicate migrațiile 0091/0092 remote și nu s-a făcut deploy pentru această ramură. CI și acceptanța în contul real sunt stări distincte de aceste rezultate locale.
