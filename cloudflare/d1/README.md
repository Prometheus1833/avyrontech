# Cloudflare D1 — Date business

D1 (SQLite distribuit) stochează **toate** datele care au listări, relații,
filtrări sau căutări: clienți, proiecte, facturi, plăți, lead-uri, tickete etc.

> Status: 🟢 **Activ pentru API-ul Cloudflare**. Producția și preview-ul au baze
> distincte; migrațiile de preview se aplică înaintea versiunii de branch, iar
> producția rămâne un pas separat, cu backup și aprobare explicită.

## Activare

```bash
# 1. Creează baza
npx wrangler d1 create avyron-db

# 2. Pune `database_id` returnat în wrangler.jsonc

# 3. Aplică migrațiile
npx wrangler d1 migrations apply avyron-db --local    # dev
npx wrangler d1 migrations apply DB --config wrangler.jsonc --env preview --remote # preview
npx wrangler d1 migrations apply DB --config wrangler.jsonc --env= --remote         # producție

# 4. Verificare
npx wrangler d1 execute avyron-db --remote \
  --command "SELECT name FROM sqlite_master WHERE type='table';"
```

În Workers/Pages: binding-ul este `env.DB`.

## Tabele (vezi `migrations/`)

| Tabel              | Rol                                          |
|--------------------|----------------------------------------------|
| `clients`          | Clienți Avyron (companie, contact, status)   |
| `projects`         | Proiecte per client (domeniu, status)        |
| `services`         | Servicii per proiect (preț, ciclu facturare) |
| `subscriptions`    | Abonamente recurente (next_billing_date)     |
| `invoices`         | Facturi (status, due_date, amount)           |
| `payments`         | Plăți încasate (provider, paid_at)           |
| `leads`            | Contact / demo / request example             |
| `support_tickets`  | Tickete suport per client+proiect            |
| `website_content`  | CMS per-proiect pentru clienții cu admin     |
| `users` / `profiles` | Identitate, profil și autentificare Cloudflare |
| `user_roles`       | Roluri `user`, `staff`, `admin`              |
| `promotions`       | Coduri, procente, perioade, limite și domeniu de aplicare |
| `commerce_orders`  | Comenzi recalculate, bază eligibilă și total validate de Worker |
| `promotion_redemptions` | Utilizări promoționale auditabile       |
| `blog_posts`       | Articole RO/EN, SEO, social și stare editorială |
| `blog_post_revisions` | Istoric înaintea fiecărei editări de articol |
| `organizations` / `organization_memberships` | Tenanturi și RBAC contextual |
| `organization_invitations` | Invitații one-time stocate hash-uit |
| `platform_principals` / `user_capabilities` | Control platformă și excepții auditate |
| `security_events` | Audit de securitate append-only |
| `idempotency_keys` / `outbox_events` | Retry sigur și livrare durabilă |
| `ai_agent_versions` / `ai_tools` | Configurații versionate și registry de tool-uri |
| `ai_runs` / `ai_run_steps` / `ai_approvals` | Trasabilitate și aprobări AI |
| `ai_budgets` / `ai_kill_switches` | Limite și oprire operațională AI |
| `knowledge_sources` / `knowledge_documents` / `knowledge_chunks` | Knowledge cu proveniență și aprobare |
| `knowledge_claims` / `knowledge_sync_runs` | Fapte versionabile și sincronizări durabile |
| `source_connections` | Registry de conectori; numai referințe la secrete |
| `lead_assignments` / `lead_activities` / `lead_reminders` | CRM și istoric operațional Leads |
| `lead_candidates` | Propuneri ale agentului, fără outreach automat |
| `ai_projects` / `ai_project_members` | Portofoliu AI separat și acces explicit per utilizator |
| `ai_project_channels` / `ai_project_agents` | Conexiuni sociale verificate și agenți atribuiți per proiect |
| `ai_project_strategy_versions` / `ai_project_memories` | Strategie versionabilă și memorie rezumată, cu expirare |
| `ai_content_items` / `ai_project_events` | Ciorne, aprobări, retenție și audit pentru AI AVY Prod |
| `financial_expenses` / `financial_revenues` | Costuri și venituri în unități minore, cu FX păstrat |
| `financial_accounts` / `financial_payment_methods` | Conturi și metode strict mascate |
| `financial_budgets` / `financial_provider_quotas` / `financial_agent_provider_policies` | Bugete, free tiers, praguri și permisiuni per agent/provider |
| `financial_usage_events` / `financial_alerts` | AI Cost Guard și alerte operaționale |
| `financial_documents` / `financial_audit_events` | Referințe R2 private și audit append-only |
| `engine_sources` / `engine_capabilities` | Catalog AVY Engine și capabilități evaluate |
| `engine_connectors` / `engine_resource_bindings` | Conectori inerți și distribuție aprobată |
| `engine_documents` / `engine_suggestions` | Documente R2 private și sugestii cu human approval |
| `engine_discovery_policies` / `engine_discovery_runs` | Descoperire periodică bugetată și trasabilă |
| `engine_audit_events` | Audit AVY Engine append-only |

## Audit local reproductibil

```bash
npm run audit:d1
```

Comanda recreează o bază temporară, aplică toate migrațiile în ordine și
verifică integritatea, cheile externe, timestampurile AI și relațiile critice.
Nu accesează D1 remote.

## Convenții

- Migrațiile sunt **append-only**. Nu rescrie o migrație aplicată.
- Numerotare: `NNNN_descriere.sql`.
- ID-uri ca `TEXT` (UUID generat în Worker cu `crypto.randomUUID()`).
- `created_at` / `updated_at` ca `INTEGER` (epoch ms).
- JSON stocat ca `TEXT` (SQLite n-are `jsonb`).
- Indexuri pe coloanele folosite în `WHERE` / `ORDER BY` / `JOIN`.
- Articolele publice sunt citite fără autentificare; ciornele și operațiile de
  scriere trec prin Worker și cer rol `staff`/`admin`.

## Pattern Worker

```ts
// listare clienți cu filtru
const { results } = await env.DB
  .prepare("SELECT id, company_name, status FROM clients WHERE status = ? ORDER BY created_at DESC LIMIT 50")
  .bind("active")
  .all<{ id: string; company_name: string; status: string }>();
```

## Backup

```bash
npx wrangler d1 export avyron-db --remote --output=backup-$(date +%F).sql
```
