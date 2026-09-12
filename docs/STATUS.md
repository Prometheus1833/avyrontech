# AVYRON OS — status verificat

Ultima actualizare locală: 2026-09-12. Inventarul live de mai jos a fost
confirmat la 2026-09-10 și nu a fost reinterogat în această etapă. Documentul
separă explicit producția de mediul preview și de codul pregătit local.
Producția și DNS-ul nu au fost modificate; fundația publicată anterior există
numai în mediul Cloudflare preview.

## Stare live confirmată

- GitHub `origin/main`: `c3bead4221b958b5725e52b556c9bb67436a64d4`.
- Worker activ: `avyrontech`, conectat la ramura `main`.
- Worker preview activ: `avyrontech-preview`, versiunea
  `ea8fe924-5af0-4525-a8c8-4e0c2894ce13` primește 100% din traficul exclusiv
  preview, fără rute custom și fără cron triggers. Candidatul de performanță
  `253e1b75-ccda-41bb-94d0-5a5dc1218b45` este încărcat, dar neactivat; codul
  CRM final din checkout nu a fost încărcat fără o nouă aprobare.
- Domenii Worker: `avyron.ro`, `www.avyron.ro`, `api.avyron.ro`,
  `app.avyron.ro/api/*`, `avyron.eu/*`, `*.avyron.eu/*` și cele trei rute
  legacy `exemplu1`–`exemplu3.avyron.ro`.
- Bindinguri active: D1 `DB`, KV `KV`, R2 `FILES` și `MEDIA`, Workers AI `AI`,
  assets și rate limiter public.
- D1 producție `avyron-db`: migrații jurnalizate numai până la `0010`.
- D1 preview `avyron-db-preview`: migrații `0001`–`0016` aplicate; 68 tabele de
  aplicație, 102 indexuri, fără relații critice orfane.
- Secrete preview prezente: `JWT_SECRET` și `MFA_ENCRYPTION_KEY`, cu valori
  distincte generate local și încărcate direct în Cloudflare; valorile nu au
  fost păstrate în repository sau loguri.
- Workers AI preview folosește modelul activ
  `@cf/meta/llama-3.1-8b-instruct-fast`; run-ul live final a fost `succeeded`,
  cu retrieval din patru surse și pas de model executat real.
- Registrul public al agenților este cache-uit la edge: verificare live
  `MISS` urmat de `HIT`, cu CORS calculat pentru originea permisă.
- R2 producție/preview: bucketurile `avyron-files*` și `avyron-media*` există și
  erau goale la momentul inventarului.
- Workerul separat `avyron-email` nu era prezent în lista Workers & Pages.
- În zona `avyron.eu`, apexul era DNS-only; `www` și wildcardul `*` lipseau.
  Rutele Worker `.eu` nu sunt deci încă susținute de DNS proxied.
- În zona `avyron.ro`, nu exista un record DNS vizibil pentru frontendul
  `app.avyron.ro`. Ținta nu va fi ghicită.

## Pregătit în ramura locală

- Migrarea append-only `0014_avyron_os_foundation.sql`:
  organizații, memberships, invitații, principal platformă, capabilități,
  sesiuni revocabile, MFA schema, audit de securitate, idempotency, outbox și
  control-plane AI versionat.
- Autentificare Cloudflare-native completată cu challenge MFA TOTP, secret
  AES-GCM, recovery codes one-time, sesiuni/dispozitive revocabile și blocarea
  acțiunilor privilegiate când sesiunea nu a trecut MFA.
- Schimbarea emailului cere parola curentă, confirmare one-time pe noua adresă,
  alertă pe adresa veche și revocă toate sesiunile după confirmare.
- Identitatea superadminului este rezolvată server-side din D1; frontendul nu
  mai conține lista de emailuri privilegiate.
- Proiectele cu `organization_id` sunt filtrate server-side după membership sau
  asignare; proiectele legacy rămân pe politica anterioară până la asocierea
  explicită.
- AI runtime: rate limits D1 + edge, plafon de răspuns, kill switch, versiune
  aprobată, buget configurabil, runs/steps și conversații legate de agent plus
  visitor ID.
- Agents SDK este configurat cu un Durable Object separat în preview pentru
  coordonarea conversațiilor; starea centrală și conținutul rămân în D1.
- Migrarea append-only `0015_knowledge_and_leads.sql` adaugă proveniența
  knowledge, conectori fără secrete, sincronizări și CRM Leads detaliat. Sursele
  sociale sunt `pending` până la autorizare și validare.
- Migrarea append-only `0016_active_workers_ai_model.sql` înlocuiește modelul
  retras de Cloudflare și normalizează inserările/actualizările legacy.
- Migrarea append-only `0017_ai_production_projects.sql` pregătește local
  portofoliul AI separat, memberships explicite, șase tipuri de canale,
  alocarea agenților, strategii, memorie cu expirare, concurenți, conținut și
  audit. Nu a fost aplicată în nicio bază remote.
- `AI AVY Prod` este disponibil în cod ca intrare unică din dashboard și
  mini-dashboard către `/intern/ai-projects`. Lista inițială conține Avyron
  WEB, Cutiuța Magică și Retuvo; fiecare are un workspace privat distinct de
  registrul proiectelor operaționale.
- Content Studio generează prin Workers AI exclusiv ciorne auditate și
  idempotente, într-o limită rulantă de 24h. Aprobarea este umană; publicarea și
  outreach-ul extern nu sunt implementate/activate.
- Stările canalelor nu sunt simulate: `connected` necesită un
  `source_connection` activ și verificat. Toate mutațiile Proiecte AI cer MFA,
  iar conectarea și automatizarea sunt rezervate `platform_owner`.
- Migrarea append-only `0018_financial_control_plane.sql` și pagina privată
  `/finance` înlocuiesc agregatorul financiar legacy Supabase cu un modul D1
  canonic: cheltuieli, venituri, conturi/carduri mascate, bugete, quotas,
  alocări, istoric de preț, alerte, documente R2 și audit. Seed-urile financiare
  nu inventează sume și rămân `needs_configuration`.
- Migrarea append-only `0019_avy_engine.sql` și pagina privată
  `/intern/avy-engine` adaugă registrul guvernat de surse, capabilități,
  conectori, documente R2, sugestii și bindings către agenți/produse/pagini.
  Toate sursele inițiale sunt în revizuire, jobul periodic este dezactivat, iar
  `uiprompts.app` rămâne explicit neverificat.
- AI Cost Guard este aplicat server-side înaintea ambelor căi Workers AI
  existente, cu FREE FIRST, permisiuni per agent/provider, buget, limită per
  request, rezervare atomică de quota, stări de aprobare și idempotency. O
  politică sau quota neconfigurată blochează apelul plătibil și folosește
  fallbackul sigur. Nicio integrare plătită, bancară sau SaaS nu este activată.
- Runtime-ul mapează defensiv identificatorul modelului retras către varianta
  activă, inclusiv înaintea unei sincronizări D1 complete.
- Politica de tool-uri blochează generic shell, code execution, SQL brut,
  URL-uri arbitrare și accesul la secrete. Acțiunile externe, financiare și de
  publicare cer aprobare explicită.
- Registry demo: `demo1`–`demo10.avyron.eu`, fiecare cu aliasul
  `exemplu1`–`exemplu10`, fără dublarea proiectului.
- CRM Leads Cloudflare: creare manuală validată, deduplicare tenant-scoped,
  pipeline în opt etape, urgență, canale de contact, fișă detaliată, istoric,
  asignări, follow-up și remindere. Contactarea externă rămâne manuală.
- Providerul legacy pentru exemple este încărcat dinamic numai când este
  configurat explicit; buildul Cloudflare folosește fallbackul local fără o
  cerere externă inutilă și fără schimbarea paginilor publice.
- Redirecturile apex/www `.eu` păstrează path și parametrii obișnuiți, dar
  elimină cheile de query sensibile.
- Pagina publică premium `/politica-cookies`, cu varianta
  `/en/cookie-policy`, documentează inventarul real de tehnologii, este
  prerendered și reutilizează panoul existent de preferințe. Analiza
  first-party este acum oprită server/client-side până la consimțământ.
- Audit D1 reproductibil prin `npm run audit:d1`.

## Verificări locale

| Verificare | Rezultat |
| --- | --- |
| TypeScript aplicație | trecut |
| TypeScript Worker | trecut |
| ESLint | trecut |
| Teste unitare securitate/routing/policy/consimțământ | 19/19 fișiere și 146/146 teste trecute |
| Replay migrații `0001`–`0019` | integritate OK, 103 tabele, 146 indexuri, fără FK orfane; nicio aplicare remote |
| Build Pages | trecut, 53 documente prerendered și sitemap cu 49 URL-uri |
| Build Worker/API dry-run | trecut, inclusiv bindingul Durable Object |
| Build email dry-run | trecut |
| Playwright public/auth/CRM/AI Prod/Finance/AVY Engine/cookies E2E | 33/33 trecute |
| `npm audit` | 0 vulnerabilități după instalarea Agents SDK |

Verificarea completă a fost repetată înainte de predare; rezultatele de mai sus
sunt cele finale pentru starea locală curentă.

## Blocaje pentru producție

1. Producția nu are încă `0011`–`0019`; codul nou nu poate fi lansat înaintea
   schemelor de care depinde.
2. Ținta reală pentru frontendul `app.avyron.ro` trebuie confirmată în
   platforma care îl găzduiește.
3. Certificatul pentru `staging.app.avyron.ro` trebuie verificat separat; un
   certificat universal pentru `*.avyron.ro` nu acoperă automat două niveluri.
4. `JWT_SECRET` și `MFA_ENCRYPTION_KEY` trebuie create distinct în producție,
   cu recovery operațional, înaintea lansării autentificării noi.
5. Preview URLs per versiune nu sunt disponibile pentru acest Worker deoarece
   implementează Durable Objects; testarea izolată folosește Worker-ul separat
   `avyrontech-preview` și rollback prin versiunea Worker anterioară.

## Limite respectate

- fără push, commit public sau merge;
- fără deploy, migrare sau promovare în producție;
- fără modificări DNS și fără mutații în D1/R2/KV de producție;
- modificările live au fost limitate la D1 și Worker preview autorizate;
- fără folosirea agentului sau creditelor Lovable;
- paginile publice existente au rămas neschimbate în afara integrării cerute a
  politicii cookies și a linkurilor juridice aferente;
- fără secrete, tokenuri sau credențiale în repository și documentație.
