// Public domain availability check via RDAP.
// - .ro  -> rdap.rotld.ro (oficial RoTLD, gratuit, fără cheie)
// - rest -> rdap.org (IANA bootstrap, redirecționează la serverul RDAP al TLD-ului)
// Anti-fraud: validare strictă input, allowlist TLD, rate-limit per IP (in-memory).

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const ALLOWED_TLDS = new Set([
  "ro", "com", "eu", "net", "org", "io", "app", "dev",
  "tech", "store", "online", "biz", "info", "co", "shop",
]);

const LABEL_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;

// In-memory rate limit: 20 req / 60s per IP. Reset on cold start.
const WINDOW_MS = 60_000;
const MAX_REQ = 20;
const hits = new Map<string, { count: number; reset: number }>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const cur = hits.get(ip);
  if (!cur || cur.reset < now) {
    hits.set(ip, { count: 1, reset: now + WINDOW_MS });
    return false;
  }
  cur.count++;
  return cur.count > MAX_REQ;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function rdapLookup(domain: string, tld: string): Promise<{
  available: boolean;
  source: string;
  uncertain?: boolean;
}> {
  const base = tld === "ro"
    ? `https://rdap.rotld.ro/domain/${domain}`
    : `https://rdap.org/domain/${domain}`;

  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 7000);
    const res = await fetch(base, {
      headers: { Accept: "application/rdap+json" },
      signal: ctl.signal,
      redirect: "follow",
    });
    clearTimeout(timer);

    if (res.status === 404) return { available: true, source: base };
    if (res.status === 200) return { available: false, source: base };
    // Some RDAP servers respond 400 for non-existent. Treat as available conservatively.
    if (res.status === 400) return { available: true, source: base, uncertain: true };
    return { available: false, source: base, uncertain: true };
  } catch (_e) {
    return { available: false, source: base, uncertain: true };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim()
    || req.headers.get("cf-connecting-ip")
    || "unknown";

  if (rateLimited(ip)) {
    return json({ error: "Prea multe verificări. Reîncearcă într-un minut." }, 429);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Body invalid" }, 400);
  }

  const raw = (body as { name?: unknown; tld?: unknown }) ?? {};
  const nameInput = typeof raw.name === "string" ? raw.name.trim().toLowerCase() : "";
  const tldInput = typeof raw.tld === "string" ? raw.tld.trim().toLowerCase().replace(/^\./, "") : "";

  if (!ALLOWED_TLDS.has(tldInput)) {
    return json({ error: "TLD nepermis" }, 400);
  }
  if (nameInput.length < 2 || nameInput.length > 63 || !LABEL_RE.test(nameInput)) {
    return json({ error: "Nume invalid (2-63 caractere, doar a-z, 0-9 și cratimă)" }, 400);
  }

  const domain = `${nameInput}.${tldInput}`;
  const result = await rdapLookup(domain, tldInput);

  return json({
    domain,
    available: result.available,
    uncertain: result.uncertain ?? false,
    method: "rdap",
  });
});
