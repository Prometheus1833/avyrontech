# Cloudflare Infrastructure — Avyron

Arhitectura backend pe Cloudflare: **D1** (date), **KV** (config), **R2** (fișiere),
**Workers** (API).

## Regula internă Avyron

> **Este fișier?** → R2
> **Este o setare unică?** → KV
> **Este listă, tabel, utilizator, client sau factură?** → D1
> **Are logică sau validări?** → Worker

## Structură

```
cloudflare/
├── d1/         ← migrații SQL pentru baza business (clients, projects, …)
├── kv/         ← documentație chei KV (site_settings, homepage, seo, features)
├── r2/         ← convenții pentru bucketul de fișiere (logos, invoices, media)
└── workers/    ← structură API standard (/api/clients, /api/invoices, …)
```

Fiecare folder are propriul `README.md` cu activare, schemă și pattern-uri.

## Status

🟡 **Scaffolding pregătit, dar nu activat.**
Aplicația Avyron rulează pe Lovable Cloud (Postgres + Edge Functions).
Cloudflare D1/KV/R2 sunt pregătite pentru migrare graduală sau pentru
proiecte client noi care vor rula direct pe Cloudflare.

## Activare (rezumat)

1. `bunx wrangler d1 create avyron-db`
2. `bunx wrangler kv namespace create AVYRON_KV`
3. `bunx wrangler r2 bucket create avyron-files`
4. Decomentează cele trei blocuri din `wrangler.jsonc` și completează ID-urile.
5. `bunx wrangler d1 migrations apply avyron-db --remote`
6. Deploy.

Detalii complete în README-urile din subfoldere.
