# Cloudflare Workers API — Structură standard

Toate operațiile trec prin Worker. Browser-ul nu accesează direct D1/KV/R2.

În producție, același Worker este disponibil pe `api.avyron.ro/v1/*` și pe
rutele same-origin `/api/*`. Namespace-ul versionat este rescris intern, fără
redirect sau Worker intermediar. Vezi [`../../../docs/API_GATEWAY.md`](../../../docs/API_GATEWAY.md).

## Rută & responsabilitate

```
/api/auth/*           ← signup, login, refresh, logout
/api/clients/*        ← CRUD clienți (D1: clients)
/api/projects/*       ← CRUD proiecte (D1: projects)
/api/services/*       ← CRUD servicii pe proiect (D1: services)
/api/subscriptions/*  ← abonamente recurente (D1: subscriptions)
/api/invoices/*       ← facturi (D1: invoices) + R2: invoices/*.pdf
/api/payments/*       ← încasări (D1: payments) + webhooks Stripe/Paddle
/api/leads/*          ← contact, demo, request example (D1: leads)
/api/tickets/*        ← support (D1: support_tickets)
/api/content/*        ← KV (site_settings, homepage, seo, features)
                       + D1 (website_content per proiect)
/api/media/*          ← upload, signed-url, delete (R2)
```

Tipurile binding-urilor se generează din `wrangler.jsonc` prin
`npm run types:worker`; `npm run types:worker:check` detectează orice diferență
între configurație și `worker-configuration.d.ts`.

## Reguli de aur

- **Validare**: zod la fiecare endpoint.
- **Auth**: JWT scurt (15 min) + refresh, stocat httpOnly cookie.
- **Roluri**: `admin` (Avyron staff), `client` (per client_id), `public` (leads).
- **Audit**: orice mutație de date business → log in D1 (`audit_log` — adăugăm
  într-o migrație ulterioară când e cerut).
- **Rate limiting**: Rate Limit binding pentru burst + UPSERT atomic în D1
  (`rate_limit_counters`) pentru limita exactă.
- **Erori**: răspuns uniform `{ error: { code, message } }`, status corect.

## Admin Dashboard Avyron

Module (consumă API-urile de mai sus):

```
Dashboard      → /api/clients?summary=1 + /api/invoices?status=overdue
Clients        → /api/clients
Projects       → /api/projects
Services       → /api/services
Subscriptions  → /api/subscriptions
Invoices       → /api/invoices
Payments       → /api/payments
Leads          → /api/leads
Support        → /api/tickets
Media          → /api/media
Settings       → /api/content (KV)
```

Politica completă D1/KV/R2 și separarea producție/preview sunt în
`../STORAGE_ARCHITECTURE.md`.

## Admin pentru site-urile clienților

`domeniu.ro/admin` poate modifica:
- telefon, email, titluri, descrieri → `KV` (`client:<pid>:site_settings`, `:homepage`)
- servicii, prețuri, galerie, testimoniale → `D1` (`website_content` JSON pe secțiune)
- imagini → `R2` (`/website-media/<project_id>/...`)
