import { Hono, type Context } from "hono";
import { checkRateLimit, clientIp, hashKey } from "./antispam";
import { readTextUpTo, validateMetadataUrl } from "./metadata";
import { readJsonBodyUpTo } from "./requestBody";
import type { AppBindings } from "./types";

type DomainStatus = "available" | "registered" | "unknown";
type Bootstrap = { services?: Array<[string[], string[]]> };
type LookupResult = { status: DomainStatus; source: "iana-rdap" | "cloudflare-doh" | "unavailable" };
type SupportedLanguage = "ro" | "en";

const IANA_BOOTSTRAP_URL = "https://data.iana.org/rdap/dns.json";
const DOH_URL = "https://cloudflare-dns.com/dns-query";
const UPSTREAM_TIMEOUT_MS = 4_000;
const RDAP_MAX_REDIRECTS = 2;
const BOOTSTRAP_MAX_BYTES = 1024 * 1024;
const DOH_MAX_BYTES = 16 * 1024;
let bootstrapSnapshot: { expiresAt: number; value: Bootstrap } | undefined;

const domainRouter = new Hono<AppBindings>();

export function normalizeDomain(value: string): string | null {
  const candidate = value.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/[./]+$/, "");
  if (!candidate || candidate.length > 253 || /[/?#]/.test(candidate)) return null;
  let hostname = "";
  try {
    const parsed = new URL(`https://${candidate}`);
    if (parsed.username || parsed.password || parsed.port) return null;
    hostname = parsed.hostname.toLowerCase();
  } catch { return null; }
  const labels = hostname.split(".");
  if (labels.length !== 2 || labels.some((label) => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))) return null;
  return hostname;
}

async function loadBootstrap(): Promise<Bootstrap> {
  if (bootstrapSnapshot && bootstrapSnapshot.expiresAt > Date.now()) return bootstrapSnapshot.value;
  const response = await fetch(IANA_BOOTSTRAP_URL, {
    headers: { accept: "application/json" },
    redirect: "error",
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    cf: { cacheEverything: true, cacheTtl: 86_400 },
  });
  if (!response.ok) throw new Error(`IANA bootstrap returned ${response.status}`);
  const value = JSON.parse(await readTextUpTo(response, BOOTSTRAP_MAX_BYTES)) as Bootstrap;
  bootstrapSnapshot = { value, expiresAt: Date.now() + 86_400_000 };
  return value;
}

async function rdapEndpoint(tld: string): Promise<string | null> {
  const bootstrap = await loadBootstrap();
  for (const [tlds, endpoints] of bootstrap.services || []) {
    if (!tlds.includes(tld)) continue;
    return endpoints.find((endpoint) => endpoint.startsWith("https://")) || null;
  }
  return null;
}

async function queryRdap(domain: string, endpoint: string): Promise<LookupResult> {
  const base = endpoint.endsWith("/") ? endpoint : `${endpoint}/`;
  let current = validateMetadataUrl(new URL(`domain/${encodeURIComponent(domain)}`, base));
  if (current.protocol !== "https:") throw new Error("RDAP requires HTTPS");
  const signal = AbortSignal.timeout(UPSTREAM_TIMEOUT_MS);
  for (let redirects = 0; redirects <= RDAP_MAX_REDIRECTS; redirects += 1) {
    const response = await fetch(current, {
      headers: { accept: "application/rdap+json, application/json;q=0.9", "user-agent": "AvyronDomainCheck/1.0 (+https://avyron.ro)" },
      redirect: "manual",
      signal,
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location || redirects === RDAP_MAX_REDIRECTS) throw new Error("Invalid RDAP redirect chain");
      current = validateMetadataUrl(new URL(location, current));
      if (current.protocol !== "https:") throw new Error("RDAP redirect requires HTTPS");
      continue;
    }
    if (response.status === 404) return { status: "available", source: "iana-rdap" };
    if (response.ok) return { status: "registered", source: "iana-rdap" };
    throw new Error(`RDAP returned ${response.status}`);
  }
  throw new Error("Too many RDAP redirects");
}

async function queryDns(domain: string): Promise<LookupResult> {
  const url = new URL(DOH_URL);
  url.searchParams.set("name", domain);
  url.searchParams.set("type", "NS");
  const response = await fetch(url, {
    headers: { accept: "application/dns-json" },
    redirect: "error",
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    cf: { cacheEverything: true, cacheTtl: 300 },
  });
  if (!response.ok) throw new Error(`DoH returned ${response.status}`);
  const data = JSON.parse(await readTextUpTo(response, DOH_MAX_BYTES)) as { Status?: number; Answer?: unknown[]; Authority?: unknown[] };
  if (data.Status === 0 && ((data.Answer?.length || 0) > 0 || (data.Authority?.length || 0) > 0)) {
    return { status: "registered", source: "cloudflare-doh" };
  }
  // NXDOMAIN cannot prove availability: a registered domain may be undelegated.
  return { status: "unknown", source: "cloudflare-doh" };
}

export async function lookupDomain(domain: string): Promise<LookupResult> {
  const tld = domain.split(".").at(-1) || "";
  try {
    const endpoint = await rdapEndpoint(tld);
    if (endpoint) return await queryRdap(domain, endpoint);
  } catch {
    console.warn(JSON.stringify({ event: "domain_rdap_unavailable" }));
  }
  try {
    return await queryDns(domain);
  } catch {
    console.warn(JSON.stringify({ event: "domain_doh_unavailable" }));
    return { status: "unknown", source: "unavailable" };
  }
}

const copy = {
  available: {
    label: { ro: "Pare disponibil", en: "Appears available" },
    message: { ro: "Registrul RDAP autoritativ nu a găsit domeniul. Confirmă la un registrar înainte de comandă.", en: "The authoritative RDAP registry did not find the domain. Confirm with a registrar before ordering." },
  },
  registered: {
    label: { ro: "Înregistrat", en: "Registered" },
    message: { ro: "Domeniul apare în registrul autoritativ sau are delegare DNS activă.", en: "The domain appears in the authoritative registry or has active DNS delegation." },
  },
  unknown: {
    label: { ro: "Necesită confirmare", en: "Needs confirmation" },
    message: { ro: "Extensia nu oferă o confirmare RDAP publică. Verifică rezultatul la registrarul ales.", en: "The extension does not provide a public RDAP confirmation. Verify with your chosen registrar." },
  },
} as const;

export function officialDomainVerificationUrl(domain: string, language: SupportedLanguage): string | null {
  if (!domain.endsWith(".ro")) return null;
  const url = new URL("https://forms.rotld.ro/whois/");
  url.searchParams.set("fqdn", domain);
  url.searchParams.set("lang", language);
  return url.toString();
}

const payloadFor = (domain: string, result: LookupResult, language: SupportedLanguage = "ro") => ({
  domain,
  status: result.status,
  source: result.source,
  label: copy[result.status].label,
  message: copy[result.status].message,
  checkedAt: new Date().toISOString(),
  disclaimer: "Rezultatul este informativ și nu rezervă domeniul.",
  officialVerificationUrl: officialDomainVerificationUrl(domain, language),
});

async function domainCheckLimit(c: Context<AppBindings>) {
  const ip = await hashKey(clientIp(c.req.raw));
  return checkRateLimit(c.env.DB, [
    { key: `domain-check:ip:${ip}:h`, limit: 60, windowSec: 3600 },
    { key: `domain-check:ip:${ip}:d`, limit: 200, windowSec: 86400 },
    { key: "domain-check:global:d", limit: 3_000, windowSec: 86400 },
  ], { limiter: c.env.PUBLIC_API_RATE_LIMITER, key: `domain-check:${ip}` });
}

function rateLimited(c: Context<AppBindings>, retryAfter: number | undefined) {
  return c.json({ error: { code: "rate_limited", message: "Prea multe verificări" } }, 429, { "Retry-After": String(retryAfter || 60) });
}

domainRouter.get("/api/public/domain-check", async (c) => {
  const domain = normalizeDomain(c.req.query("domain") || "");
  if (!domain) return c.json({ error: { code: "invalid_domain", message: "Domeniul nu este valid" } }, 400);

  const rate = await domainCheckLimit(c);
  if (!rate.ok) return rateLimited(c, rate.retryAfter);

  const result = await lookupDomain(domain);
  const ttl = result.status === "registered" ? 3600 : result.status === "available" ? 300 : 60;
  c.header("cache-control", `public, max-age=${ttl}, stale-while-revalidate=${ttl}`);
  const language = c.req.query("language") === "en" ? "en" : "ro";
  return c.json(payloadFor(domain, result, language));
});

domainRouter.post("/api/public/domain-check", async (c) => {
  const parsed = await readJsonBodyUpTo(c.req.raw, 2 * 1024);
  if (!parsed.ok) return c.json({ error: { code: parsed.error } }, parsed.error === "payload_too_large" ? 413 : 400);
  const body = parsed.value && typeof parsed.value === "object"
    ? parsed.value as { domain?: unknown; language?: unknown; surface?: unknown }
    : null;
  const domain = normalizeDomain(String(body?.domain || ""));
  if (!domain) return c.json({ error: { code: "invalid_domain", message: "Domeniul nu este valid" } }, 400);

  const rate = await domainCheckLimit(c);
  if (!rate.ok) return rateLimited(c, rate.retryAfter);

  const result = await lookupDomain(domain);
  const language = body?.language === "en" ? "en" : "ro";
  const surface = String(body?.surface || "landing").trim().slice(0, 40) || "landing";
  await c.env.DB.prepare(
    "INSERT INTO public_domain_checks(id,domain,status,source,language,surface,created_at) VALUES(?,?,?,?,?,?,?)",
  ).bind(crypto.randomUUID(), domain, result.status, result.source, language, surface, Date.now()).run();

  c.header("cache-control", "private, no-store");
  return c.json(payloadFor(domain, result, language), 201);
});

export { domainRouter };
