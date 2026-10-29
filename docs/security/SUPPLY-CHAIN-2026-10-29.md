# Dependency and CI hardening — 29 October 2026

This branch updates the root and isolated API Worker lockfiles. Initial npm audit reports included a critical DOMPurify advisory in the root tree and a critical proxy-addr advisory in the API tree, plus high and moderate findings in MCP, Agents, Zod, Hono, Wrangler, sharp and transitive packages. The package versions are resolved in the lockfiles; a lockfile update alone does not demonstrate a deployed fix.

The application uses patched DOMPurify, Zod 4, MCP client/server 2.4, MCP SDK 1.32.2, Wrangler 4.155, sharp 0.35.5 and selector parser 6.1.5. `npm audit` must be rerun in CI and after each update; its result describes known advisories at query time only. `security.yml` adds a high-severity audit gate for both full dependency trees and CodeQL analysis for JavaScript/TypeScript, and Dependabot is configured for both npm trees and GitHub Actions. The effective CodeQL, Dependabot and secret scanning states in GitHub must be verified after review/merge; this branch does not change repository settings or protect `main`.

After a clean `npm ci`, `npm audit --audit-level=moderate` returned `found 0 vulnerabilities` for both the root and isolated API tree on 29 October 2026. This is a point-in-time registry result, not an exploitability assessment or a substitute for continuous scanning.

Local checks after the clean install: 517 unit tests passed in 69 files and 101 Chromium browser journeys passed; typecheck passed; lint reported 0 errors and 4 existing Fast Refresh warnings; D1 schema/integrity audit passed; static Pages, standalone Worker, API and email Worker builds passed. The API and email builds were Wrangler dry runs. Upgrading Wrangler required regenerating `worker-configuration.d.ts`; the generated diff contains only the hash and new static asset module declarations. GitHub CodeQL results must be recorded separately after the PR runs.

## Compatibility exception

The latest available `agents@0.31.0` advertises exact MCP peer versions older than the patched direct MCP versions. The API tree uses `npm ci --legacy-peer-deps` to install the patched MCP versions while retaining the current Agents API. Typecheck, unit tests and Worker dry-run build are required before merge, followed by a synthetic Agent/MCP preview integration test. This mismatch is a residual integration risk until upstream Agents publishes compatible peer pins. Remove the install exception when that release is available.

## Review gates

Before merge, verify a clean `npm ci`, `npm audit` in both trees, typecheck, lint, D1 audit, tests, Pages/Worker/API/email builds and browser journeys. Inspect the CodeQL workflow results and confirm it uploads findings with only `contents: read` and `security-events: write`. Configure required PR reviews and checks on `main` separately after explicit authorization; confirm effective rules by API. No deployment, remote migration, or provider activation is part of this branch.
