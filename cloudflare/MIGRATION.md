# Migrare Auth: Supabase → Cloudflare Workers

> **Status:** scaffolding gata. Migrarea efectivă a frontendului este pasul
> **2** și se face DOAR după ce `avyron-api` răspunde la `/api/health` în prod.

## Faza 1 — Infrastructură Cloudflare (independentă de app)

1. Deploy worker `cloudflare/workers/api/` — vezi README-ul lui.
2. Verifică `curl https://avyron-api.<ws>.workers.dev/api/health`.
3. Creează un cont de test prin `/api/auth/signup` și promovează-l la `admin`.
4. Migrează datele existente (opțional, în alt PR):
   - export `profiles` din Supabase → `users` în D1 (parolele NU pot fi migrate, userii trebuie să facă „uitat parola”).
   - export `user_roles`, `subscriptions`, `invoices`, `tickets` etc. în D1.

## Faza 2 — Comutarea frontendului

Când `avyron-api` e stabil:

1. Adaugă `VITE_AVYRON_API_URL=https://avyron-api.<ws>.workers.dev` în `.env`.
2. Înlocuiește `src/integrations/supabase/client.ts` cu un client nou
   `src/integrations/avyron/client.ts` care wrap-uie `fetch` cu:
   - JWT în memorie (access token, 15 min)
   - refresh automat prin cookie `sid` (`POST /api/auth/refresh`)
3. Rescrie `src/hooks/useAuth.tsx` să folosească noul client (păstrează aceeași
   interfață `user/profile/roles/isStaff/isAdmin` → componentele rămân neatinse).
4. Rescrie fiecare apel `supabase.from(...)` → `api.get/post(...)`.
5. Șterge dependența `@supabase/supabase-js` din `package.json`.
6. Demolez Lovable Cloud (opțional, doar după ce ești 100% sigur).

## Faza 3 — Email Routing (deja scaffolded)

- Worker `cloudflare/workers/email/` primește pe `contact@avyron.ro`,
  forward către Gmail, send-as configurat în Gmail.
- `/api/auth/forgot` din `avyron-api` va trimite linkul de reset prin acest worker
  (TODO marcat în cod).

## De ce în două faze?

Auth-ul Supabase live conține deja userii reali. Comutarea simultană ar însemna
- pierderea sesiunilor active
- forțarea tuturor să-și reseteze parola
- downtime la login până validăm `avyron-api` în prod

Faza 1 e zero-risk (cod separat). Faza 2 se planifică cu fereastră de mentenanță.
