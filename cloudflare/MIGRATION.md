# Migrare Avyron → Cloudflare (deploy guide)

Stack final: **Workers + D1 + KV + R2**, totul în același Worker (`avyrontech`)
care servește SPA-ul din `dist/client/` și API-ul same-origin sub `/api/*`.
Fără CORS, fără domenii separate.

## Resurse configurate

| Tip      | Nume          | ID / valoare                              |
|----------|---------------|-------------------------------------------|
| Worker   | avyrontech    | `avyrontech.avyrontech.workers.dev`       |
| Account  | —             | `51abbee1bab5f1fc9bfbfd9dcea5f3dc`        |
| D1       | avyron-db     | `85b6868d-174a-48aa-8891-9366bbcb7e47`    |
| KV       | AVYRON_KV     | `7c296f2750b943cea4376c12122ed276`        |
| R2       | avyron-files  | bucket de creat (vezi pas 2)              |
| R2 S3    | endpoint      | `https://51abbee1bab5f1fc9bfbfd9dcea5f3dc.r2.cloudflarestorage.com` |

ID-urile sunt deja completate în `wrangler.jsonc` (root).

## Pași de deploy (one-time setup)

Rulează din root-ul proiectului, pe mașina ta (eu nu am acces la `wrangler login`).

```bash
# 1. autentificare
bunx wrangler login

# 2. creează bucket R2 (D1 + KV există deja)
bunx wrangler r2 bucket create avyron-files

# 3. pune JWT_SECRET (HS256 — 48 bytes random)
openssl rand -hex 48 | bunx wrangler secret put JWT_SECRET

# 4. aplică migrațiile D1 pe remote
bunx wrangler d1 migrations apply avyron-db --remote

# 5. build + deploy SPA + Worker împreună
bun run deploy
```

După deploy, verifică:

```bash
curl https://avyrontech.avyrontech.workers.dev/api/health
# → {"ok":true,"ts":...}

# signup test
curl -X POST https://avyrontech.avyrontech.workers.dev/api/auth/signup \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@avyron.ro","password":"ParolaTest12","displayName":"Admin"}'
```

## Promovare la admin

```bash
bunx wrangler d1 execute avyron-db --remote \
  --command "INSERT INTO user_roles (user_id, role) VALUES ('<uuid-din-signup>', 'admin');"
```

## Ce e MIGRAT acum (Cloudflare)

- **Auth complet**: `signup`, `login`, `logout`, `refresh`, `me`, `forgot`, `reset`
- **Profile**: citire + update + upload avatar (R2)
- **Roluri**: tabel `user_roles` separat (anti privilege-escalation)
- **Sesiuni**: cookie `sid` httpOnly 30d + JWT access 15min cu refresh
- **Frontend**: `useAuth`, `Auth.tsx`, `ForgotPassword.tsx`, `ResetPassword.tsx`,
  `ProfileTab.tsx` — toate pe `cfAuth` (no more `supabase.auth`)

## Ce NU e încă migrat (rămân pe Supabase)

Toate modulele staff care fac `supabase.from(...)` direct:
- `StaffClientsTab`, `StaffProjectsTab`, `StaffInvoicesTab`, `StaffPaymentsTab`
- `StaffMaintenanceTab`, `StaffChatTab`, `StaffAnnouncementsTab`, `StaffResourcesTab`
- `StaffDomainStatsTab`, `StaffExampleRequestsTab`, `StaffFinanceTab`, `StaffMediaTab`
- `SubscriptionsTab`, `InvoicesTab`, `TicketsTab`, `StatsTab`, `CartTab`, `Blog`

Aceste tab-uri vor returna date goale după cutover (nu mai există sesiune Supabase).
Cu directiva ta — *"nu sunt mulți utilizatori"* — strategia recomandată e:

1. Lasă-le să afișeze gol până migrăm modul cu modul
2. Pentru fiecare modul: adaug endpoint în `src/worker/index.ts` (model deja
   pus în `cloudflare/d1/migrations/0001_init.sql`) + rescriu componenta să
   folosească `cfAuth.request("/api/...")`

Pot să continui cu **Clients → Projects → Invoices → Payments** într-o pasă
următoare, dacă vrei.

## Email pentru reset password

Worker-ul de auth doar inserează tokenul în D1 și loghează linkul de reset.
Pentru trimiterea efectivă pe email folosește `cloudflare/workers/email/`
(Workers Email Routing — `send_email` binding) sau Resend ca fallback. Spune-mi
care preferi și conectez handler-ul `/api/auth/forgot` la trimitere reală.
