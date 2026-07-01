Dacă resursele Cloudflare sunt deja create, pașii rămași sunt doar de configurare locală și deployment. Planul presupune că ai `bun` instalat și ești în folderul rădăcină al proiectului Avyron.

## Pași de execuție

### 1. Autentificare wrangler (dacă nu ești deja logat)

```bash
bunx wrangler login
bunx wrangler whoami
```

### 2. Obține ID-urile reale ale resurselor create

```bash
bunx wrangler d1 list
bunx wrangler kv namespace list
bunx wrangler r2 bucket list
```

Copiază:
- `database_id` pentru baza `avyron-db`
- `id` pentru namespace-ul `AVYRON_KV`
- confirmă că bucketul `avyron-files` există

### 3. Actualizează `cloudflare/workers/api/wrangler.jsonc`

În fișier, înlocuiește:

```json
"database_id": "REPLACE_WITH_REAL_ID",
```

cu ID-ul real de la pasul 2, și:

```json
{ "binding": "KV", "id": "REPLACE_WITH_REAL_ID" }
```

cu ID-ul real al namespace-ului KV.

R2 rămâne doar cu numele bucketului:

```json
{ "binding": "FILES", "bucket_name": "avyron-files" }
```

### 4. Setează secretele workerului

Rulează din `cloudflare/workers/api` (sau adaugă `--config cloudflare/workers/api/wrangler.jsonc`):

```bash
cd cloudflare/workers/api

# generează un secret puternic pentru JWT
openssl rand -hex 48 | bunx wrangler secret put JWT_SECRET

# alege un token pentru seed (poate fi orice string random, ex. 32 caractere)
openssl rand -hex 24 | bunx wrangler secret put SEED_TOKEN
```

Salvează undeva valoarea `SEED_TOKEN` — ai nevoie la pasul 7.

### 5. Aplică migrările D1

```bash
cd cloudflare/workers/api
bunx wrangler d1 migrations apply avyron-db --remote
```

Aceasta creează tabelele `projects`, `project_staff`, `project_proposals`, `project_media`, `project_links`, `project_logs`, `project_updates` și extensiile necesare.

### 6. Deploy worker

```bash
cd cloudflare/workers/api
bunx wrangler deploy
```

La final vei vedea URL-ul workerului, de exemplu `https://avyron-api.<subdomain>.workers.dev`.

### 7. Rulează seed-ul pentru conturi și proiecte de test

```bash
curl -X POST https://<URL_WORKER>/api/admin/seed \
  -H "X-Seed-Token: <VALOAREA_SEED_TOKEN>"
```

Răspunsul trebuie să conțină `ok: true` și raport cu staff, clienți și proiecte create.

### 8. Verifică funcționarea

```bash
# health check
curl https://<URL_WORKER>/api/health

# login cu un cont staff
curl -X POST https://<URL_WORKER>/api/auth/login \
  -H "content-type: application/json" \
  -d '{"email":"niko@avyron.ro","password":"Avyronpass123@"}'

# listare proiecte (necesită auth; poți folosi tokenul din răspunsul de login)
curl https://<URL_WORKER>/api/projects \
  -H "authorization: Bearer <ACCESS_TOKEN>"
```

### 9. Verifică ruta `/intern` în aplicație

După ce frontend-ul este publicat, accesează:

```
https://avyron.ro/intern
```

Loghează-te cu `niko@avyron.ro` / `Avyronpass123@` și verifică:
- lista de proiecte
- pagina unui proiect (`/intern/projects/clarlumanari`)
- posibilitatea de a adăuga propuneri/linkuri

## Rezultat așteptat

- Worker live și conectat la D1 + R2 + KV
- Baza de date cu schemele aplicate
- Conturile staff și clienți create
- Cele 3 proiecte de test vizibile în platformă
- Frontendul poate apela backendul fără erori CORS/auth

## Note

- Dacă login-ul returnează `invalid_credentials`, verifică că seed-ul a rulat și că parola este exact `Avyronpass123@`.
- Dacă `/api/projects` returnează `forbidden`, tokenul este expirat sau userul nu are rol `staff`/`admin`. Reîmprospătează tokenul prin `/api/auth/refresh`.
- Dacă workerul nu vede D1, verifică `database_id` din `wrangler.jsonc`.
- Dacă seed-ul dă `forbidden`, tokenul `SEED_TOKEN` nu este setat corect sau nu este transmis în header.