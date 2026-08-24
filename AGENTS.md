# AVYRON repository workflow

These rules apply to all work in this repository.

## Source of truth

- GitHub is the source of truth for code, history, reviews, and releases.
- Do not invoke the Lovable agent or use Lovable credits unless the user explicitly requests it for that task.
- Work directly from this repository and preserve unrelated user changes.
- Lovable Git sync tracks `main`. Changes appear in Lovable only after the reviewed task branch is merged into `main`.
- Do not edit the same files in Lovable while a GitHub task branch is open. If Lovable creates a commit, fetch and integrate it before continuing; never overwrite it with a force push.

## Branch and delivery workflow

- Never make planned changes directly on `main`.
- Create a dedicated branch for each task, preferably named `codex/<short-task-name>-YYYY-MM-DD`.
- Implement and validate changes locally, then commit and push the task branch.
- Open or update a pull request before merging into `main` unless the user explicitly requests a different workflow.
- Do not deploy, merge, or publish without explicit user authorization.
- Before requesting merge, update the task branch from the latest `main` and resolve conflicts on the task branch.

## Hosting and deployment

- The public frontend is built for Cloudflare Pages; API and email services run as Cloudflare Workers.
- Cloudflare Pages production tracks `main`; task branches produce previews and must never promote themselves to production.
- Keep edge routing, static prerendering, API bindings, and Lovable static-preview compatibility intact.
- For this project, validate the static, Pages, and standalone Worker builds when relevant:
  - `npm run build`
  - `npm run build:pages`
  - `npm run build:worker`
- Never commit credentials, tokens, production secrets, or local environment files.

## Verification

- Run the relevant tests, type checks, lint checks, and production builds before pushing.
- Report any check that could not be run and the exact reason.
- Keep commits focused on the requested task.
