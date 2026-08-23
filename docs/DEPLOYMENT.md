# AVYRON delivery and deployment

GitHub is the single source of truth. The same reviewed commit must reach
Lovable and Cloudflare; neither platform is an independent editing source.

## Branch flow

1. Update local `main` from GitHub.
2. Create one `codex/<task>-YYYY-MM-DD` branch.
3. Make and validate changes only on that branch.
4. Push the branch and open a pull request into `main`.
5. Review the CI result and Cloudflare Pages preview.
6. Update the branch from the latest `main` before merge.
7. Merge only after explicit approval.

Do not edit the same files in Lovable while a task branch is open. Lovable Git
sync follows `main`, so a merged commit appears there automatically without an
AI-agent run or Lovable credits. If Lovable creates a commit unexpectedly,
pause, fetch `main`, and integrate that commit on the task branch. Never force
push `main`.

## Cloudflare Pages — public frontend

Connect the Pages project to `Prometheus1833/avyrontech` with:

- Production branch: `main`
- Preview deployments: enabled for non-production branches
- Build command: `npm run build:pages`
- Build output directory: `dist`
- Root directory: repository root
- Node.js: 22

`build:pages` emits prerendered HTML and `dist/_worker.js`. The Pages edge
runtime supplies the canonical redirects, real 404/403/500/503 statuses, and
`X-Robots-Tag` for private routes.

Add a Pages service binding in both Production and Preview:

- Variable name: `API`
- Service: `avyrontech`
- Environment: production

The binding forwards `/api/*` internally to the existing API Worker. The
custom-domain Worker routes for `avyron.ro/api/*` may remain as an additional
production safeguard, but previews require the service binding.

## Cloudflare Workers — API and email

The API Worker is configured in `cloudflare/workers/api/wrangler.jsonc`; the
email Worker is configured in `cloudflare/workers/email/wrangler.jsonc`.
Connect each Worker to the same GitHub repository, production branch `main`,
and set its root directory to its own folder. Restrict build watch paths so a
frontend-only commit does not redeploy backend services.

Recommended watch paths:

- API Worker: `cloudflare/workers/api/**`, `cloudflare/d1/**`
- Email Worker: `cloudflare/workers/email/**`
- Pages frontend: everything except backend-only Worker paths

Production secrets remain in Cloudflare bindings and must never be committed.

## Required verification

Before merge:

```bash
npm ci
npm run build:pages
npm test
npm run build:worker
```

After the production deployment:

```bash
curl -I https://avyron.ro/costuri
curl -I https://avyron.ro/pagina-inexistenta-verificare
curl -I https://avyron.ro/produse/website-prezentare-premium
```

Expected statuses are `301`, `404`, and `200`, respectively.
