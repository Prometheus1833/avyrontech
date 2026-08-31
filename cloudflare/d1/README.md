# Cloudflare D1 — Date business

D1 (SQLite distribuit) stochează **toate** datele care au listări, relații,
filtrări sau căutări: clienți, proiecte, facturi, plăți, lead-uri, tickete etc.

> Status: 🟢 **Activ pentru API-ul Cloudflare**. Producția și preview-ul au baze
> distincte; migrațiile de preview se aplică înaintea versiunii de branch, iar
> producția rămâne un pas separat, cu backup și aprobare explicită.

## Activare

```bash
# 1. Creează baza
npx wrangler d1 create avyron-db

# 2. Pune `database_id` returnat în wrangler.jsonc

# 3. Aplică migrațiile
npx wrangler d1 migrations apply avyron-db --local    # dev
npx wrangler d1 migrations apply DB --config wrangler.jsonc --env preview --remote # preview
npx wrangler d1 migrations apply DB --config wrangler.jsonc --env= --remote         # producție

# 4. Verificare
npx wrangler d1 execute avyron-db --remote \
  --command "SELECT name FROM sqlite_master WHERE type='table';"
```

În Workers/Pages: binding-ul este `env.DB`.

## Tabele (vezi `migrations/`)

| Tabel              | Rol                                          |
|--------------------|----------------------------------------------|
| `clients`          | Clienți Avyron (companie, contact, status)   |
| `projects`         | Proiecte per client (domeniu, status)        |
| `services`         | Servicii per proiect (preț, ciclu facturare) |
| `subscriptions`    | Abonamente recurente (next_billing_date)     |
| `invoices`         | Facturi (status, due_date, amount)           |
| `payments`         | Plăți încasate (provider, paid_at)           |
| `leads`            | Contact / demo / request example             |
| `support_tickets`  | Tickete suport per client+proiect            |
| `website_content`  | CMS per-proiect pentru clienții cu admin     |
| `users` / `profiles` | Identitate, profil și autentificare Cloudflare |
| `user_roles`       | Roluri `user`, `staff`, `admin`              |
| `promotions`       | Coduri, procente, perioade, limite și domeniu de aplicare |
| `commerce_orders`  | Comenzi recalculate, bază eligibilă și total validate de Worker |
| `promotion_redemptions` | Utilizări promoționale auditabile       |
| `blog_posts`       | Articole RO/EN, SEO, social și stare editorială |
| `blog_post_revisions` | Istoric înaintea fiecărei editări de articol |

## Convenții

- Migrațiile sunt **append-only**. Nu rescrie o migrație aplicată.
- Numerotare: `NNNN_descriere.sql`.
- ID-uri ca `TEXT` (UUID generat în Worker cu `crypto.randomUUID()`).
- `created_at` / `updated_at` ca `INTEGER` (epoch ms).
- JSON stocat ca `TEXT` (SQLite n-are `jsonb`).
- Indexuri pe coloanele folosite în `WHERE` / `ORDER BY` / `JOIN`.
- Articolele publice sunt citite fără autentificare; ciornele și operațiile de
  scriere trec prin Worker și cer rol `staff`/`admin`.

## Pattern Worker

```ts
// listare clienți cu filtru
const { results } = await env.DB
  .prepare("SELECT id, company_name, status FROM clients WHERE status = ? ORDER BY created_at DESC LIMIT 50")
  .bind("active")
  .all<{ id: string; company_name: string; status: string }>();
```

## Backup

```bash
npx wrangler d1 export avyron-db --remote --output=backup-$(date +%F).sql
```
