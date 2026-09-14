# AVYRON OS — audit de acoperire și release

Data: 14 septembrie 2026. Acest document prevalează asupra inventarelor istorice
din 10–12 septembrie. Surse: cele trei briefuri atașate, toate cerințele
conversației, repository-ul și verificările HTTP autentificate din această etapă.

**Verdict: release incremental de stabilizare, nu finalizarea tuturor cerințelor.**
Un card, o schemă sau un adapter neconectat nu constituie un flux funcțional complet.

## Infrastructură și acces verificate

- Cloudflare Workers + D1 + R2 + KV; fără migrare la alt furnizor, fără servicii
  plătite activate. Nu există operații DDL remote în acest release.
- `app.avyron.ro/` redirecționează la `/profil`; pagina răspunde 200, HTTPS,
  `private, no-store`, `noindex, nofollow`. `api.avyron.ro/healthz` răspunde OK.
- Ambele conturi indicate au trecut login, `/api/auth/me` și logout real.
  `prometheus@avyron.ro` rămâne `platform_owner`, `avyrontech@gmail.com`
  rămâne `superadmin`. Aceste roluri nu sunt identice: politica owner-only
  pentru mutațiile financiare/Engine nu a fost relaxată.
- Cu ambele conturi: `/api/os/overview`, `/api/finance/overview`,
  `/api/ai-projects`, `/api/engine/overview` au răspuns 200.
- `/api/admin/users` a răspuns 403 `mfa_required` fără MFA, conform politicii.
  Activarea MFA în Setări este un pas manual obligatoriu. Factorii și codurile
  de recuperare nu sunt generați în numele utilizatorului în acest release.
- Secretele, parolele și sesiunile nu sunt incluse în documentație sau commit.
  Sesiunile testului au fost închise. Nu s-au executat publicări sociale,
  outreach, plăți, upgrade-uri sau inferențe AI în verificările de release.

## Corecțiile acestui release

- Leadurile urgente și întârziate sunt numărate o singură dată; cele închise
  nu mai sunt considerate prioritare doar pentru că au marcaj urgent.
- Decizia AI, continuarea și auditul sunt salvate într-un singur batch atomic;
  o eroare nu lasă aprobarea salvată fără continuare. Retrimiterea nu dublează
  evenimentul. Expirarea și rolul sunt verificate; notele au tip/lungime validate.
- Un run nu este reluat dacă mai are o aprobare în așteptare.
- Numărul total de aprobări nu este limitat artificial la cele opt din preview.
- Totaluri Home/Financiar cu aceeași definiție, lună Europe/Bucharest, limită
  superioară temporală și fără conversii valutare presupuse. Ciornele nu sunt venit.
  Documentele parțial încasate rămân estimări la valoarea documentului, nu cashflow.
- R2/AI cu binding disponibil sunt „configurat”, nu „funcțional” fără probă.
  Conectorii neverificați/reverificați de peste șapte zile nu sunt afișați verzi.
- Prioritățile preced KPI-urile și cardurile Proiecte AI/Engine; linkul înapoi
  duce la site-ul public, nu într-o buclă pe subdomeniul app. Fără bulină de
  notificare fictivă. Accesul rapid este filtrat după permisiuni.
- Centrele au căutare fără sensibilitate la diacritice, grupuri pliabile,
  status explicit și butoane numai pentru destinațiile deja disponibile.

## Matrice consolidată — fără module duplicate

Legendă: **parțial** = există cod utilizabil, dar nu toate cerințele/validările;
**fundație** = modele/politici/registru, fără flux complet; **backlog** = de construit.

| Cerințe consolidate | Destinație canonică | Stare și ce lipsește |
| --- | --- | --- |
| Dashboard premium română, desktop/mobil, mini-dashboard ≤6 intrări | `/profil`, navigația existentă | Shell publicat; mini-dashboardul trebuie verificat separat pentru fiecare rol. |
| Team/Staff, privilegii; dashboarduri Sales/Developer/Marketing/Finance/Client | Echipă și personal + auth/organizations | Roluri user/staff/admin și principal D1; MFA. Dashboardurile de specialitate și editorul tuturor capabilităților sunt parțiale. |
| Needs Attention/Azi, AVY Briefing 2–4 rânduri și setări | Overview | Agregator real pentru leaduri, facturi, revizuiri, suport, alerte; nu acoperă încă expirări domenii/WCAG/SLA. Briefing determinist; preferințe/programare backlog. |
| Approval Center Approve/Edit/Reject | Overview + AI OS | Approve/Reject auditate; Revizuiește este navigare, NU editor complet al cererii. Legarea aprobării de versiunea exactă a tuturor artefactelor externe rămâne de extins. |
| AI Activity/Agent Runs, cost, rezultate | Overview + AI OS | Rulări/pași/tokeni reali; explorator paginat complet, cost realizat și rezultate per tool încă parțiale. |
| Infrastructure Health, Integrations Health | Overview | API/auth/D1 observate; R2/AI doar configurare. Nu probează încă toate hostname-urile, DNS, email, Pages și furnizorii externi. |
| Security Center, Error Center, Backup & Recovery | Centre + audit backend | MFA, sesiuni, rate limits, evenimente și proceduri există; UI central, alerte agregate, backup periodic și restore drill nu sunt confirmate. |
| Automation Center, trigger/condiții/retry/dry-run/kill switch | AI runtime + Centre | Fundație de outbox, idempotency și cron; nu există încă editor și executor complet pentru toate fluxurile. |
| Domains & Digital Assets, Domain Hunter/Trader/Desk | Modul domenii, viitor desk | Registry demo și verificări existente; portofoliu, expirări, watchlist, licitații și simularea integrală backlog. Nicio tranzacție reală. |
| Contracts & Renewals, AVY Renewal | Centre → proiecte/financiar | Backlog pentru management contractual și reînnoiri complete; nu se dublează abonamentele financiare. |
| Knowledge/Documents Hub, Asset Vault | Knowledge + AVY Engine + R2 proiecte/financiar | Proveniență și documente parțiale; căutare transversală AI, versionare generală, seif de brand și detecția contradicțiilor de completat. Secretele rămân în bindings. |
| Command Center ⌘K/Ctrl+K | `/profil` | Navigare funcțională. „Creează lead”, scanare WCAG, raport august și interogări naturale nu sunt executate încă. |
| SLA & Deadlines | Proiecte / viitoare taskuri | Backlog. |
| Change Requests, statusuri propuneri, cost suplimentar | Proiect individual | Fundație proiect/media; flux complet cerere → aprobare cost → livrare de completat. |
| Deliverables Tracker, Client Onboarding, Client Offboarding | Proiect individual | Backlog pentru checklisturi persistente, responsabilități, export/predare și arhivare. |
| Privacy & Consent Center; Legal/Compliance Calendar | Consent existent + Centre | Cookie consent funcțional; DSAR/export/ștergere, jurnal unificat și calendar de obligații de construit. |
| Experiment Center | Centre | Backlog pentru experimente, randomizare, conversii și evaluare. |
| Comentarii blog și alte pagini | Centre | Backlog pentru stocare, moderare, rate limits și integrare publică aprobată. |
| Pluginuri, skilluri, MCP/API, repo-uri publice | AVY Engine | Registru guvernat; nu reprezintă instalare/executare automată. Licențe, permisiuni și verificare obligatorii înainte de activare. |
| Vizite, rapoarte, statistici/exporturi | Overview + rapoarte D1 | Colectare first-party și sumar real; UI analytics legacy, rapoarte intermodule și exporturi programate incomplete. |
| Abonați / newsletter AVYRON | Centre | Backlog: double opt-in dacă ales, liste, suppression, unsubscribe, campanii, provider autorizat. |
| Programări | Centre | Backlog: calendar persistent, disponibilitate, responsabil, client, reminder. |
| CRM Leads, surse, istoric contact, asignare, reminder urgent, follow-up | Leads & CRM | Flux manual D1; import automat, Inbox omnichannel, eligibilitate outreach, conversie idempotentă lead→proiect de completat. |
| Proiecte în curs / client selectat; fișă, oferte, linkuri, metadate, R2 | Proiecte operaționale | Parțial Cloudflare; nu se amestecă cu portofoliul AI. Nu s-au creat clienți/proiecte fictive în producție pentru demonstrație. |
| Proiecte proprii și administrate AI: Avyron WEB, Cutiuța Magică, Retuvo | `/intern/ai-projects` | Lista și workspace existente; strategii, ciorne, agenți, memorie/retention. Publicare efectivă social, inbox și cercetare concurență automată nu sunt activate. |
| Facebook, Instagram, TikTok, LinkedIn, WhatsApp, Messenger etc. | Conectori comuni + Proiecte AI | Fără OAuth validat nu se importă mesaje și nu se publică. Statusurile nu substituie autorizarea providerului. |
| Avyron AI Assistant, Leads Agent, profilurile specializate | Runtime AI comun | Registry, retrieval/policy, ciorne și Cost Guard existente; un profil nu garantează tools complete sau agent „antrenat”. |
| AVY Brief/Estimator/QA/Capacity/Margin/Renewal/Opportunity/Incident/Knowledge Auditor/Cost Controller; Editorial/Writer/Visual/Brand Review/Publisher/Content Analyst; Concierge/Intake/Prospect/Research/Qualifier/Outreach/Follow-up/Proposal | Registry comun AI | Fundație comună; tools, evaluări și permisiuni trebuie validate per profil. Fără SQL/shell/secrete arbitrare. |
| AVY Engine: uiprompts, particles, originkit, 21st, Framer + surse proprii | `/intern/avy-engine` | Registru și documente; surse în revizuire, uiprompts neverificat. Conturile nu sunt presupuse conectate; nu se copiază resurse fără licență. |
| Engine: sugestii periodice, aprobare superadmin, legare produse/pagini/agenți | Engine discovery + bindings | Fundație; job implicit dezactivat. Sincronizarea nu înseamnă execuție/arbitrare ori modificare automată de produs. |
| Cookies premium + buton minidash + setări existente | `/politica-cookies` | Implementare existentă; reutilizează `avyron-cookie-consent-v2` și `avyron:cookie-settings`, fără stocare paralelă. |
| Despre noi „România, Europa”; fără FAQ Home; Site Prezentare Profesional; Blog Profesional | Pagini publice existente | Modificări cerute explicit în release-ul anterior; nicio nouă modificare publică în acest release. |

## Financiar — acoperirea cerințelor 1–73

| Grup din specificație | Implementare / limită reală |
| --- | --- |
| 1–3, 7, 44–49, 60: overview, categorii, detail drawer, UX și Home | `/finance` canonic, reexportat în dashboard. Filtrele/sortările avansate complete și toate view-urile specifice furnizorilor rămân parțiale. |
| 4–6, 9–11, 61–64, 66–68: cheltuieli, venituri, conturi/carduri, FX, price/billing history, seed | Schema 0018 și API/UI existente; prețuri nule. Nu toate câmpurile schemei au editor sau operație CRUD completă. Fără PAN/CVV/PIN. |
| 8, 10–11, 20–22, 65: statistici, marje, anomalii, optimizer, proiecții/calendar | Calcule deterministe parțiale; estimări de management. Cashflow parțial încasat, atribuire Ads/ROI și calendar complet de extins. |
| 12–18, 50–53: free tier, praguri, guard, cache/dedupe, bugete, AVY Finance | Guard server-side și politici existente; lipsa cotei/aprobării blochează. Agentul nu poate cumpăra/efectua plăți/modifica bugete autonom. Fallback provider/local și batch generalizate sunt extensii, nu active implicit. |
| 19–20, 35, 41–42: alerte, audit și observabilitate | Tabele/reguli/UI parțiale. Nu toate alertele cerute au producer sau notificări livrate; validarea atomicității tuturor mutațiilor financiare rămâne necesară. |
| 23–25, 43: documente private, manual/import/API, adaptoare/export | R2 autorizat și contracte adaptoare existente; reconciliere și importuri automate inactive. Exporturi XLSX/PDF complete și async backlog. |
| 26–40, 51–53: RBAC, MFA, sesiuni, WAF, secrets, API/webhooks, backups, integritate/concurență | Controale server-side existente, nu certificat de securitate complet. Webhooks financiare inactive. Nu este confirmată configurarea tuturor regulilor WAF sau restaurarea backupurilor. |
| 54–59, 69–73: teste, failure, performanță, indexuri, docs, DoD | Teste locale + smoke autentificat; DoD integral **neîndeplinit**. CRUD financiar complet, IDOR pe toate resursele, failure matrix, PDF/XLSX și restore drill trebuie finalizate. |

Necesit, Contabilitate, Meștero, Lovable, Claude subscription/API, FGO și Google Ads
există ca intrări configurabile, nu costuri inventate. Reclamele nu trebuie reduse
la abonament fix. Cost actual zero și viitor nenul au suport în model.
Revolut/FGO/Stripe/NETOPIA/Google Ads/Meta Ads/OpenAI/Anthropic/Cloudflare/Supabase/
Resend/GitHub/Lovable sunt contracte de integrare, nu conectări financiare live.
Supabase în registry este numai extensie opțională viitoare, nu infrastructură activată.

## Blocaje și ordine de continuare

1. MFA pentru ambele conturi și parole individuale noi, întrucât parola de bootstrap
   a fost transmisă în conversație. Configurare email transactional fără a presupune
   că Email Routing permite și trimitere. Nicio cheie/serviciu plătit inventat.
2. Înlocuirea dependențelor legacy din interfețele interne cu API-urile Cloudflare
   autorizate, fără migrare de date neaprobată și fără sisteme duplicate:
   `InvoicesTab`, `SubscriptionsTab`, `TicketsTab`, `StatsTab`, `StaffChatTab`,
   `StaffAnnouncementsTab`, `StaffDomainStatsTab`, `StaffPaymentsTab`,
   `StaffMaintenanceTab`, `StaffMediaTab`. `StaffProjectsTab` și
   `StaffSubscriptionsTab` conțin de asemenea cod legacy; verificat reachability înainte de eliminare.
3. Finalizarea domeniului financiar: validați toate mutațiile atomic, separați
   cashflow/venit facturat, normalizați bugete/categorii/analytics multivalută,
   expuneți câmpurile lipsă și treceți întreaga Definition of Done.
4. Un singur strat pentru taskuri/termene/cereri/livrabile și evenimente; Centrele
   sunt views peste acesta, nu baze de date noi pentru fiecare card.
5. Conectori reali, scope-uri minime, licențe, contracte webhook/replay și teste
   sandbox. Aprobarea unui deploy nu autorizează campanii/publicări/plăți reale.
6. Newsletter, comentarii, programări, rapoarte, compliance și experimente apoi,
   reutilizând tenant/RBAC/audit/documents existente.

## Verificare și recuperare

- TypeScript aplicație/Worker, ESLint și audit D1 local: trecute.
- Build static, Pages, Worker standalone, API și email dry-run: trecute.
- Playwright: **37/37**, inclusiv ordinea priorităților, căutare/navigare centre,
  dashboard română desktop/mobil, financiar, Engine, CRM, auth și pagini publice.
  Prima încercare a fost blocată de sandbox (`listen EPERM`); reluarea autorizată
  cu server local a trecut. Niciun test E2E nu activează integrare plătită.
- Unit/integration: **165/165** în rularea cu artefactul Pages prezent;
  buildul static singur omite intenționat testul artefactului Pages.
- Screenshot desktop inspectat vizual, cu fixtures (nu activitate reală).
- Punct de rollback anterior release-ului: Worker
  `976b02ba-d884-4597-b05e-20b7023a60bf`.

Testele noi execută routerul Hono pe SQLite cu toate migrările 0001–0019 și
tranzacții batch; includ eroare DB injectată, rollback, duplicate, expirare,
permisiuni, numărători, FX și fus orar. Nu sunt echivalente cu un test complet
Cloudflare runtime sau cu CRUD pe producție. E2E UI folosesc fixtures/mocks.

Release-ul nu modifică schema remote și nu necesită restaurare de date pentru
rollback. Se revine la versiunea Worker precedentă dacă smoke testele eșuează.
Backup/restore D1/R2: procedura din `FINANCIAL_MODULE.md`; un runbook nu dovedește
că un backup periodic sau un test de restaurare a fost executat.
