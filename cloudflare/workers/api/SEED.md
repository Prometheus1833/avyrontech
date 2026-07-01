# Seed Avyron — conturi inițiale

Rulare (o singură dată, sau oricând vrei re-sincronizare — e idempotent):

```bash
# 1) Setează token-ul de seed (o singură dată) — orice string random
bunx wrangler secret put SEED_TOKEN --config cloudflare/workers/api/wrangler.jsonc

# 2) După deploy, apelează endpoint-ul
curl -X POST https://<worker-domain>/api/admin/seed \
  -H "X-Seed-Token: <VALOAREA_SETATĂ>"
```

**Bootstrap fără token:** dacă în DB nu există niciun user cu rol `admin`,
endpoint-ul rulează fără token (o singură dată, până apare primul admin).

## Ce creează

### Staff (rol `staff`; Niko primește și `admin`)
Toate au parola inițială `Avyronpass123@` și pot loga case-insensitive:

| Email | Pseudonim | Rol funcțional |
|---|---|---|
| niko@avyron.ro    | Niko    | dev (admin) |
| andreea@avyron.ro | Andreea | designer |
| adi@avyron.ro     | Adi     | dev |
| alex@avyron.ro    | Alex    | marketing |
| florin@avyron.ro  | Florin  | support |

### Clienți (rol `user`)
| Email | Parolă | Proiect |
|---|---|---|
| clarlumanari@gmail.com     | `Clarlumanari123`     | **clarlumanari.ro** — Online / Finalizat |
| plaseieftineiasi@gmail.com | `Plaseieftineiasi123` | **plaseieftineiasi.ro** — Online / Finalizat |
| retuvocore@gmail.com       | `retuvo123@`          | **retuvo.ro** — În dezvoltare |

Fiecare client are:
- rând în `users` + `profiles` (company_name completat),
- rând în `clients` (email lowercase),
- proiect în `projects` cu `slug` unic (folosit în URL `/intern/projects/<slug>`),
- toți staff-ii sunt atașați automat prin `project_staff`.

## Note

- Emailurile din DB sunt salvate lowercase; login-ul deja face `.toLowerCase()`
  → poți loga cu `Niko@Avyron.ro`, `niko@avyron.ro`, etc.
- Adresa `avyrontech@gmail.com` **NU** e creată ca user — e doar destinația
  rutării Cloudflare Email Routing pentru `contact@`, `office@`, `development@`,
  `design@` `@avyron.ro`.
- Rulările următoare nu re-scriu parolele existente; doar upsert la profil,
  clienți și proiecte după `email` / `slug`.
