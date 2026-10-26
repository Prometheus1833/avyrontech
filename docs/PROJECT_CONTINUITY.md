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

Actualizare după release: PR-urile #59, #60 și #61 au fost integrate în `main` până la commitul `15d1519`; auditul SEO live a verificat 72 URL-uri din sitemap. Numărul de URL-uri indexate efectiv de Google rămâne de verificat în contul AVYRON Search Console. La verificarea D1/Worker din 26.10.2026 nu existau conexiuni financiare sau sociale active și nu erau instalate cheile Stripe, Oblio ori Revolut Merchant.

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
