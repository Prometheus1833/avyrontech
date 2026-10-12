# AVYRON OS: reguli API și sincronizare financiară

Verificat la 13 octombrie 2026 pe documentația oficială. Acest registru este afișat în dashboardul intern, în „Financiar → Conturi și carduri → Plăți și facturare”; nu conține credențiale. Codul de referință este `providerSyncPolicy.ts`. Stările sunt calculate din configurația Worker și `financial_provider_connections`, nu dintr-un test extern făcut la fiecare încărcare. Nu activa producția pe baza etichetei „configurat”.

## Modelul comun

`comandă AVYRON` → `checkout` → `plată confirmată de procesator` → `factură Oblio emisă` → `încasare/decontare bancară verificată`.

- Fiecare tranziție are identificatorul propriu: comandă internă, sesiune/PaymentIntent/order la procesator, factură (serie + număr), tranzacție bancară. Nu se folosește unul ca dovadă automată pentru altul.
- Evenimentele externe se verifică pe corpul brut și secretul specific mediului; se deduplică după ID-ul evenimentului și al resursei, se păstrează auditul și se răspunde rapid. O citire API server-to-server rezolvă stările lipsă sau evenimentele sosite în altă ordine.
- Retry numai cu idempotency key stabilă și aceeași cerere. Pentru timeout/rezultat necunoscut, se citește mai întâi resursa existentă; niciun retry orb de factură, rambursare sau debitare.
- Importurile sunt paginate și cu fereastră suprapusă pentru evenimente întârziate; checkpointul se mută doar după salvare. Limitare de rată, backoff pentru `429`/`5xx`, alerte și reconciliere manuală pentru nepotriviri.
- Dashboardul marchează un checkpoint intern mai vechi de 24 de ore drept „sincronizare veche”. Este un prag operațional AVYRON, nu un SLA promis de furnizori și nici dovadă de reconciliere bancară.
- Secretele sunt doar în Worker Secrets, nu în D1, documentație, UI sau loguri. Conexiunea trebuie testată separat în sandbox/test și apoi în live. Scrierile financiare interne cer MFA verificat.

## Stripe — procesare plăți

Folosește secret API și `whsec_` separat pentru test/live. Webhookul verifică `Stripe-Signature` pe corpul brut; Stripe nu garantează ordinea evenimentelor și poate trimite duplicate. Confirmarea pentru Checkout este server-side, nu redirectul din browser. `checkout.session.completed` poate necesita verificarea `payment_status`; pentru metode întârziate folosește evenimentele asincrone. Reconcilierea abonamentelor, refundurilor, disputelor și payouturilor este separată de plățile inițiale. Cheia de idempotency pentru POST nu trebuie refolosită cu alți parametri; Stripe o poate elimina după cel puțin 24 h, deci protecția locală rămâne necesară.

Surse: [webhooks](https://docs.stripe.com/webhooks), [idempotency](https://docs.stripe.com/api/idempotent_requests), [Checkout](https://docs.stripe.com/payments/checkout/fulfill-orders).

## Oblio — facturare

Autorizarea este OAuth 2.0 cu `client_id` (e-mail), `client_secret` și bearer token cu expirare (exemplul oficial: 3600 s). `POST /api/docs/invoice` acceptă `orderNumber` și `idempotencyKey`; folosește o valoare stabilă per comandă. `GET /api/docs/invoice` citește după CIF, serie și număr; `GET /api/docs/invoice/list` oferă filtre și paginare cu cel mult 100 rezultate/pagină. Limitele publicate sunt 30 cereri de generare/100 s și 30 alte cereri/10 s. Webhookurile Oblio au mecanism propriu de verificare/challenge; nu le trata ca webhookuri Stripe. Încasarea facturii (`PUT /api/docs/invoice/collect`) și e-Factura/SPV sunt acțiuni distincte. Regimul TVA, seria și comportamentul SPV se confirmă cu contabilul înainte de emitere; `sendEmail` rămâne decizie separată.

Sursă: [API Oblio](https://www.oblio.eu/api/).

## Revolut Business — conturi bancare

Business API este separat de Merchant. Accesul folosește certificat/JWT, access token scurt și refresh token; pentru vizualizare solicită scope `READ`, nu `PAY` sau acces la date sensibile de card. Administrarea webhookurilor prin API necesită `WRITE`, doar în etapa controlată de configurare; tokenul de sincronizare curentă rămâne limitat la `READ`. Webhooks v2 permit `TransactionCreated` și `TransactionStateChanged`; semnătura este HMAC-SHA256 peste `v1.{timestamp}.{raw_payload}`. Notificarea declanșează citirea tranzacției curente; sincronizarea istorică a conturilor, soldurilor și tranzacțiilor este paginată. Împerecherea unei plăți cu banca necesită referință, sumă, monedă și stare finală; nepotrivirile rămân de verificat. Conectarea este amânată și nu există decontări verificate în AVYRON OS.

Surse: [sincronizarea conturilor și tranzacțiilor](https://developer.revolut.com/docs/guides/manage-accounts/use-cases/accounts-and-transactions-syncing), [webhooks v2](https://developer.revolut.com/docs/guides/manage-accounts/webhooks/about-webhooks), [verificarea semnăturii](https://developer.revolut.com/docs/guides/manage-accounts/webhooks/verify-the-payload-signature), [Business API](https://developer.revolut.com/docs/api/business).

## Revolut Merchant — checkout separat

Credențialele, API-ul și webhookul Merchant nu se reutilizează pentru Business Banking. Evenimentul de plată este verificat și urmat de citirea comenzii la Merchant înainte de îndeplinire. Abonamentele și ciclurile se verifică separat. Nici un payout Merchant/Stripe nu este echivalat automat cu o intrare bancară.

Surse: [Merchant API](https://developer.revolut.com/docs/api/merchant), [verificarea webhookului](https://developer.revolut.com/docs/guides/merchant/monitor-and-observe/webhooks/verify-the-payload-signature).

## Ce rămâne înainte de sincronizare live

1. Titularul rezolvă verificarea contului Stripe și confirmă entitatea juridică.
2. Responsabilul fiscal confirmă seria Oblio, TVA și fluxul SPV. Nu se emit documente de probă în contul live.
3. Se activează și testează MFA; se configurează secretele numai în Worker și se validează istoricul migrărilor D1.
4. Se testează webhookurile și retry-urile cu fixture-uri, sandbox/test, duplicate, evenimente în ordine inversă și răspunsuri API ambigue.
5. Se construiește conectorul Revolut Business read-only și reconcilierea bancară după aprobarea contului. Până atunci, dashboardul afișează „Neverificate”.

Acest PR adaugă registrul de reguli și observabilitatea stărilor. Nu introduce credențiale, polling live, transferuri, plăți, facturi sau schimbări ale webhookurilor de producție.
