# Cloudflare KV — Configurații și conținut simplu

KV stochează **doar** valori care sunt: puține, citite des, modificate rar.

> Regulă: dacă e listă, tabel, client, factură → **D1**, nu KV.
> Dacă e fișier → **R2**.
> Dacă e setare unică → **KV**.

## Activare

```bash
# Creează namespace-ul (o singură dată)
bunx wrangler kv namespace create AVYRON_KV

# Copiază `id` și `preview_id` în wrangler.jsonc (vezi blocul comentat).
```

În Workers/Pages: binding-ul este `env.KV`.

## Chei standard

### `site_settings`
Date de contact și prezență online.
```json
{
  "companyName": "Avyron",
  "phone": "0740xxxxxx",
  "email": "contact@avyron.ro",
  "address": "Iași",
  "facebook": "https://facebook.com/avyron",
  "instagram": "https://instagram.com/avyron",
  "whatsapp": "https://wa.me/40740xxxxxx"
}
```

### `homepage_content`
Texte editabile din hero / CTA homepage.
```json
{
  "heroTitle": "Website-uri moderne",
  "heroSubtitle": "Transformăm ideile în rezultate",
  "ctaText": "Solicită ofertă"
}
```

### `seo_settings`
Meta tags globale (fallback când o pagină nu setează ceva specific).
```json
{
  "title": "Avyron — Soluții digitale",
  "description": "Construim site-uri rapide, optimizate Google, în 2-5 zile.",
  "keywords": "web design, seo, dezvoltare web, romania"
}
```

### `features`
Feature flags (boolean).
```json
{
  "showTestimonials": true,
  "showBlog": false,
  "showDomainCheck": true,
  "enableCart": false
}
```

## Convenții

- Cheile sunt `snake_case`.
- Valorile sunt **JSON serializat** (string), parse-uit în cod.
- Pentru editare din admin: `PUT /api/content/settings/:key` (Worker validează JSON-ul).
- Cache la edge automat (KV e CDN-cached).

## Pentru site-urile clienților

Fiecare proiect client poate avea propriul namespace KV (sau prefix de cheie):
- `client:<project_id>:site_settings`
- `client:<project_id>:homepage_content`

Astfel adminul `domeniu.ro/admin` modifică doar cheile lui.
