# Website prin abonament

## Scope and audit

Prepared from `origin/main` at `7322cf40e09e20b8b6b22a0f18090df574f9f15e` on the dedicated task branch. The live D1 catalog was inspected read-only: `premium-website` exists; no approved monthly Start/Business/Premium prices were present. No production rows, provider products, credentials, DNS records, plans or deployments were changed during implementation.

The homepage website chooser contains three square cards in one desktop row and a horizontally scrollable row on small screens. Classic website development remains available; Cinematic 3D remains coming soon; the third card opens Website prin abonament. The general `/servicii` directory is deliberately unchanged, following the user's more specific instruction. The main website page and Configurator provide complementary contextual links.

## Public surface

- RO `/servicii/website-prin-abonament`
- EN `/en/services/website-subscription`
- Benefits-first page, responsive CSS perspective scene, business concepts explicitly labelled as concepts, three configurable plans, client workspace preview, FAQ, three-step brief.
- Real `PortfolioCarousel`, the `premium-website` configuration, assets and publication policy are shared with the main website page. Both new routes resolve to the same carousel key in the edge HTML rewriter, so hidden/unpublished examples are not resurrected by prerendering.
- Canonical, localized alternates, Service/FAQ structured data, distinct content-addressed social covers, prerendering, sitemap and llms generation use existing registries. No Offer price is invented. Technical crawlability is not a guarantee of search-engine indexing or traffic.
- No WebGL dependency or new image-generation expense. The concept artwork uses resolution-independent CSS; the portfolio uses existing AVYRON project images. No claim of new 4K/8K photographic masters.
- Progress and idempotency key survive reloads within the browser session; consent is not preselected or persisted. The brief does not create an account, take payment or activate a subscription.

## Native entities and storage

Migration `0111_website_subscriptions.sql` extends the current D1 database. Number 0110 is reserved for the independent security PR #122; it is not included here. No R2 bucket, queue, external server, auth system, CRM or payment processor is added.

The three catalog identities are `website-sub-start`, `website-sub-business`, `website-sub-premium`, with SKUs `AVY-WEB-SUB-START`, `AVY-WEB-SUB-BUSINESS`, `AVY-WEB-SUB-PREMIUM`. Initial prices are NULL, fiscal status unverified and payment unavailable. Zero applies to development only, never to monthly service or the client's domain.

The `website_subscription_*` tables retain plan revisions, brief-to-lead associations, project configuration, electronic acceptances, exact native-order/project/buyer associations, verified paid periods, change classifications and immutable consumption. Native leads, clients, projects, services, subscriptions, users, project_staff, client_account_access, project_work_items, project_proposals, project_updates, operation_notifications, financial_revenues and security_events remain the authoritative operational records. Billing details reuse `subscription_billing_settings`; the accepted beneficiary is frozen separately for historical invoicing.

Allocation creates a native project, one service and paused subscription, five onboarding/work items, optional verified existing client account access and native staff assignments, atomically. A future client can be created with minimal contact information and associated with an existing account later. Login creation/reset stays in the existing Clients/account workflow; no password is invented, emailed or logged by this module. A brief cannot be allocated twice, and repeated allocation keys cannot create duplicate projects.

Clients see the service in the existing Mentenanță/Abonamente account area only when assigned. The duplicate generic operational/provider subscription cards are filtered out for these SKUs. Document Center, project files, chat, work items, reports and AVYRON Studio continue to use the central project/service/subscription records and existing permissions.

## AVYRON OS and authorization

`/profil?tab=website-subscriptions` is under Activități Recurente, accessible to authorized maintenance staff. Owner/Super Admin manage plan versions and account/client/team allocation. Assigned staff work through native project ACLs; being an ordinary admin does not grant configuration access. Client billing/checkout belongs to the explicitly assigned primary payer; other authorized client representatives can follow the project and approve its current review.

The module supplies a searchable project register, plan filter, request allocation, versioned plan editor, project stage/domain controls, native task list, client approval, monthly change request/triage/consumption, subscription/terms/buyer view, provider portal, optional maintenance transition, and actual project statistics/links/activity. Search is server-side with a 200-row response bound and a visible refinement notice. Existing project tools manage files, preview/staging links, work assignment and delivery.

Backend routes are authenticated in the main Worker, use current native resource permissions and retain the global private no-store policy. Public plan data opts into 30-second caching and omits unpublished terms/prices. Public briefs use strict bounded validation, UUID idempotency keys, honeypot, existing Turnstile and IP/edge rate limits. Persisted links reject executable protocols. No private document is sent to an AI or a new provider.

- Public GET `.../plans`, POST `.../requests`
- Internal GET `.../internal/options`, PUT `.../internal/plans/:id`, POST `.../internal/allocate`
- Internal project PATCH `.../internal/projects/:id`, POST `.../:id/plan`, POST `.../:id/account`
- Account GET `.../account/projects`, GET `.../account/projects/:id`
- Account POST `.../account/projects/:id/changes`, PATCH `.../account/changes/:id`
- Account GET/PUT `.../account/projects/:id/billing`
- Account POST `.../account/projects/:id/checkout`, `.../:id/approve`, `.../:id/transition`

All prefixes above are `/api/website-subscriptions`. Existing root authentication, Origin/CSRF/CORS and rate controls still apply. MFA is not activated by this work.

## Payment, tax and lifecycle

The initial three plans are unpriced RON plans. Native service/operational subscription amounts are RON, so this first release does not silently treat EUR as RON. Owner must configure price, reviewed tax treatment, sufficient terms, cancellation conditions and email policy before publishing a plan revision. The existing Stripe key must resolve to the configured AVYRON account with charges enabled. Catalog price/currency/tax drift invalidates review for new allocations. Refreshing an unaccepted allocation is explicit; accepted snapshots never change when the master plan is edited.

Checkout reuses the existing native order engine and Stripe monthly Checkout. The new SKU cannot be paid through an unrelated generic cart order without project allocation, buyer identity and explicit versioned acceptance. Each acceptance freezes terms/hash/version/timestamp and the project's beneficiary details. Multiple companies represented by the same login cannot share a buyer snapshot implicitly. Initial and renewal revenues/invoices carry the exact client/project association.

Signed Stripe webhooks are the immediate source of payment evidence. Initial payment is verified against the checkout's specific paid invoice, not a potentially newer `latest_invoice`. Monthly periods must match the accepted amount/currency and a full provider billing cycle, including month-end anchors; they cannot overlap or be overwritten. Current provider status is fetched to prevent an old event reactivating a cancelled subscription. Content quota applies only to reviewed content changes completed in a paid active period; defects and security work consume zero. Reopening/completing a change again cannot spend or restore units twice.

The existing `billing_reconcile` job also checks at most two website projects and three paid invoices per project per run. A persisted cursor walks invoice history and resets after the last page. It verifies provider objects and native associations before repairing missed checkout/renewal effects; invoices and fulfillment are idempotent. Provider/ledger mismatches log a fixed safe code and preserve the cursor for review/retry. No new scheduler is installed. Cancellation/renewal stays in the existing verified Stripe customer portal; operational billing controls cannot manually activate or move the due date for these provider-managed subscriptions.

After 12 verified paid monthly periods, the native project notification offers an optional transition. A client request adds one deduplicated project activity item; no product, price, payment mandate, minimum term or penalty changes automatically. The staff prepares a separately approved maintenance allocation through the existing workflow.

The accepted item's native invoice provider is reused. Initial seeds use manual invoicing; enabling Oblio requires the existing approved company/series/tax/provider configuration and appropriate catalog selection before allocation/acceptance. Native invoice retry handles provider failures. No live charge, cancellation, invoice issue or email delivery was executed as a test.

## External capabilities and remaining configuration

- Existing Workers/D1, API, notification triggers, queue job, billing and project infrastructure are reused; no extra binding or subscription.
- Domain/subdomain, hosting, DNS, SSL, backups, email and publication use the existing project delivery infrastructure. A lead or checkout does not provision them automatically. The operator connects/verifies the actual project resources before launch. The main domain comes from the client.
- Address counts 1/2/3 are provisioning targets. Hosted inbox availability and cost require domain/provider validation; Cloudflare Email Routing is not misrepresented as free hosted mailboxes.
- Monitoring shows existing native project reports when present. SSL/DNS/backups/uptime without reports remain unverified; no 24/7 monitoring is invented. Existing project links can point to logs/hosting consoles with their own access control.
- Social buttons/links are distinct from optional authenticated APIs. Existing e-mail/WhatsApp/chat integrations and agent approvals retain their current configuration; the module does not send external messages automatically.
- Real account allocation requires the client's authorized existing account and team choices. No arbitrary production account was created or assigned.
- Tariffs, legal review, billing-provider capability, DNS/mailbox provisioning and live provider transaction validation remain release/activation prerequisites.

## Release and rollback

1. Review the task PR and reconcile latest main, especially independent PR #122; preserve Cabinet project PR #110.
2. Export a D1 backup using the established release workflow. Test/apply migration 0111 in an isolated preview D1 before production. No destructive down migration.
3. Validate API and static/Pages/standalone Worker builds, migrations, unit/runtime tests, web/mobile/keyboard/contrast checks and SEO output for the exact release commit.
4. Release API with schema, then frontend using the existing approved production workflow. This task does not authorize a production deployment on its own.
5. Initially accept briefs and unpriced allocations. Configure/approve tariffs, tax/terms and existing invoice/Stripe settings; perform an authorized real provider verification before enabling paid subscriptions. Check client-account isolation and one end-to-end project in production.
6. Before paid activation, the old UI can be restored while retaining additive schema. After payments exist, retain the new billing handlers and acceptance/period data; revert only the public/UI surface or roll forward a fix. Do not deploy an older billing implementation that cannot preserve website buyer/order identity. Disable new plan sales in the catalog during incident response; keep existing paid subscription webhooks and reconciliation alive.

Local validation evidence is recorded in the task PR. Provider mocks prove application behavior, not production credentials, deliverability, paid transactions or search-engine indexing.

## Local evidence (2026-11-08)

- Application/Worker type checks, lint (four existing React Refresh warnings), all-migration integrity/FK audit: passed.
- Static/Pages and standalone site Worker builds with SEO audit: passed; API Worker dry-run and binding-type check: passed. No deploy command without `--dry-run` was used.
- 37 targeted billing/subscription tests; 70 website/operations tests after contextual catalog correction; 77 website/catalog/native-project/workspace/overview tests after registry/fixture updates; final 15 website runtime tests including immediate client revocation through both the module and native project API: passed.
- 22 social-preview/dashboard source checks: passed. Source checks were updated for the Radix dialog and additional internal plan identities. A pre-existing template-withdrawal fixture now selects a current shared review version, matching the endpoint policy instead of choosing an arbitrary historical revision.
- Chromium public layouts at 320/390/768/1440, three-square chooser desktop/mobile, keyboard focus return, public brief persistence/retry, and staff configuration desktop/mobile: passed. RO/EN metadata and automated WCAG A/AA contrast/semantics check: passed. Browser evidence uses synthetic API/challenge/provider fixtures, never real charges or client records.
- The broad initial run exercised 127 files (1,124 tests including one opt-in skip). Its seven failures were in six affected files; catalog selection, old registry assumptions, the dialog assertion, the social-cover identifier and the template fixture were corrected and all six files passed targeted reruns. The PR CI must validate the complete final revision before merge.

Official protocol references checked: [Stripe invoices and pagination](https://docs.stripe.com/api/invoices/list), [Checkout session invoice identity](https://docs.stripe.com/api/checkout/sessions/object), [subscription billing-period fields](https://docs.stripe.com/api/subscriptions/object). Local provider fixtures cover both legacy subscription links and current invoice parent/item-period shapes.
