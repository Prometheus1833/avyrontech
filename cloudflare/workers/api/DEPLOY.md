# Deploy Cloudflare Worker `avyrontech`

**Contextul actual (deja făcut):**
- D1 `avyron-db` → `85b6868d-174a-48aa-8891-9366bbcb7e47`
- KV → `7c296f2750b943cea4376c12122ed276`
- R2 `avyron-files` (documente private per proiect) → binding `FILES`
- R2 `avyron-media` (active publice, portfolio, og) → binding `MEDIA`
- Worker URL: `https://avyrontech.avyrontech.workers.dev`

Toate ID-urile sunt deja în `wrangler.jsonc`.

## Comenzi (rulează din `cloudflare/workers/api/`)

```bash
# 1. Autentificare (o singură dată)
bunx wrangler login

# 2. Setează secretele (îți cere valoarea în terminal)
#    JWT_SECRET → openssl rand -hex 48   (96 caractere)
bunx wrangler secret put JWT_SECRET

#    SEED_TOKEN → openssl rand -hex 24   (48 caractere)
#    SALVEAZĂ-L, e nevoie o singură dată pentru seed
bunx wrangler secret put SEED_TOKEN

# 3. Aplică migrațiile pe D1 (remote)
bunx wrangler d1 migrations apply avyron-db --remote

# 4. Deploy worker
bunx wrangler deploy
# → https://avyrontech.avyrontech.workers.dev

# 5. Seed conturi + proiecte demo (o singură dată)
curl -X POST https://avyrontech.avyrontech.workers.dev/api/admin/seed \
  -H "X-Seed-Token: <SEED_TOKEN>"

# 6. Verifică
curl https://avyrontech.avyrontech.workers.dev/api/health
```

## Conturi după seed

Parola pentru toate: `Avyronpass123@`

| Email                   | Rol           |
|-------------------------|---------------|
| avyrontech@gmail.com    | staff (admin) |
| client1@example.com     | client        |
| client2@example.com     | client        |
| client3@example.com     | client        |

## Frontend

Frontend-ul (React în Lovable) știe deja unde e workerul:
- pe `avyron.ro` sau direct pe `*.workers.dev` → same-origin
- în preview Lovable (`*.lovable.app`) → cross-origin către `https://avyrontech.avyrontech.workers.dev`
- CORS + cookie `sid` funcționează (`credentials: "include"` + `ALLOWED_ORIGINS` includ preview + prod)

## Custom domain (opțional, când vrei /api pe avyron.ro)

În Cloudflare Dashboard → Workers & Pages → `avyrontech` → Settings → Domains & Routes:
- adaugă route: `avyron.ro/api/*` (zona `avyron.ro`)
- adaugă route: `www.avyron.ro/api/*`

După asta frontend-ul din prod trece automat pe same-origin (fără CORS).

## Troubleshooting

- `invalid_credentials` la login → verifică că seed-ul a rulat.
- `forbidden` la seed → SEED_TOKEN nu e setat corect; re-rulează `wrangler secret put SEED_TOKEN`.
- CORS blocked în preview → verifică `ALLOWED_ORIGINS` în `wrangler.jsonc` include exact URL-ul preview-ului.

## Formular „Vreau exemplu gratuit” (SMTP)

Endpoint: `POST /api/contact/demo` (public, multipart/form-data).
Atașamentele se salvează în R2 `avyron-files` sub `leads/<id>/`, lead-ul se salvează în KV 90 zile,
apoi se trimite email prin SMTP direct din Worker (TCP sockets + STARTTLS).

Setează secretele (din `cloudflare/workers/api`):

```bash
bunx wrangler secret put SMTP_HOST     # ex: smtp.gmail.com
bunx wrangler secret put SMTP_PORT     # 587 (STARTTLS) sau 465 (TLS)
bunx wrangler secret put SMTP_USER     # ex: avyrontech@gmail.com
bunx wrangler secret put SMTP_PASS     # app password
bunx wrangler secret put SMTP_FROM     # ex: contact@avyron.ro (opțional)
bunx wrangler secret put LEAD_TO       # emailul de bază al agenției
bunx wrangler deploy
```

Dacă SMTP nu e configurat sau pică, formularul răspunde `202` iar lead-ul rămâne salvat în KV + R2.
