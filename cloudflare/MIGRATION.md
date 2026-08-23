# Migrare Avyron către Cloudflare

GitHub este sursa de adevăr. Arhitectura separă responsabilitățile pentru a putea
scala și a evita ca un deploy frontend să modifice API-ul sau emailul:

- Cloudflare Pages: frontendul Vite și prerenderingul SEO;
- Worker `avyrontech`: auth, API, D1, KV, R2 și SMTP outbound;
- Worker `avyron-email`: Email Routing inbound;
- D1: conturi, profiluri, proiecte, lead-uri și audit;
- KV: rate limits și cache-uri cu TTL;
- R2: documente și media.

## Stadiu

Migrate în Cloudflare:

- signup/login/logout/refresh/reset/change-password;
- profil și avatar R2;
- roluri, sesiuni hash-uite, audit și import controlat de conturi;
- proiectele din platforma internă și media aferentă;
- formularul CTA și solicitările de exemple, persistate în D1 și trimise prin SMTP;
- lista de conturi și lista solicitărilor de exemple din dashboard;
- Email Routing inbound.

Rămân temporar pe Supabase modulele interne care încă folosesc direct
`supabase.from(...)` (facturi, plăți, abonamente, tickets, chat, announcements și
unele vizualizări de proiect). Acestea se migrează modul cu modul, după contracte
API și export de date, fără dublă scriere implicită.

## Cutover sigur

1. `npm ci`
2. `npx tsc --noEmit`
3. `npm run validate:cloudflare`
4. `npm test`
5. backup D1 remote;
6. aplicare migrații D1 remote;
7. configurare secrete;
8. upload de versiune preview API;
9. smoke test auth/form/email;
10. promovare separată, numai cu aprobare explicită.

Comenzile și secretele necesare sunt documentate în `workers/api/DEPLOY.md`.
