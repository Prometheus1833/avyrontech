# AVYRON Cloudflare-native — architecture map și release gate

Data auditului: 2026-10-09. Acest document descrie starea verificată în cod și separă explicit configurația locală de resursele confirmate în contul Cloudflare.

## Reguli de adevăr

- GitHub și migrările D1 append-only sunt sursa de adevăr.
- `wrangler.jsonc` descrie configurația dorită; nu dovedește singur existența sau sănătatea resurselor remote.
- Nu se activează AI plătit, overage, MFA, Turnstile sau OAuth prin simpla prezență a codului.
- Nu se publică, nu se trimit mesaje și nu se execută modificări Codex fără aprobarea specifică acțiunii.
- Stările neconfirmate remote sunt `UNKNOWN`, `NOT_CONFIGURED` sau `LIMITED`, niciodată „funcțional”.

## Architecture map

| Modul | Sursa de date | API / runtime | Agent | Permisiuni | Storage | Automatizare | Aprobare |
|---|---|---|---|---|---|---|---|
| Identitate și sesiuni | D1 `users`, `user_roles`, `sessions`, `platform_principals` | `/api/auth/*`, `/api/admin/users*` | — | sesiune live, RBAC și Super Admin în Worker | D1; token acces numai în memorie; refresh HttpOnly | expirare și curățare programată | rolurile și resetările sunt acțiuni Super Admin auditate |
| AVY | D1 agents, versions, knowledge, runs | `/api/ai/*`, Durable Object `AVYRON_AGENT_RUNTIME` | `avy` | tool policy + RBAC | D1 metadata; fără acces DB direct al modelului | AI Core + runtime per agent | tool-urile sensibile cer approval |
| AI Production / Media Manager | D1 ai_projects, content, jobs, sources, assets | `/api/ai-projects/*` | `ai-prod-content` și agenții existenți | membership proiect + RBAC | D1 metadata, R2 assets | Queue + scheduler D1 existent | conținutul și publicarea rămân separate; auto-publish oprit |
| Leads | D1 `leads` și tabelele de conversații | `/api/leads*` | agentul Leads existent | staff/admin + reguli de handoff | D1 | scheduler existent și evenimente persistente | mesajele externe cer aprobare |
| Logo Studio | D1 requests/orders, Workers AI pentru concepte | `/api/logo-studio/*` | agentul existent | cont autentificat pentru generare | D1 metadata; ieșirea browserului, nu base64 în D1 | AI Core | rezultatele comerciale rămân draft/comandă |
| Approval Center | D1 approvals și evenimente de audit | rutele AI/operations existente | toți agenții | owner/admin conform capabilității | D1 | jobs/workflows | approve, reject și tranziții validate server-side |
| Codex Work Items | D1 `codex_work_items` | `/api/admin/codex-work-items*` | propuneri manuale/agent | Super Admin | D1, fără cod executabil | workflow separat numai pentru mentenanță | aprobarea nu execută automat cod |
| Billing | D1 billing + adaptoare Stripe/Revolut/Oblio | `/api/billing/*` | — | cont/client/admin | D1 metadata | reconciliere prin Queue | webhook-uri semnate și acțiuni admin controlate |
| Diagnostice | D1 diagnostic runs/results | `/api/admin/system/diagnostics*`, `/api/health*` | — | health public minimal; dashboard Super Admin | D1 | rulare la cerere; mentenanță Workflow | pornire manuală Super Admin |

## Cloudflare bindings

### Reutilizate

- `DB`: D1 `avyron-db`; preview folosește `avyron-db-preview`.
- `FILES`, `MEDIA`: două bucketuri R2, cu variante preview separate.
- `KV`: config/cache mic, separat în preview.
- `AI`: Workers AI.
- `AVYRON_AGENT_RUNTIME`: Durable Object existent, per agent/context.
- `ASSETS`: frontend static în același Worker.
- `PUBLIC_API_RATE_LIMITER`: limitator edge existent.
- Cron Triggers: păstrate; operațiile grele sunt trimise către Queue.

### Declarate, dar neconfirmate remote

- `ASYNC_JOBS`: `avyron-async-jobs`; preview `avyron-async-jobs-preview`.
- DLQ: `avyron-async-jobs-dlq`; preview separat.
- `AVYRON_WORKFLOW`: `avyron-maintenance`; preview separat.

Aceste resurse nu au fost create sau verificate în cont deoarece sesiunea Wrangler nu este autentificată. Crearea lor este un pas manual/release separat și nu trebuie dedusă din config.

## Auth final

- Login: email sau username + parolă.
- Conturile privilegiate pot intra fără email verification; conturile publice păstrează verificarea emailului.
- MFA și Turnstile pentru autentificare sunt dezactivate explicit prin feature flags. `TURNSTILE_SECRET` rămâne necesar pentru formularele publice deja protejate, iar `MFA_ENCRYPTION_KEY` rămâne necesar pentru seiful de integrări existent; prezența secretelor nu activează automat funcțiile de autentificare.
- Google și GitHub afișează doar starea credentialelor; butoanele nu devin active înainte de implementarea și testarea callback-urilor OAuth.
- Sesiunea este verificată în D1 la fiecare request privat; schimbarea rolului/dezactivarea are efect fără a aștepta expirarea JWT.
- Refresh cookie: `HttpOnly`, `Secure`, `SameSite=Lax` în producție. Access token: numai în memorie.
- Conturile create/resetate de administrator au `must_change_password=1`; middleware-ul permite numai `me`, refresh, logout și schimbarea parolei până la finalizare.
- Security events rețin hash IP, țară aproximativă Cloudflare, rezumat dispozitiv/user-agent și request id; nu rețin parole sau tokenuri.

## AI Core și limite

- Primary: `@cf/qwen/qwen3-30b-a3b-fp8`.
- Secondary: `@cf/google/gemma-4-26b-a4b-it`, numai vision, long context sau review secundar explicit.
- Image: `@cf/black-forest-labs/flux-2-klein-4b`, registru separat de LLM.
- Niciun modul Worker nu mai apelează direct `env.AI.run()` în afara `aiCore.ts`.
- Limite output: Qwen 700/1200/1800, Gemma 500/900/1400.
- Limite zilnice interne: Qwen 3000, Gemma 700, FLUX 700, background 400, global hard-stop 5000.
- La 3000 se opresc joburile AI de fundal; la 4000 rămân numai cererile importante/user initiated; la 5000 se opresc apelurile.
- `PAID_AI_ENABLED`, `ALLOW_AI_OVERAGE`, `AUTO_AI_UPGRADE` sunt `false` în producție și preview.
- Rezervările sunt idempotente și protejate de trigger D1; financial cost guard rămâne al doilea strat.

## Queue și Workflow

- Queue procesează bounded batches, validează mesajele, face ack numai după succes și retry la eroare; după limita Wrangler, mesajul ajunge în DLQ.
- Cron trimite în Queue: operații, generare socială programată, reconciliere billing și refresh curs valutar.
- Workflow-ul de mentenanță are pași determinist numiți, retry limitat, curățare coordonare expirată, `PRAGMA optimize` și dovadă în `security_events`.
- Workflow-ul se pornește numai de Super Admin din `/api/admin/system/workflows/maintenance`.

## Release gate și pași manuali minimi

1. Autentifică Wrangler pe contul Cloudflare corect și verifică `account_id`; nu schimba binding-urile D1/R2/KV existente.
2. Creează Queue/DLQ și Workflow doar dacă `wrangler deploy --dry-run` și inventarul contului confirmă că nu există resurse reutilizabile cu același rol.
3. Verifică secretele deja cerute de implementarea curentă: `JWT_SECRET`, `TURNSTILE_SECRET` pentru formularele publice și `MFA_ENCRYPTION_KEY` pentru seiful de integrări. MFA/Turnstile în autentificare și OAuth rămân oprite prin feature flags până la testarea completă a fiecărui flux.
4. Aplică migrarea `0058` întâi în preview; rulează `PRAGMA foreign_key_check`, `PRAGMA quick_check` și auditul de schemă.
5. Rulează smoke tests preview pentru login, first-login, roluri, sesiuni, D1, R2, KV, Queue, Workflow și approvals.
6. Rulează Qwen și Gemma cu câte o cerere minimă. Rulează FLUX numai dacă bugetul zilei permite și salvează rezultatul ca probă; altfel marchează `NOT_TESTED`.
7. Compară metricile reale Cloudflare cu pragurile; unde Analytics API nu este disponibil, păstrează `UNKNOWN`.
8. Promovarea în producție necesită autorizare explicită separată.

## Dovezi locale disponibile

- Replay complet al migrărilor D1 și `integrity_check`.
- Typecheck aplicație + Worker.
- Suite unit/integration și teste noi pentru politicile auth/AI.
- Build static, Pages și Worker + Wrangler dry-run înainte de orice preview.

## Dovezi care lipsesc până la autentificare/deploy preview

- existența și consumul real D1/R2/KV/Queue/Workflow;
- producere/consum Queue și DLQ în Cloudflare;
- start/retry/resume Workflow în Cloudflare;
- inferențe live Qwen, Gemma și FLUX;
- login și administrare conturi pe un preview cu cookie/domain real;
- URL preview și smoke test browser.
