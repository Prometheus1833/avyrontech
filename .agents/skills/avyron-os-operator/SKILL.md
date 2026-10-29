---
name: avyron-os-operator
description: Reconcile AVYRON OS Leads and AI Prod agent work with the repository and D1 when Codex handles operator tasks; use for agent status, drafts, reviews, and handoffs, not for unrelated site work.
---

# AVYRON OS operator

Use GitHub `main` as the source of reviewed code and AVYRON OS/D1 as the source of operational state. Read `AGENTS.md`, `docs/PROJECT_CONTINUITY.md`, and `docs/PROJECT_GLOSSARY.md` before changing the project. Check the current branch, PRs, deployed Worker version and live D1 state separately; a configured route or skill file is not proof of a running agent.

The canonical AVYRON WEB agent slugs are `leads` and `ai-prod-content`. Their operator account has limited project membership and capabilities; it is not a platform administrator. Check `agent_operator_bindings`, `agent_execution_routes` and agent version/status before reporting synchronization. Treat `codex_review` and `codex_manual` routes as requiring an available Codex operator. The Workers AI routes can run in Cloudflare only when the deployed code, bindings, policy and budget permit them. A powered-off iMac cannot execute a local Codex task.

For lead and content work, use the OS record and exact conversation/content history. Preserve draft, approval, scheduled, published and provider-verified states as distinct. Reconcile duplicates and check the destination before any external action. Never infer a connected provider from a label or URL. Do not send, publish, change a provider, or trigger paid inference merely because an agent route exists; follow the user's specific authorization and the repository's review boundaries.

This skill contains no credentials or private session data. It is a repository-local, reviewable operating contract. It does not copy the operator's private desktop skills, log a browser into third-party services, create a remote Codex session, or grant AVYRON OS permissions. If a task needs any of those, report the exact missing capability and use an authorized hosted runtime or the user's authenticated browser session.
