import type { Env } from "./types";
import { readTextUpTo } from "./metadata";
import { sealCredential, openCredential } from "./integrationAdapters";
import { sha256 } from "./security";
import { checkRateLimit } from "./antispam";
const BASE = "https://api.openprovider.eu/v1";
const TIMEOUT = 5000;
export type DomainProviderResult = {
  status: "available" | "registered" | "unknown";
  source: "openprovider";
  checkedAt: string;
  cached?: boolean;
};
export class DomainProviderError extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}
export function domainProviderStatus(env: Env) {
  const enabled = env.DOMAIN_OPENPROVIDER_ENABLED === "true",
    credentials = !!env.OPENPROVIDER_USERNAME && !!env.OPENPROVIDER_PASSWORD,
    vault =
      !!env.KV &&
      !!env.MFA_ENCRYPTION_KEY &&
      env.MFA_ENCRYPTION_KEY.length >= 32;
  return {
    provider: "openprovider",
    enabled,
    credentials,
    vault,
    configured: enabled && credentials && vault,
    mode: "availability_only",
    documentation: "https://developer.openprovider.com/get-started.html",
  };
}
async function json(response: Response) {
  if (!response.ok) {
    await response.body?.cancel();
    throw new DomainProviderError(
      response.status === 401
        ? "provider_authentication_failed"
        : response.status === 429
          ? "provider_rate_limited"
          : "provider_unavailable",
    );
  }
  const value = JSON.parse(await readTextUpTo(response, 32768));
  if (
    !value ||
    typeof value !== "object" ||
    value.code !== 0 ||
    value.maintenance === true ||
    !value.data ||
    typeof value.data !== "object" ||
    Array.isArray(value.data)
  )
    throw new DomainProviderError("provider_invalid_response");
  return value.data as Record<string, unknown>;
}
function expiration(token: string) {
  try {
    const payload = token.split(".")[1];
    const value = JSON.parse(
      atob(payload.replace(/-/g, "+").replace(/_/g, "/")),
    );
    if (Number.isFinite(value.exp))
      return Math.min(Date.now() + 3600000, Number(value.exp) * 1000 - 60000);
  } catch {
    /* Opaque tokens use a conservative cache lifetime. */
  }
  return Date.now() + 600000;
}
async function credential(env: Env, reference: string, force = false) {
  if (!force) {
    const sealed = await env.KV.get(reference);
    if (sealed) {
      try {
        const value = JSON.parse(
          await openCredential(sealed, env.MFA_ENCRYPTION_KEY, reference),
        );
        if (
          typeof value.token === "string" &&
          value.expiresAt > Date.now() + 10000
        )
          return value.token as string;
      } catch {
        /* Rotation or an expired cache triggers fresh authentication. */
      }
    }
  }
  const rate = await checkRateLimit(env.DB, [
    { key: "domain-provider:login", limit: 3, windowSec: 60 },
    { key: "domain-provider:login-day", limit: 200, windowSec: 86400 },
  ]);
  if (!rate.ok) throw new DomainProviderError("provider_rate_limited");
  const data = await json(
    await fetch(BASE + "/auth/login", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        username: env.OPENPROVIDER_USERNAME,
        password: env.OPENPROVIDER_PASSWORD,
        ip: "0.0.0.0",
      }),
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT),
    }),
  );
  if (
    typeof data.token !== "string" ||
    !/^[A-Za-z0-9._~-]{1,16384}$/.test(data.token)
  )
    throw new DomainProviderError("provider_invalid_response");
  const expiresAt = expiration(data.token);
  if (expiresAt <= Date.now() + 10000)
    throw new DomainProviderError("provider_authentication_failed");
  await env.KV.put(
    reference,
    await sealCredential(
      JSON.stringify({ token: data.token, expiresAt }),
      env.MFA_ENCRYPTION_KEY,
      reference,
    ),
    {
      expirationTtl: Math.max(60, Math.floor((expiresAt - Date.now()) / 1000)),
    },
  );
  return data.token;
}
/** Exact-match availability only. Never creates, reserves, renews, prices or purchases a domain. */
export async function queryDomainProvider(
  env: Env,
  domain: string,
): Promise<DomainProviderResult> {
  if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.ro$/.test(domain))
    throw new DomainProviderError("invalid_domain");
  if (!domainProviderStatus(env).configured)
    throw new DomainProviderError("provider_unconfigured");
  const fingerprint = (
      await sha256(`${env.OPENPROVIDER_USERNAME}\0${env.OPENPROVIDER_PASSWORD}`)
    ).slice(0, 24),
    reference = `domain:openprovider:auth:v1:${fingerprint}`;
  const cache =
      typeof caches !== "undefined"
        ? await caches.open("avyron-domain-provider-v1")
        : null,
    key = new Request(
      `https://domain-cache.avyron.internal/openprovider/v1/${domain}?account=${fingerprint}`,
    );
  const cached = await cache?.match(key);
  if (cached) {
    try {
      const value = JSON.parse(
        await readTextUpTo(cached, 2048),
      ) as DomainProviderResult;
      if (
        value.source === "openprovider" &&
        ["available", "registered"].includes(value.status) &&
        Number.isFinite(Date.parse(value.checkedAt))
      )
        return { ...value, cached: true };
    } catch {
      /* Cache corruption does not establish availability. */
    }
  }
  const rate = await checkRateLimit(env.DB, [
    { key: "domain-provider:lookup", limit: 30, windowSec: 60 },
  ]);
  if (!rate.ok) throw new DomainProviderError("provider_rate_limited");
  let token = await credential(env, reference);
  const check = () =>
    fetch(BASE + "/domains/check", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        domains: [{ name: domain.slice(0, -3), extension: "ro" }],
        with_price: false,
      }),
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT),
    });
  let response = await check();
  if (response.status === 401) {
    await response.body?.cancel();
    token = await credential(env, reference, true);
    response = await check();
  }
  const data = await json(response);
  const results = Array.isArray(data.results) ? data.results : [];
  const matching = results.filter(
    (r) =>
      r && typeof r === "object" && String(r.domain).toLowerCase() === domain,
  );
  if (matching.length !== 1)
    throw new DomainProviderError("provider_domain_mismatch");
  const entry = matching[0];
  if (!["free", "active"].includes(entry.status))
    throw new DomainProviderError("provider_status_unconfirmed");
  // Premium/claims are not ordinary availability; no commercial terms are inferred.
  if (entry.status === "free" && (entry.is_premium === true || entry.claim_key))
    throw new DomainProviderError("provider_terms_required");
  const result: DomainProviderResult = {
    status: entry.status === "free" ? "available" : "registered",
    source: "openprovider",
    checkedAt: new Date().toISOString(),
  };
  if (cache)
    await cache
      .put(
        key,
        Response.json(result, {
          headers: {
            "Cache-Control": `public, max-age=${result.status === "available" ? 120 : 900}`,
          },
        }),
      )
      .catch(() => {});
  return result;
}
