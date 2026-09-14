# `avyrontech` — Worker API

Workerul servește aplicația Vite și API-ul Avyron din același origin. Folosește
Hono, D1, KV, două bucket-uri R2, Rate Limit binding și SMTP outbound.

## Dezvoltare și validare

Comenzile se rulează din rădăcina repository-ului:

```bash
npm ci
npm run types:worker:check
npx tsc -p tsconfig.worker.json
npm run build:api
npm test
```

`npm run build:api` face numai typecheck și dry-run. Nu publică o versiune.
Tipurile `CloudflareBindings` sunt generate din `wrangler.jsonc`, iar
integrările opționale sunt declarate separat în `src/types.ts`.

### Dependențe reproductibile

SDK-ul `agents` și MCP sunt instalate în pachetul Worker existent, nu în pachetul
React. `npm ci` din rădăcină rulează automat `npm run install:api`, care aplică
lockfile-ul din acest director. Nu folosi `--legacy-peer-deps` sau `--force`.
Frontendul păstrează React 18/Zod 3; runtime-ul SDK utilizează Zod 4.
Nu importa `agents/react` în frontend fără o revizie separată a compatibilității.
Wrangler și workers-types sunt aliniate cu versiunile rădăcinii; niciun nou
Worker, binding sau serviciu nu este creat de această separare a pachetelor.

## Contracte importante

- auth: scrypt, JWT scurt, sesiune hash-uită în cookie `HttpOnly` și verificare
  PBKDF2 limitată pentru compatibilitate legacy;
- mutații: validare, autorizare pe rol/proprietar și audit D1;
- formulare publice: honeypot, Turnstile, limiter edge și ferestre exacte D1;
- conținut configurabil: KV versionat, JSON limitat la 128 KiB;
- fișiere: R2 privat, chei construite de server și metadata în D1;
- cleanup: cron zilnic pentru rândurile temporare expirate.

Separarea resurselor și convențiile sunt în
`../../STORAGE_ARCHITECTURE.md`. Instrucțiunile operaționale sunt în `DEPLOY.md`.
