# AVYRON OS — arhitectură țintă

## Principii

GitHub este sursa de adevăr. Workerul central aplică autentificarea,
autorizarea, validarea și auditul; browserul nu decide niciodată accesul la
date. Fiecare resursă operațională are `organization_id`, iar excepțiile de
platformă sunt rezolvate din D1 și auditate.

```text
avyron.ro / app.avyron.ro
          │ HTTPS
          ▼
Cloudflare edge + static assets
          │ /api/*
          ▼
avyrontech Worker
  ├─ auth + platform/org RBAC
  ├─ MFA TOTP + session/device revocation
  ├─ API versioning + validation + rate limits
  ├─ deterministic AI policy + approvals
  ├─ Agents SDK coordination, fără rute directe publice
  ├─ D1 transactions / outbox
  ├─ R2 signed and authorized object access
  └─ KV configuration/cache (never security state)
          │
          ├─ D1: relational source of truth
          ├─ R2: files and media
          ├─ KV: cache/configuration
          ├─ Durable Objects: lifecycle per conversație
          └─ Workers AI: bounded inference only
```

## Boundary pe organizații

`organizations` este tenantul. `organization_memberships` leagă utilizatorul
de tenant și conține rolul contextual. `platform_principals` este separat de
rolurile organizației, astfel încât un client owner nu devine administrator al
platformei.

Datele legacy nu sunt asociate automat. `client_organizations` este legătura
explicită între vechiul `clients` și tenant; numai după această legătură un
proiect nou poate primi `organization_id`. Astfel evităm amestecarea accidentală
a datelor între clienți.

## Evenimente și operații durabile

- `security_events`: audit append-only pentru allow/deny/fail, actor, tenant,
  request ID și context JSON fără secrete.
- `idempotency_keys`: protejează operațiile repetabile și callbackurile.
- `outbox_events`: scrierea business și intenția de livrare pot fi păstrate în
  aceeași bază; procesorul marchează `published` numai după livrare.
- `email_delivery_log`: rezultatul concret al trimiterii.

## Runtime comun pentru agenți

Un agent activ indică o versiune aprobată din `ai_agent_versions`. Configurația
de tool-uri se rezolvă din `ai_tools` și `ai_agent_tool_policies`, apoi trece
prin politica deterministă din `agentRuntimePolicy.ts`.

Ordinea de decizie:

1. kill switch global/tenant/agent/tool;
2. buget și rate limit;
3. versiune aprobată;
4. tool înregistrat și activ;
5. capabilitate și scope permis;
6. aprobare umană pentru external, financial sau publish;
7. execuție și jurnalizare în `ai_runs` + `ai_run_steps`;
8. rezultat sau handoff controlat.

Niciun prompt nu poate acorda shell, code execution, SQL brut, URL arbitrar sau
acces la secrete. Aceste limite sunt cod și date de policy, nu text în system
prompt.

`AvyronAgentRuntime` folosește Agents SDK și Durable Objects numai pentru
coordonarea lifecycle-ului unei conversații. D1 rămâne sistemul central pentru
mesaje, knowledge, lead-uri, politici și audit. Metodele runtime sunt invocate
prin RPC din același Worker, după propriile controale; nu există o rută
WebSocket/callable expusă direct internetului.

## Medii

| Mediu | Cod | Date | Domenii live |
| --- | --- | --- | --- |
| development | checkout local | D1 local/R2 local | localhost |
| preview | Worker `avyrontech-preview` | `*-preview`, inclusiv namespace Durable Object separat, fără rute custom | URL preview Worker |
| production | `main` aprobat | resurse fără sufix | domenii AVYRON |

Bindingurile și variabilele se declară complet în fiecare environment deoarece
configurația Wrangler nu moștenește automat toate câmpurile. Preview nu primește
rute de producție și nu reutilizează D1/R2/KV production.

`JWT_SECRET` și `MFA_ENCRYPTION_KEY` sunt secrete distincte per environment.
Cheia MFA are minimum 32 de caractere, nu apare în vars, loguri, migrații sau
bundle și trebuie păstrată pentru a putea decripta factorii deja înscriși.
Fiecare JWT conține doar identitatea și ID-ul opac al sesiunii; Workerul
revalidează în D1 sesiunea, starea contului, rolurile curente și marcajul MFA,
astfel încât revocarea să aibă efect imediat.

## Dependențe operaționale

- Codul care citește o coloană/tabel nou se publică numai după migrarea
  environmentului respectiv.
- Migrarea este append-only; backupul și verificarea read-only preced fiecare
  pas remote.
- DNS se activează numai după ce versiunea Worker și certificatul au fost
  verificate.
- Un demo privat cere autentificare reală; `noindex` este doar control SEO.
