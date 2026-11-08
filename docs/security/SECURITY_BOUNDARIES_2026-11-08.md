# AVYRON — audit și integrare graduală de securitate

Data: 8 noiembrie 2026. Bază auditată: `7322cf40e09e20b8b6b22a0f18090df574f9f15e` (identificatorul exact este verificat în PR; nu folosi acest document ca dovadă de deploy).

## Limita acestei livrări

Această ramură întărește autentificarea existentă și pregătește o limită Cloudflare Access configurabilă. Nu activează Access, MFA, passkeys, un plan plătit, un furnizor nou sau o bază de date paralelă. Operatorul a ales explicit „Pregătește integrarea; configurăm Access ulterior”. Nicio migrare remote, modificare DNS/WAF, rotație de secret de producție sau publicare în producție nu a fost executată în audit.

Proiectele clienților, inclusiv cabinetul de avocatură, rămân în afara modificărilor. Nu se activează protecție Access la nivelul întregului Worker: același Worker deservește publicul, conturile clienților, API-uri legitime și hostname-uri de client. Tratarea hostname-urilor mapate precedă noua limită în Workerul API.

## Arhitectură și inventar

- React/Vite + router existent, Pages advanced mode și Worker de site standalone; API Hono/Workers, D1, KV, R2 privat, cozi/DO/workflows existente.
- Autentificare nativă: parolă scrypt, JWT de acces de 15 minute și sesiune D1 revocabilă; Providerii declarați Google/GitHub sunt `enabled:false` în cod, inclusiv când sunt prezente credențiale; nu sunt considerați login-uri funcționale. Callback-urile OAuth operaționale existente nu sunt rescrise. `requireAuth` verifică sesiunea activă, contul activ și rolurile actuale din D1 la fiecare cerere privată.
- Rolurile de bază `user/staff/admin` nu înlocuiesc principalul Owner/Super Admin, rangurile staff, capabilitățile, atribuirile pe proiect, accesul financiar și politicile Document Center. Aceste verificări rămân autoritatea asupra resursei.
- Conturile clienților folosesc autentificarea canonică existentă pe `api.avyron.ro`, inclusiv navigarea între site și `app.avyron.ro`. Viitorul hostname de administrare folosește cookie host-only și API same-origin, cu aceleași conturi/D1; necesită autentificare proprie pe acel hostname.
- Inventarul AST reproductibil identifică 418 declarații literale de endpoint, 98 declarații middleware și 14 intrări explicite de panou. Include `/intern/*`, `/staff`, `/admin`, `/profil` și `/finance`. Nu reprezintă numărul de politici independente și nu dovedește autorizarea rutelor dinamice, montărilor sau fiecărui endpoint.

```sh
node scripts/security-readiness.mjs inventory --output .security-private/routes.json
node scripts/security-readiness.mjs plan --config docs/security/security.config.example.json --output .security-private/plan.json
```

Fișierele generate au permisiuni `0600`; directorul este ignorat de Git. Comanda `plan` nu aplică nimic și refuză `--apply`/`--deploy`. Identitățile se completează într-o copie privată, nu în exemplul public.

## Constatări și remediere

| Constatare verificată | Impact / remediere în ramură | Stare |
| --- | --- | --- |
| Importatorul legacy accepta numai dovada `X-Seed-Token`; secretul este încă prezent în Worker | Secretul singur putea crea/elevă conturi. Se cer suplimentar sesiune nativă validă și principal Owner/Super Admin, inclusiv verificare în router; limită 3 loturi/oră/actor. Resetarea parolei revocă sesiunile țintei. Identitățile Owner rezervate nu sunt importabile. | Corectat în cod; necesită lansare |
| Fallback-ul refresh compara și ID-ul sesiunii în clar | ID-ul apare în JWT/lista propriilor sesiuni și nu trebuie tratat ca dovadă refresh. Acceptăm numai hash-ul secretului, nu ID-ul copiat din JWT. Sesiunile foarte vechi cu secret stocat direct necesită o autentificare nouă. | Corectat și testat |
| Cookie-ul `sid` nu folosea prefix host-only și refresh-ul nu se rotea | `__Host-sid`, Secure/HttpOnly/Path=/, fără Domain; migrare la primul refresh, secret nou la 15 minute, grace 30 secunde/CAS pentru taburi concurente; expirarea absolută și opțiunea „ține-mă minte” păstrate. Fereastra legacy nu se redeschide la rotațiile următoare. | Corectat și testat |
| Verificatorul JWT accepta lipsa `exp` dacă semnătura era validă | Algoritm HS256 fix, exact 3 segmente, dimensiune limitată, `exp`/`iat` valide și verificare `nbf`. Aceasta este întărire a validării; nu dovedește un bypass fără cheia de semnare. | Corectat |
| Nu exista acțiune dedicată „deconectează toate dispozitivele” cu confirmare de parolă | Endpoint autentificat, limitat, parolă curentă, revocare doar a contului curent, audit și UI compact. Revocarea invalidează imediat și JWT-urile încă neexpirate. | Implementat |
| HTML live pe site și cont nu includea CSP/HSTS | Baseline CSP compatibil (`object-src/base-uri/frame-ancestors`), scripturi în Report-Only implicit, HSTS fără includeSubDomains/preload, nosniff/referrer. Politica de script nu devine restrictivă înainte de verificarea integrărilor. | Implementat, nu încă live |
| `workers_dev:true` și `preview_urls:true` în configurație | URL-uri alternative pot evita doar protecția de hostname. În modul enforce, operațiunile native interne cer și JWT Access verificat criptografic. Dezactivarea ambelor URL-uri este pregătită separat, după inventarul webhook-urilor/integrărilor. | Dezactivare amânată controlat |
| GitHub `main` fără branch protection și fără ruleset activ | Risc de modificări care ocolesc review/CI. Pregătirea Access nu remediază GitHub. Recomandare: ruleset cu PR + verificări obligatorii și excepție explicită verificată pentru sincronizarea Lovable. | Setare externă neactivată |
| API-urile Access organization/apps/IdP/service tokens răspund 401/10000 cu accesul disponibil | Nu pot confirma configurația externă, IdP, politicile, seat-urile sau planul. Nu afirmăm că resursele lipsesc. | Configurare ulterioară cerută de utilizator |
| Cele 4 bucketuri R2 verificate au `r2.dev` dezactivat și niciun custom domain | Nu sunt expuse prin aceste două mecanisme; nu este certificare a fiecărei rute de citire sau dovadă de backup reușit. | Verificat read-only |
| `BACKUP_JOBS_ENABLED=false` în configurație | Bucketurile private nu demonstrează existența unei copii consistente D1+R2. Se păstrează mecanismul existent; activarea, costul și un exercițiu real de restaurare rămân gate separat. | Limitare documentată |

## Modulul reutilizabil

`src/shared/securityBoundary.ts` definește politica și sanitizarea. `src/worker/adminBoundary.ts` protejează intrările HTML, iar `cloudflare/workers/api/src/securityBoundary.ts` adaugă limita identității după autentificarea nativă și înaintea politicilor de resursă.

- `off` implicit: păstrează integrarea externă neactivată; întăririle native de sesiune, import și CSRF funcționează independent.
- `observe`: calculează și înregistrează lipsa sau nepotrivirea identității, dar permite cererea conform RBAC nativ. Evenimentul are outcome `allowed`, nu refuz fictiv. Dedupe 15 minute/actor/motiv.
- `enforce`: configurația invalidă refuză cu 503; identitate absentă/nepotrivită refuză cu 403; rolurile și resursele continuă să fie verificate. Un typo de mod nu poate dezactiva protecția.

Pentru HTML se protejează întregul hostname admin și intrările legacy `/intern`, `/staff`, `/admin`. Redirecționările legacy elimină query/hash/credențialele URL. Pentru API, cererile native de staff/admin către resurse (cu excepția self-service `/api/auth/*` pe originea publică, care păstrează propriile verificări), toate cererile autentificate pe hostname admin și prefixele exclusiv interne cer identitate în enforce. Rutele mixte ale clienților păstrează verificările de apartenență/publicare și nu primesc o obligație Access.

JWT Access: numai RS256, semnătură verificată cu cheia publică a issuerului fix `<team>.cloudflareaccess.com`, AUD aplicație exact, type `app`, exp/iat/nbf, kid unic; fără fetch către jku/x5u furnizat în token. JWKS public are timeout, limită de dimensiune și cache 5 minute. Lipsa/eroarea providerului blochează enforce; schimbarea cheilor poate necesita expirarea cache-ului. Header-ele email/Client-ID singure nu sunt autentificare. Email-ul Access trebuie să coincidă cu email-ul verificat al contului nativ.

Service Auth folosește forma oficială `sub:""`, `common_name:ClientID`, semnată de Cloudflare. `SECURITY_SERVICE_BINDINGS` trebuie să lege explicit ClientID de un cont nativ `user` și prefixe/metode limitate; nu creează conturi, roluri sau capabilități. Fără mapare exactă, refuză. Nu presupunem că `ctx.access` este propagat prin Service Bindings sau routerul Static Assets.

## Sesiuni, secrete și operațiuni critice

Migrarea **0110_security_session_rotation.sql** adaugă 5 coloane nullable și 2 indexuri. Nu șterge sesiuni sau documente și nu modifică ID-uri. Se aplică înainte de cod. Secretul refresh rămâne numai în cookie; D1 stochează hash-uri. Clienții API non-browser trebuie să păstreze un cookie jar și să preia `Set-Cookie` la rotație; un header Cookie fix nu reprezintă o integrare compatibilă cu rotația. Refresh-urile invalide nu emit un Set-Cookie de ștergere care ar putea suprascrie cookie-ul valid al altui tab; logout explicit șterge ambele nume.

`SESSION_JWT_SECRET` opțional separă semnarea sesiunilor de `JWT_SECRET` folosit și pentru linkuri existente. Rotația este pregătită, nu executată: cheie nouă în secret manager; cheia veche în `SESSION_JWT_PREVIOUS_SECRET`; timpi epoch **ms** `SESSION_JWT_ROTATED_AT` și `SESSION_JWT_PREVIOUS_VALID_UNTIL`, interval maxim 15 minute. Numai JWT-uri emise înaintea rotației sunt acceptate cu cheia veche. După interval, elimină cheia veche și variabilele de tranziție. Rotirea directă a `JWT_SECRET` poate invalida linkuri/newsletter: inventariază-le înainte. Nu copia valori în Git, rapoarte sau chat.

`SECURITY_BREAK_GLASS` este un secret JSON cu `issuedAt`, `expiresAt` (maxim 30 minute), `tokenHash` SHA-256 base64url și `userIds` explicite. Header `X-Avyron-Recovery` cu secret aleatoriu de minimum 32 caractere, numai cont Owner nativ activ, sesiune validă și audit critic reușit. Nu ocolește parola, RBAC sau Access la edge; este recuperare API pe o cale separată validată în pilot, nu un link public de urgență și nu o cheie persistentă. Dacă edge blochează toate căile, recuperarea se face din control-plane Cloudflare autorizat. Nicio cheie de urgență nu a fost creată aici.

Scannerul `node scripts/check-secret-hygiene.mjs` verifică fișierele urmărite pentru formate cunoscute de chei și fișiere env/dev.vars; raportează numai locația/tipul. Nu dovedește absența tuturor secretelor sau curățarea istoricului Git. Este inclus în CI împreună cu auditul dependențelor și CodeQL existente. Un secret suspect se revocă la furnizor înainte de a curăța istoricul, coordonat cu ceilalți colaboratori.

## Monitorizare și confidențialitate

`GET /api/admin/security`: doar Owner/Super Admin, stare de configurare și agregate pe 24h; în Setări apare un card compact, fără butoane de activare sau valori de secrete. Alertă vizuală când există evenimente critice sau cel puțin 10 refuzuri/erori; nu s-au creat mesaje externe sau un serviciu nou de alertare.

Evenimentele noi elimină chei sensibile și obiecte arbitrare, limitează metadatele și nu stochează raw User-Agent în auditul auth. Telemetria CSP este neautentificată și nefiabilă: doar enum-ul directivei, fără URL-uri, query, samples, tokenuri sau emailuri; 16 KiB/report, 6/minut/IP, 100/zi global prin limitele existente. Nu provoacă automat blocări sau alerte critice. Logurile și retenția existente rămân autoritatea; nu se pretinde ștergerea retroactivă a tuturor datelor istorice.

## Activare graduală și rollback

1. Review/CI pe ramură, apoi autorizare de release; verifică exact repo/commit/Worker. Backup D1 și confirmare recuperare înainte de 0110. Aplică 0110, verifică integritatea și deploy cod cu boundary `off`, fără schimbarea flagurilor MFA.
2. În contul Avyron, operatorul verifică planul gratuit și numărul de identități, aplicațiile Access existente, IdP și politicile. Nu accepta upgrade și nu introduce Allow Everyone/Bypass global. Separă grupurile admin/staff/colaboratori; rolurile efective rămân native.
3. În preview-ul **existent**, atașează hostname-ul pilot aceluiași Worker. Rulează planul cu identități explicite, issuer/AUD reale și `VITE_ADMIN_HOSTNAME` identic cu `ADMIN_HOSTNAME`. Adaugă originea exactă și callback-urile OAuth la furnizorii folosiți înainte de test; nu presupune că sunt înregistrate.
4. Activează `observe`, verifică login/parolă/OAuth/logout/refresh, resurse pe rol, mobile, clienți, agenți, plăți, email/webhook-uri. Pentru automatizări, identifică exact endpointul/identitatea/destinația; tokenul Access nu acordă permisiuni native.
5. Verifică recuperarea fără tokenuri în URL/log și fără exceptarea clienților de la RBAC. Completează gate-urile numai după probe reale. Abia apoi `enforce` în pilot și, prin release autorizat, în producție.
6. Auditează toate destinațiile workers.dev, preview/deployment, originile directe și endpointurile vechi. Înlocuiește URL-urile legitime/callback-urile înainte de a seta **ambele** `workers_dev:false`, `preview_urls:false` în configurațiile relevante. Nu aplica overlay-ul pe Workerul cabinetului sau pe alte proiecte.
7. WAF/Turnstile/rate rules externe se verifică în planul curent și pornesc în log/preview unde este disponibil. Nu s-a creat nicio regulă WAF remote. CSRF, limitele API și validarea server-side nu depind de WAF.

Rollback rapid al Access: `SECURITY_BOUNDARY_MODE=off` pe Workerul corect și revenire la aplicația/politica/route-ul salvat înainte de activare. Nu șterge tabelul de sesiuni sau coloanele 0110. Rollback-ul binar către codul anterior prefixului `__Host-sid` poate cere reautentificare; preferă rollback al politicii în versiunea nouă. Păstrează configurația precedentă și accesul de control-plane până după validare. CSP script se păstrează Report-Only până la inventarierea integrărilor; nu activa `SECURITY_CSP_MODE=enforce` ca simplă optimizare.

## Acoperirea celor 15 activități

| # | Rezultat / limită explicită |
| --- | --- |
| 01 | Inventar reproductibil, verificări read-only GitHub/Cloudflare/live, constatări și teste negative. Nu este audit de penetrare exhaustiv al celor 418 declarații. |
| 02 | Aceeași aplicație/D1, configurare hostname/origini/API, plan de rutare; DNS și callbacks se configurează în pilot. |
| 03 | Validare criptografică, grupuri explicite și plan; Access extern amânat de utilizator. |
| 04 | Pregătire/runbook; flagurile MFA rămân false/disabled. Fără passkeys noi sau înscrieri forțate. |
| 05 | Cookie host-only, rotație/expirare/revocare, logout-all cu parolă. |
| 06 | Control nativ existent păstrat; importator corectat și nouă limită server-side testată. |
| 07 | Principali/capabilități/atribuiri native păstrate; service identities fără admin implicit. |
| 08 | CSRF completat, cookie/CSP/HSTS, rate limits existente reutilizate; WAF extern rămâne de verificat. |
| 09 | Inventar/configurație și refuz Access pe API interne în enforce; eliminarea live a URL-urilor alternative rămâne condiționată de testarea integrărilor. |
| 10 | Mapare serviciu-cont-rute; webhook-urile și agenții existenți nu sunt rescrise sau promovate. Testele lor existente sunt regresie, nu dovadă de livrare externă. |
| 11 | Audit sanitizat, agregate/semnal vizual, telemetrie limitată; fără pagere/emailuri noi. |
| 12 | R2 privat verificat, scanare secrete și mecanism de rotație; backupurile/restaurarea și rotația efectivă nu sunt declarate executate. |
| 13 | Teste RSA reale/SQLite, Workers/D1 local nativ, scenarii browser și CI; dovada externă Access lipsește până la configurare. |
| 14 | Config implicit off, preview existent, plan/gates/rollback; fără activare riscantă în producție. |
| 15 | Politică comună, middleware, inventar, generator de plan, teste/runbook, fără dependențe noi. |

## Surse primare

- [Validarea JWT Access](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/)
- [Claims application token](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/application-token/)
- [Workers și limitele propagării Access](https://developers.cloudflare.com/workers/configuration/cloudflare-access/)
- [Service tokens](https://developers.cloudflare.com/cloudflare-one/access-controls/service-credentials/service-tokens/)
- [workers.dev](https://developers.cloudflare.com/workers/configuration/routing/workers-dev/), [Preview URLs](https://developers.cloudflare.com/workers/configuration/previews/)

Rezultatele finale ale verificărilor și commitul exact sunt consemnate în PR. Documentul distinge implementarea locală de configurarea furnizorului și de verificarea live după release.
