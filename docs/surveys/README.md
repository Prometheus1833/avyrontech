# AVYRON Smart Surveys

Smart Surveys collects discovery, onboarding and project materials through a private adaptive interview. It is independent of the configurator.

## Surfaces and product coverage

- `https://surveys.avyron.ro/`: indexable, prerendered public landing, with professional website discovery first and direct phone, WhatsApp and email contacts.
- `/s/{token}`: private, no-store/noindex interview. No marketing analytics, chat widget or token in the sitemap.
- `/auth` on the survey host: existing AVYRON login and MFA, for explicitly account-bound surveys only.
- AVYRON OS `/intern/surveys` and the Smart Surveys operational center: templates, questions/rules, campaigns, responses, private files, reviewed briefs, analytics and settings.

Initial templates map to the existing catalog: professional website, ecommerce, professional blog, web/mobile application, AI agent, SEO, branding/social identity, QA and website/software audit. Onboarding, content collection, feedback and maintenance/subscriptions support the delivery lifecycle. Thirteen templates are seeded. They are editable, versioned database content; published API summaries drive the landing, including subsequently created templates. Seed summaries also provide prerendered fallback content.

## Architecture

`src/shared/surveys/engine.ts` is the shared deterministic schema, conditional rule evaluator, answer validator, completeness calculator and structured brief builder. `src/pages/surveys` supplies the React UI. Hono routes under `cloudflare/workers/api/src/surveys` use the existing auth, staff center permissions, D1, private R2 bucket, AI runtime and financial guard.

Browser -> same-origin `/api/surveys` -> pinned template and response in D1 -> submission transaction -> structured brief + existing outbox + OS notification -> restricted email binding. AI interpretation runs separately through the existing 15-minute scheduled job, with leased outbox entries and at most three reserved attempts per brief. Email delivery never waits for model inference. Interrupted runs become auditable failures before a new cost reservation. AI interpretation is optional; staff approval creates or updates the canonical Documents Hub brief. Survey answers are never silently rewritten by AI.

Dependencies are the existing OS centers and Documents Hub migrations 0025/0026. Additive 0027 introduces the survey domain; 0028 seeds templates. No duplicate identities, CRM, document repository or email queue is introduced.

## Data model

- `survey_templates`: editable catalog record and current version pointer.
- `survey_versions`: immutable validated JSON definitions containing sections, questions and rules. Existing surveys retain their version ID.
- `surveys`: CRM/project/organization relations, status, context, campaign attribution, timestamps, expiry, retention and revision.
- `survey_sessions`: hashed random tokens, expiry/revocation, optional account or first-browser proof.
- `survey_responses`: answers JSON and optimistic revision, one response per survey.
- `survey_files`: metadata, randomized private storage key and lifecycle status. The parent survey supplies response/lead/client/project relations, avoiding stale duplicated IDs.
- `survey_briefs`: exact answer snapshot, separate AI draft, staff-approved text, comments, revision and canonical Hub document relation.
- `survey_events`: event names and question/section identifiers, without answer content.
- `survey_consents`: separate versioned acknowledgement history.
- `survey_campaigns`, `survey_settings`: reusable campaign links and retention/activation policies.

The existing `outbox_events` receives a lease column. Result delivery retries up to five times, then exposes a retry action in OS. Stable email Message-ID assists deduplication; email is at-least-once, not an exactly-once guarantee. Submission is idempotent by survey/response revision.

## Files and access

Use `avyron-files`, private randomized keys, and authenticated backend downloads. Neither R2 keys nor public signed bearer URLs are exposed. Each file is at most 10 MiB; each survey at most 20 files / 60 MiB. Extensions, MIME and practical magic signatures are checked. Office files are accepted as attachments, never executed or parsed. General ZIP and executable uploads are rejected. SVG is restrictive and download-only. Raster previews use authenticated blob reads. A malware scanner interface is reserved, with no claim that a scanner is deployed.

Removing a file from an answer detaches it. The administrative file inventory retains it under the survey retention policy; the backend supports explicit deletion after detachment. Replacing a single-file answer follows the same rule. Retention cleanup deletes R2 objects and survey records; approved Hub documents retain their separate project retention policy.

## Security and privacy

Tokens contain 256 bits of entropy and only SHA-256 hashes are stored. Public creation uses Turnstile and rate limits; an unguessable request UUID with server HMAC permits recovery after a lost start response. Standard token links support cross-device resume. One-time links bind first use to an HttpOnly/Secure/SameSite cookie for 24 hours; use ordinary resume links for multi-day collaboration. Account-bound links require the assigned AVYRON user.

Write validation runs server-side. Hidden branch answers are removed before saving; foreign survey files cannot be attached. Autosave uses revision comparison, server-backed state and a seven-day local fallback for unsent changes. Conflicts require an explicit choice, rather than silently overwriting another device.

Staff need both center permissions and access to the parent project, organization, client or lead. New surveys do not inherit broad legacy project visibility. Settings/deletion require the platform owner. Template management uses existing administrative roles. Third-party marketing analytics are disabled across the survey subdomain, including auth transitions; campaign attribution and survey metrics stay first-party. Individual page/API responses are no-store; private URLs are excluded from analytics and sitemap. Cloudflare invocation logs are disabled to avoid persisting bearer-token paths there. Existing exception and operational logs remain available.

## Templates and field extensions

Open OS -> Smart Surveys -> Template-uri. Create or duplicate a template, edit sections/questions/help text/options, set required/importance, and use the advanced question JSON for dependencies, ranges, repeats or matrices. Preview evaluates the same deterministic engine. Publish creates a new immutable version; deactivate removes a template from new public creation.

Rules: SHOW IF, HIDE IF, REQUIRE IF, SKIP IF, RECOMMEND IF, REPEAT, BRANCH, DEPENDS ON. Conditions reference question IDs and are validated for missing references/cycles. Repeated answer IDs use `base__index`. Branch targets are section IDs.

A new field type requires the shared enum/schema and server answer validator, a renderer in `QuestionField.tsx`, and meaningful branching/validation tests. Image selection supports optional `imageUrls` keyed by the option label, restricted to AVYRON public `/assets/` images; otherwise visual style swatches are rendered. File fields share upload validation and quotas.

## CRM and operations

Create a survey from an approved template and optionally a lead/client/project. The backend checks access and prefills known business/contact details. Known answers are skipped in the interview but remain reviewable. No public submission creates an unsolicited lead. Lead and project details display a compact survey summary; complete responses stay in Smart Surveys. Client relationships are accessible from the source selector and API filter.

When the existing CRM sets `leads.converted_project_id`, a D1 trigger links the existing surveys and approved brief documents to that project/client. No survey is duplicated. Manual relinking also validates every explicitly supplied parent. Copy, open, email draft and WhatsApp handoff use the actual private URL. These handoffs do not pretend to be automated third-party messaging connectors.

Follow-up selects needed questions and increments the response revision, keeping the historical brief snapshot. Human review/approval is required before an AI interpretation becomes an approved project document.

Analytics show the latest 100 accessible surveys: created, sent, opened, started, completed, completion rate, elapsed completion duration and last-viewed unanswered journey positions. Durations include pauses. Drop-off counts incomplete surveys at their last viewed question; it is not proof that a visitor permanently abandoned.

## AI activation and cost boundaries

The `survey-brief` agent is registered but AI is disabled by default. Generation requires an approved agent version, no kill switch, explicit survey activation, configured provider quota and a bounded daily/monthly RON policy. Quota units are conservative application token estimates, not Cloudflare billing neurons. Never label a locally configured quota as the account's remaining free allowance.

The configured model is `@cf/meta/llama-3.1-8b-instruct-fp8`. The RON reservation uses the documented model rates, UTF-8 bytes plus prompt allowance for the input upper estimate, maximum output tokens, and uses ECB USD/RON cross rates with a 50% conversion/tax buffer, then rounds up to bani. Unsupported models or currencies fail closed. See [Cloudflare model pricing](https://developers.cloudflare.com/workers-ai/models/llama-3.1-8b-instruct-fp8/). Pricing must be reviewed if the model or provider price changes. Generation fails closed after 2026-10-22 until its pricing review is renewed. The user approved a 25 RON monthly survey budget; deployment configuration uses a 2.50 RON daily cap and a 0.20 RON per-request cap. The cap covers this agent, not unrelated account services.

The structured brief remains available when AI is disabled/denied. AI facts require source citations whose quotes match client answers; staff must still verify the interpretation. Smart text input only proposes text and requires the client's explicit acceptance. Uploaded files and contact email/phone are not fed into brief generation.

## Deployment and verification

Validate `npm run typecheck`, `npm run lint`, `npm test`, `npm run audit:d1`, `npm run build:pages`, `npm run build:worker`, `npm run build:api`, and Playwright. Build Pages again before releasing the combined Worker, because Worker builds use `dist/client`.

The normal release script records the D1 Time Travel bookmark, validates migration history, applies additive migrations, checks referential/integrity constraints and deploys. If D1 returns SQLITE_NOMEM for the global quick check, the release script checks every application table, including FTS shadow tables, in bounded batches. It does not skip an integrity failure or claim to check provider-owned metadata. Preserve the previous Worker version for rollback; do not roll back database migrations by dropping survey tables.

Cloudflare changes: survey custom domain on the existing Worker, allowed origin/Turnstile hostname, existing Turnstile widget allowlist, restricted `SURVEY_EMAIL` recipient `avyrontech@gmail.com`, and existing scheduled cleanup/outbox execution. No second R2 bucket or external marketing service is required.

## UI refinement handoff

The implemented direction is calm dark violet/blue glass, responsive CSS depth, reduced-motion support and a lightweight loading state that lasts only while fetching. It does not artificially delay the user; network latency cannot be guaranteed under two seconds. Claude can refine brand geometry, transitions, option illustrations and microcopy while preserving field contracts, direct-contact links, private-page analytics isolation, keyboard support and mobile overflow checks. No WebGL engine is needed.

## Concurrent-task handoff

This release is isolated in `codex/smart-surveys-2026-09-22`, based on `55df3b1` with the existing OS centers/Documents Hub commits. The separate mobile/marketing/backup worktree remains untouched. Its unpublished `0027_marketing_accounts_backups.sql` must be renumbered after 0028 when integrating these branches, before its first remote application; never rename migrations already applied remotely. The release script checks the actual migration history and stops on an incompatible sequence.

Browser tests use `PLAYWRIGHT_PORT=4187` for isolation; server reuse is opt-in. Prerender bundles are scoped by worktree path even when node_modules is shared.
