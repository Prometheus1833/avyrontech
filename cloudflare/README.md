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

🟢 **Backendul principal este activ pe Cloudflare Workers.** Autentificarea,
platforma internă, formularele și blogul editorial folosesc API-ul Worker cu
D1/KV/R2. Frontendul poate fi publicat de fluxul existent, dar nu primește
niciodată credențiale directe către storage.

## Activare (rezumat)

1. `npm ci`
2. `npm run validate:cloudflare`
3. Aplică migrațiile numai în mediul țintă (`preview` înainte de branch).
4. `npm run deploy:api:preview` pentru o versiune nepromovată.
5. Producția se migrează și se publică separat, numai după backup și aprobare.

Detalii complete în README-urile din subfoldere.

Gateway-ul canonic, bugetul Free și furnizorii externi acceptați sunt descriși
în [`../docs/API_GATEWAY.md`](../docs/API_GATEWAY.md).
