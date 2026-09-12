# AVY Engine

Status: implementat local, Cloudflare-only. Migrarea `0019_avy_engine.sql` nu a
fost aplicată remote, Workerul nu a fost publicat, iar descoperirea periodică
pornește dezactivată.

## Scop

AVY Engine este registrul intern pentru surse, funcții, efecte, componente,
documentație, skill-uri, pluginuri, MCP-uri, API-uri și repository-uri care pot
fi evaluate pentru AVYRON OS. O resursă observată nu este automat sigură,
licențiată sau compatibilă.

Fluxul canonic este:

`sugestie → verificare → evaluare securitate/licență → aprobare → binding → activare`

Datele externe sunt neîncrezătoare. AVY Engine nu execută cod descărcat, nu
instalează pachete, nu clonează repository-uri, nu urmează instrucțiuni din
pagini și nu publică modificări.

## UI

- Card super admin în `/profil` către `/intern/avy-engine`.
- Overview minimalist pentru surse, capabilități, documente și bindings.
- Catalog de surse cu search, stări, acces, preț și porți de securitate.
- Detail drawer pentru capabilități, conectori și documentație.
- Sugestii manuale sau generate de `AVY Engine Scout`, toate pending.
- Bindings către `avyron_os`, `agent`, `product`, `project` sau `page`.
- Politică periodică configurabilă, dezactivată implicit.

## Model D1

| Tabel | Rol |
| --- | --- |
| `engine_sources` | platforme/site-uri/repository-uri și verificarea lor |
| `engine_capabilities` | funcții atomice, livrare, risc, licență și evidențe |
| `engine_connectors` | registry API/MCP/Git/OAuth fără secrete |
| `engine_documents` | metadata pentru fișiere private R2 |
| `engine_suggestions` | candidați care necesită decizie umană |
| `engine_resource_bindings` | distribuție aprobată către agenți/produse/pagini |
| `engine_discovery_policies` | frecvență și limite pentru analiză |
| `engine_discovery_runs` | execuții trasabile și stări de buget/aprobare |
| `engine_audit_events` | audit append-only fără secrete |

Documentele text aprobate pot fi legate ulterior de `knowledge_documents`;
nu se dublează sistemul existent de chunks/claims. D1 rămâne sursa canonică,
R2 păstrează fișierele și KV poate fi utilizat numai pentru cache regenerabil.

## Surse inițiale

- `uiprompts.app`: introdus exact cum a fost cerut, `unverified`; domeniul nu a
  putut fi confirmat și nu are capabilități inventate.
- Casberry Particle Simulator: efecte 3D și formate de export observate;
  licența și utilizarea comercială necesită verificare.
- OriginKit: componente/sections/templates, CLI și MCP observate în
  documentația oficială.
- 21st.dev: catalog React/shadcn, template-uri, teme și prompturi AI-ready.
- Framer: Plugin API, Server API, componente și agenți externi.
- GitHub public: catalog generic; fiecare repository cere license review,
  commit pin și dependency scan.
- Cloudflare Developers: documentație primară pentru infrastructura AVYRON.

Toate pornesc `reviewing`, fără discovery, conector sau binding activ.

## API

- `GET /api/engine/overview`
- `GET|POST /api/engine/sources`
- `GET|PATCH /api/engine/sources/:id`
- `GET /api/engine/capabilities`
- `POST /api/engine/sources/:id/capabilities`
- `PATCH /api/engine/capabilities/:id`
- `POST /api/engine/sources/:id/connectors`
- `PATCH /api/engine/connectors/:id`
- `POST /api/engine/sources/:id/documents`
- `GET /api/engine/documents/:id/content`
- `PATCH /api/engine/documents/:id`
- `GET|POST /api/engine/suggestions`
- `PATCH /api/engine/suggestions/:id`
- `POST /api/engine/suggestions/:id/promote`
- `GET|POST /api/engine/bindings`
- `PATCH /api/engine/bindings/:id`
- `GET /api/engine/projections/:targetType/:targetKey`
- `POST /api/engine/sources/:id/discover`
- `PATCH /api/engine/discovery-policy`
- `GET /api/engine/audit`

Toate endpoint-urile sunt private, autentificate și autorizate server-side.
Mutațiile trec prin step-up MFA. `platform_owner` are control complet; alte
roluri au nevoie de capabilități explicite `engine.*`.

Conectorii noi sunt înregistrați `not_configured`. UI poate trece un conector
doar în testare, pauză sau revocat; activarea este refuzată până când există o
validare tehnică separată, aprobare și secret binding Cloudflare, dacă este
necesar. D1 păstrează doar metadate și aliasuri, nu credențiale.

## AVY Engine Scout

Agentul inspectează numai URL-ul canonic al unei surse `active` după ce
securitatea, termenii și robots au fost marcate revizuite. Cererea are timeout
de 10 secunde, răspunsul este citit streaming cu limită de 256 KB, iar HTML-ul
este redus la text inert.

Workers AI este apelat numai după `AI Cost Guard`. Rezultatele sunt acceptate
numai dacă URL-ul exact exista în pagina observată și sunt salvate ca sugestii
pending. Agentul nu poate promova sau activa sugestii.

Jobul periodic reutilizează programul de mentenanță existent și este inert
până când Super Admin activează explicit politica, sursele și bugetul real.

## Documente și fișiere

Formate acceptate: PDF, PNG, JPEG, TXT, Markdown și JSON valid. Se verifică
semnătura/magic bytes, mărimea maximă este 10 MB, numele este sanitizat și se
calculează SHA-256. Fișierele sunt private în R2, fără URL permanent. Un fișier
poate deveni utilizabil de agenți numai după aprobare și trust review.

Executabilele, arhivele, HTML-ul și JavaScript-ul nu sunt acceptate.

## Integrarea cu produse și agenți

`engine_resource_bindings` este contractul unic de sincronizare. Un binding
activ cere simultan o sursă `active` și o capabilitate `ready`. Pagina publică
de produse nu este modificată și nu consumă resurse candidate. Când conținutul
public va fi aprobat, un adaptor poate consuma proiecția filtrată fără a expune
documente, secrete sau configurații interne.

## Configurare manuală

1. Verifică identitatea domeniului și proprietarul sursei.
2. Revizuiește Terms, robots, licența și drepturile comerciale.
3. Configurează sursa ca `reviewed` și apoi `active`.
4. Configurează quota și politica financiară pentru `avy-engine-scout`.
5. Activează discovery numai pentru sursele permise.
6. Aprobă individual capabilitățile și bindings.

Niciun API key, cookie de cont, token MCP sau credential Git nu se salvează în
D1 ori repository. Viitoarele credențiale folosesc exclusiv Cloudflare secret
bindings și necesită threat model separat.
