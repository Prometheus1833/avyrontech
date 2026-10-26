# Continuitatea proiectului AVYRON

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
