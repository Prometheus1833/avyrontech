# Avyron Email Routing Worker

Workerul `avyron-email` procesează mesajele inbound pentru aliasurile `@avyron.ro`
și le forwardează la adresa configurată prin `FORWARD_TO`. O eroare de forward este
aruncată pentru ca platforma Cloudflare să o poată observa și reîncerca; nu este
raportată fals ca succes.

## Activare

1. În zona `avyron.ro`, activează **Email Routing** și păstrează MX/SPF generate de Cloudflare.
2. Verifică adresa destination folosită în `FORWARD_TO`.
3. Creează ruta `contact@avyron.ro` → **Send to a Worker** → `avyron-email`.
4. Validează fără deploy: `npm run build:email`.
5. Deploy-ul se execută separat, numai când este aprobat:

```bash
npx wrangler deploy --config cloudflare/workers/email/wrangler.jsonc
```

Email Routing inbound și Email Sending outbound sunt funcții diferite. Formularele
și resetarea parolei trimit outbound prin SMTP Cloudflare Email Sending, configurat
în Workerul API; detaliile sunt în `../api/DEPLOY.md`.

Pentru deliverability, domeniul trebuie să aibă DKIM activ pentru Email Sending și
o politică DMARC graduală. Nu adăuga un al doilea SPF record; completează politica
existentă dacă mai există și alți expeditori autorizați.
