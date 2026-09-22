# Mobile, marketing, accounts and backups — 2026-09-22

Local task branch: `codex/mobile-marketing-backups-2026-09-22`.
This extends the unpublished OS centers and Documents Hub work. Nothing in this task changes the existing GitHub remote, domains, D1/R2/KV identities, authentication endpoints, optional admin MFA policy, or production release authorization.

## Instructions for Codex, Claude and Lovable

- Read this file and `AGENTS.md` before editing these modules. Work on a dedicated branch. Do not run a Lovable agent or overwrite parallel GitHub changes. Fetch/compare main before an authorized push; preserve normal merge history.
- Use the existing Cloudflare API and `cfAuth`. Never create a parallel Supabase backend, login session store or credential store. Staff permissions are checked again on the server; hiding a button is not authorization.
- Migration `0030_marketing_accounts_backups.sql` is append-only after first release. The previously local-only 0027 marketing migration was renumbered during integration with the already published survey migrations. Deploying without the complete migration history breaks the new centers.
- Preserve the distinction between a draft, approval of an exact revision, and explicit external publication. Content edits clear approval. No agent may bypass Cost Guard, kill switches, identity checks or admin approval.
- Keep `os-backups/` private. Never include it in public media/file listings. No private API response, page HTML, token or user document may enter the service worker cache. Do not cache the dashboard offline.
- Do not automatically enable subscriptions, paid usage, backup schedules, account connections or publishing. No real social account was contacted or changed by implementation tests.

## Dashboard entry points

`/profil?tab=os-centers&center=marketing` — strategies, daily performance measurements, AI drafts, approval, publishing and unfollow suggestions.

`/profil?tab=os-centers&center=accounts` — owner-only account metadata, encrypted credentials and assisted device sessions.

`/profil?tab=os-centers&center=backup` — backup policies, executions, permanent baseline, inventory checks and controlled recovery.

Staff installation button is in the Profile header. Android Chromium supports the native installation prompt when eligible. Safari on iPhone/iPad uses Share → Add to Home Screen. Desktop Safari uses Add to Dock. These use the same backend and role permissions; a fresh login in the installed app can be necessary. An offline public screen explains connectivity; private changes are not queued. UI resumes refresh center data after foregrounding/reconnection. Update activation is explicit to avoid discarding edits.

## Connect accounts

1. Add an Avyron or Cutiuța Magică account in **Conturi & dispozitive**. Identity/provider/auth method cannot be changed in place.
2. API/OAuth tokens and passwords are entered only in the vault form. They are encrypted with AES-GCM and `MFA_ENCRYPTION_KEY`, using a unique KV reference. Tokens never return to the browser; password reveal requires a reason, audit entry and clears from the UI after 30 seconds or when hidden.
3. Verify API accounts. Instagram uses a professional account ID and a Facebook Login Graph token; Facebook uses the Page ID and Page token. Configure the API version supported by the approved Meta app (initial form v26.0). App Review/scopes and provider account eligibility remain prerequisites. Token acquisition/renewal occurs in the provider's official flow; this change does not implement OAuth consent callbacks.
4. Cloudflare verification checks the configured environment's D1 database using the entered Account ID and token. Scope the token to the target account/database with export/read permissions. Avoid global API keys. Preview binds its own D1 ID and Workflow name.
5. Password/passkey/device accounts open the official HTTPS login page. A web app cannot automatically reuse or control another native app's session. Assisted sessions last 8 hours, use an in-memory device token plus the authenticated owner session, heartbeat only while visible, and can be revoked. Tasks expire after 15 minutes. Operators execute and confirm tasks; autonomous screen control would require a separately installed and authorized native companion.

## Marketing execution

- Campaign currency and brand remain fixed. Set status `active` before publishing; paused/archived campaigns do not publish. Measurements accept one final entry per day with source evidence. CPC/CPL/CPA and ROAS are derived from recorded totals; zero denominators display no result. Ad spend is not imported automatically.
- AVY Marketing Studio uses Workers AI only after the existing financial policy/quota allows it. Configure the agent/provider policy and verified quota in the financial module. Model usage is atomically reserved and logged in `ai_runs`; no unlimited budget is seeded. Output is text plus a creative brief, not a generated video/image.
- Upload final visual assets through the existing media flow and enter a public HTTPS URL. Instagram feed accepts images; reels accept video; stories accept image/video subject to Meta account eligibility. Facebook adapter supports text and image Page posts. Facebook stories/reels, TikTok and unsupported native features use assisted device tasks; no unsupported format is falsely reported as published.
- Owner approval records the exact post revision. Publish/schedule is a separate explicit action. The existing quarter-hour cron processes at most 5 due/processing posts per run. Video processing can take longer. `remote_id` is provider evidence of success.
- Provider writes are claimed before execution. A timeout/missing response around an external write becomes `uncertain` and is never automatically retried. Verify the account directly and reconcile manually before authoring a replacement. Do not turn `uncertain` into `draft` in bulk.
- Unfollow analysis consumes official Instagram JSON exports (including split follower files), or plain usernames. It does not retrieve a complete follower graph from Graph API. Users must confirm complete lists for the correct account/date. Protected handles are excluded; the result is deterministic, alphabetic and capped at 50. Only counts, evidence, input hash and candidates are stored. No unfollow API call is implemented or executed.

## Backup operation

Cloudflare Workflow `AvyronBackupWorkflow`, binding `BACKUP_WORKFLOW`, production name `avyron-backup`, preview `avyron-backup-preview`. Existing private FILES bucket stores the prefix `os-backups/`; no new external storage service is introduced. Workflow availability and storage/operation quotas must be checked before release. Schedules are disabled by default; admin selects 6/12/24/168 hours.

D1 export is polled continuously and may pause D1 writes/reads briefly. Data SQL excludes active sessions, transient MFA challenges, device sessions/tasks and idempotency rows. Manifest contains application schema, virtual FTS definitions, table/index/trigger order metadata, selected R2 inventory and coverage. FTS shadow tables are excluded. Secrets from account/integration/asset vault KV references are copied as ciphertext. The master encryption key and other Worker secrets are **not** exportable via this binding and must be kept separately.

R2 copies use source ETags and immutable deduplicated keys. If a source changes before copying, the run fails instead of presenting a complete snapshot. D1 and R2 are not one atomic transaction; use a maintenance/quiescence window when business-level cross-resource consistency is required. Durable Object state, Git source, DNS, provider settings and Worker secrets require separate procedures. Same-account backup does not survive complete loss of that Cloudflare account.

The future baseline is created by selecting **copie de bază** on a manual run. It becomes protected only on successful completion. DB triggers prevent baseline deletion/unprotection and deletion of its object references. Retention preserves all baselines and at least the newest configured number of complete runs, deleting older expired runs and unreferenced blobs only. A unique active-run index and cleanup lease serialize copying versus garbage collection. Capacity checks include existing backup objects and a metadata reserve; a full store blocks new copies rather than silently discarding protected copies. An interrupted cleanup can resume after its lease expires (one hour).

Inventory verification checks presence and sizes, for up to 2,000 files in one request. It is not a cryptographic/full restore test. Larger inventories are checked via the manifest offline. Remote API/export/storage behavior and physical-device installation need staging/live acceptance after credentials are configured; mocked tests are not evidence of a production backup.

## Recovery procedure

1. Download data SQL and manifest from **Recuperare controlată**. Keep the current production state and get explicit authorization before a production restore.
2. Fetch the manifest's `credentialsKey` and `objects[].blob_key` from the private FILES bucket using authorized Wrangler/R2 access. Do not print decrypted values in logs. Keep the manifest and original master key separately.
3. Create isolated D1, R2 and KV resources. Apply schema entries of type `table` first (including virtual FTS declarations, excluding shadow tables), with deferred foreign keys for data import. Import data SQL. Then apply views, indexes and triggers. Rebuild `ai_knowledge_fts` and `hub_documents_fts` with their FTS5 `rebuild` command. Clear transient operation leases/queued jobs in the restored environment; do not allow schedules to resume from historical rows.
4. Restore each manifest object to its original `source_bucket`/`source_key`, preserving metadata. Restore encrypted credential KV values under the original references and configure the original encryption key securely. Keep other signing/API secrets under the environment's release policy and invalidate sessions.
5. Run login/RBAC/document/marketing checks with publishing and backup schedules disabled. Record environment, date and results in **Dovada testului în mediu izolat**.
6. Review and explicitly authorize any binding switch or production restore. There is intentionally no one-click overwrite of live production data.

## Official references

- [Meta Instagram API](https://www.postman.com/meta/instagram/documentation/6yqw8pt/instagram-api)
- [Meta Facebook API](https://www.postman.com/meta/facebook/documentation/r56bjfd/facebook-api)
- [D1 export API](https://developers.cloudflare.com/api/resources/d1/subresources/database/methods/export/)
- [Cloudflare Workflow D1 backup example](https://developers.cloudflare.com/workflows/examples/backup-d1/)
- [PWA installation](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable)

## Local validation completed

- 278 unit/API tests passed, including account access, encrypted secrets, post revision approvals, ambiguous provider writes, export comparisons, backup retention, baseline protection, multipart abort and inventory verification.
- 74 browser tests passed: public routes, auth/signup, all 29 centers, new forms, installation instructions, offline public cache, and OS navigation at 320, 390, 768, 1024, 1440 and landscape 844 px.
- Application/Worker type checks and ESLint passed.
- Static frontend + Pages, standalone site Worker and API Worker dry-run builds passed. Prerender bundles are isolated by checkout path to avoid collisions when worktrees share dependencies.
- Migration 0027 applied to the isolated local D1 database; schema audit passed. No remote migration, production deployment, social publication or live backup was executed.
- Browser emulation does not replace physical iOS/Android acceptance. Real Meta publishing and Cloudflare export/restore require the configured accounts and an explicitly authorized staging acceptance run.
