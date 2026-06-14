# Avyron — Email Worker (`contact@avyron.ro`)

Rutează emailurile primite pe `contact@avyron.ro` către cutia internă
`avyrontech@gmail.com`, iar pe site afișăm doar adresa de brand.

## Pas 1 — Cloudflare Email Routing (UI)

1. Cloudflare Dashboard → domeniul `avyron.ro` → **Email** → **Email Routing**.
2. Apasă **Enable Email Routing**. Cloudflare adaugă automat MX + SPF.
3. La **Destination addresses**, adaugă `avyrontech@gmail.com` și confirmă
   linkul primit pe Gmail.

## Pas 2 — Deploy worker

```bash
bunx wrangler deploy --config cloudflare/workers/email/wrangler.jsonc
```

## Pas 3 — Regulă de rutare

În **Email Routing → Routes**:

- Custom address: `contact@avyron.ro`
- Action: **Send to a Worker** → `avyron-email`

(Opțional, catch-all: `*@avyron.ro` → Worker `avyron-email`.)

## Pas 4 — Reply ca `contact@avyron.ro` din Gmail

Gmail → Settings → **Accounts and Import** → *Send mail as* →
**Add another email address**:

- Name: `Avyron`
- Email: `contact@avyron.ro`
- Treat as alias: ✅
- SMTP: folosește un SMTP gratuit (ex. Brevo) sau Gmail SMTP cu app password.
  Cloudflare Email Routing nu oferă SMTP outbound; pentru trimitere prin
  Worker, vezi `env.SEND_EMAIL` în `src/index.ts`.

## Trimitere programatică din Worker

```ts
await env.SEND_EMAIL.send({
  from: "contact@avyron.ro",
  to: "client@example.com",
  subject: "Confirmare",
  text: "Mulțumim!",
});
```

`from` trebuie să fie un domeniu verificat în Email Routing
(`avyron.ro` ✓).
