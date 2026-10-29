# Public function abuse controls — 29 October 2026

Base: `origin/main` at `87d3fbb`. Scope: source inspection and synthetic local tests for Logo Studio, domain checks and the public analytics event route. This branch has no migration or external configuration change. It does not enable administrative MFA, Turnstile or a paid provider.

## Findings and code state

| ID | Severity / evidence | Exploitation and effect | Treatment |
| --- | --- | --- | --- |
| P1 | Medium: `logoStudio.ts` reused an IP plus brief hash as the AI cost reservation key while calling the model on every request. | An authenticated user could repeat one brief and obtain model calls that shared a single budget reservation; the existing per-IP quota still bounded total calls. | Unique reservation key for every model invocation; per-user, per-IP and global D1 quotas plus a per-user edge burst key. Synthetic repeated-brief test checks 10 distinct keys and rejection of the 11th call. |
| P2 | Medium: domain GET and POST used different edge limiter keys and had no exact D1 quota. | A caller could alternate methods, double the edge allowance, and distribute requests across Cloudflare locations; RDAP traffic and D1 writes could increase. | One shared edge key, D1 quota of 60/IP/hour, 200/IP/day and 3,000 globally/day. Mixed-method test confirms the 61st request is rejected. |
| P3 | Medium: Logo Studio, domain POST and analytics parsed JSON before a route-specific byte bound on this base. | Oversized bodies could consume Worker memory/CPU before validation. | Count streamed bytes before JSON parse: 16 KiB for generation, 32 KiB for logo orders, 2 KiB for domain and analytics. A deliberately understated `Content-Length` still yields 413. The global API limit in PR #66 remains complementary and must be integrated before release. |
| P4 | Medium: RDAP calls followed arbitrary redirects supplied by a registry endpoint from the IANA bootstrap; bootstrap/DoH JSON was unbounded. | A compromised or misconfigured upstream could redirect a Worker request toward a private address or exhaust memory with a large JSON response. | Manual redirects, at most two, with HTTPS and public-address validation on each hop; bootstrap JSON capped at 1 MiB and DoH at 16 KiB. Suspicious chains and oversized responses fall back to a conservative unknown result. |
| P5 | Low: `LOGO_STUDIO_DAILY_CAP` accepted unbounded numeric values, and RDAP failure logs included the checked domain. | Bad configuration could remove the intended account budget; logs could retain sensitive domain intent. | Restrict the override to integers 1–1,000, default 400; log only a fixed failure event. |

The AI generator requires an authenticated session. Local browser generation uses the visitor's device and does not call the AI Worker. Logo orders retain their existing IP/email quotas and optional Turnstile verification. Contact, product requests, newsletter and AI chat already have D1 quotas and edge burst checks in source; this review did not demonstrate an additional bypass in those routes. The exchange-rate endpoint is cached and bounds upstream XML size; its refresh path was not load tested.

## Limits and legitimate traffic

| Function | New effective boundary | Likely effect |
| --- | --- | --- |
| AI logo concept | 10/user/hour, 30/user/day, 30/IP/hour, 100/IP/day, 400/global/day by default; edge burst per user | Shared office IPs can serve up to three users at the hourly user quota; a larger office can still hit the IP cap. Local fallback remains available when AI is limited. |
| Domain lookup | GET and POST share 60/IP/hour, 200/IP/day, 3,000/global/day; existing edge burst 30 per 60 seconds | Repeated checks from a shared IP may receive 429. Cached GET hits may avoid Worker execution, so they do not spend the D1 quota. |
| Analytics event | Existing 240/IP/hour; new 2 KiB body bound | Oversized or malformed events are rejected before parsing; ordinary small event payloads remain accepted. |

These are initial preventive thresholds, not production tuning. Review aggregate 429 rate, domain check completions, AI fallback frequency, D1 writes and Worker p95 after an approved release. Adjust thresholds only after observing legitimate traffic; rollback is reverting this PR and redeploying the previous reviewed Worker version with separate authorization.

## Local performance and resource measurement

`AVYRON_BENCH_PUBLIC_LIMITS=1 npx vitest run src/test/public-abuse-limits.test.ts -t 'reports synthetic local route latency' --reporter=verbose --silent=false` ran 20 warmups and 100 measured iterations per path, with in-memory SQLite and stubbed upstream/AI calls, without a concurrent build. Results in milliseconds:

| Path | p50 | p95 | Exact counter writes per successful call |
| --- | ---: | ---: | ---: |
| Direct stubbed RDAP lookup, for context | 0.085 | 0.156 | 0 |
| Domain GET through Hono | 0.727 | 1.651 | 3 |
| Domain POST through Hono | 0.822 | 1.600 | 3 plus one domain result row |
| AI logo generation through Hono, model stubbed | 1.091 | 1.894 | 5 plus the existing AI budget reservation in production |

The run performed 1,320 exact counter writes and 120 domain result inserts. Logo generation previously performed three counter writes; it now performs five. Domain checks previously had no D1 counter writes. The figures combine route, hashing, JSON and SQLite overhead; they are neither a before/after Worker latency comparison nor Cloudflare D1 network measurements. Request bodies are bounded at 2–32 KiB before parsing. Production p95 and D1 write cost require observation after an approved deployment.

## Verification and residual work

Local regression uses in-memory SQLite for exact D1 windows and stubbed RDAP/DoH and AI; it does not exercise Cloudflare's global distribution or live provider behavior. [Cloudflare documents the Workers Rate Limiting binding as approximate and local to locations](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/); D1 is the exact boundary for these routes. RDAP registry DNS rebinding cannot be ruled out by URL validation alone; an isolated network test is still needed. An authorized preview load test should measure 429 rate and p95, and verify that a legitimate registry redirect remains usable. No production scan or provider request was made for these tests.

Merge order for a later approved release: integrate the global body/authorization PR #66, the supply-chain PR #67, then this PR after refreshing each task branch from `main` and rerunning CI. PR review, preview and green checks do not imply deployment. Administrative MFA, branch protection, backup activation, scanner integration and production WAF/rate rules remain separate decisions described in `docs/security/AUDIT-2026-10-29.md` on PR #66.
