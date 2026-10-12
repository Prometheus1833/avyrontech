# AVYRON OS — integrare financiară etapizată

Acest document privește exclusiv AVYRON; nu modifică sistemele Cutiuța Magică. GitHub este sursa de cod, iar producția nu se schimbă prin simpla deschidere a unui PR.

## Ce există în cod

- Cloudflare Worker, D1, KV și AVYRON OS Financiar; rutele autentificate folosesc roluri și MFA privilegiat.
- Stripe Checkout/Customer/Portal, Revolut **Merchant** Checkout și abonamente, Oblio OAuth și emitere facturi.
- Ledgerul financiar existent, încasări manuale și facturi, status de checkout și jurnal de webhookuri. Nu se creează un dashboard paralel.
- Protecție nouă: plata Stripe este confirmată doar la `payment_status=paid`; sesiunea trebuie să aparțină comenzii locale; evenimentele test/live nu se amestecă; revendicarea D1 este unică pe comandă.
- Protecție nouă: emiterea Oblio este blocată implicit; eroarea rămâne `pending`, iar reluarea cere rol staff/admin, MFA și activare fiscală explicită. Trimiterea e-mailului are un comutator distinct.

## Stări care nu trebuie confundate

`checkout creat` → `plată confirmată de procesator` → `factură emisă` → `decontare bancară verificată` sunt operațiuni separate. Dashboardul afișează plățile și facturile distinct, pe monedă; până la importul sau conexiunea Revolut Business, decontarea bancară apare **neverificată**, nu zero. Nu se raportează comisioane, profit fiscal sau sold bancar neverificat ca date reale.

## Condiții pentru conectarea live

1. Deschide Stripe Dashboard, Oblio și Cloudflare în browserul accesibil Codex sau autorizează CLI/API oficial; sesiunile Safari nu sunt vizibile automat. Nu trimite chei prin chat.
2. Confirmă contul Stripe al AVYRON și firma emitentă în Oblio (DIGITAL ECOTECH SOLUTIONS S.R.L., CUI 55055976), seria AVYRON și TVA cu persoana responsabilă. Verifică dacă există deja endpointuri webhook și secrete, fără a le duplica.
3. Verifică istoricul migrațiilor D1 înainte de aplicarea migrării append-only `0063_billing_fulfillment_claims.sql`; dacă istoricul remote diferă, oprește lansarea și reconciliază-l separat.
4. Rulează plăți Stripe **test mode**, webhookuri duplicate/în ordine diferită și răspunsuri Oblio simulate. Fără sandbox Oblio confirmat, nu trimite facturi de probă către producție.
5. După aprobarea inițială a facturării, activează `OBLIO_AUTO_ISSUE_ENABLED=true` numai în mediul potrivit; `OBLIO_SEND_EMAIL_ENABLED=true` necesită decizie separată. Nu activa facturare fiscală paralelă în Stripe.
6. Revolut Business Banking se conectează ulterior numai cu permisiuni read-only și contul RON existent. Revolut Merchant nu este conexiunea bancară. Până atunci, nu marca payouturile Stripe drept bani văzuți în bancă.

Lipsesc încă verificarea live a conturilor, sincronizarea tranzacțiilor Revolut Business, comisioanele/payouturile Stripe, e-Factura, proformele și stornările validate cu firma, precum și fluxurile de rambursare. Acestea nu sunt simulate ca operaționale în interfață și nu necesită noi agenți AI.
