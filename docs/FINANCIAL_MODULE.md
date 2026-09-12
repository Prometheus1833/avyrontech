# AVYRON OS — modul financiar intern

Status: implementat local, Cloudflare-only. Migrarea `0018` nu a fost aplicată
în preview sau producție. Datele și indicatorii sunt estimări de management,
nu evidență contabilă fiscală.

## Arhitectură

- UI privată: `/finance`, încărcată lazy și reutilizată în tabul Financiar din
  `/profil`. Overview-ul arată numai KPI-urile esențiale; listele și detaliile
  se deschid progresiv, inclusiv drawer-ul unei cheltuieli. Super Admin poate
  crea venituri, conturi, metode mascate și bugete, configura quotas, gestiona
  alerte și atașa/descărca documente private.
- API Worker: `/api/finance/*`, cu autentificare, autorizare server-side,
  validare strictă, rate limit, MFA pentru mutații, query-uri parametrizate,
  idempotency și audit append-only.
- D1: sursa canonică pentru metadata, relații, sume, bugete, quotas, alerte și
  istoric. Sumele sunt întregi în unități minore; cursul este păstrat separat în
  milionimi, iar suma originală nu este suprascrisă.
- R2: documentele financiare; D1 stochează cheia obiectului, hash-ul, versiunea,
  metadata și autorizarea. Nu se creează URL-uri publice permanente.
- KV/cache: potrivit numai pentru agregate regenerabile, niciodată ca sursă de
  adevăr financiară. În această etapă agregatele sunt calculate din D1.

## Model D1

Migrarea append-only `cloudflare/d1/migrations/0018_financial_control_plane.sql`
adaugă:

| Tabel | Rol |
| --- | --- |
| `financial_vendors` | furnizori și categorii configurabile |
| `financial_expenses` | cheltuieli, abonamente, trial/free, FX și scadențe |
| `financial_expense_allocations` | cost general, per proiect/client/agent |
| `financial_revenues` | venituri, facturi și referințe de plată |
| `financial_accounts` | conturi mascate, sold opțional din sursă autorizată |
| `financial_payment_methods` | exclusiv alias, provider, last4 și metadata permisă |
| `financial_budgets` | limite generale și per categorie/client/proiect/agent |
| `financial_provider_quotas` | free tiers, praguri, reset și hard stop |
| `financial_agent_provider_policies` | provideri aprobați și plafoane per agent |
| `financial_usage_events` | deciziile AI Cost Guard și costurile estimate/reale |
| `financial_performance_metrics` | leads, ads, usage și venit atribuit per perioadă |
| `financial_billing_records` | billing history fără rescriere retroactivă |
| `financial_price_history` | versiuni de preț |
| `financial_alerts` | info/notice/warning/critical |
| `financial_documents` | referințe R2 private, hash și versiune |
| `financial_provider_connections` | registry conectori fără tokenuri |
| `financial_audit_events` | istoric append-only fără secrete |

Constrângerile și indexurile previn valori negative, relații orfane, facturi
duplicate cunoscute și stocarea unor stări invalide. Ștergerea unei cheltuieli
este arhivare, nu `DELETE` fizic.

Seed-urile sunt Necesit, Contabilitate, Meștero, Lovable, Claude Subscription,
Claude API, FGO și Google Ads, plus contul conceptual Revolut Business AVYRON
RON. Toate sumele/datele necunoscute sunt `NULL`, iar starea este
`needs_configuration`.

## API

- `GET /api/finance/overview?from=&to=` — KPI și următoarea plată.
- `GET /api/finance/config` — furnizori/proiecte/clienți pentru selectoare.
- `GET|POST /api/finance/expenses` — listare paginată/filtrată și creare.
- `GET|PATCH|DELETE /api/finance/expenses/:id` — detail, editare și arhivare.
- `GET|POST /api/finance/revenues` și `PATCH|DELETE .../:id` — venituri și
  arhivare sigură.
- `GET|POST /api/finance/accounts` — conturi; fără IBAN complet.
- `POST /api/finance/payment-methods` — card/metodă strict mascată.
- `GET|POST /api/finance/budgets` — bugete și quotas.
- `PATCH /api/finance/quotas/:id` și
  `PUT /api/finance/agent-policies/:agent/:provider` — limite și permisiuni
  server-side pentru agenți.
- `POST /api/finance/cost-guard/evaluate` — evaluare FREE FIRST idempotentă.
- `GET /api/finance/alerts` și `GET /api/finance/audit`.
- `GET /api/finance/analytics` — categorii, costuri recurente, proiecții și
  marje estimative per client/proiect.
- `POST /api/finance/alerts/scan` și `PATCH /api/finance/alerts/:id` — reguli
  deterministe și workflow de acknowledge/resolve.
- `POST /api/finance/documents`, `GET .../:id/content`, `DELETE .../:id` —
  upload validat, download privat ca attachment și arhivare sigură.
- `GET /api/finance/export?resource=&format=` — CSV protejat de formula
  injection sau JSON, exclusiv după step-up MFA și audit.

Listele de istoric sunt limitate. Filtrele de listă rulează server-side și
escape-uiesc wildcardurile. Operațiile de creare folosesc `Idempotency-Key`;
facturile au și chei unice D1.

## Permisiuni și securitate

Permisiunile granulare reutilizează `user_capabilities`:

- `finance.read`
- `finance.write`
- `finance.accounts.read`
- `finance.documents.read`
- `finance.settings`
- `finance.budget.approve`
- `finance.integrations.manage`
- `finance.audit.read`

`platform_owner` are control total. Un `superadmin` non-owner și un admin pot
citi, dar scrierile/configurarea cer capabilitatea explicită. În UI secțiunea
rămâne superadmin; API-ul este autoritatea reală. Orice mutație cere o sesiune
MFA verificată. Răspunsurile sunt private/no-store, au politici CSP/header la
nivelul Workerului și nu conțin date complete de card sau secrete.

Endpointul metodelor de plată respinge explicit câmpuri precum număr complet,
CVV/CVC, PIN, parolă, token sau secret. Logurile/auditul includ numai alias și
last4. Uploadurile financiare folosesc validarea de tip, dimensiune și semnătură
de fișier plus autorizarea R2; descărcarea primește un răspuns autentificat,
`no-store`, nu un URL public.

## AI Cost Guard

Fluxul obligatoriu este:

`Agent → Budget Guard → Provider Quota → Execute`

Guardul verifică permisiunea agentului, starea providerului, free allowance,
unitățile cerute, costul estimat, bugetul rămas, limita per request și hard
stop-ul. Rezultatul este unul dintre `allowed`, `approval_required`,
`waiting_for_budget_approval` sau `blocked` și este păstrat idempotent în
`financial_usage_events`.

Fallbackul pentru limită epuizată rămâne: provider gratuit deja aprobat,
execuție locală disponibilă, cache, queue/delay, batch sau context redus. Guardul
nu cumpără credite, nu face upgrade și nu modifică bugete. Integrarea fiecărui
agent existent cu Workers AI trece obligatoriu prin guard; politicile pornesc
`needs_configuration`, iar apelul de model este blocat sau trimis în fallback
până la configurarea planului, limitei și bugetului real.

## Adapters și integrări

`FinancialProviderAdapter` definește `fetchTransactions`, `fetchInvoices`,
`fetchUsage`, `fetchSubscription`, `fetchBalance` și `sync`. Registry-ul este
pregătit pentru Revolut Business, FGO, Stripe, NETOPIA, Google/Meta Ads,
OpenAI, Anthropic, Cloudflare, Supabase, Resend, GitHub și Lovable.

Niciun adapter nu este conectat și niciun API extern nu a fost apelat. Tokenul
viitor este secret Cloudflare; D1 păstrează doar numele bindingului și starea.
Webhookurile viitoare trebuie să verifice semnătura, timestampul, replay-ul și
idempotency înainte de procesare.

## Backup, restore și migrare

Înaintea unei aplicări remote:

1. export D1 în locație controlată și inventariază R2;
2. aplică migrarea întâi în preview, fără a o edita după aplicare;
3. rulează `npm run audit:d1` și smoke tests `/api/finance/*`;
4. validează numărul de rânduri, foreign keys și seed-urile cu valori nule;
5. în producție aplică numai după aprobare explicită și o nouă salvare;
6. rollback-ul aplicației folosește versiunea Worker anterioară; datele noi sunt
   additive și pot rămâne nefolosite. Nu se șterg tabele ca rollback automat.

Documentele R2 au versionare și hash. Restaurarea trebuie să refacă întâi D1,
apoi obiectele R2 cu aceleași chei, într-un mediu izolat, înainte de cutover.

## Configurare manuală obligatorie

Administratorul trebuie să introducă valori reale pentru costuri, monede, curs,
date de facturare, trial/free, limite, bugete, cont/card last4, alocări și
referințe de document. Conectorii rămân `not_connected` până la OAuth/API și
secret binding aprobate. Nu se deduce niciun preț din pagini publice.

## Limitări curente

- graficele și proiecțiile afișează stare goală până există istoric suficient;
- detectarea anomaliilor este deterministă, nu ML, și nu blochează tranzacții;
- nu există reconciliere bancară, sync automat, webhook activ sau plăți în
  această etapă; exportul este API-ready, iar documentele sunt funcționale prin
  UI/API local, fără linkuri publice;
- un adapter real necesită threat model, sandbox/provider mock, replay tests și
  aprobare separată înainte de activare.
