# Avyron demo domains — Cloudflare handoff

## Live configuration — 2026-09-22

The ten requested hostnames have explicit DNS records in the `avyron.eu` zone.
Each record is **A → 192.0.2.0, Proxied, TTL Auto**. This is an originless
Cloudflare placeholder, not a server to contact. The existing `avyrontech` Worker
route `*.avyron.eu/*` handles requests before any origin fetch. Never turn these
placeholder records to DNS-only.

| Hostname | Current registry project | State |
| --- | --- | --- |
| exemplu1.avyron.eu | demo-eu-1 (alias) | Ready for project connection |
| exemplu2.avyron.eu | demo-eu-2 (alias) | Ready for project connection |
| exemplu3.avyron.eu | demo-eu-3 (alias) | Ready for project connection |
| exemplu4.avyron.eu | demo-eu-4 (alias) | Ready for project connection |
| exemplu5.avyron.eu | demo-eu-5 (alias) | Ready for project connection |
| demo1.avyron.eu | demo-eu-1 | Ready for project connection |
| demo2.avyron.eu | demo-eu-2 | Ready for project connection |
| demo3.avyron.eu | demo-eu-3 | Ready for project connection |
| demo4.avyron.eu | demo-eu-4 | Ready for project connection |
| demo5.avyron.eu | demo-eu-5 | Ready for project connection |

All ten names have independent DNS records. The existing application registry
pairs `exempluN` with `demoN`; this does not mean ten distinct projects have been
deployed. Assign actual project repositories/builds explicitly before activation.
No wildcard DNS record, `www` record or additional numbered slots were created
in this task. Names 6–10 and named demos in the code registry are not evidence
of public DNS activation.

The deployed holding page is **“Demo în pregătire”**, deliberately HTTP **404**
with `X-Robots-Tag: noindex, nofollow`. HTTPS works, but real demo content awaits
connection. `/api/auth/me` also returns the isolated holding page, not the
internal platform API. Do not label the projects themselves as launched.

## Apex redirect

`avyron.eu` is now an originless proxied A record, `192.0.2.0`. Its previous
value was `185.158.133.1`, DNS-only, TTL 3600. The previous provider association
had priority over the zone settings; Cloudflare's change confirmation was
accepted specifically to move this apex to the requested redirect.

Cloudflare Single Redirect:

- Name: `AVYRON EU apex to canonical RO`
- Rule ID: `86c3aedbaf894d089f16b9421dba23e3`
- Match: `(http.host eq "avyron.eu")`
- Status: 301
- Target: `concat("https://avyron.ro", http.request.uri.path)`
- Preserve query string: false (query credentials are not forwarded)

The exact hostname filter excludes every demo subdomain. The existing Worker
route `avyron.eu/*` remains in place. Preserve the Single Redirect in future
infrastructure changes; Wrangler's route configuration does not manage it.
Existing `_lovable` verification TXT records were preserved. `avyron.ro`, its
application/API domains and the repository's GitHub/Lovable connection were not
changed by this task. `www.avyron.eu` is outside this activation.

## Connect a project — preferred Cloudflare hosting

1. Choose the exact slot and record its repository, owner and deployment target.
   Build/preview the project before switching traffic. Keep each project's data,
   secrets and storage separate from the Avyron OS production bindings.
2. Deploy an isolated Cloudflare Worker with static assets (or a Pages project).
   For a Worker, give the project Worker the **exact** route
   `demo1.avyron.eu/*` (substitute the assigned name), with zone `avyron.eu`.
   It takes precedence over the existing wildcard route. Keep the proxied DNS
   placeholder. Do not reassign or remove the shared wildcard for all demos.
3. For Pages or a different origin, first complete that project's custom-domain
   setup and certificates. The `avyrontech` wildcard still intercepts proxied
   traffic: add an exact route exclusion (no Worker) for the assigned hostname
   through zone Worker Routes, then use the exact project-provided DNS target.
   A DNS change alone is not enough while the wildcard Worker captures traffic.
4. Commit the relevant routing configuration to the owning repository. Document
   the exact override/exclusion so later infrastructure deployments preserve it.
   Do not deploy the unpublished OS feature branch just to connect a demo.
5. Verify DNS, valid HTTPS, the actual project homepage, assets, SPA deep links,
   forms and mobile layout. Ensure no internal Avyron API or secrets are exposed.
   Retain `noindex` until the owner approves indexing.
6. Roll back a project by restoring its proxied placeholder and removing only
   its exact override/exclusion, returning control to the holding-page Worker.

Lovable or another AI agent can generate the project and sync its repository;
Cloudflare remains the hosting target. Do not invoke Lovable's agent or spend
credits unless the user requests it.

## Optional direct Lovable hosting

Only use this option if the user authorizes external hosting for that project.
In the correct Lovable project, add the exact assigned subdomain under Domains.
Copy the A/CNAME target, TXT verification name/value and required proxy mode
from that project's current instructions; never guess them or reuse the apex's
verification values. Replace only that slot's placeholder. If proxied, account
for the Worker wildcard as above. If DNS-only is required, the Cloudflare Worker
cannot intercept it, and the provider must already serve HTTPS for that name.
Do not edit apex DNS, other projects' slots or existing verification records.

## Alternative: bundle a static demo in the shared resolver

The registry is `cloudflare/workers/api/src/sites.config.ts`. Put the isolated
build under `public/_demo-sites/<slug>/`, then set that registry entry's
`status: "active"` and `assetRoot: "/_demo-sites/<slug>"`. Keep `indexing: false`.
If `exempluN` and `demoN` need different content, split the alias into its own
registry entry before deployment. Use the normal reviewed release process;
validate routing tests, lint, type checks and static/Pages/Worker builds.
Never expose the main Avyron SPA as the fallback for a demo hostname.

## Verification and rollback

See `docs/evidence/eu-domains-2026-09-22.json` for the timestamped live checks.
Public DNS is checked through Cloudflare and Google resolvers. HTTPS checks use
those returned edge addresses with full certificate validation; stale local DNS
can retain the earlier apex TTL or an earlier negative answer temporarily.
The holding-page 404 is expected until an actual project is activated.

Before any future changes, inspect the live DNS, Worker routes and redirect
rules again. Do not treat this dated snapshot as a live inventory. The prior
apex DNS value is retained above for an explicitly authorized rollback; reverting
it alone also requires disabling the Single Redirect and considering provider
revalidation. Never remove all `_lovable` TXT records as a cleanup shortcut.

## References

- [Originless redirect placeholders](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)
- [Worker routes and exact route precedence](https://developers.cloudflare.com/workers/configuration/routing/routes/)
- [Cloudflare hostname priority](https://developers.cloudflare.com/ssl/reference/certificate-and-hostname-priority/)
