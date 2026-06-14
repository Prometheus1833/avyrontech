# Cloudflare D1 — Infrastructură

Acest folder conține schema și migrațiile pentru baza de date D1 (SQLite la edge),
pregătite pentru a fi rulate pe Cloudflare Workers/Pages.

## Status

🟡 **Scaffolding** — binding-ul este definit (comentat) în `wrangler.jsonc`.
Aplicația folosește în continuare Lovable Cloud (Postgres) pentru toate datele;
D1 este pregătit pentru cazuri viitoare unde vrem stocare la edge (cache,
analytics, A/B flags, rate limiting persistent etc.).

## Activare

```bash
# 1. Creează baza
bunx wrangler d1 create avyron-db

# 2. Copiază `database_id` returnat și pune-l în wrangler.jsonc
#    (decomentează blocul `d1_databases`)

# 3. Aplică migrațiile
bunx wrangler d1 migrations apply avyron-db --remote
bunx wrangler d1 migrations apply avyron-db --local   # pentru dev

# 4. Query rapid pentru verificare
bunx wrangler d1 execute avyron-db --remote --command "SELECT name FROM sqlite_master WHERE type='table';"
```

În Workers/Pages Functions, binding-ul este disponibil ca `env.DB`:

```ts
export const onRequest: PagesFunction<{ DB: D1Database }> = async ({ env }) => {
  const { results } = await env.DB.prepare("SELECT 1 AS ok").all();
  return Response.json(results);
};
```

## Structură

```
cloudflare/d1/
├── README.md                 ← acest fișier
├── schema.sql                ← schema completă (referință)
└── migrations/
    └── 0001_init.sql         ← prima migrație
```

## Convenții

- Migrațiile sunt **append-only**. Nu rescrie un fișier deja aplicat.
- Numerotare `NNNN_descriere.sql` (4 cifre, snake_case).
- SQLite ≠ Postgres: fără `gen_random_uuid()`, fără `jsonb`. Folosește `TEXT` pentru
  UUID/JSON și generează ID-uri în cod (`crypto.randomUUID()`).
- `created_at`/`updated_at` ca `INTEGER` (epoch ms) sau `TEXT` (ISO) — fără triggere
  complexe; setate explicit din Worker.
