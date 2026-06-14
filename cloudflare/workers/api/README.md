# avyron-api — Worker auth + business API

Worker dedicat pentru autentificare (D1 + JWT) și CRUD-ul Avyron. Independent
de aplicația React (care continuă să ruleze pe Lovable Cloud până când frontendul
este comutat pe acest API).

## Stack

- **Runtime**: Cloudflare Workers (V8 isolates)
- **Framework**: Hono 4
- **DB**: D1 (`avyron-db`)
- **KV**: `AVYRON_KV` (site_settings, homepage, seo, features)
- **R2**: `avyron-files` (logos, invoices PDF, media)
- **Auth**: PBKDF2-SHA256 (210k iter) + HS256 JWT (15 min) + cookie sesiune `sid` (30 zile)

## Deploy pas-cu-pas

```bash
cd cloudflare/workers/api

# 1. autentificare (deschide browserul; o singură dată per mașină)
bunx wrangler login

# 2. resurse Cloudflare (o singură dată)
bunx wrangler d1 create avyron-db          # → copiază database_id în wrangler.jsonc
bunx wrangler kv namespace create AVYRON_KV # → copiază id în wrangler.jsonc
bunx wrangler r2 bucket create avyron-files

# 3. completează ID-urile în wrangler.jsonc (3 locuri marcate REPLACE_WITH_REAL_ID)

# 4. JWT secret (random, 64+ chars)
bunx wrangler secret put JWT_SECRET
# lipește output-ul lui:  openssl rand -hex 48

# 5. instalează dependențe + aplică migrațiile D1
bun install
bun run migrate:remote

# 6. deploy
bun run deploy
# → URL: https://avyron-api.<workspace>.workers.dev
```

## Verificare după deploy

```bash
curl https://avyron-api.<workspace>.workers.dev/api/health
# {"ok":true,"ts":1718380000000}

curl -X POST https://avyron-api.<workspace>.workers.dev/api/auth/signup \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@avyron.ro","password":"parolatest123"}'
```

## Promovarea unui user la admin

```bash
bunx wrangler d1 execute avyron-db --remote \
  --command "INSERT INTO user_roles (user_id, role) VALUES ('<uuid>', 'admin');"
```

## După ce API-ul răspunde

Frontendul (`src/`) trebuie comutat de la `@supabase/supabase-js` la fetch-uri
către `VITE_AVYRON_API_URL`. Pașii sunt scriptați separat — vezi `cloudflare/MIGRATION.md`.
