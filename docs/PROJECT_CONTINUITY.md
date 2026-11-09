# Continuitatea proiectului AVYRON

AVY Chat — 09.11.2026: [context comercial și prețuri](./AVY_CHAT_PRICING.md). Corecția distinge proiectele personalizate de produsele digitale, citește tarifele configurate în D1, clarifică întrebările ambigue și validează sumele generate. Se reutilizează AI Core și modelele existente, numai în cotele gratuite. Nu necesită migrare sau rescrierea configurațiilor personalizate. Starea CI și a verificării live se citește în PR.

Reconciliere de producție — 09.11.2026: [inventar, verificări și rollout](./RELEASE_RECONCILIATION_2026-11-09.md) pentru PR-urile #122–#129 și migrările 0110–0113. Se păstrează ordinea dependențelor, sesiuni fără activare MFA/Access, portalul simplificat, abonamentul website, Site Builder / Etape, portofoliul și Leads Agency. Configurația Cloudflare confirmă că domeniile canonice sunt servite de Workerul `avyrontech` cu ASSETS; compatibilitatea Pages rămâne verificată separat. PR #110 și proiectele cabinetelor sunt excluse. Starea merge/deploy și versiunile efective se verifică în raport și PR, nu se deduc din această notă.

Securitate — 08.11.2026: [audit, limită Access și rollback](./security/SECURITY_BOUNDARIES_2026-11-08.md), migrare aditivă 0110, cookie host-only/rotație/revocare, importator legacy restricționat și teste native Workers/D1. Access este doar pregătit, configurarea externă fiind amânată explicit de utilizator; MFA nu se activează. Nu s-au aplicat migrări remote, DNS/WAF sau deploy. Verificați commitul și rezultatele finale în PR. Cabinetul și PR #110 sunt excluse.

Manager Social Media — 07.11.2026: [flux editorial și runbook](./SOCIAL_EDITORIAL_WORKFLOW.md), migrarea aditivă 0105, agenda -24h/+24h, decizii native cu revizie, reutilizare și handoff Codex. Corectează și rezervarea financiară a proiectelor AI, separată de proiectele CRM. Șase materiale text/proveniență au fost importate în D1, strategia operațională și patru automatizări Codex existente au fost actualizate; acestea nu reprezintă publicări sociale. Încărcarea imaginilor în R2 este blocată de autorizare (403), fără fișiere pretins încărcate. Codul, migrarea remote și deployul necesită verificare separată în PR. Cabinetul și PR #110 sunt excluse.

Notificări native — 07.11.2026: [arhitectură și runbook](./NATIVE_NOTIFICATIONS.md), migrarea aditivă 0104, inbox client/staff, reguli live de acces, mesaje contextuale și administrare Owner/Super Admin. Starea locală, PR și producție se verifică separat; această notă nu dovedește deployul. Proiectul cabinetului și PR #110 sunt excluse.

Înlocuire Qwen — 07.11.2026: din `6d00e41`, ramura `codex/replace-qwen-cloudflare-2026-11-07` pregătește Mistral Small 3.1 24B prin bindingul existent. [Runbook](./QWEN_REPLACEMENT.md): 0103, versiuni istorice păstrate, alias legacy, rute sincronizate și controale Free neschimbate. Starea efectivă și verificarea furnizorului se citesc din PR.

Consolidare — 07.11.2026: [inventarul de reconciliere](./RELEASE_RECONCILIATION_2026-11-07.md) acoperă PR-urile restante, dependențele, Altele și recuperarea fluxului Leads prin migrarea aditivă 0101. Publicarea cabinetului este verificată separat în Sites. Rezultatele CI, integrarea și versiunea Worker se consemnează în PR; documentația locală nu constituie dovadă de deploy.

Baza `9dead20` include deja livrările #93 (lotul OS integrat), #103 (portal/client/logo/achiziții), #105 (generator documente), #106 (SEO) și #107 (Avy Skills). Paragrafele istorice marcate „local” sau „deploy amânat” de mai jos descriu momentul redactării, nu o restanță curentă. Verificați istoricul GitHub și dovezile de release pentru starea live.

Avy Skills — 07.11.2026: ramura `codex/avy-skills-2026-11-07`, pornită din `3d08c3f`, adaugă cele trei ateliere interne și migrarea 0100. [Arhitectură și limite verificate](./AVY_SKILLS.md): instrucțiuni/resurse versionate, briefuri private, mockup fără AI, pregătire în coada nativă și Media Generate prin AI Core. Antivirusul se aplică numai uploadurilor externe; generările interne nu consumă scanări. Nu există plafon nou de pregătiri sau resurse, doar paginare, protecții tehnice și bugetele existente. Starea locală/PR/remote/live se verifică separat; această notă nu dovedește deployul.

Actualizare SEO 06.11.2026: auditul de build verifică și descoperirea paginilor din linkuri HTML, iar GA4 folosește coada Google `Arguments`, acord explicit și excluderea suprafețelor private. Dovada Bing este în meta tagul public `msvalidate.01`; starea verificării, sitemapurile și primirea efectivă a evenimentelor trebuie confirmate după deploy. Se reutilizează Cloudflare Crawler Hints pentru IndexNow, fără conector paralel. Vezi [runbookul de indexare](./SEO_INDEXATION_RUNBOOK.md); cifrele private de trafic și exporturile de cont nu se păstrează în Git.

Acest document permite unui agent să continue lucrul fără să confunde codul local, PR-ul, preview-ul și producția. Verifică întotdeauna starea curentă înainte de a folosi inventarul datat de mai jos.

## Limite și surse de adevăr

- GitHub păstrează codul, istoricul și review-ul. `main` alimentează producția publică și sincronizarea Lovable; un PR deschis nu apare automat în Lovable sau în producție.
- Website-ul fără autentificare și AVYRON OS au suprafețe diferite. O schimbare internă nu trebuie să altereze designul public delogat.
- Cloudflare Pages/Workers servesc frontendul și API-ul; D1 păstrează datele operaționale. Migrațiile sunt append-only. Tokenurile și secretele stau în bindinguri/vault, nu în Git, D1 de conținut, Page ori memorie.
- `docs/AVYRON_OS_PRODUCT_MODEL.md` descrie rolurile, canalele și aprobările. O etichetă de cont, un secret prezent sau un rând `configured` nu dovedesc OAuth funcțional, sincronizare, publicare, plată ori indexare.

## Hartă pentru modificări

| Scop | Intrare principală | Verificare |
| --- | --- | --- |
| Rute publice, canonical, noindex, hreflang | `src/seo/publicRoutes.ts`, `src/i18n/routes.ts`, `scripts/prerender.mjs` | `npm run build`, `npm run seo:audit`, HTML/sitemap generate și verificare live după release |
| Scene, 3D și performanță | `src/lib/stage/capability.ts`, `src/components/site/PerformanceGovernor.tsx`, `src/components/biblioteca/StageSlot.tsx` | desktop/mobil, mișcare redusă, fallback static, fără layout shift |
| Dashboard, staff și AI | `src/pages/intern`, `src/components/dashboard`, `cloudflare/workers/api/src/aiProjects.ts` | roluri reale, stări goale, acțiuni, pipeline, API și audit |
| Integrări și facturare | `cloudflare/workers/api/src`, `cloudflare/d1/migrations`, `docs/AVYRON_OS_PRODUCT_MODEL.md` | identitate furnizor, permisiuni, webhook, sync, reconciliere și stare în producție separat |
| Release | `scripts/release-api.mjs`, `wrangler.jsonc`, workflowurile CI | PR verde, migrații/integritate, Worker/Pages, endpointuri și interfață live |

## Inventar de predare la 26.10.2026

Actualizare ulterioară: PR-urile #52–#64 au fost integrate în `main` până la `8eef084`, inclusiv checkoutul Stripe pentru utilizatori autentificați. În contul Stripe AVYRON `acct_1U7mECIGC775oOSQ`, destinația webhook este activă; cele trei secrete Stripe sunt instalate criptat în Workerul de producție `avyrontech`. Nu există încă o plată de test ori o livrare webhook verificată, iar panoul financiar indică „Configurat, neverificat” deoarece `MFA_AUTH_ENABLED=false` blochează verificarea din OS. În Oblio, seria AVY de factură începe cu 0001 și este separată de CM; cele patru secrete Oblio sunt instalate criptat în Workerul AVYRON, iar o citire API directă a confirmat ambele serii, fără a emite facturi. Sincronizarea în OS nu este încă dovedită. Conexiunile sociale nu sunt verificate. D1 arată două legături active ale operatorului Codex, pentru `ai-prod-content` și `leads`; resincronizarea distructivă a contului nu este necesară fără o abatere demonstrată. Vezi [runbookul de conexiuni](./AVYRON_OS_CONNECTIONS_2026-10-26.md) pentru starea exactă. Buildul automat al Workerului a eșuat la instalarea `bun install --frozen-lockfile` din cauza unui `bun.lock` învechit; ramura de audit elimină acest lockfile pentru a folosi `package-lock.json` și `npm@10.9.2`, managerul declarat de proiect. Verifică buildul Cloudflare după merge înainte de a considera remedierea live.

Testul public al AVY din aceeași zi a descoperit HTTP 400 la primul mesaj: widgetul trimite `conversationId: null`, iar API-ul accepta doar șir sau câmp absent. Ramura de audit acceptă explicit `null` și testează prima conversație. API-ul a răspuns 200 la aceeași întrebare fără acel câmp, dar botul nu trebuie considerat reparat până când răspunsul din widget este verificat live după deploy. Panoul AI OS indică „knowledge only” deoarece politica furnizorului AI nu este activă; răspunsurile din sursele aprobate rămân posibile fără modelul generativ.

Actualizare după release: PR-urile #59, #60 și #61 au fost integrate în `main` până la commitul `15d1519`; auditul SEO live a verificat 72 URL-uri din sitemap. În contul AVYRON Search Console, raportul din 23.10.2026 arăta pentru `https://avyron.ro/sitemap.xml` **7 indexate, 62 descoperite dar neindexate și 2 404 istorice**. Cele două exemple 404 răspundeau cu 200 și aveau canonical/index corect la 26.10.2026; validarea remedierii a fost pornită. Sitemapul cu 71 URL-uri a fost retrimis, iar `/servicii`, `/produse` și `/blog` au trecut testul live Google și au intrat în coada de indexare. Aceste solicitări nu dovedesc indexarea finală; recitește raportul după procesarea Google. La verificarea D1/Worker din 26.10.2026 nu existau conexiuni financiare sau sociale active și nu erau instalate cheile Stripe, Oblio ori Revolut Merchant.

Decizie de produs ulterioară: conectează servicii financiare numai pentru încasări. Stripe este procesatorul principal propus, Revolut Merchant este opțional după alegerea și autorizarea contului AVYRON, iar Oblio rămâne flux separat de facturare. Nu conecta API-ul Revolut Business pentru conturi, solduri sau tranzacții bancare; nu este necesar pentru checkout. Vezi [runbookul de conexiuni](./AVYRON_OS_CONNECTIONS_2026-10-26.md). Schimbarea din ramura `codex/payment-only-connections-2026-10-26` blochează activarea conectorului bancar vechi fără a șterge istoricul; verifică PR-ul și producția înainte de a o considera lansată.

La acest moment `origin/main` era `4bd0e90`. PR-urile [#52](https://github.com/Prometheus1833/avyrontech/pull/52) SEO/indexare, [#53](https://github.com/Prometheus1833/avyrontech/pull/53) dashboard staff, [#54](https://github.com/Prometheus1833/avyrontech/pull/54) vizualul scenei cu dispozitive, [#55](https://github.com/Prometheus1833/avyrontech/pull/55) AVY bot, [#56](https://github.com/Prometheus1833/avyrontech/pull/56) AI AVY Prod și [#57](https://github.com/Prometheus1833/avyrontech/pull/57) verificări financiare erau deschise, nu integrate în `main`. Verifică din nou `gh pr list` și diferențele dintre ramuri înainte de a le continua sau combina. Nu trata un check CI verde drept deploy.

Pentru seria Oblio și conexiunile sociale/financiare, [runbookul din PR #57](https://github.com/Prometheus1833/avyrontech/pull/57/files) este o propunere pe ramură până la merge; verifică starea reală a conturilor și D1 înainte de activare.

## Predare între agenți

1. `git fetch origin main`, `git status --short --branch`, `gh pr list --state open`; inspectează worktree-urile și fișierele suprapuse.
2. Pentru un task nou, pornește din ultimul `origin/main` pe o ramură dedicată. Pentru continuarea unui PR, folosește ramura lui și integrează ultimul `main` acolo înainte de cererea de merge. Nu rescrie istoricul împins și nu suprascrie commiturile Lovable.
3. Stabilește sursa exactă a datelor și starea: cod local, preview, PR, D1/Worker configurat, provider verificat, live. Păstrează `draft`, `pending_approval`, `approved`, `scheduled`, `published` și `synced` distincte.
4. Înainte de a preda, notează în PR: scopul cerut, commitul de bază, fișierele și migrațiile schimbate, verificările cu rezultate, captura/URL-ul preview când contează vizual, efectele externe, ce rămâne blocat și următorul pas exact.
5. Merge, deploy, publicare, schimbări DNS, activarea furnizorilor și migrațiile remote necesită autorizare explicită conform `AGENTS.md`. După o lansare autorizată, verifică destinația reală și actualizează predarea; nu lăsa un status „pregătit” să devină „finalizat” prin presupunere.

Pentru Lovable: lucrează din `main` după merge-ul PR-ului relevant. Cât timp o ramură GitHub este în review, evită editarea acelorași fișiere în Lovable. Dacă Lovable produce un commit între timp, adu-l în ramura de lucru înainte de a continua.

## Document Center — release autorizat la 4 noiembrie 2026

Modulul este documentat în [DOCUMENT_CENTER.md](./DOCUMENT_CENTER.md): cinci zone compacte, tipizate și generator împreună, editor și exporturi reale, acces pe resursă și versiune, integrare cu entitățile existente. Utilizatorul a autorizat push/deploy. Privatizarea `FILES` a fost confirmată în Cloudflare și s-au creat două destinații private distincte de backup în R2 existent; configurația de producție activează explicit operațiile pe fișiere și backupul manual. Preview nu moștenește destinațiile de producție. Verificați rezultatul migrărilor 0075/0076 și revizia live în jurnalul release-ului. Modelele juridice nu sunt aprobate; importurile rămân în carantină fără scanner. Inventarul și copiile de recuperare private nu sunt incluse în repository-ul public.

## Dashboard și aprobări — 5 noiembrie 2026

Continuare locală: [Manager Social Media și AVY Core](./SOCIAL_AVY_CORE.md) documentează deciziile editoriale sincronizate, mini-dashboardul activităților, eliminarea navigării duplicate și abonamentele de mentenanță pe înregistrările existente. Migrarea aditivă 0078 este verificată local. Conform ultimei instrucțiuni a utilizatorului, push și deploy sunt amânate până la încheierea taskurilor; nu prezentați aceste schimbări drept live.

Ramura de rafinare pornește din `c4403abc`: carduri compacte, centru unic de citire pentru cinci surse originale, revizuire contextuală, actualizare automată și verificare reală a bindingurilor. Vezi [DASHBOARD_APPROVALS_SYNC.md](./DASHBOARD_APPROVALS_SYNC.md). În mandatul explicit de sincronizare, D1 preview a fost aliniat de la 24 la 75 de migrații după backup restaurat și verificat; zero erori FK, `quick_check=ok`, datele preview rămân separate. Codul nou și indexurile de producție nu sunt live doar pentru că baza preview a fost aliniată. Nu s-a activat un serviciu plătit, un index Vectorize sau un conector extern fictiv.

## Leaduri și configurarea serviciilor — 5 noiembrie 2026

Lucrări locale pe `codex/leads-services-config-2026-11-05`, după checkpointul local `01c12f3`. Vezi [LEADS_SERVICE_CONFIGURATION.md](./LEADS_SERVICE_CONFIGURATION.md): pipeline compact, motive comerciale de eliminare și editori separați pentru prezentarea comună și paginile serviciilor. Migrațiile 0079/0080 sunt aditive. Push, PR și deploy rămân amânate conform utilizatorului; nicio publicare reală sau migrare remote nu a fost executată pentru această etapă.

## Abonamente Clienți și AVYRON — 5 noiembrie 2026

Continuare locală după `8fa9b41`, pe `codex/client-internal-subscriptions-2026-11-05`. [SUBSCRIPTION_OPERATIONS.md](./SUBSCRIPTION_OPERATIONS.md) descrie alocările pe CRM/proiecte/conturi existente, calendarul lunar și ciornele în registrul financiar, plus evidența conturilor interne din `financial_expenses`. Migrarea aditivă 0081 nu activează furnizori, facturare externă sau plăți automate. Accesul clientului, staffului și financiarului este separat în backend. Push și deploy rămân amânate până la încheierea taskurilor.

## Centru Documente — organizare și personalizare, 5 noiembrie 2026

Continuare locală după `24b8957`, pe `codex/document-center-experience-2026-11-05`. [DOCUMENT_CENTER_EXPERIENCE.md](./DOCUMENT_CENTER_EXPERIENCE.md) descrie Biblioteca Agenție, Documente SC/STAFF, paginile separate Tipizate și Generator, precompletarea emitentului, contextul CRM/abonament și ciorna de factură din registrul existent. Biblioteca efectelor/integrărilor din dashboard se numește Biblioteca Artefacte. Migrarea aditivă 0082 completează exclusiv date goale ale emitentului cunoscut și păstrează referințele financiare cu integritate tranzacțională. Nu emite facturi și nu debitează conturi. Push, PR, merge, migrare remote și deploy rămân amânate conform utilizatorului.

## Membrii Agenției și chat — 05.11.2026, local

Continuare după `27a66a3`, pe `codex/internal-chat-staff-access-2026-11-05`. [STAFF_RANKS_INTERNAL_CHAT.md](./STAFF_RANKS_INTERNAL_CHAT.md) descrie chatul adaptat desktop/mobil, cele șapte ranguri, permisiunile granulare pe infrastructura existentă, alocările și crearea atomică a conturilor, cu politica MFA existentă și evidențierea explicită a excepției de rollout. Configurația MFA globală nu a fost schimbată. Utilizatorul a confirmat explicit accesul Super Admin la Documente SC și backupurile firmei, înlocuind politica anterioară de delegare. 0083 este aditivă și nu realocă automat conturile existente; migrarea trebuie să preceadă API-ul. Push, PR, merge, migrare remote și deploy rămân amânate până la finalizarea taskurilor.

## Clienți — fișă și alocări, 05.11.2026 (local)

Ramura `codex/client-workspace-2026-11-05`, de la `51960ce`, extinde Clienți cu creare CRM/cont nativ, schimbare obligatorie a parolei, profil fiscal canonic, proiecte multiple, abonamente contextuale, plăți și Document Center în mini-dashboard. Migrarea aditivă `0084` adaugă revizii și mod explicit de acces; previne reapariția unei asocieri revocate prin reconciliere pe email pentru clienții administrați explicit. Nu schimbă autentificarea, furnizorii sau designul public. Vezi [CLIENT_WORKSPACE.md](./CLIENT_WORKSPACE.md) pentru API, limite și lansare. Nu presupune push/PR/merge/migrare remote/deploy: utilizatorul a cerut lansarea numai la sfârșitul lotului și va face testul final în contul real ulterior.

## Organizare OS, Financiar și Media — 05.11.2026 (local)

Continuare de la `3aa2ead` pe `codex/os-workspace-refinement-2026-11-05`. [OS_WORKSPACE_REFINEMENT.md](./OS_WORKSPACE_REFINEMENT.md) descrie meniul reorganizat, eliminarea Control platformă, directorul căutabil de destinații, cele cinci grupe financiare, scrollurile interne accesibile, AVY Engine și bibliotecile Media AVYRON/clienți. 0085 este aditivă și trebuie să preceadă API-ul. Media reutilizează CRM, RBAC, FILES și destinațiile private de backup; uploadurile rămân în carantină fără scanner. Reconcilierea Engine modifică numai eligibilitatea legăturilor interne, fără activare de furnizori. Backupul verifică fișierul și manifestul; restaurarea automată completă D1 nu este inclusă. Nicio migrare remote, publicare, activare plătită, push sau deploy în această etapă.

## INTERN OS și bară staff — 05.11.2026 (local)

Continuare de la `9940346`, pe `codex/staff-upbar-navigation-2026-11-05`. [STAFF_UPBAR_NAVIGATION.md](./STAFF_UPBAR_NAVIGATION.md) descrie intrarea directă INTERN OS, meniul personal redus, resursele/proiectele contextuale și chatul echipă/proiect-client, reutilizând identitatea, permisiunile și mesajele existente. 0086 adaugă contextul proiectului și previne expunerea lui în canale/DM vechi pe durata actualizării; trebuie aplicată înainte de Worker. Nu confundă proiectele operaționale cu alocările AI. Mesajele salvate folosesc D1 existent; nu există furnizori, notificări externe sau servicii plătite noi. Push, PR, migrare remote și deploy rămân amânate până la finalul taskurilor, iar utilizatorul păstrează testul final în contul real pentru mai târziu.

## Previzualizări servicii și verificări finale — 06.11.2026, local

Continuare de la `faf94f8`, pe `codex/service-link-previews-2026-11-05`. [Previzualizări și pregătirea lansării](./LINK_PREVIEWS_RELEASE_READINESS.md) descrie cele 26 de imagini publice tematice RO/EN, metadatele specifice, prevenirea imaginilor rămase la navigare, corecția comună a HTML-ului rutelor private și remedierea alertei de dezvoltare `minimatch`. La cererea explicită s-a creat și verificat live un cont client gratuit nativ, fără privilegii sau abonamente; datele de acces nu se înscriu în repository. D1 producție este integră, la 0077, cu zece migrări locale încă neaplicate (0078–0087, ultima aliniază numai eticheta SAL a unui artefact, fără schimbări comerciale). Push, PR, merge, migrări remote și deploy rămân pentru etapa finală autorizată; nu prezentați metadatele noi și modulele locale drept live.

Verificările finale au inclus și o corecție restrânsă a selectorului de dispozitive de pe homepage: la scroll anulat și layout deplasat, fallbackul recalculează destinația. Testul nou reproduce problema pe codul vechi și trece după corecție. Raportul de pregătire include rezultatele combinate pentru 197 de scenarii browser, 757 de teste de cod, verificări native Worker/ASSETS și limitele reale de release. Acestea sunt verificări locale; release-ul rămâne neexecutat.

## Carusele Exemple și notificări — 06.11.2026, local

Continuare de la `520c42e`, pe `codex/example-carousels-notifications-2026-11-06`. [EXAMPLE_CAROUSELS.md](./EXAMPLE_CAROUSELS.md) descrie registrul din Platformă, cele zece contexte de servicii, păstrarea exemplelor existente, editarea și istoricul, pipeline-ul ciornă/verificare/aprobare/publicare și integrarea cu centrul de aprobări/notificările native. 0088 este aditivă și trebuie să preceadă API-ul; în lot sunt acum unsprezece migrații locale, 0078–0088, fără o aplicare remote în această etapă. Publicarea rescrie și HTML-ul servit prin Worker, fără a păstra exemplele ascunse în snapshotul prerandat. Clopoțelul folosește un popover nemodal sub buton, adaptat mobilului. Se reutilizează RBAC/D1 și politica MFA; nu există servicii, credite Lovable sau bucketuri publice noi. Push, PR, merge și deploy rămân amânate până la finalul taskurilor.

## Antivirus Bouncer — 06.11.2026, local, acceptanță externă nefinalizată

Continuare de la `1397ce3`, pe `codex/bouncer-antivirus-2026-11-06`. [ANTIVIRUS_BOUNCER.md](./security/ANTIVIRUS_BOUNCER.md) înlocuiește propunerea cu scanner generic din PR #69: furnizor unic Bouncer Free prin API v2, D1/R2 existente, carantină, cote rezervate atomic, legarea versiunii R2 la verdict, citiri fail-closed și inventariere istorică. Principal → Antivirus este ultimul buton din prima grupă; control plane exclusiv Owner/Super Admin. Migrarea 0089 este aditivă; lotul local ajunge la 0078–0089. Nu există servere/ClamAV/Oracle/bucketuri noi ori servicii plătite activate. Nu s-a găsit cheia Bouncer în inventarul numelor de secrete; documentele publice indică Mumbai și nu confirmă un DPA/garanțiile transferului. Citirea API a setărilor publice R2 a fost refuzată cu 10000. Până la verificări, fără date reale transmise și fără afirmație de scanare live; PR #69 rămâne draft. Push, PR update, merge, migrări remote și deploy sunt amânate.

## Colaboratori / Parteneri — 06.11.2026, local

Continuare de la `0dd2286`, pe `codex/collaborators-partners-2026-11-06`. [COLLABORATORS_PARTNERS.md](./COLLABORATORS_PARTNERS.md) descrie ultimul buton din Principal, fișele compacte cu mini-dashboard, contactele, codurile interne și legăturile explicite la CRM/conturi existente. Registrul este distinct de planurile de produse AVY Partener. Badge-ul și Colaborările mele sunt derivate server-side; nu acordă roluri sau licențe. 0090 adaugă numai metadate și asocieri, cu maximum trei fișiere active × 5 MB, în Document Center/R2 existente, supuse porții antivirus. Notele interne, permisiunile granulare și revocarea sunt verificate în backend; schimbarea contului retrage publicarea documentelor. Uploadurile reale rămân blocate până la configurarea/verificarea Bouncer. Lotul ajunge la 0078–0090; push, PR, merge, migrări remote și deploy rămân amânate.


## Proiecte, activități sociale și recurente — 6 noiembrie 2026

Lotul precedent a fost integrat prin [PR #93](https://github.com/Prometheus1833/avyrontech/pull/93), la `dcfd638`, cu migrații până la 0090 și release verificat anterior. Însemnările mai vechi „local/amânat” de mai sus sunt instantanee istorice. Noua ramură `codex/project-social-recurring-2026-11-06` pornește din acest commit și implementează [etapele proiectelor, clientul opțional/nou, comenzile viitoare sociale și grupa Activități Recurente](./PROJECTS_SOCIAL_RECURRING.md). Migrațiile 0091–0092 sunt doar ale noii ramuri, probate local; nu au fost aplicate remote în acest task. Noul push/PR nu înseamnă merge/deploy. Nu se configurează acum cheile rămase și nu se execută publicări sociale.

## Creare proiect AI, arhivă de leaduri și beneficiari direcți — 6 noiembrie 2026

Continuare de la `05ced74` (PR #94 verificat verde în GitHub la începutul acestui task), pe `codex/ai-leads-document-workflows-2026-11-06`. [Runbookul fluxurilor](./AI_LEAD_DOCUMENT_WORKFLOWS.md) descrie crearea AI cu aprobare/MFA/idempotency, arhivarea reversibilă a leadurilor cu cinci motive și listă în pagină, contactarea manuală WhatsApp validată, rezumatul editabil Documente SC, beneficiarul completat direct și proiectele viitoare cu exporturi reale private. 0093 adaugă numai metadatele arhivării în tabela existentă. Nu există merge, migrare remote sau deploy nou în această etapă; conturile, serviciile plătite și cheile rămân neatinse.

## Contoare de activitate și separarea Logo — 6 noiembrie 2026

Continuare din `c6f2865` (#95, incluzând #94), pe `codex/dashboard-activity-logo-products-2026-11-06`. [Runbookul](./DASHBOARD_ACTIVITY_LOGO_MODULES.md) descrie contoarele autorizate desktop/mobil, confirmările individuale ale anunțurilor, AVY STAFF și mutările cerute, produsul 3D plătit în Produse și simulatorul 2D în Platformă, istoricul privat al briefurilor, tariful asistat AI păstrat și situația comercială nativă. 0094–0096 sunt append-only; prețurile și achizițiile existente nu sunt suprascrise. D1 remote a refuzat citirea cu 7403; nu există reverificare a datelor live, migrare remote, merge, deploy sau activare de furnizori în acest task.

## Căutare directă și AVY ChatBot AI — 6 noiembrie 2026

Continuare din `67a2223` (#96, incluzând #94–#95), pe `codex/dashboard-search-chatbot-2026-11-06`. [Runbookul](./DASHBOARD_SEARCH_CHATBOT.md) descrie mutarea Financiar în Principal, căutarea inline autorizată și neblocantă, tooltipurile barei superioare și pagina Platformă → AVY ChatBot AI. Agentul public existent suportă conversații generale sub aceleași cote/politici, fără acces la documente private sau instrumente noi; configurația se aprobă explicit și respinge versiuni vechi. 0097 creează o versiune nouă numai pentru instrucțiunile standard istorice nemodificate și păstrează configurațiile personalizate, istoricul, instrumentele și finanțele. Testele cu furnizor simulat nu sunt dovadă de generare live. Nu există merge, migrare remote, deploy sau activare de furnizori în acest task.

## Rezumate de proiecte și sincronizarea conturilor — 6 noiembrie 2026

Continuare din `f61b8f2` (#97, incluzând #94–#96), pe `codex/project-summaries-account-sync-2026-11-06`. [Runbookul](./PROJECT_SUMMARIES_ACCOUNT_SYNC.md) descrie cardurile compacte cu tip/client/site/buget/etapă/perioadă/servicii, calendarul opțional din migrarea 0098, abonamentele native din fișa proiectului și reconcilierea legacy a contului înainte de răspunsul `/auth/me`, cu protejarea revocărilor. Accesul financiar este verificat în backend inclusiv pentru încasări și metadatele istoricului. Un audit read-only agregat este disponibil; citirea D1 remote din acest task a fost refuzată cu 7403, deci sincronizarea conturilor reale nu este declarată verificată. Nu există migrări remote, activări de furnizori, merge sau deploy în acest task.

## Portal client simplificat — 6 noiembrie 2026

Continuare din `96fc8c8` (#98, incluzând #94–#97; verificările GitHub ale #98 au fost reverificate și sunt verzi), pe `codex/client-portal-simplification-2026-11-06`. [Runbookul portalului](./CLIENT_PORTAL_SIMPLIFICATION.md) descrie marca Avyron Tech, navigarea clientului fără AVY Core/biblioteci interne, unificarea mentenanței și abonamentelor, căutarea autorizată în proiecte/documente și interfața separată Centru Documente pentru citire, versiuni, export și distribuire cu confirmare. Accesul rămâne derivat din granturile/publicările native; nu sunt adăugate migrații sau furnizori și nu se modifică rolurile staffului. Testele browser sunt sintetice; acceptanța în contul real rămâne la utilizator. Nu există merge, migrare remote sau deploy nou în acest task.

## Suport, facturi și coș client — 6 noiembrie 2026

Continuare din `e892fc8` (#99, incluzând #94–#98, reverificat verde), pe `codex/client-support-billing-cart-2026-11-06`. [Runbookul](./CLIENT_COMMERCE_SUPPORT.md) descrie Suport și mesaje, Plăți și facturi cu descărcări autorizate/CLEAN, bara mobilă Acasă–Servicii–Coș–Produse–Mai multe și starea comună a coșului, cu jurnal de modificări neconfirmate, reîncercare, timeout și catalog curent. Sertarul public gol nu șterge coșul contului. S-a corectat folosirea unei coloane financiare inexistente, reutilizând relațiile de reconciliere Stripe/Revolut native, fără migrări noi. Testele sunt locale/sintetice; nu există conturi reale modificate, plăți, furnizori activați, merge sau deploy în acest task.

## Avy Cont și navigarea clientului — 6 noiembrie 2026

Continuare din `efccced` (#100, incluzând #94–#99), pe `codex/client-account-home-navigation-2026-11-06`. [Runbookul](./CLIENT_ACCOUNT_HOME.md) descrie marca Avyron Web, intrarea Avy Cont, meniul cu Blog/Biblioteca Artefacte și prima pagină cu proiecte/achiziții native, Mentenanță, Profil și metode de plată. Favoritele personale și sincronizarea lor automată sunt retrase din UI, fără ștergerea istoricului sau a achizițiilor/licențelor. Nu există migrări noi, efecte comerciale, merge sau deploy; contul real rămâne de verificat de utilizator.

## Creează Logo și produse Development achitate — 6 noiembrie 2026

Continuare din `4924253` (#101, întregul lot #94–#101 verificat verde), pe `codex/client-logo-paid-products-2026-11-06`. [Runbookul](./CLIENT_LOGO_PAID_PRODUCTS.md) descrie intrarea către simulatorul existent, autentificarea comună site/cont pe hostul API fără extinderea cookie-ului la subdomenii, recenziile precompletate cu aprobare păstrată și istoricul paginat al produselor cu plată confirmată. Nu adaugă migrări, roluri, tarife sau furnizori. Sesiunile vechi pot necesita reautentificare o dată. Utilizatorul a omis Hugging Face și a autorizat explicit D1 Write pentru backup/migrări. Starea release-ului și verificările finale se consemnează în PR; această notă nu dovedește merge/deploy.

## Generator Documente — structură și exporturi AVYRON, 06.11.2026

Continuare de la PR #103 (`b6c4f7b`) pe ramură dedicată: [DOCUMENT_GENERATOR_EDITORIAL.md](./DOCUMENT_GENERATOR_EDITORIAL.md). Acțiuni directe de salvare/PDF/Word/pregătire distribuire, previzualizare comună și 11 familii cu structură modernă, cu noi versiuni de master și păstrarea personalizărilor/istoricului. 0099 este aditivă. Utilizatorul a confirmat păstrarea sediului din OS și completarea ulterioară a ONRC/reprezentant/capital în Documente SC. Consultați PR-ul pentru verificări și starea efectivă a migrării/deployului; documentul de continuitate nu dovedește o lansare.

## Prezentare generală — diagnostic și acțiuni (07.11.2026)

Vezi [runbookul operațional](./OVERVIEW_OPERATIONS.md): nume native pentru agenți, selecție proiect AI, priorități detaliate și retragerea controlată a cererilor. Reautorizarea R2/AI și probele reale sunt consemnate separat de cod. Nu există migrare nouă; PR #113/0105 rămâne separat. Proiectul cabinetului și designul public sunt excluse. Starea PR/CI/deploy se citește din GitHub, nu din această notă.

Financiar / produse — 08.11.2026: [fluxuri și limite](./FINANCE_COMMERCE_COMPLETION.md), migrarea aditivă 0106. Conturi editabile, verificare procesatori accesibilă, completare identități, licențe/livrabile și activarea verificată a produselor. Nu reprezintă dovadă de migrare remote, vânzări active sau deploy; PR #113/#114 și cabinetul rămân livrări distincte.

### Website prin abonament — task branch, not production (2026-11-08)

See `docs/WEBSITE_SUBSCRIPTIONS.md` for audit, native entity mapping, migration 0111, routes, payment/approval/quota rules, activation prerequisites and rollback. Homepage chooser gains a third square card; Cinematic 3D stays coming soon; the general services directory stays unchanged. Three monthly plans start unpriced and require explicit Owner review plus the existing verified payment/invoice setup. No remote migration/provider write/deploy is implied by local implementation. Preserve independent security PR #122 (migration 0110) and Cabinet PR #110.
