# Arhitectura de date Cloudflare — Avyron

`wrangler.jsonc` este sursa unică de adevăr pentru binding-uri. Browserul nu
primește credențiale D1, KV sau R2; toate operațiile trec prin Worker și prin
politicile de autentificare, roluri, validare și audit.

## Separarea mediilor

| Serviciu | Producție | Preview | Responsabilitate |
| --- | --- | --- | --- |
| D1 | `avyron-db` | `avyron-db-preview` | date relaționale și tranzacționale |
| KV | `avyron_kv` | `avyron_kv_preview` | configurații JSON mici, citite frecvent |
| R2 documente | `avyron-files` | `avyron-files-preview` | documente și atașamente private |
| R2 media | `avyron-media` | `avyron-media-preview` | imagini/avataruri/media de proiect |
| Rate Limit | namespace `183301` | namespace `183302` | protecție rapidă la edge, înainte de D1 |

Un build de branch trebuie să execute `npm run deploy:api:preview`. Testul
`cloudflare-storage-policy.test.ts` eșuează dacă preview-ul reutilizează ID-urile
de producție. Nici conținutul, nici migrațiile bazelor nu sunt promovate automat
odată cu o versiune de Worker.

## Ce aparține fiecărui serviciu

### D1 — sursa de adevăr

- utilizatori, roluri, profiluri și sesiuni;
- clienți, proiecte, servicii, facturi, lead-uri și audit;
- articole, traduceri, stări editoriale și istoricul reviziilor;
- metadata obiectelor R2, fără corpul fișierului;
- contoare exacte de rate limiting în ferestre fixe.

Operațiile concurente și regulile de securitate nu folosesc KV drept contor.
Interogările frecvente trebuie să selecteze coloane explicite și să aibă index
pe coloanele folosite de `WHERE`, `JOIN` și `ORDER BY`.

### KV — configurație, nu bază tranzacțională

- chei validate și versionate: `content:v1:<cheie>`;
- JSON de maximum 128 KiB;
- fără parole, tokenuri, lead-uri, emailuri sau alte date personale;
- fără contoare exacte ori read-modify-write concurent.

Versiunea cheii permite schimbarea ulterioară a schemei fără a interpreta greșit
valorile vechi. Datele sensibile și listele interogabile rămân în D1.

### R2 — obiecte binare

- `FILES/leads/<lead-id>/<filename>` pentru atașamentele formularelor;
- `MEDIA/projects/<project-id>/<media-id>-<filename>` pentru media proiectelor;
- `MEDIA/avatars/<user-id>` pentru avataruri.
- `MEDIA/blog/covers/<uuid>.<ext>` pentru coperți publice validate ale articolelor.

Cheile sunt construite numai de Worker, numele sunt normalizate, tipul și
dimensiunea sunt validate înainte de scriere, iar metadata R2 păstrează
identificatorii utili. Dacă salvarea metadata în D1 eșuează, obiectul nou este
șters; la ștergere, metadata D1 rămâne dacă R2 nu confirmă operația.

Fișierele sunt private implicit. Download-ul autorizat este transmis prin
Worker cu `ETag`, intervale byte, `nosniff`, `private, no-store` și un
`Content-Disposition` sigur.

## Retenție și operare

- Cronul zilnic elimină contoare, sesiuni, resetări și verificări expirate din D1.
- Atașamentele lead-urilor trebuie să primească o regulă lifecycle R2 aliniată
  politicii GDPR; nu se configurează o durată arbitrară fără aprobarea juridică.
- Versioning sau event notifications R2 se activează numai dacă apare un flux
  real de recuperare/procesare; nu sunt necesare pentru obiectele goale actuale.
- Se configurează alerte pentru erori Worker, D1 și livrări SMTP; logurile nu
  trebuie să includă corpuri, parole, tokenuri ori fișiere.
- Se face export/backup D1 înaintea unei migrații de producție. Preview-ul se
  poate recrea din migrațiile versionate din repository.

## Comenzi sigure

```bash
# tipuri + TypeScript + pachet Worker, fără upload
npm run build:api

# aplică schema numai în D1 preview
npx wrangler d1 migrations apply DB --config wrangler.jsonc --env preview --remote

# creează o versiune de preview; nu o promovează în producție
npm run deploy:api:preview
```

Aplicarea migrațiilor pe producție și `npm run deploy:api` sunt pași separați și
necesită aprobare explicită.
