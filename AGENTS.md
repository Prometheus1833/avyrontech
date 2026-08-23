# AVYRON repository workflow

These rules apply to all work in this repository.

## Source of truth

- GitHub is the source of truth for code, history, reviews, and releases.
- Do not invoke the Lovable agent or use Lovable credits unless the user explicitly requests it for that task.
- Work directly from this repository and preserve unrelated user changes.

## Branch and delivery workflow

- Never make planned changes directly on `main`.
- Create a dedicated branch for each task, preferably named `codex/<short-task-name>-YYYY-MM-DD`.
- Implement and validate changes locally, then commit and push the task branch.
- Open or update a pull request before merging into `main` unless the user explicitly requests a different workflow.
- Do not deploy, merge, or publish without explicit user authorization.

## Hosting and deployment

- Cloudflare Workers and Cloudflare Pages are the target hosting platforms; choose the appropriate Cloudflare runtime for each project component.
- Keep Cloudflare Worker routing, static prerendering, API bindings, and Pages compatibility intact.
- For this project, validate both the standard build and the Worker build when relevant:
  - `npm run build`
  - `AVYRON_WORKER=1 npm run build`
- Never commit credentials, tokens, production secrets, or local environment files.

## Verification

- Run the relevant tests, type checks, lint checks, and production builds before pushing.
- Report any check that could not be run and the exact reason.
- Keep commits focused on the requested task.
