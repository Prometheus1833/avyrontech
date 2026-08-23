# Deploy controlat — `avyrontech`

Workerul API folosește D1 `avyron-db`, KV, R2 `avyron-files` și `avyron-media`.
Frontendul Pages și Workerul Email Routing sunt build-uri separate.

## Build settings

- API Worker: build command `npm run build:api`, deploy command `npm run deploy:api`
- API preview version: `npm run deploy:api:preview`
- Pages: build command `npm run build:pages`, output `dist`
- Node: `22`, package manager: npm (unicul lockfile este `package-lock.json`)

## Ordinea activării

Aceste comenzi modifică resursele Cloudflare și se rulează numai după verificarea preview-ului:

```bash
npx wrangler d1 migrations apply avyron-db --remote --config cloudflare/workers/api/wrangler.jsonc
npx wrangler secret put JWT_SECRET --config cloudflare/workers/api/wrangler.jsonc
npx wrangler secret put SEED_TOKEN --config cloudflare/workers/api/wrangler.jsonc
npx wrangler secret put SMTP_PASS --config cloudflare/workers/api/wrangler.jsonc
npm run deploy:api
```

Pentru Cloudflare Email Sending SMTP:

- host: `smtp.mx.cloudflare.net`
- port: `465` (TLS implicit)
- username: literal `api_token`
- `SMTP_PASS`: token API cu permisiunea **Email Sending: Edit**
- `SMTP_FROM`: expeditor verificat, implicit `contact@avyron.ro`
- `LEAD_TO`: inbox-ul intern care primește solicitările

Resetarea parolei, formularul CTA și solicitarea unui exemplu folosesc același transport SMTP.
Datele sunt scrise întâi în D1; un eșec SMTP este înregistrat și returnat explicit frontendului.

## Import de conturi

Endpointul `POST /api/admin/import-users` cere întotdeauna `X-Seed-Token`. Nu există
parole sau liste de utilizatori în repository. Conturile importate primesc
`must_change_password=1` și trebuie să schimbe parola temporară la primul login.

Exemplu de structură (valorile reale se transmit dintr-un fișier local necomis):

```json
{
  "users": [
    {
      "email": "user@example.com",
      "temporaryPassword": "generated-temporary-password",
      "displayName": "User",
      "roles": ["user"]
    }
  ]
}
```

Importul nu rescrie conturile existente. Hash-urile de parolă Supabase nu se mută
prin frontend; pentru utilizatorii existenți se folosește un import administrativ
cu parole temporare sau fluxul de resetare prin email.

## Validare fără publicare

```bash
npm ci
npx tsc --noEmit
npm run validate:cloudflare
npm test
```
