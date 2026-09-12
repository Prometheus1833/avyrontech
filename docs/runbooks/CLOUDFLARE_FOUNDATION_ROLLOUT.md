# Runbook — AVYRON OS Cloudflare foundation

Acest runbook nu reprezintă autorizare de execuție. Fiecare etapă remote cere
confirmare explicită. Ordinea previne publicarea unui Worker care citește tabele
inexistente.

## 0. Preconditions

- branch revizuit și actualizat față de ultimul `origin/main`;
- CI local complet verde;
- autentificare Wrangler refăcută fără a salva tokenuri în repository;
- `MFA_ENCRYPTION_KEY` creat separat în preview și producție, cu backup în
  secret managerul operațional; rotația cere un runbook de recriptare;
- ținta `app.avyron.ro` confirmată separat;
- fereastră de schimbare și persoană responsabilă de rollback.

## 1. Verificare read-only

```bash
git fetch origin --prune
git rev-list --left-right --count origin/main...HEAD
npm run audit:d1
npx wrangler d1 migrations list DB --config wrangler.jsonc --env preview --remote
npx wrangler d1 migrations list DB --config wrangler.jsonc --env= --remote
```

Stop dacă bindingul D1, environmentul, lista de migrații sau commitul diferă de
inventarul aprobat.

## 2. Preview data first

Țintă: binding `DB`, environment `preview`, baza `avyron-db-preview`.

1. export/backup dacă baza nu mai este goală;
2. aplică migrațiile `0001`–`0016`;
3. rulează controalele `SELECT` din `cloudflare/d1/checks/post-migration.sql`;
   D1 remote poate refuza `PRAGMA foreign_key_check` / `integrity_check` cu
   `SQLITE_AUTH`, deci aceste două PRAGMA rămân obligatorii în replay-ul local;
4. verifică principalii, versiunile de
   agent, sursele sociale inactive și timestamps în milisecunde;
5. încarcă Workerul separat `avyrontech-preview`, fără rute custom, și verifică
   bindingul `AVYRON_AGENT_RUNTIME`;
6. Worker-ele cu Durable Objects nu primesc Preview URLs per versiune; folosește
   URL-ul Worker-ului izolat și păstrează versiunea anterioară pentru rollback;
7. rulează signup/login, enrollment MFA, challenge/recovery, revocare sesiune,
   schimbare email, org isolation, AI policy, knowledge sources, Leads și demo
   routing pe URL-ul preview.

Rollback preview: șterge versiunea candidat sau revino la versiunea Worker
anterioară. Dacă baza era goală și trebuie refăcută, recrearea resursei preview
este acceptabilă numai cu aprobarea explicită; producția nu se atinge.

## 3. Production database

Țintă exactă: binding `DB`, environment production, `avyron-db`.

1. export D1 și păstrează checksum + locația artefactului în jurnalul privat;
2. confirmă din nou că remote are `0010` ca ultimă migrare;
3. aplică în ordine `0011`, `0012`, `0013`, `0014`, `0015`, `0016`;
4. dacă Dashboard cere execuție manuală, rulează instrucțiunile în ordine și
   jurnalizează migrarea numai după succesul integral al schemei și datelor;
5. rulează verificările read-only din pasul preview;
6. nu deploya Workerul dacă există FK orfane, tabele lipsă sau timestamps AI în
   secunde.

Rollback D1: nu edita migrațiile aplicate și nu șterge coloane în incident.
Oprește funcționalitatea prin kill switch/versiunea Worker anterioară, păstrează
datele și pregătește o migrare compensatoare. Restore din export este ultima
opțiune și cere aprobare separată.

## 4. Worker deployment

```bash
npm run validate:cloudflare
npx wrangler deploy --config wrangler.jsonc --env= --dry-run
```

După o a doua aprobare, publică versiunea `avyrontech`. Verifică `healthz`,
auth, endpointurile protejate 401/403, organizations, AI paused/budget și
host routing. Rollback: promovează imediat versiunea Worker anterioară; schema
0014–0016 sunt backward-compatible cu codul vechi.

## 5. DNS `avyron.eu`

Diff propus și rollbackul sunt în `docs/CLOUDFLARE_RESOURCES.md`. Aplică pe rând:

1. apex: păstrează targetul, schimbă numai Proxy la Proxied;
2. adaugă `www` CNAME proxied spre apex;
3. adaugă wildcard A proxied spre `192.0.2.1`;
4. verifică TLS înainte de testele HTTP;
5. testează apex/www, path/query, eliminarea tokenurilor, `demo1`, aliasul
   `exemplu1`, un slot nepregătit și un hostname neaprobat;
6. confirmă că MX/TXT și livrarea email nu s-au schimbat.

Rollback: revino apex la DNS-only și șterge numai recordurile `www` și `*`
adăugate în această schimbare. Nu modifica nameservere sau înregistrări email.

## 6. Go/no-go evidence

- commit SHA și versiune Worker;
- lista migrațiilor remote și outputul verificărilor;
- status TLS pentru fiecare hostname;
- status/Location/cache/security headers pentru smoke tests;
- rezultat auth/RBAC cross-tenant și AI kill switch;
- rollback testat sau pași confirmați;
- diferențe față de plan, dacă există.
