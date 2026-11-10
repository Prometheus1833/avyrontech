# Oblio și Stripe AVYRON — verificare 10 noiembrie 2026

## Limite și separare

Destinație: Workerul `avyrontech`, firma DIGITAL ECOTECH SOLUTIONS S.R.L., comenzile native AVYRON și contul Stripe verificat prin `STRIPE_ACCOUNT_ID`. Seria Oblio AVY este separată de CM; nu se modifică seria implicită CM, conturile Cutiuța Magică, alte facturi sau alte proiecte.

În Oblio, utilizatorul poate avea acces la ambele serii ale aceleiași firme. Această separare operațională nu reprezintă izolare de credentiale la furnizor: cheia API aparține utilizatorului Oblio. Rotația ei trebuie coordonată cu toate integrările acelui cont. Nu se resetează parola și nu se creează utilizatori externi automat.

## Date confirmate și configurare

Ownerul a confirmat firma neplătitoare de TVA. Sesiunea reală Oblio arată opțiunea „Plătitor de TVA” debifată. API-ul autentificat a răspuns 200 și a confirmat aceeași firmă, seria AVY (Factura, start 0001, următor 0001, non-default) și cota implicită exactă `Neplatitor TVA`, procent 0. Seria CM era default, cu următorul număr 0001, și a rămas neschimbată.

Cele șase setări Oblio din Workerul AVYRON au fost actualizate exclusiv prin mecanismul criptat Cloudflare, pe baza acestei verificări. Nu se înscriu valori de credentiale în repository, rapoarte sau capturi. Transferul temporar între UI și configurator folosește un FIFO privat; nu există fișier de credentiale.

`OBLIO_AUTO_ISSUE_ENABLED` și `OBLIO_SEND_EMAIL_ENABLED` rămân neactivate în timpul diagnosticului. Configurarea valorilor fiscale nu autorizează singură emiterea documentelor. Nu s-au emis facturi, schimbat tarife sau efectuat debitări.

## Problema observată și patch

După actualizarea credentialelor, verificarea din Worker a rămas la `oblio_auth_unreachable`, deși același API a funcționat din mediul local. Helperul anterior reducea și un răspuns HTTP non-JSON la status 0, pierzând distincția între un gateway care răspunde HTML, un timeout și o problemă de rețea. Originea exactă a erorii remote rămâne neconfirmată până la verificarea patchului live.

Patchul păstrează statusul HTTP și emite numai coduri fixe de eroare, fără corpuri de răspuns sau mesaje de excepție care pot conține date sensibile. Formularul OAuth este serializat explicit identic în verificare, reconciliere și emitere. Emiterea are timeout și refuză redirecturile. Pentru `Neplatitor TVA`, o cotă globală sau linie nenulă este respinsă înaintea apelului extern.

## Flux comercial și probe

Stripe confirmă plățile prin webhook semnat pentru comenzi salvate și pentru contul verificat. Registrul financiar și factura Oblio se leagă de aceeași comandă. Emiterea utilizează `idempotencyKey` cu prefix AVYRON, seria configurată și valoarea comenzii, păstrând reducerile. Reconcilierea Oblio citește numai facturile native deja emise, în seria AVY. Sincronizarea de referințe nu încasează și nu emite facturi.

La citirea D1 reală: zero facturi native și o comandă în stare requested; nu există o încasare reală dovedită de acest diagnostic. Catalogul avea 136 intrări active cu TVA 0, dintre care 135 cu verificarea fiscală per articol încă neaprobată. Nu s-au aprobat în masă articole, licențe sau produse.

49 teste țintite au trecut după patch: verificare conturi/serii, status HTTP păstrat, lipsa datelor sensibile în erori, neplătitor 0%, respingerea TVA nenul, idempotencyKey, reduceri, gate de aprobare și reconciliere exclusiv a referințelor native. Testele folosesc furnizori sintetici; nu sunt probe de încasare sau facturare reală. Typecheck, lint, build, CI și verificarea remote se înregistrează în PR.

## Condiții înainte de activare

Conexiune revalidată din Worker, credentiale securizate și rotație coordonată, serie și nomenclator verificate, webhooks Stripe verificate și date de facturare complete. O probă fiscală reală cere o comandă reală eligibilă și nu se fabrică doar pentru un test. Starea finală și identificatorii de release se verifică în PR; această notă nu dovedește deployul sau rezolvarea erorii remote.

Surse: [API Oblio](https://www.oblio.eu/api/) — OAuth, nomenclatoare, serie, TVA și idempotencyKey; [Stripe webhooks](https://docs.stripe.com/webhooks); [Cloudflare secrets](https://developers.cloudflare.com/workers/configuration/secrets/).
