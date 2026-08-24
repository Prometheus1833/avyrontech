# Cloudflare KV — configurații și cache

KV stochează exclusiv valori mici, nesensibile, citite des și modificate rar.
În Worker binding-ul este `env.KV`; resursele sunt separate:

- producție: `avyron_kv`;
- preview: `avyron_kv_preview`.

## Contractul aplicației

- API: `GET|PUT /api/content/settings/:key`;
- cheie fizică: `content:v1:<key-validat>`;
- valoare: JSON valid de maximum 128 KiB;
- metadata: versiunea schemei și momentul actualizării;
- autentificare la scriere: rol `admin`;
- citire publică numai pentru configurațiile expuse explicit de rută.

Exemple logice: `site_settings`, `homepage_content`, `seo_settings`, `features`.
Prefixul `content:v1:` este adăugat de Worker, nu de client.

## Ce nu intră în KV

- utilizatori, clienți, facturi, proiecte ori lead-uri — D1;
- parole, tokenuri, emailuri, atașamente sau alte date personale — D1/R2;
- fișiere binare — R2;
- rate limiting exact — D1. Binding-ul Rate Limit oferă doar protecția rapidă
  de burst, iar contorul atomic D1 decide limita de securitate.

KV este eventual consistent. Nu folosim secvențe `get` → increment → `put`
pentru operații concurente și nu creăm câte un namespace per client; izolarea
logică viitoare folosește prefixe validate, iar izolarea fizică este rezervată
cerințelor contractuale reale.
