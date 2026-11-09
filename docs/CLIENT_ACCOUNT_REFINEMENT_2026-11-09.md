# Client account navigation and payments — 2026-11-09

Base: `7322cf40e09e20b8b6b22a0f18090df574f9f15e` (`origin/main`).

## User-facing behavior

- Mobile Services opens only the service catalog. Products opens the product catalog; My products keeps confirmed purchases and licensed resources separate. Both catalogs reuse native commerce/cart APIs and quoted prices.
- Avy Cont sits immediately after Avyron Web. Dashboard section tiles pair Home/Staff Support, Projects/Maintenance, My products/Services, My Documents/Payments. Cart remains in the mobile bar and desktop header; the notification bell remains. Neither duplicates a dashboard section tile.
- `Documentele Mele` is the client label only. Authorized listing, preview, share, download, and server access checks are preserved. The local search/sort toolbar is removed; authorized global search remains.
- Maintenance/Subscriptions defaults to the subscription list without general payments/activity shortcuts. Existing activity deep links and collaboration access remain usable.
- Payments/History shows saved masked methods first, confirmed chronological payments below, pending payable orders when present, and optional invoice details. No search/status filters. Legacy orders/invoices links resolve to the unified page, preserving explicit order/payment return context.
- Billing details are collapsed. Card entry uses native hosted Stripe setup; AVYRON never accepts PAN/CVV. Busy guards and recoverable errors protect retry actions. Only verified HTTPS Stripe checkout/portal destinations are accepted. Provider availability still comes from the existing API.

The client avatar menu follows this order: `Profil`, `Servicii`, `Mentenanță / Abonamente`, `Plăți și Facturi`, `Produse Development`, `Documentele Mele`, `Creează Logo`, `Coș`, `Suport Staff`. Settings and authorized collaborations remain available below the primary entries. The Development purchase-history heading is `Produse Development`; payment confirmation and license checks remain unchanged. `Plăți și Facturi` opens the same unified payments/history page.

A separate full-width `Blogul Avyron` card links to the public blog immediately before sign-out, in both the avatar menu and the mobile More sheet. The existing Artifact Library link is retained separately.

## API and authorization

New read-only `GET /api/workspace/payments?limit=50&offset=0` uses the existing authentication, private/no-store middleware, page bounds, D1, and account access grants. No migration or new store.

History reads actual `financial_receipts`, historical fully paid revenue balances, confirmed paid checkout sessions, and legacy paid orders. Exact existing provider/order fulfillment links suppress duplicate order/receipt representations. Receipt dates are payment dates; historical/provider update timestamps are explicitly labeled confirmation dates. Financial records require current entity access; account-owned paid orders stay scoped to their actual purchaser. No provider session IDs, raw references, or internal notes are returned.

Invoice PDFs reuse the protected workspace endpoint and recheck access. Provider-hosted allowlisted Oblio invoices open separately with no AVYRON Authorization header or referrer. A missing order link never matches an unrelated invoice.

The shared billing-account request cache lives only inside the mounted page, keyed by authenticated user; it is not a global or persistent financial cache. Save/refresh invalidate it.

## Verification and external effects

Local validation passed: application and Worker type checks; ESLint with zero errors and four existing Fast Refresh warnings; 113 distinct API/unit regression tests across seven files; 77 distinct Chromium and 12 WebKit browser scenarios (targeted suites plus the final focused order-retry case); Pages/static and standalone Worker builds; API dry-run; full local D1 schema audit. Browser checks include 320/390/1440px account layouts, catalog/cart separation, account isolation, keyboard card-setup retry, private invoice download, external invoice headers, accessibility checks and unchanged staff controls. Generated desktop/mobile screenshots were inspected locally. SEO audits passed as part of the builds. The avatar-menu follow-up also passed 23 targeted unit tests, 62 Chromium scenarios and five WebKit scenarios; the final icon/layout adjustment was rechecked in ten Chromium/WebKit layout runs. Updated the existing product-category test to recognize the separate client product catalog while preserving its role checks. Browser fixtures are synthetic, including hosted Stripe setup, invoice files and payment history; they do not prove a live payment, provider configuration, or settlement. No real cards, payments, email, production D1 writes, new services, subscriptions, or secrets were used.

Scope excludes staff permissions, internal dashboard design, public logged-out design, law-firm files, and migrations on other task branches.

## Release and rollback

Deploy the API addition before the frontend that consumes it, after review and explicit release authorization. No schema changes are needed. Revert this task's frontend/API commit to restore the prior presentation; no data rollback is required. Run a separate signed-in production smoke test for actual account grants, invoices and configured provider availability after release. Do not perform a live card charge as part of that smoke test.
