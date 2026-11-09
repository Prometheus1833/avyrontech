# Reconciliere cerințe AVYRON — 7–9 noiembrie 2026

Sursă: mesajele acestei conversații din 07.11, 18:28 UTC până la 09.11, 12:52 UTC, cele două instrucțiuni anexate și conversația „Serviciu site abonament lunar”. Revizia de bază: `571bd76742af8f841055a83babd168bbc108487f`. Inventarele datate sunt context; rezultatele acestei corecții se completează după execuție, pe revizia din PR.

## Probleme confirmate și remediate în această corecție

| Element | Stare inițială | Problemă | Remediere | Stare de verificare |
| --- | --- | --- | --- | --- |
| Subsol comun | FAIL | Legături către copii demonstrative ale Flawless Studio și Retuvo; prea multe controale colorate și o a doua acțiune comercială redundantă. | Navigare text, o acțiune contextuală, contacte reale și zona legală/SAL; fără demo-uri. | FIXED: verificări Chromium/WebKit pe build, inclusiv subsolul la 320/390/1280 px și acțiunile legale/contact. |
| Demo-uri de brand | FAIL | Două pagini locale conțin prezentări și statistici inventate despre proiecte reale. | Eliminare din bundle, prerandare și sitemap; adresele vechi redirecționează 301 către sectoarele portofoliului, cu fallback SPA. Nu se ating site-urile clienților. | FIXED: trei probe unitare ale retragerii și fallback-urile browser trec; HTTP de producție se consemnează în PR. |
| Website prin abonament | FAIL | Machetă fictivă FORMA, listare comercială rigidă și secțiune socială amestecată în prezentarea contului. | Lucrări reale în hero, beneficii înainte de planuri, secțiune distinctă pentru integrări/contact, indicatori compacți pe plan și detalii extensibile; identitate AVYRON violet, fundal profund și perspective progresive. Formularul și API-urile native sunt păstrate. | FIXED: verificări Chromium/WebKit ale paginii, planurilor, formularului, administrării și axe; capturi inspectate. |
| Resurse vizuale | FAIL | Nu exista dovadă vizuală reală în hero-ul serviciului. | Capturi publice Flawless Studio și Ruller la 3840×2160; livrare WebP 480/960/1600 px, dimensiuni explicite, srcset/sizes. Șase fișiere de livrare însumează 185.626 octeți; masterele 4K lossless și proveniența sunt în `docs/qa/website-subscription-recovery-2026-11-09`. | FIXED: capturi și răspunsuri HTTP reale, inspecție desktop. |
| Regresia ordinii landing | FAIL | Un test vechi cerea cele patru carduri înaintea exemplului gratuit, contrar ultimei instrucțiuni. | Aserțiune sincronizată cu ordinea aprobată: exemplu gratuit → Insights → cele patru carduri → urmărește-ne. | FIXED: aserțiunea reluată în ambele motoare pe buildul compilat. |
| Navigare între pagini | FAIL | Un timer de zero milisecunde anula prematur protecția `beforeunload`; un import întârziat putea reîncărca vechiul URL și întrerupe navigarea nouă. | Protecția rămâne activă pe durata navigării; `pageshow` sau interacțiunea reală după anulare restabilesc recuperarea obișnuită. Nu se modifică autentificarea. | FIXED: două regresii noi eșuau înainte; toate cele șapte teste de recuperare trec după remediere. Regresia browser a importului întrerupt trece în Chromium/WebKit; buildurile finale trec. |

## Matricea cerințelor din cele două zile

Tabelul identifică implementarea și probele care trebuie executate. Existența unui fișier sau un test cu fixture nu reprezintă validarea unui furnizor ori a unui cont real.

| Cerință | Implementare reutilizată / verificată | Probe de regresie |
| --- | --- | --- |
| Notificări, 0104 și control pe roluri | Notificări native, inbox și reguli existente; istoricul migrărilor prin release guard. | `native-notifications`, `os-dashboard-runtime`, cookie transport și securitate Workers. |
| Manager Social Media: -24h/+24h, aprobare, reutilizare, Codex | Flux editorial și versiuni ale agentului existente; acțiunile externe rămân supuse aprobării. | `social-editorial`, `social-editorial-workflow`, `social-content-operations-v3`. |
| Overview, agenți denumiți, proiect AI ales, aprobări, primele trei evenimente | Componentele OS, resursele native și centrul de aprobări. | `os-dashboard`, `os-dashboard-runtime`, `dashboard-activity-logo`. |
| Financiar compact, configurare efectivă, permisiuni, SKU | Politica financiară comună și registrul comercial; fără procesator paralel. | `finance-policy`, `finance-commerce-runtime`, `finance-commerce`, `billing-dashboard`. |
| Logo 3D: tarif; mentenanță nouă/client/catalog | Configurări native Logo Studio, registrul mentenanței și alocările existente. | `logo-studio`, `logo3d-refinement`, `subscription-operations-runtime`, `subscription-operations`. |
| Documente: Generator, Tipizate, STAFF, SC, Bibliotecă | `allowedDocumentViews()` aplică această ordine și permisiunile; aceeași înregistrare centrală și versiuni separate de master. | `document-center`, `document-experience`, `document-center-experience.spec`. |
| Coduri servicii/produse, Resend, ordinea AVY Core/Engine și Skills | Registrul comercial, newsletter și `dashboardNavigation`; fără parole externe stocate. | `agency-knowledge-newsletter`, `newsletter-operations`, `os-dashboard`. |
| Site Builder: cunoștințe, instrucțiuni portabile și Etape | `SiteBuilderKnowledgePanel`, `SiteBuilderStagesPanel`, resurse și versiuni native. | `avy-skills`, browser Avy Skills și etapele proiectelor. |
| Logo Engine / Media Generate și imaginea Wellness | Ateliere creative existente, versiuni de brief și imaginile responsive deja aprobate. | `avy-skills`, `logo-studio`, parcursurile scenei landing. |
| .ro: verificare gratuită și cheie ulterior | Adaptor registrar existent, starea `unknown/provider_unconfigured` păstrată fără disponibilitate inventată. | `domain-provider`, `domain-source-migration`, `domain-quality-standard`. |
| Quality Standard și Insights | Cinci cercuri existente, 100/100 explicit țintă de prezentare; feed comun blog, swipe/săgeți/pauză; ordinea nouă păstrată. | `quality-standard`, `home-anchor`, `domain-quality-standard`, `home-blog-carousel`. |
| Separare admin, sesiuni, API, RBAC, uploaduri și audit | Middleware, cookie-uri host-only, revocare, configurare Access pregătită și politici private existente. | `test:security:local`, `session-security`, `security-boundary`, `security-audit-regressions`. |
| Website prin abonament: concept, trei planuri și cerere | Pagina refăcută; aceleași planuri și identificatori, cerere în trei pași, Turnstile, idempotency, Lead/CRM. | `website-subscriptions-runtime`, `website-subscriptions.spec`. |
| Website prin abonament: administrare, cont, perioade, 12 luni | `WebsiteSubscriptionsHub` și API-ul existent; tarife/termeni versionați, plăți semnate, cote și tranziție explicită. | Runtime website, checkout, facturare și izolare de client din suita integrală. |
| Portal simplu: meniu, Servicii/Produse, plăți/istoric și documente | Navigarea client și paginile native existente; fără AVY Core sau biblioteci staff în accesul clientului. | `client-commerce-refinement`, `client-portal`, `client-workspace`, `client-document-navigation`. |
| Portofoliu pe domenii și site-uri reale | Pagina și datele existente; legături către producțiile reale, inclusiv Retuvo, fără copie demonstrativă. | `portfolio-showcase`, `portfolio`, retragerea demo-urilor. |
| Leads Agency FREE-FIRST | Registru și pipeline existente, surse gratuite în prim-plan, comisioane separat, eligibilitate neconfirmată semnalată. | `leads-agency`, `leads-agency-runtime`, browser Leads Agency. |
| SEO, responsive, formulare, cookie, analytics și accesibilitate | Registru rute/canonical/prerandare comun; validări frontend/backend, consimțământ și resurse existente. | Audit SEO de build, `prerender-html`, `public-routes`, `public-analytics`, axe și inspecție vizuală. |

## Limite care nu trebuie prezentate drept funcții conectate

- **ACCEPTED_EXCEPTION**: MFA pentru administratorii existenți rămâne dezactivat, conform instrucțiunii explicite. Access este pregătit; configurarea externă este amânată de utilizator.
- **ACCEPTED_EXCEPTION**: Hugging Face este omis momentan. Pentru .ro utilizatorul a cerut pregătirea integrării și configurarea cheii ulterior; fără cheie nu există verdict confirmat.
- **NOT_VERIFIED**: cheia/contractul/DPA Bouncer și aprobarea procesării confidențiale lipsesc. Fișierele externe sensibile rămân blocate; generările interne nu consumă scanări.
- **NOT_VERIFIED**: prețurile și termenii aprobați ai celor trei planuri, provisionarea domeniului/mailboxurilor și o tranzacție/abonare/factură reală nu sunt inventate. Planurile neconfigurate acceptă solicitări, nu plăți prezentate ca active.
- **NOT_VERIFIED**: o sesiune reală Owner/Client, livrare Resend/socială, indexare GSC efectivă, telefoane fizice și restaurare nouă de obiecte R2 nu rezultă din teste locale. Se păstrează limitele explicate în auditul de securitate și runbookurile furnizorilor.
- **NOT_VERIFIED / FAIL**: auditul de securitate păstrează constatările organizaționale și de protecție GitHub descrise în `AVYRON_SECURITY_AUDIT.md`; nu se pretinde certificare ASVS/WCAG/EAA sau conformitate completă.

## Izolarea proiectelor

Repository-ul acestei modificări este exclusiv `Prometheus1833/avyrontech`. Nu se modifică worktree-uri, baze de date, domenii, conturi sau deploymenturi Retuvo/Cutiuța Magică. Capturile site-urilor publice sunt doar citiri. Proiectele cabinetelor și workflow-ul lor rămân excluse. Destinațiile de preview/producție, SHA-ul, buildurile și probele live se consemnează separat în PR înainte de închiderea livrării.

## Constatări de securitate care rămân distincte de corecția vizuală

Auditul existent documentează șapte abateri ASVS, care nu sunt ascunse de succesul testelor funcționale:

| ID verificabil | Situație și remediere necesară | Motivul păstrării controlate |
| --- | --- | --- |
| V3.4.1 | Inventarierea TLS pe toate subdomeniile înainte de HSTS includeSubDomains. | Activarea oarbă poate bloca proiectele și integrările existente. |
| V3.4.3 | Analiza telemetriei CSP și validarea editorilor, 3D și furnizorilor înainte de trecerea tuturor directivelor report-only în enforcement. | Nu se dezactivează integrări pentru un scor artificial. |
| V6.2.4 | Blocklist verificat de minimum 3.000 de parole pentru creări/schimbări, cu teste și licență de corpus. | Necesită reconcilierea coerentă a politicii UI/backend, fără respingerea autentificărilor existente. |
| V6.2.5 | Politică bazată pe lungime și blocklist, înlocuind regulile de compoziție la creări/resetări. | Nu se slăbește arbitrar politica actuală și nu se impun resetări. |
| V6.2.12 | Corpus verificabil de parole compromise și tratare explicită a indisponibilității. | Nu se trimit parole sau hashuri complete către un furnizor nou și nu se declară o verificare inexistentă. |
| V9.2.3 | Audiență explicită pentru noile tokenuri și rollout compatibil cu sesiunile existente. | O impunere bruscă ar putea deconecta conturile și serviciile curente. |
| V11.4.2 | Benchmark scrypt în Workers și format compatibil cu rehash la autentificare. | Creșterea costului fără benchmark poate depăși limitele Free și degrada loginul. |

Aceste rânduri rămân FAIL în matricea ASVS; planul nu este prezentat ca patch activat. MFA păstrează separat excepția explicită. Auditul organizațional, branch protection și restaurarea reală rămân descrise în auditul principal. Refacerea paginii nu echivalează cu certificarea întregii platforme.

## Rezultatele execuției locale finale

- **PASS**: tipuri app/Worker; lint integral — zero erori, patru avertismente preexistente în componentele logo.
- **PASS**: build standalone Worker, static/Pages, API și e-mail dry run. Audit SEO: 80 pagini indexabile, 212 publice noindex și 11 URL-uri strategice de produse. Cele două demo-uri retrase nu mai sunt pagini indexabile.
- **PASS**: 108 scenarii browser Chromium/WebKit după refacere și corecția navigării. După adăugarea stilurilor critice și a preîncărcării strict pe rutele abonamentului, încă 18 probe relevante trec, inclusiv conținut stilizat fără JavaScript, fluxul de navigare întrerupt, subsolul, moneda și editorul social.
- **PASS**: 67 teste unitare/SSR pe buildul final, inclusiv cele trei probe ale stilurilor critice/preload și cele șapte probe ale recuperării navigării. Rularea integrală de dezvoltare a avut 1.272 PASS, două regresii noi FAIL pe implementarea veche și un benchmark opțional omis; după remediere, fișierul de șapte teste a trecut. Rezultatul integral pe SHA-ul exact se citește din CI-ul PR-ului; rularea inițială nu este prezentată ca integral verde.
- **PASS**: 410 probe în runtime Workers/D1 local real, inclusiv acces anonim respins, separare între clienți, rotație/revocare de sesiune, CSRF/CORS și transportul cookie. Fără scrieri remote sau activare MFA.
- **PASS cu limitele declarate**: auditul static verifică 345 referințe ASVS, 436 endpointuri și 14 panouri, fără erori de inventar sau secrete identificate. Cele șapte FAIL și controalele NOT_VERIFIED rămân în matrice, nu sunt ascunse de succesul execuției scriptului.
- **PASS**: verificare Cloudflare read-only la 09.11, 13:20 UTC — Workerul `avyrontech` păstrează bindingurile D1/AI și cele patru bucketuri R2; toate patru au r2.dev dezactivat și zero domenii custom. Aceasta nu este dovadă de inferență AI sau restaurare executată.
- **Laborator, fără promisiune CrUX**: pe artefactul HTML real al abonamentului, desktop 1440×1000, CPU 1×: LCP 585 ms, CLS 0; mobil 390×844, DPR 3, CPU 4× și Fast 4G: LCP 3.468 ms, CLS 0. Mobilul mai are cost de inițializare JavaScript; nu se declară scor PageSpeed 100 ori INP verificat. În aceeași investigație, înaintea stilurilor critice/preload, desktopul a avut LCP 1.548 ms. Acestea sunt probe de laborator, nu o analiză statistică ori o garanție de producție.
- **Inspecție vizuală**: hero, planuri, subsol, contrast și responsive. Mastere reale 3840×2160, lossless, păstrate separat de imaginile WebP responsive livrate; proveniență în directorul QA. Nu există demo de client nou construit în acest task.

## Notă despre mediul de verificare

Rularea inițială pe serverul de dezvoltare a identificat aserțiunea veche de ordine și a întâlnit așteptări `window.load` blocate în WebKit; a fost oprită și înlocuită cu verificarea artefactelor compilate. Prima regresie compilată a identificat întreruperea navigării vechi/noi; cauza a fost reprodusă în teste unitare înainte de remediere. Rularea finală de 108 scenarii este verde, fără dezactivarea aserțiunilor.

Vite preview simplu servește homepage-ul SPA la o adresă de director fără slash, în timp ce Workerul de producție rezolvă ruta la fișierul ei prerandat. Profilarea/no-JS folosesc de aceea URL-ul local de director `/servicii/website-prin-abonament/`. O măsurare inițială a fallback-ului homepage (4.232 ms) a fost invalidată ca probă pentru acest serviciu; nu se confundă cu HTML-ul de producție. Scriptul de build verifică stilurile critice în head și preîncărcarea modulului abonamentului exclusiv pe rutele RO/EN, fără încărcarea lui pe homepage.

## Publicare și probe externe

Prima execuție CI pe `4e52bdc` a trecut 1.277 teste unitare (un benchmark opțional omis) și 453 scenarii browser, dar a respins trei scenarii: etichetele accesibile ale brandului/telefonului/e-mailului din subsol nu includeau tot textul vizibil, iar două aserțiuni analytics încă cereau vechiul demo beauty. Etichetele artificiale au fost eliminate în favoarea textului vizibil, iar verificările cer acum portofoliul real și absența demo-urilor retrase. Nu se publică pe baza acelei execuții eșuate; rezultatul CI pe revizia corectată se consemnează în PR.

Preview-ul Cloudflare izolat a trecut patru verificări reale Chromium/WebKit × 390/1440 px, fără scriere de solicitări comerciale. În laboratorul Chrome mobil, CPU 4× și Fast 4G, HTML-ul canonic servit de Cloudflare a avut LCP 2.977 ms și CLS 0. Acest rezultat nu echivalează cu date CrUX sau scor PageSpeed 100.

Acest fișier consemnează verificările locale; merge/deploy, SHA-ul final, versiunea efectivă Worker, rezultatele CI și verificările pe domeniile publice se consemnează în PR-ul ramurii `codex/avyron-subscription-footer-recovery-2026-11-09`. Nu se deduce o stare de producție dintr-un build local. Nu se activează furnizori plătiți, configurări amânate sau măsuri cu risc de blocare a autentificării.
