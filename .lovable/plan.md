# Comenzi de rulat în Terminal (Mac)

Rulează-le în ordine. Toate se dau din folderul worker-ului.

## 1. Intră în folderul worker-ului

```bash
cd cloudflare/workers/api
```

(dacă nu știi calea exactă, în Finder navighează la proiect → click dreapta pe folderul `api` → "New Terminal at Folder")

## 2. Login în Cloudflare (o singură dată)

```bash
bunx wrangler login
```

Se deschide browser-ul, aprobi contul.

## 3. Setează secretele Worker-ului

```bash
bunx wrangler secret put JWT_SECRET
```
Când îți cere valoare, lipește un string random lung (min 32 caractere). Exemplu:
`k9Xp2mQ7vR4nY8tL5wA1bZ3cE6fH0jS9dU2iO4kM7pN` (poți genera altul, orice).

```bash
bunx wrangler secret put SEED_TOKEN
```
Lipește alt string random (îl vei folosi o singură dată la seed). Exemplu:
`seed_avyron_9x2m7pQ4wL8vR3nY5tK`

## 4. Aplică migrațiile D1 pe baza remote

```bash
bunx wrangler d1 migrations apply avyron-db --remote
```

Confirmă cu `y` dacă întreabă.

## 5. Deploy Worker

```bash
bunx wrangler deploy
```

La final îți afișează URL-ul: `https://avyrontech.avyrontech.workers.dev`

## 6. Verifică CORS + health

```bash
curl -sS https://avyrontech.avyrontech.workers.dev/api/health

curl -i -X OPTIONS https://avyrontech.avyrontech.workers.dev/api/auth/login \
  -H "Origin: https://id-preview--3432ba2d-bd12-41f5-9dc2-a3e04fe788d0.lovable.app" \
  -H "Access-Control-Request-Method: POST"
```
A doua comandă trebuie să răspundă `204` cu header `access-control-allow-origin`.

## 7. Rulează seed-ul (creează contul admin)

Înlocuiește `<SEED_TOKEN>` cu valoarea de la pasul 3:

```bash
curl -X POST https://avyrontech.avyrontech.workers.dev/api/admin/seed \
  -H "X-Seed-Token: <SEED_TOKEN>"
```

## 8. Testează login

```bash
curl -X POST https://avyrontech.avyrontech.workers.dev/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"avyrontech@gmail.com","password":"Avyronpass123@"}'
```

Trebuie să primești un JSON cu `token` și `user`. Dacă da → login din UI funcționează.

---

## Dacă ceva eșuează

- **`wrangler: command not found`** → folosește `npx wrangler ...` în loc de `bunx wrangler ...`
- **`D1_ERROR: no such table`** la seed → migrațiile n-au rulat, repetă pasul 4
- **`401` la seed** → SEED_TOKEN greșit, repetă pasul 3 cu aceeași valoare pe care o pui în curl
- **CORS error din browser** → verifică că preview URL-ul e în `ALLOWED_ORIGINS` din `wrangler.jsonc` și redeploy (`bunx wrangler deploy`)

Spune-mi la ce pas ești sau lipește output-ul dacă apare o eroare.
