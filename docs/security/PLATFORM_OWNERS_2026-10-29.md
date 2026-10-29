# AVYRON platform owners — release handoff, 29 October 2026

This document concerns roles inside AVYRON OS. It does not grant repository ownership, Cloudflare account administration, or provider credentials. Administrative MFA remains deferred at the owner's request.

## Read-only baseline

- GitHub source: `Prometheus1833/avyrontech`, `origin/main` at `87d3fbb10c967f9c66e0625a7fed1ebb54880273` when this branch was created.
- Remote D1 `avyron-db` last applied migration: `0072_social_forms_surveys_store_content.sql` at inspection.
- Targeted D1 query showed the Prometheus account active, verified, with admin role and `platform_owner`; the AVYRON Tech account active, verified, with admin role and `superadmin`; no user account for Anisoara. No secret, password hash, user ID, or private record was read or recorded.
- Existing policy made Prometheus the sole platform owner. Promotion management also used a separate exact-email guard and UI gate.

## Reviewable change

Migration `0073_platform_owner_team.sql` designates the three identities specified by the owner as platform owners. It promotes an already existing, verified, enabled target account to admin if needed. It does not create a missing account, set or reset any password, change a suspended principal to active, or enable MFA. A D1 principal row alone grants no access: an enabled user, verified email, and admin role are also required on each privileged request.

The API now requires a verified email for platform authority, checks the owner role for promotion management, and prevents self-service email changes into or away from reserved platform identities. The admin-create endpoint and seed-token importer cannot create a preverified reserved identity. Both admin-role mutation routes reject promotion of an unverified reserved account or a grant by a delegated superadmin. An existing platform owner must grant the admin role to a newly registered and verified Anisoara account through the audited admin route. The legacy shared-password seed script is disabled.

## Release steps requiring separate approval

1. Review the PR and reconcile it with the latest `main`. The unrelated security PRs #66–#69 remain separate. Do not use `scripts/release-api.mjs` as a validation command: it can apply remote migrations and deploy.
2. Confirm that Anisoara controls the designated mailbox. She can use the normal AVYRON signup and verification flow. Until a verified account exists, her platform owner designation is inert. Do not provision a password in source control or share one across administrators.
3. For an approved D1 change, record a current D1 Time Travel bookmark, confirm the pending migration list contains only the reviewed `0073_platform_owner_team.sql`, then apply it with `wrangler d1 migrations apply avyron-db --remote`. This is a production mutation and must have explicit approval for this migration. Verify `PRAGMA foreign_key_check`, `PRAGMA integrity_check`, and the three active principal roles using targeted read-only queries. Do not print password hashes or unrelated users.
4. For an approved Worker and Pages release, deploy the reviewed commit through the normal release path. Check the live Worker version and Pages commit separately. A merged PR, preview, or green CI does not establish live authority.
5. Once Anisoara has completed email verification, a current `platform_owner` can grant her `admin` access through `PATCH /api/admin/users/:userId/roles` with `accessLevel: admin` and a unique idempotency key. The server rechecks verification and actor role. Obtain her user ID through the authorized admin UI; never infer it from an email string.
6. Have each of the three account owners sign in themselves. For each, verify `/api/auth/me` returns `platformRole: platform_owner`, `superadmin: true`, and an admin role; check read-only promotion and owner-only OS views. Exercise promotion writes and owner-only mutations with synthetic data in an authorized test environment, never as an active production probe. Verify an ordinary admin remains denied. Check audit events and revoke old sessions if an account or credential was suspected compromised.

Rollback is a separately approved, targeted principal change, followed by session revocation and live verification. Demote the AVYRON Tech principal to its previous `superadmin` role and suspend the Anisoara principal if this authorization must be withdrawn. Do not restore the entire D1 database over intervening production writes merely to undo these role grants. Check the final roles through the API and D1. The old Worker version can be restored separately if the new code itself fails; record its version before release.

## Residual limits

The Anisoara account does not yet exist in live D1, so no claim of active access is made. Administrative MFA is still deferred. The security PRs #66–#69 remain open at this handoff. AVYRON OS roles do not change GitHub or Cloudflare permissions.

The role lookup remains one D1 query per privileged check; `/api/auth/me` reuses that result for its superadmin flag. Reserved-email checks add a D1 read only to rare administrative and email-change mutations. No production latency or resource impact was measured because nothing was deployed.

Cloudflare references: [D1 migrations](https://developers.cloudflare.com/workers/wrangler/commands/d1/) and [Time Travel](https://developers.cloudflare.com/d1/reference/time-travel/).
