# Abonamente Clienți și Abonamente AVYRON

Etapă locală pe `codex/client-internal-subscriptions-2026-11-05`, pornită din `8fa9b41`. `origin/main` verificat la început: `631a127`. Schimbările anterioare Document Center/dashboard/Social/AVY Core/Leaduri/Servicii sunt păstrate. Utilizatorul a amânat push și deploy până la încheierea taskurilor; această etapă nu publică, nu emite facturi și nu debitează conturi reale.

## Navigare și interfață

- `/profil?tab=subscriptions-admin`: **Abonamente Clienți**, cu monitorizare înaintea cataloagelor, rânduri compacte și detalii extensibile, căutare și filtre după stare/facturare/cont.
- Imediat dedesubt, `/profil?tab=internal-subscriptions`: **Abonamente AVYRON**, vizibilă staffului și administratorilor; absentă din contul clientului.
- `/profil?tab=subscriptions`: secțiunea existentă a clientului, care afișează și planul/specificațiile alocărilor manuale, calendarul lunar și termenul de plată.

Mini-dashboardul **Alocă client** acceptă o fișă existentă sau creează o fișă nouă în `clients`. Selectează un cont verificat, planul din catalogul existent, proiectul și condițiile lunare. E-mailul identic poate recomanda contul verificat; confirmarea afișează explicit contul și beneficiarul. Asocierea este cea existentă în `client_account_access`, cu întinderea prevăzută de politicile fișei clientului, nu un sistem separat de autentificare.

Un client viitor nu primește un cont fabricat și nu este contactat automat. În lipsa contului, se păstrează fișa și alocarea; la verificarea unui cont cu același e-mail se folosește mecanismul existent de asociere. Pentru alt e-mail, administratorul folosește autorizarea din fișa clientului. Numai conturile active, verificate, fără rol staff/admin pot fi selectate drept conturi client.

Planurile sunt citite prin funcția de catalog reutilizată cu AVY Core: `SUBSCRIPTION_CATEGORIES` și `partnership_plans` existente. Specificațiile și tariful se personalizează numai pentru alocarea curentă. Dacă nu se selectează un proiect existent al aceluiași beneficiar, se creează un proiect dedicat în `projects`, cu serviciu în `services` și abonament în `subscriptions`. Proiectul dedicat are `kind=subscription`; nu se declară automat mentenanță activă. AVY Core și editorul serviciilor existente rămân disponibile.

## Date și facturare

Migrarea aditivă **0081_subscription_operations.sql** adaugă:

- Cheie opacă de alocare în `subscriptions`, unică între alocările necancelate.
- `subscription_billing_settings`: date minime ale beneficiarului pentru această alocare, termen de plată și ziua calendaristică de referință. Nu suprascrie profilul fiscal global al unui utilizator care reprezintă mai multe firme.
- `subscription_invoice_periods`: legătură unică per abonament/perioadă către ciorna din `financial_revenues`, fără copierea facturii.
- Câmpuri de identificare a contului, spațiului de lucru și responsabilului în `financial_expenses`, plus revizie și index pentru registrul intern.

Alocarea configurează un ciclu lunar RON pe infrastructura actuală; nu creează `billing_subscriptions`, comenzi plătite sau drepturi AVY Studio. Licențele și checkoutul procesatorului rămân fluxuri separate. Abonamentele existente ale procesatoarelor sunt vizibile într-un grup separat, cu stările înregistrate prin mecanismele lor existente.

**Pregătește factura** necesită drept financiar, MFA și confirmarea perioadei/valorii/beneficiarului. Creează o singură ciornă în `financial_revenues`, fără număr fiscal, TVA presupus, trimitere sau încasare. Verificarea regimului fiscal și emiterea efectivă continuă în fluxul financiar autorizat. Calendarul avansează după pregătirea ciornei; data următoare reprezintă perioada următoare, nu confirmarea plății celei curente. Starea ciornelor este citită din același registru în detaliile abonamentului.

Ziua de referință se păstrează prin lunile scurte: 31 ianuarie → 28/29 februarie → 31 martie. Editarea exclusivă a datelor fiscale nu schimbă această ancoră. Pauza/anularea opresc pregătirea perioadelor noi și păstrează istoricul. Schimbarea beneficiarului din alte fluxuri invalidează setările de facturare până la reverificare.

## Evidența conturilor interne

Registrul intern citește costurile recurente/gratuite/de test/variabile generale din **`financial_expenses`**, cu furnizorii din `financial_vendors`. Nu creează un registru financiar paralel. Rândurile istorice fără date de cont sunt marcate „De completat”; nu sunt prezentate drept integrări ori conturi verificate.

Scurtăturile Lovable, Codex/OpenAI, Cloudflare și GitHub precompletează numai identificarea furnizorului/produsului. Nu activează conturi sau abonamente. Sunt suportate mai multe conturi/spații de lucru pentru același furnizor. Costul poate rămâne necunoscut; valoarea zero este explicită pentru un cont gratuit. Se păstrează numele planului, identificarea contului, responsabilul, ciclul și reînnoirea. „Reînnoire automată” este exclusiv evidența unei setări la furnizor, fără modificare externă.

Stafful primește numai detaliile operaționale. Costul, moneda, e-mailul contului, notele și setările financiare sunt omise din răspunsul API fără drept financiar. Scrierile necesită permisiunea financiară existentă și MFA. Un Super Admin fără `finance.write` nu primește automat drept de modificare a costurilor.

Editorul minimal nu poate rescrie valori fiscale istorice ori plătite: acestea se modifică în Financiar. Revizia este invalidată și de editările din Financiar; conflictele nu suprascriu datele. Jurnalul financiar și jurnalul de securitate sunt scrise în aceeași tranzacție.

## API și protecții

- `GET/POST /api/admin/client-subscriptions`
- `PUT /api/admin/client-subscriptions/:id/billing`
- `POST /api/admin/client-subscriptions/:id/prepare-invoice`
- `GET/POST /api/internal/subscriptions`
- `PUT /api/internal/subscriptions/:id`

Toate necesită autentificarea existentă, autorizare server-side și răspunsuri `private, no-store`. Alocările clienților sunt rezervate principalilor de platformă; registrul intern refuză clientul inclusiv prin URL/API direct. Fiecare cerere revalidează accesul, inclusiv la retry. Scrierile sunt limitate, validate, idempotente și atomice. Constrângerile și reviziile protejează împotriva duplicării și concurenței. Limita unui formular este 64 KiB, cu maximum 30 de specificații.

Listele au limite explicite de protecție: 500 de abonamente clienți/procesator, 1.000 de clienți/conturi/proiecte și 1.000 de cheltuieli interne; istoricul din monitor arată ultimele 12 perioade, fără ștergerea celorlalte. Pentru volume mai mari trebuie extinsă paginarea, fără a presupune că un rezultat limitat este inventarul integral.

Nu se stochează parole, chei sau tokenuri. Nu se introduc servicii Cloudflare noi, abonamente plătite, cereri către furnizori sau furnizori AI. Metadatele noi se află în D1 și intră în strategia existentă de backup; nu sunt create obiecte R2 noi.

## Verificare și lansare

Testele runtime rulează handler-ele reale cu toate migrațiile SQLite: izolare între clienți, cont viitor/verificat, retry, duplicare, concurență, rollback la audit indisponibil, date lunare, MFA/RBAC, protejarea fiscalității istorice și omiterea câmpurilor private pentru staff. Testele browser folosesc API-uri simulate și verifică separat interfața și confirmările; nu dovedesc configurarea furnizorilor reali.

Verificarea suplimentară în Worker/D1 local a folosit autentificarea existentă și înrolare/verificare TOTP reale pe conturi sintetice. A confirmat alocarea pe client/proiect/cont existent, afișarea exclusiv la clientul corect, citirea–editarea–salvarea datelor de facturare, refuzul API-ului intern pentru client (403), pregătirea unei ciorne financiare fără număr fiscal, avansarea lunară și păstrarea costului necunoscut în registrul intern. Nu a activat furnizori, nu a trimis mesaje/facturi și nu a încasat bani. Sesiunile și factorul TOTP create pentru test au fost închise/eliminate exclusiv din fixture-ul local.

Migrarea 0081 și trigger-ele de integritate ale alocării au fost aplicate numai local. `foreign_key_check` este curat. Controlul global `quick_check` a întâlnit limita `SQLITE_NOMEM` a mediului D1 local; verificarea pe fiecare dintre cele șapte tabele afectate a întors `ok`. Nu a fost ocolită verificarea integrității.

Rezultate finale pe codul livrat:

- Vitest: **83 fișiere, 664 teste trecute**, un benchmark opțional de limite publice omis (`AVYRON_BENCH_PUBLIC_LIMITS` nu este activat). Sunt incluse 16 teste noi pentru operațiunile de abonamente.
- Playwright: **51/51 scenarii trecute**, din care nouă noi pentru alocare, client viitor, recuperare după conflict, ciornă financiară, cont intern, separarea staff/client și lățimile 320/390 px. Au trecut și regresiile dashboard/Social/AVY Core/navigare pe roluri. După ajustarea finală a temei dialogurilor, cele nouă scenarii noi au fost reluate cu succes, inclusiv o verificare de contrast de minimum 4,5:1 pentru butonul „Înapoi”; nu reprezintă o certificare completă de accesibilitate.
- Build standalone Worker, build Pages (inclusiv build static/prerandare și audit SEO), tipuri aplicație/Worker, audit D1 și build API dry-run: trecute. Fără deploy.
- ESLint: zero erori, patru avertismente React Refresh existente în componentele Logo. Fișierul nou de teste browser a trecut și verificarea separată după ajustarea capturilor.
- `git diff --check`: curat; pachetul generat nu conține datele/credențialele sintetice ale fixture-ului local.

Capturi cu date sintetice: [monitorizare clienți](qa/subscriptions-2026-11-05/client-subscriptions.png), [confirmarea alocării](qa/subscriptions-2026-11-05/allocation-review.png), [registru intern](qa/subscriptions-2026-11-05/internal-subscriptions.png), [320 px](qa/subscriptions-2026-11-05/allocation-mobile-320.png), [390 px](qa/subscriptions-2026-11-05/allocation-mobile-390.png). Etichetele selectoarelor au fost corectate în urma primei rulări browser; capturile așteaptă finalizarea animației dialogului.

Migrarea remote, verificarea în conturile reale și release-ul rămân pentru lansarea autorizată de la încheierea taskurilor. Nu există un scheduler nou de emitere automată: sunt configurate perioadele lunare și pregătirea controlată a ciornelor, urmate de fluxul financiar existent.
