---
name: avyron-os-operator
description: Reconcile AVYRON OS Leads and AI Prod agent work with the repository and D1 when Codex handles operator tasks; use for agent status, drafts, reviews, and handoffs, not for unrelated site work.
---

# AVYRON OS operator

Use GitHub `main` as the source of reviewed code and AVYRON OS/D1 as the source of operational state. Read `AGENTS.md`, `docs/PROJECT_CONTINUITY.md`, and `docs/PROJECT_GLOSSARY.md` before changing the project. Check the current branch, PRs, deployed Worker version and live D1 state separately; a configured route or skill file is not proof of a running agent.

The canonical AVYRON WEB agent slugs are `leads` and `ai-prod-content`. Their operator account has limited project membership and capabilities; it is not a platform administrator. Check `agent_operator_bindings`, `agent_execution_routes` and agent version/status before reporting synchronization. Treat `codex_review` and `codex_manual` routes as requiring an available Codex operator. The Workers AI routes can run in Cloudflare only when the deployed code, bindings, policy and budget permit them. A powered-off iMac cannot execute a local Codex task.

For lead and content work, use the OS record and exact conversation/content history. Preserve draft, approval, scheduled, published and provider-verified states as distinct. Reconcile duplicates and check the destination before any external action. Never infer a connected provider from a label or URL. Do not send, publish, change a provider, or trigger paid inference merely because an agent route exists; follow the user's specific authorization and the repository's review boundaries.

This skill contains no credentials or private session data. It is a repository-local, reviewable operating contract. It does not copy the operator's private desktop skills, log a browser into third-party services, create a remote Codex session, or grant AVYRON OS permissions. If a task needs any of those, report the exact missing capability and use an authorized hosted runtime or the user's authenticated browser session.

## Reveniri și limite native

Fișa leadului oferă preluare, aprobare/respingere și revizie punctuală prin API-urile native `/api/leads/ID/claim` și `/api/leads/ID/follow-ups/DRAFT/{review,revise,sent}`. Revizia se leagă de utilizator, ciornă, versiune și intenție; păstrează aceeași Idempotency-Key la retry de rețea. Confirmă numai canalele în care mesajul este deja verificat ca trimis. Un canal confirmat nu se rescrie și nu se reconfirmă. Nu transmite mesaje din această operație.

În registrul `agent_execution_routes`, `limit_mode=native_budget` înseamnă bugetele existente AI Core, iar `manual` înseamnă operație manuală autorizată; `max_daily_runs=0` nu introduce un plafon zilnic în aceste două moduri. Regulile `daily` existente sunt păstrate. Codex local necesită calculatorul deschis; coada Cloudflare pregătește numai ciornele autorizate.

## Social editorial workflow

For `ai-prod-content`, use `docs/SOCIAL_EDITORIAL_WORKFLOW.md` and the native social-manager API. `ai_content_items` is the canonical material; a job without content is not an approval package. Read the -24h/+24h agenda, reuse an appropriate unpublished source, persist the actual draft with stable source/revision and Idempotency-Key, then verify it by reading back. Retain reusable sources and shared private assets; archive elapsed queue entries rather than deleting evidence.

Dashboard and Codex chat decisions target the same content ID and `updated_at`. A Codex decision records `origin=codex_chat` and the exact human message in `approvalReference`, through a native authenticated reviewer session. The editor operator must not grant itself approval rights. Unavailable authorization is a pending synchronization, never a successful approval. A new date, text or target matrix requires review of the changed version; do not repeatedly request approval for the unchanged exact matrix already approved.

An old composer or pending R2 matrix is not a permanent browser lease. Avoid concurrent active operations, preserve published R1, and close only tabs opened by the current run. Draft preparation continues when no publication session is available. No model, paid feature, AI quota or lead-outreach route is activated by this workflow.
