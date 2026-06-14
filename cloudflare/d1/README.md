# Cloudflare D1 — Date business

D1 (SQLite distribuit) stochează **toate** datele care au listări, relații,
filtrări sau căutări: clienți, proiecte, facturi, plăți, lead-uri, tickete etc.

> Status: 🟡 **Scaffolding**. Aplicația folosește în continuare Lovable Cloud
> (Postgres) pentru date live. D1 e pregătit pentru activare graduală.

## Activare

```bash
# 1. Creează baza
bunx wrangler d1 create avyron-db

# 2. Pune `database_id` returnat în wrangler.jsonc (decomentează blocul d1_databases)

# 3. Aplică migrațiile
bunx wrangler d1 migrations apply avyron-db --local    # dev
bunx wrangler d1 migrations apply avyron-db --remote   # producție

# 4. Verificare
bunx wrangler d1 execute avyron-db --remote \
  --command "SELECT name FROM sqlite_master WHERE type='table';"
```

În Workers/Pages: binding-ul este `env.DB`.

## Tabele (vezi `migrations/0001_init.sql`)

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

## Convenții

- Migrațiile sunt **append-only**. Nu rescrie o migrație aplicată.
- Numerotare: `NNNN_descriere.sql`.
- ID-uri ca `TEXT` (UUID generat în Worker cu `crypto.randomUUID()`).
- `created_at` / `updated_at` ca `INTEGER` (epoch ms).
- JSON stocat ca `TEXT` (SQLite n-are `jsonb`).
- Indexuri pe coloanele folosite în `WHERE` / `ORDER BY` / `JOIN`.

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
bunx wrangler d1 export avyron-db --remote --output=backup-$(date +%F).sql
```
