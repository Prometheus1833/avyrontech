# Comenzi de rulat în Terminal (Mac) — deploy Worker Cloudflare

**Context:** Am șters din proiect worker-ul duplicat din rădăcină (`/wrangler.jsonc` + `/src/worker/`) care se suprascria peste cel bun.
Acum există un singur worker: `cloudflare/workers/api/` — cel complet cu CORS, seed, projects, media.

**Status actual pe `avyrontech.avyrontech.workers.dev`:**
- ✅ `/api/health` → 200 (worker deployed)
- ❌ `/api/auth/login` → 500 (versiunea greșită deployed; tabelele lipsesc sau JWT_SECRET nu-i setat)
- ❌ CORS preflight → 404 (versiunea greșită)

**Trebuie să redeploy-ezi din folderul corect ca să repari totul.**

---

## 1. Intră în folderul worker-ului bun

```bash
cd ~/Downloads/avyrontech/cloudflare/workers/api
pwd
```
`pwd` **trebuie** să se termine cu `/cloudflare/workers/api`.

```bash
ls wrangler.jsonc
```
Trebuie să afișeze fișierul.

## 2. Login în Cloudflare (dacă nu ești deja)

```bash
bunx wrangler login
```

## 3. Setează secretele

```bash
bunx wrangler secret put JWT_SECRET
```
Când cere valoare, lipește un string random ≥32 caractere. Poți genera cu:
`openssl rand -hex 48`

```bash
bunx wrangler secret put SEED_TOKEN
```
Lipește alt string random (îl folosești o singură dată la seed):
`openssl rand -hex 24`
**SALVEAZĂ-L undeva**, îl folosești la pasul 6.

## 4. Aplică migrațiile pe D1 remote

```bash
bunx wrangler d1 migrations apply avyron-db --remote
```
Confirmă cu `y`.

## 5. Deploy Worker

```bash
bunx wrangler deploy
```
La final: `https://avyrontech.avyrontech.workers.dev`

## 6. Verifică că merge

```bash
curl -sS https://avyrontech.avyrontech.workers.dev/api/health

curl -i -X OPTIONS https://avyrontech.avyrontech.workers.dev/api/auth/login \
  -H "Origin: https://id-preview--3432ba2d-bd12-41f5-9dc2-a3e04fe788d0.lovable.app" \
  -H "Access-Control-Request-Method: POST"
```
A doua trebuie să răspundă **204** cu header `access-control-allow-origin`. Dacă dă 404 → deploy-ul n-a mers din folderul corect.

## 7. Rulează seed-ul (creează admin + demo)

Înlocuiește `<SEED_TOKEN>` cu valoarea de la pasul 3:

```bash
curl -X POST https://avyrontech.avyrontech.workers.dev/api/admin/seed \
  -H "X-Seed-Token: <SEED_TOKEN>"
```

## 8. Testează login-ul

```bash
curl -X POST https://avyrontech.avyrontech.workers.dev/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"avyrontech@gmail.com","password":"Avyronpass123@"}'
```

Trebuie JSON cu `access_token` și `user`. Dacă da → **login din UI funcționează**.

---

## Conturi create de seed (parolă `Avyronpass123@`)

| Email | Rol |
|---|---|
| avyrontech@gmail.com | staff (admin) |
| client1@example.com | client |
| client2@example.com | client |
| client3@example.com | client |

## Erori posibile

- **`wrangler: command not found`** → folosește `npx wrangler ...`
- **`D1_ERROR: no such table`** la seed → repetă pasul 4
- **`forbidden` la seed** → SEED_TOKEN greșit, repetă pasul 3
- **`Missing entry-point`** → nu ești în `cloudflare/workers/api`, rerulează pasul 1
- **CORS blocked în browser** → verifică `ALLOWED_ORIGINS` în `wrangler.jsonc`, apoi redeploy

Spune-mi la ce pas ești / lipește output-ul dacă apare o eroare.
