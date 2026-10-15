# AVYRON OS — integrare financiară etapizată

Acest document privește exclusiv AVYRON; nu modifică sistemele Cutiuța Magică. GitHub este sursa de cod, iar producția nu se schimbă prin simpla deschidere a unui PR.

## Ce există în cod

- Cloudflare Worker, D1, KV și AVYRON OS Financiar; rutele autentificate folosesc roluri, iar MFA privilegiat trebuie activat pentru operațiunile financiare sensibile.
- Stripe Checkout/Customer/Portal, Revolut **Merchant** Checkout și abonamente, Oblio OAuth și emitere facturi.
- Ledgerul financiar existent, încasări manuale și facturi, status de checkout și jurnal de webhookuri. Nu se creează un dashboard paralel.
- Protecție nouă: plata Stripe este confirmată doar la `payment_status=paid`; sesiunea trebuie să aparțină comenzii locale; evenimentele test/live nu se amestecă; revendicarea D1 este unică pe comandă.
- Protecție nouă: emiterea Oblio este blocată implicit; eroarea rămâne `pending`, iar reluarea cere rol staff/admin, MFA verificat și activare fiscală explicită. Toate scrierile și exportul din Financiar cer MFA verificat, independent de comutatorul global. Trimiterea e-mailului are un comutator distinct.
- Dashboardul existent citește din D1 separat checkouturile, abonamentele, facturile, evenimentele eșuate și registrul de conexiuni. Prezența unui cont manual sau a unui secret nu este afișată ca sincronizare API verificată.

## Verificare live din 13 octombrie 2026, doar citire

- Cloudflare: Workerul `avyrontech` de producție este legat de `avyron-db`; în lista de variabile/secrete nu apar încă cele pentru Stripe sau Oblio. `MFA_AUTH_ENABLED=false` și `ADMIN_MFA_POLICY=disabled`: politica globală actuală ocolește MFA pentru unele scrieri financiare. În această ramură, toate scrierile din modulul Financiar și reîncercarea unei facturi cer explicit `mfaVerified`; activarea și testarea MFA înainte de lansare sunt obligatorii, altfel aceste acțiuni vor rămâne blocate.
- Stripe: sesiunea AVYRON este accesibilă, dar contul afișează **Payments paused**, din cauza verificării identității reprezentantului, restantă din 24 august 2026. Plățile live nu pot fi declarate funcționale. În Business details, numele juridic afișat este `DIGITAL ECOTECH SOLUTION`, diferit de `DIGITAL ECOTECH SOLUTIONS S.R.L.` indicat în mandat; proprietarul contului trebuie să confirme sau să corecteze datele în Stripe.
- Oblio: sesiunea firmei `DIGITAL ECOTECH SOLUTIONS S.R.L.` este accesibilă. În lista seriilor de **Factura** nu apare nicio serie. Nu a fost creată o serie și nu s-a emis niciun document.
- Revolut Business: nu a fost conectat sau verificat; nu confunda contul bancar cu Revolut Merchant.

## Stări care nu trebuie confundate

`checkout creat` → `plată confirmată de procesator` → `factură emisă` → `decontare bancară verificată` sunt operațiuni separate. Dashboardul afișează plățile și facturile distinct, pe monedă; până la importul sau conexiunea Revolut Business, decontarea bancară apare **neverificată**, nu zero. Nu se raportează comisioane, profit fiscal sau sold bancar neverificat ca date reale.

## Condiții pentru conectarea live

1. Rezolvă verificarea identității cerută de Stripe și confirmă numele juridic; acestea necesită intervenția titularului contului. Nu trimite documente sau chei prin chat.
2. Confirmă seria de facturi AVYRON, regimul TVA și fluxul e-Factura cu persoana responsabilă; nu crea serii sau facturi reale doar pe baza unei convenții de nume. Verifică apoi endpointurile webhook și secretele, fără a le duplica.
3. Activează și testează MFA pentru personalul cu acces financiar înaintea conectării reale. Verifică istoricul migrațiilor D1 înainte de aplicarea migrării append-only `0063_billing_fulfillment_claims.sql`; dacă istoricul remote diferă, oprește lansarea și reconciliază-l separat.
4. Rulează plăți Stripe **test mode**, webhookuri duplicate/în ordine diferită și răspunsuri Oblio simulate. Fără sandbox Oblio confirmat, nu trimite facturi de probă către producție.
5. După aprobarea inițială a facturării, activează `OBLIO_AUTO_ISSUE_ENABLED=true` numai în mediul potrivit; `OBLIO_SEND_EMAIL_ENABLED=true` necesită decizie separată. Nu activa facturare fiscală paralelă în Stripe.
6. Revolut Business Banking se conectează ulterior numai cu permisiuni read-only și contul RON existent. Revolut Merchant nu este conexiunea bancară. Până atunci, nu marca payouturile Stripe drept bani văzuți în bancă.

Lipsesc încă autentificarea API și testele providerilor, sincronizarea tranzacțiilor Revolut Business, comisioanele/payouturile Stripe, e-Factura, proformele și stornările validate cu firma, precum și fluxurile de rambursare. Acestea nu sunt simulate ca operaționale în interfață și nu necesită noi agenți AI.
