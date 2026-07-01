# Deployment Avyron API pe Cloudflare

Acest ghid presupune că ai deja create în Cloudflare dashboard sau CLI:
- D1 database `avyron-db`
- KV namespace `AVYRON_KV`
- R2 bucket `avyron-files`
- Worker `avyron-api` (va fi creat la deploy)

Dacă nu sunt create, rulează mai întâi:

```bash
cd cloudflare/workers/api
bunx wrangler d1 create avyron-db
bunx wrangler kv namespace create AVYRON_KV
bunx wrangler r2 bucket create avyron-files
```

---

## 1. Autentificare

```bash
bunx wrangler login
bunx wrangler whoami
```

## 2. Obține ID-urile reale

```bash
bunx wrangler d1 list
bunx wrangler kv namespace list
```

Outputul va arăta așa:

```
avyron-db  xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

Copiază `database_id` și `id`-ul KV în `wrangler.jsonc` (vezi pasul 3).

## 3. Actualizează `wrangler.jsonc`

Editează `cloudflare/workers/api/wrangler.jsonc` și înlocuiește `REPLACE_WITH_REAL_ID` cu ID-urile obținute.

## 4. Setează secretele

```bash
cd cloudflare/workers/api

# JWT secret (minim 64 caractere hex recomandat)
openssl rand -hex 48 | bunx wrangler secret put JWT_SECRET

# Seed token — salvează valoarea pentru pasul 7
openssl rand -hex 24 | bunx wrangler secret put SEED_TOKEN
```

**Salvează valoarea SEED_TOKEN într-un loc sigur.**

## 5. Aplică migrările D1

```bash
cd cloudflare/workers/api
bunx wrangler d1 migrations apply avyron-db --remote
```

## 6. Deploy worker

```bash
cd cloudflare/workers/api
bunx wrangler deploy
```

La final vei vedea URL-ul workerului, de exemplu:

```
https://avyron-api.<account>.workers.dev
```

## 7. Seed conturi și proiecte

```bash
curl -X POST https://<URL_WORKER>/api/admin/seed \
  -H "X-Seed-Token: <SEED_TOKEN>"
```

Răspunsul așteptat:

```json
{
  "ok": true,
  "report": {
    "staff": [...],
    "clients": [...],
    "projects": [...]
  }
}
```

## 8. Verifică funcționarea

```bash
# health
curl https://<URL_WORKER>/api/health

# login staff
curl -X POST https://<URL_WORKER>/api/auth/login \
  -H "content-type: application/json" \
  -d '{"email":"niko@avyron.ro","password":"Avyronpass123@"}'

# listare proiecte (înlocuiește ACCESS_TOKEN)
curl https://<URL_WORKER>/api/projects \
  -H "authorization: Bearer <ACCESS_TOKEN>"
```

## 9. Verificare frontend

După ce publici frontend-ul, accesează:

```
https://avyron.ro/intern
```

Loghează-te cu:

- **Staff:** `niko@avyron.ro` / `Avyronpass123@`
- **Client:** `clarlumanari@gmail.com` / `Clarlumanari123`

## Troubleshooting

| Problemă | Cauză probabilă | Soluție |
|---|---|---|
| `Database not found` | `database_id` greșit în `wrangler.jsonc` | Re-verifică cu `wrangler d1 list` |
| `KV namespace not found` | `id` greșit în `wrangler.jsonc` | Re-verifică cu `wrangler kv namespace list` |
| `invalid_credentials` la login | Seed n-a rulat sau parolă greșită | Re-rulează seed și verifică parola |
| `forbidden` la seed | Tokenul nu e setat sau nu se potrivește | Verifică `wrangler secret list` și header-ul trimis |
| `CORS error` în browser | Originea frontendului nu e în `ALLOWED_ORIGINS` | Adaugă domeniul în `wrangler.jsonc` → `vars.ALLOWED_ORIGINS` |
