# Cloudflare R2 — Storage de fișiere

R2 stochează **toate** fișierele binare. **Niciodată imagini sau PDF-uri în D1.**

## Activare

```bash
bunx wrangler r2 bucket create avyron-files
bunx wrangler r2 bucket create avyron-files-preview   # opțional, pentru dev
```

Apoi decomentează blocul `r2_buckets` din `wrangler.jsonc`.
Binding-ul în Workers: `env.FILES`.

## Structură de directoare

```
/clients/<client_id>/...           ← date personale ale clientului
/projects/<project_id>/...         ← assets specifice proiectului
/invoices/<year>/INV-<id>.pdf      ← facturi PDF (generate)
/contracts/<client_id>.pdf         ← contracte semnate
/logos/<client_slug>/logo.webp     ← logo-uri clienți
/website-media/<project_id>/...    ← galerii, hero images, attachments
```

### Exemple
- `/contracts/client-001.pdf`
- `/logos/cogito/logo.webp`
- `/website-media/project-15/gallery-1.webp`
- `/invoices/2026/INV-104.pdf`

## Convenții

- **Formate**: imagini → `.webp` (fallback `.jpg`); documente → `.pdf`.
- **Nume**: `kebab-case`, fără diacritice, fără spații.
- **Acces public**: doar pentru `logos/` și `website-media/` (via Custom Domain R2).
- **Acces privat**: `clients/`, `invoices/`, `contracts/` — semnate cu URL pre-signed
  generate din Worker (TTL scurt, ex. 15 min).
- Limită soft per fișier: 10 MB pentru imagini, 25 MB pentru PDF-uri.

## API pattern (Worker)

```ts
// Upload
PUT  /api/media/upload
  → multipart/form-data → env.FILES.put(key, body)

// Download privat
GET  /api/media/signed-url?key=invoices/2026/INV-104.pdf
  → returnează URL pre-signed (TTL 15 min)

// Delete (admin)
DELETE /api/media/:key
```

Toate operațiile trec prin Worker — niciodată acces direct la R2 din browser.
