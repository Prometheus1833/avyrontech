# Deploy controlat — `avyrontech`

Workerul API folosește D1 `avyron-db`, KV, R2 `avyron-files` și `avyron-media`.
Frontendul Pages și Workerul Email Routing sunt build-uri separate.

## Build settings

- API Worker: build command `npm run build:api`, deploy command `npm run deploy:api`
- API preview version: `npm run deploy:api:preview` (obligatoriu pentru branch-uri)
- Pages: build command `npm run build:pages`, output `dist`
- Config API canonic: `wrangler.jsonc` din rădăcina repository-ului
- Node: `22`, package manager canonic: npm; `bun.lock` rămâne sincronizat pentru build-ul Cloudflare configurat anterior pe Bun

## Ordinea activării

Preview-ul folosește exclusiv resursele `*-preview`. Schema lui se aplică astfel:

```bash
npx wrangler d1 migrations apply DB --remote --config wrangler.jsonc --env preview
npm run deploy:api:preview
```

`wrangler versions upload` creează o versiune verificabilă, fără promovare în
producție. Pentru un secret de preview se folosește fluxul de versiuni, nu
`wrangler secret put`, deoarece comanda din urmă publică imediat o versiune.

Următoarele comenzi modifică producția și se rulează numai după aprobarea
explicită a cutover-ului:

```bash
npx wrangler d1 migrations apply DB --remote --config wrangler.jsonc --env=
npx wrangler secret put JWT_SECRET --config wrangler.jsonc
npx wrangler secret put SMTP_PASS --config wrangler.jsonc
npx wrangler secret put TURNSTILE_SECRET --config wrangler.jsonc
npm run deploy:api
```

Pentru Cloudflare Email Sending SMTP:

- host: `smtp.mx.cloudflare.net`
- port: `465` (TLS implicit)
- username: literal `api_token`
- `SMTP_PASS`: token API cu permisiunea **Email Sending: Edit**
- `SMTP_FROM`: expeditor verificat, implicit `contact@avyron.ro`
- `LEAD_TO`: inbox-ul intern care primește solicitările

Email Sending necesită activarea produsului în contul Cloudflare (în prezent,
planul Workers Paid). Până la activare, `SMTP_PASS` rămâne opțional: datele sunt
salvate în D1, iar livrarea este marcată explicit `failed`, fără succes fals.

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

Configurația de producție refuză uploadul dacă lipsesc `JWT_SECRET`,
`SMTP_PASS` sau `TURNSTILE_SECRET`. Preview-ul cere `JWT_SECRET`; integrările
SMTP și Turnstile se validează separat până când tokenurile lor de preview sunt
configurate.
