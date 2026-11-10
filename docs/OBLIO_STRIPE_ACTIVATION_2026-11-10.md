# Oblio și Stripe AVYRON — verificare 10 noiembrie 2026

## Limite și separare

Destinație: Workerul `avyrontech`, firma DIGITAL ECOTECH SOLUTIONS S.R.L., comenzile native AVYRON și contul Stripe verificat prin `STRIPE_ACCOUNT_ID`. Seria Oblio AVY este separată de CM; nu se modifică seria implicită CM, conturile Cutiuța Magică, alte facturi sau alte proiecte.

În Oblio, utilizatorul poate avea acces la ambele serii ale aceleiași firme. Această separare operațională nu reprezintă izolare de credentiale la furnizor: cheia API aparține utilizatorului Oblio. Rotația ei trebuie coordonată cu toate integrările acelui cont. Nu se resetează parola și nu se creează utilizatori externi automat.

## Date confirmate și configurare

Ownerul a confirmat firma neplătitoare de TVA. Sesiunea reală Oblio arată opțiunea „Plătitor de TVA” debifată. API-ul autentificat a răspuns 200 și a confirmat aceeași firmă, seria AVY (Factura, start 0001, următor 0001, non-default) și cota implicită exactă `Neplatitor TVA`, procent 0. Seria CM era default, cu următorul număr 0001, și a rămas neschimbată.

Cele șase setări Oblio din Workerul AVYRON au fost actualizate exclusiv prin mecanismul criptat Cloudflare, pe baza acestei verificări. Nu se înscriu valori de credentiale în repository, rapoarte sau capturi. Transferul temporar între UI și configurator folosește un FIFO privat; nu există fișier de credentiale.

`OBLIO_AUTO_ISSUE_ENABLED` și `OBLIO_SEND_EMAIL_ENABLED` rămân neactivate în timpul diagnosticului. Configurarea valorilor fiscale nu autorizează singură emiterea documentelor. Nu s-au emis facturi, schimbat tarife sau efectuat debitări.

## Problema observată și patch

După actualizarea credentialelor, verificarea din Worker a rămas la `oblio_auth_unreachable`, deși același API a funcționat din mediul local. Helperul anterior reducea și un răspuns HTTP non-JSON la status 0, pierzând distincția între un gateway care răspunde HTML, un timeout și o problemă de rețea. Proba nativă workerd a identificat cauza: `redirect: "error"` nu este implementat de Workers și aruncă TypeError înainte de trimiterea cererii. Cu `manual`, aceeași probă cu date sintetice ajunge la Oblio și primește răspuns JSON 400, valid pentru credentiale sintetice invalide. Root cause este reprodus local; verificarea finală din Workerul publicat rămâne distinctă.

Toate cele 18 utilizări ale modului incompatibil din backend sunt schimbate în `manual`. Consumatorii păstrează verificarea `response.ok`, astfel încât redirecturile sunt respinse fără urmărirea destinației sau transmiterea credentialelor. Corecția comună acoperă și cardurile/portalul/reînnoirile Stripe, helperul de integrări și verificările de domenii, fără activarea unor furnizori noi. Modul `error` din browser rămâne neschimbat, fiind valid în browser.

Patchul păstrează statusul HTTP și emite numai coduri fixe de eroare, fără corpuri de răspuns sau mesaje de excepție care pot conține date sensibile. Formularul OAuth este serializat explicit identic în verificare, reconciliere și emitere. Emiterea are timeout și refuză redirecturile. Pentru `Neplatitor TVA`, o cotă globală sau linie nenulă este respinsă înaintea apelului extern.

## Flux comercial și probe

Stripe confirmă plățile prin webhook semnat pentru comenzi salvate și pentru contul verificat. Registrul financiar și factura Oblio se leagă de aceeași comandă. Emiterea utilizează `idempotencyKey` cu prefix AVYRON, seria configurată și valoarea comenzii, păstrând reducerile. Încasarea Card folosește referința confirmată din billing_order_fulfillments și suma comenzii; o simplă stare paid fără confirmarea nativă nu autorizează emiterea automată. Referința și totalul trebuie să concorde. Data emiterii și încasării folosesc Europe/Bucharest. Un răspuns fiscal cu altă serie decât AVY este respins. Reconcilierea Oblio citește numai facturile native deja emise, în seria AVY. Sincronizarea de referințe nu încasează și nu emite facturi.

La citirea D1 reală: zero facturi native și o comandă în stare requested; nu există o încasare reală dovedită de acest diagnostic. Catalogul avea 136 intrări active cu TVA 0, dintre care 135 cu verificarea fiscală per articol încă neaprobată. Nu s-au aprobat în masă articole, licențe sau produse.

Prima trecere a validat 49 teste țintite. Suita extinsă finală, 15 fișiere/194 cazuri, a avut 192 PASS și două timeouturi în hookurile de creare a bazei sintetice sub încărcare paralelă; ambele cazuri au trecut separat cu un singur worker, fără mărirea timeouturilor sau schimbarea aserțiunilor. TypeScript, lint (zero erori, patru avertismente existente) și API dry-run au trecut. Șase probe native workerd au trecut, cu furnizori exclusiv sintetici și constructor Request real: autentificare, redirect respins fără propagarea credentialelor, factură neplătitor, TVA nenul blocat înaintea oricărui apel, portal Stripe și integrare cu redirect refuzat. Comanda `npm run test:providers:runtime` este adăugată în CI. Ultima reverificare după completarea încasării, datei fiscale și izolării seriei: 83/83 teste PASS, șase probe native PASS și API dry-run PASS. Scenariile unitare acoperă: verificare conturi/serii, status HTTP păstrat, lipsa datelor sensibile în erori, neplătitor 0%, respingerea TVA nenul, idempotencyKey, reduceri, gate de aprobare și reconciliere exclusiv a referințelor native. Testele folosesc furnizori sintetici; nu sunt probe de încasare sau facturare reală. CI pe commitul final și verificarea remote se înregistrează în PR. Endpointul Stripe live a fost reverificat în consola furnizorului: activ, contul AVYRON, URL `https://api.avyron.ro/api/billing/webhooks/stripe`, nouă evenimente compatibile cu handlerul. Aceasta verifică configurația, nu livrarea unei plăți reale. Metadatele Workerului `cutiuta-magica-store`, citite fără valori sau modificări, nu conțin bindinguri Oblio; citirea seifului Cutiuța a confirmat o credențială Oblio criptată, cu verificare istorică din 18 octombrie. Configurația sa folosește alt utilizator Oblio decât AVYRON; nu s-au citit valorile cheilor și nu s-au modificat date acolo. Utilizatorul a confirmat ulterior schimbarea parolei pentru utilizatorul AVYRON; cheia nouă se validează și instalează numai în Workerul AVYRON. Retuvo este o integrare viitoare, nemodificată.

## Condiții înainte de activare

Conexiune revalidată din Worker, credentiale securizate și rotație coordonată, serie și nomenclator verificate, webhooks Stripe verificate și date de facturare complete. O probă fiscală reală cere o comandă reală eligibilă și nu se fabrică doar pentru un test. Starea finală și identificatorii de release se verifică în PR; această notă nu dovedește deployul sau rezolvarea erorii remote.

Surse: [API Oblio](https://www.oblio.eu/api/) — OAuth, nomenclatoare, serie, TVA și idempotencyKey; [Stripe webhooks](https://docs.stripe.com/webhooks); [Cloudflare secrets](https://developers.cloudflare.com/workers/configuration/secrets/); [Request în Workers: manual/follow, fără error](https://developers.cloudflare.com/workers/runtime-apis/request/).
