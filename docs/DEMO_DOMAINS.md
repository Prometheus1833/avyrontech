# Avyron demo domains — Cloudflare rollout

The production Worker uses `cloudflare/workers/api/src/sites.config.ts` as the
single hostname/project registry. Demo requests are resolved before API routes,
so an unconfigured demo cannot reach auth, D1, KV, R2 client files or the main
site fallback. All registered projects start as `unavailable` and non-indexable.

## DNS records

Create the records only after the Worker version containing the hostname
resolver has been deployed and the corresponding Worker routes are active.
This order prevents a demo hostname from accidentally exposing an origin.

### `avyron.ro`

| Type | Name | Target | Proxy | Reason |
| --- | --- | --- | --- | --- |
| Existing | `@` | existing Avyron production target | Proxied | Main canonical site; do not replace during this rollout. |
| Existing/Custom Domain | `www` | Worker custom domain | Proxied | Worker returns an exact 301 and preserves path/query. |
| Existing CNAME | `app` | exact Lovable target shown by Lovable | Proxied only if Lovable currently supports it | Keep the internal UI independent; Worker owns only `app.avyron.ro/api/*`. Never guess the Lovable target. |
| A | `exemplu1` | `192.0.2.1` | Proxied | Reserved documentation IP; the exact Worker route answers before an origin request. |
| A | `exemplu2` | `192.0.2.1` | Proxied | Same isolated resolver. |
| A | `exemplu3` | `192.0.2.1` | Proxied | Same isolated resolver. |

Do not add `*.avyron.ro`: it could capture `app.avyron.ro` or future mail/app
hostnames. Exact routes are intentional.

### `avyron.eu`

| Type | Name | Target | Proxy | Reason |
| --- | --- | --- | --- | --- |
| A | `@` | existing origin IP (or `192.0.2.1` after a controlled cutover) | Proxied | Required for the apex Worker route; Worker returns 301 to `https://avyron.ro/`. |
| CNAME | `www` | `avyron.eu` | Proxied | Exact public DNS plus the wildcard Worker route returns the same 301. |
| A | `*` | `192.0.2.1` | Proxied | One scalable DNS record for all first-level demo hostnames; the Worker fails closed for unknown names. |

The wildcard covers `exemplu1`–`exemplu10`, `salaforza`,
`pensiuneabradetul`, `asociatia-europa` and future first-level demo names.
Individual A/CNAME records are unnecessary unless one project later needs a
different origin. Exact records override the wildcard.

Keep the existing `_lovable` TXT verification records. They do not conflict
with the proxied address records.

## Worker routes and TLS

Production routes are declared in `wrangler.jsonc`:

- exact routes for `exemplu1`–`exemplu3.avyron.ro`;
- `avyron.eu/*` for the apex redirect;
- `*.avyron.eu/*` for `www` and all demo subdomains;
- the existing exact `app.avyron.ro/api/*` route remains unchanged.

Preview has no custom-domain routes and continues to use isolated preview
storage. Cloudflare Universal SSL on a full zone covers the apex and first-level
wildcard names used here. After DNS activation, confirm `Active` edge
certificates and test every hostname over HTTPS before enabling a demo.

## Activating one demo

1. Build the project into an isolated public prefix, for example
   `public/_demo-sites/salaforza/`.
2. In `sites.config.ts`, set that entry to `status: "active"` and
   `assetRoot: "/_demo-sites/salaforza"`.
3. Keep `indexing: false` until the owner explicitly approves indexing.
4. Run lint, unit tests, the production build and HTTP smoke tests.
5. Deploy the Worker version, then verify the hostname. No production secret is
   made available to the demo bundle; it can read only its own static prefix.

References: [Cloudflare wildcard DNS](https://developers.cloudflare.com/dns/manage-dns-records/reference/wildcard-dns-records/), [Worker routes](https://developers.cloudflare.com/workers/configuration/routing/routes/), [Universal SSL](https://developers.cloudflare.com/ssl/edge-certificates/universal-ssl/).
