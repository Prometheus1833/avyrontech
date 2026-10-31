# AVYRON

Website public bilingv și AVYRON OS, construite în același repository. GitHub este sursa de adevăr pentru cod și release; regulile obligatorii pentru orice agent sunt în [AGENTS.md](./AGENTS.md).

## Înainte de a modifica proiectul

1. Citește [continuitatea proiectului](./docs/PROJECT_CONTINUITY.md), [glosarul](./docs/PROJECT_GLOSSARY.md) și, pentru mișcare sau 3D, [ghidul efectelor vizuale](./docs/VISUAL_TECHNIQUES.md).
2. Actualizează `origin/main`, verifică ramura curentă, schimbările locale și PR-urile deschise. Un PR sau un preview nu înseamnă funcționalitate lansată.
3. Lucrează pe o ramură dedicată, păstrează schimbările altor agenți și deschide PR. Lovable urmărește `main`; evită editarea acelorași fișiere în Lovable cât timp PR-ul este deschis.

## Harta codului

- `src/pages`, `src/components/site`, `src/components/services`, `src/components/biblioteca`, `src/components/logo3d`: website și experiențe vizuale.
- `src/pages/intern`, `src/components/dashboard`, `src/components/finance`: interfața AVYRON OS.
- `cloudflare/workers/api/src`: API, autorizare, AI și integrări; `cloudflare/d1/migrations`: istoric D1 cu migrări append-only.
- `src/seo/publicRoutes.ts`: registrul rutelor publice; `scripts/prerender.mjs`, `scripts/generate-sitemap.mjs`, `scripts/audit-seo.mjs`: ieșirea indexabilă și auditul.
- `docs/SEO_INDEXATION_RUNBOOK.md`: verificarea indexării în Search Console și controlul post-release al paginilor RO/EN.
- `docs/AVYRON_OS_PRODUCT_MODEL.md`: modelul funcțional al OS, inclusiv roluri, aprobări și conexiuni.

## Verificare locală

Instalează dependențele din lockfile cu `npm ci`. Pentru schimbări de cod rulează `npm run typecheck`, `npm run lint` și testele relevante. Pentru suprafața publică rulează `npm run build`, `npm run build:pages` și `npm run build:worker`; pentru API rulează și `npm run build:api` (dry run). `npm test` include teste ale HTML-ului prerandat și trebuie rulat după `npm run build`, nu după un simplu `vite build` care golește `dist`.

Nici buildul local, nici PR-ul nu dovedesc starea live. Merge, migrațiile remote, deployul și publicarea cer autorizarea explicită descrisă în [AGENTS.md](./AGENTS.md).
