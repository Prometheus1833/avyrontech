import { Hono } from "hono";
import { clientIp, hashKey } from "./antispam";
import type { AppBindings } from "./types";

type DomainStatus = "available" | "registered" | "unknown";
type Bootstrap = { services?: Array<[string[], string[]]> };
type LookupResult = { status: DomainStatus; source: "iana-rdap" | "cloudflare-doh" | "unavailable" };

const IANA_BOOTSTRAP_URL = "https://data.iana.org/rdap/dns.json";
const DOH_URL = "https://cloudflare-dns.com/dns-query";
const UPSTREAM_TIMEOUT_MS = 4_000;
let bootstrapSnapshot: { expiresAt: number; value: Bootstrap } | undefined;

const domainRouter = new Hono<AppBindings>();

export function normalizeDomain(value: string): string | null {
  const candidate = value.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/[./]+$/, "");
  if (!candidate || candidate.length > 253 || candidate.includes("/")) return null;
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
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    cf: { cacheEverything: true, cacheTtl: 86_400 },
  });
  if (!response.ok) throw new Error(`IANA bootstrap returned ${response.status}`);
  const value = await response.json<Bootstrap>();
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
  const response = await fetch(new URL(`domain/${encodeURIComponent(domain)}`, base), {
    headers: { accept: "application/rdap+json, application/json;q=0.9", "user-agent": "AvyronDomainCheck/1.0 (+https://avyron.ro)" },
    redirect: "follow",
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
  });
  if (response.status === 404) return { status: "available", source: "iana-rdap" };
  if (response.ok) return { status: "registered", source: "iana-rdap" };
  throw new Error(`RDAP returned ${response.status}`);
}

async function queryDns(domain: string): Promise<LookupResult> {
  const url = new URL(DOH_URL);
  url.searchParams.set("name", domain);
  url.searchParams.set("type", "NS");
  const response = await fetch(url, {
    headers: { accept: "application/dns-json" },
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    cf: { cacheEverything: true, cacheTtl: 300 },
  });
  if (!response.ok) throw new Error(`DoH returned ${response.status}`);
  const data = await response.json<{ Status?: number; Answer?: unknown[]; Authority?: unknown[] }>();
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
  } catch (error) {
    console.warn(JSON.stringify({ event: "domain_rdap_unavailable", domain, error: String(error) }));
  }
  try {
    return await queryDns(domain);
  } catch (error) {
    console.warn(JSON.stringify({ event: "domain_doh_unavailable", domain, error: String(error) }));
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

domainRouter.get("/api/public/domain-check", async (c) => {
  const domain = normalizeDomain(c.req.query("domain") || "");
  if (!domain) return c.json({ error: { code: "invalid_domain", message: "Domeniul nu este valid" } }, 400);

  const rateKey = await hashKey(clientIp(c.req.raw));
  const { success } = await c.env.PUBLIC_API_RATE_LIMITER.limit({ key: `domain-check:${rateKey}` });
  if (!success) return c.json({ error: { code: "rate_limited", message: "Prea multe verificări" } }, 429, { "Retry-After": "60" });

  const result = await lookupDomain(domain);
  const ttl = result.status === "registered" ? 3600 : result.status === "available" ? 300 : 60;
  c.header("cache-control", `public, max-age=${ttl}, stale-while-revalidate=${ttl}`);
  return c.json({
    domain,
    status: result.status,
    source: result.source,
    label: copy[result.status].label,
    message: copy[result.status].message,
    checkedAt: new Date().toISOString(),
    disclaimer: "Rezultatul este informativ și nu rezervă domeniul.",
  });
});

export { domainRouter };
