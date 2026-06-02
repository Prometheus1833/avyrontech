// Public domain availability check via RDAP.
// - .ro  -> rdap.rotld.ro (oficial RoTLD)
// - rest -> rdap.org (IANA bootstrap)
// Features: status normalization, DB cache (1h), staff/admin-only logs.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const ALLOWED_TLDS = new Set([
  "ro", "com", "eu", "net", "org", "io", "app", "dev",
  "tech", "store", "online", "biz", "info", "co", "shop",
]);
const LABEL_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;

const WINDOW_MS = 60_000;
const MAX_REQ = 20;
const hits = new Map<string, { count: number; reset: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1h

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

async function sha256(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

type Status = "available" | "registered" | "unknown";

const MESSAGES: Record<Status, { ro: string; en: string }> = {
  available: {
    ro: "Domeniul este liber — îl poți înregistra.",
    en: "Domain is free — you can register it.",
  },
  registered: {
    ro: "Domeniul este deja înregistrat.",
    en: "Domain is already registered.",
  },
  unknown: {
    ro: "Nu am putut verifica acum. Încearcă din nou în câteva secunde.",
    en: "Could not verify right now. Try again in a few seconds.",
  },
};

async function rdapLookup(domain: string, tld: string): Promise<{
  status: Status;
  source: string;
  http?: number;
}> {
  const url = tld === "ro"
    ? `https://rdap.rotld.ro/domain/${domain}`
    : `https://rdap.org/domain/${domain}`;

  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 7000);
    const res = await fetch(url, {
      headers: { Accept: "application/rdap+json" },
      signal: ctl.signal,
      redirect: "follow",
    });
    clearTimeout(timer);

    // Normalize per RFC 7480: 200 = exists, 404 = not found.
    // RoTLD also uses 400 for nonexistent names; rdap.org may proxy that.
    if (res.status === 200) return { status: "registered", source: url, http: 200 };
    if (res.status === 404) return { status: "available", source: url, http: 404 };
    if (res.status === 400) return { status: "available", source: url, http: 400 };
    if (res.status === 429 || res.status >= 500) {
      return { status: "unknown", source: url, http: res.status };
    }
    return { status: "unknown", source: url, http: res.status };
  } catch {
    return { status: "unknown", source: url };
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
  try { body = await req.json(); } catch { return json({ error: "Body invalid" }, 400); }

  const raw = (body as { name?: unknown; tld?: unknown }) ?? {};
  const nameInput = typeof raw.name === "string" ? raw.name.trim().toLowerCase() : "";
  const tldInput = typeof raw.tld === "string" ? raw.tld.trim().toLowerCase().replace(/^\./, "") : "";

  if (!ALLOWED_TLDS.has(tldInput)) return json({ error: "TLD nepermis" }, 400);
  if (nameInput.length < 2 || nameInput.length > 63 || !LABEL_RE.test(nameInput)) {
    return json({ error: "Nume invalid (2-63 caractere, doar a-z, 0-9 și cratimă)" }, 400);
  }

  const domain = `${nameInput}.${tldInput}`;
  const userAgent = req.headers.get("user-agent")?.slice(0, 500) ?? null;

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  // 1) Try cache: most recent log for same domain within TTL, only certain statuses.
  const cutoff = new Date(Date.now() - CACHE_TTL_MS).toISOString();
  const { data: cached } = await admin
    .from("domain_checks")
    .select("status, source, created_at")
    .eq("domain", domain)
    .in("status", ["available", "registered"])
    .gte("created_at", cutoff)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let status: Status;
  let source: string | null;
  let cachedFlag = false;

  if (cached) {
    status = cached.status as Status;
    source = cached.source ?? null;
    cachedFlag = true;
  } else {
    const r = await rdapLookup(domain, tldInput);
    status = r.status;
    source = r.source;

    // Log every fresh check (anonymized IP).
    const ipHash = ip === "unknown" ? null : await sha256(`${ip}:${Deno.env.get("SUPABASE_URL")}`);
    await admin.from("domain_checks").insert({
      domain, tld: tldInput, name: nameInput,
      status, source, user_agent: userAgent, ip_hash: ipHash,
    });
  }

  return json({
    domain,
    status,
    available: status === "available",
    label: { ro: status === "available" ? "Disponibil" : status === "registered" ? "Înregistrat" : "Necunoscut",
             en: status === "available" ? "Available"   : status === "registered" ? "Registered"   : "Unknown" },
    message: MESSAGES[status],
    cached: cachedFlag,
    source,
  });
});
