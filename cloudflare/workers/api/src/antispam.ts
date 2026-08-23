// Protecție anti-spam pentru formularele publice.
//   • rate limiting pe IP + pe email, cu contoare în KV (fixed window)
//   • verificare Cloudflare Turnstile (dacă TURNSTILE_SECRET e setat)
//   • honeypot (câmp ascuns care trebuie să rămână gol)

export type RateRule = { key: string; limit: number; windowSec: number };

export type RateResult = { ok: true } | { ok: false; retryAfter: number };

export async function checkRateLimit(kv: KVNamespace, rules: RateRule[]): Promise<RateResult> {
  for (const rule of rules) {
    const bucket = Math.floor(Date.now() / 1000 / rule.windowSec);
    const key = `rl:${rule.key}:${bucket}`;
    let count = 0;
    try {
      count = parseInt((await kv.get(key)) || "0", 10) || 0;
    } catch {
      continue; // KV indisponibil → nu blocăm utilizatorii legitimi
    }
    if (count >= rule.limit) {
      const nextWindow = (bucket + 1) * rule.windowSec;
      return { ok: false, retryAfter: Math.max(1, nextWindow - Math.floor(Date.now() / 1000)) };
    }
    try {
      await kv.put(key, String(count + 1), { expirationTtl: Math.max(60, rule.windowSec + 60) });
    } catch {
      /* best effort */
    }
  }
  return { ok: true };
}

export async function verifyTurnstile(
  secret: string | undefined,
  token: string,
  ip: string,
  options: { expectedAction?: string; allowedHostnames?: string } = {},
): Promise<{ ok: boolean; reason?: string }> {
  if (!secret) return { ok: true, reason: "disabled" }; // neconfigurat → nu blocăm
  if (!token) return { ok: false, reason: "missing-token" };
  try {
    const body = new FormData();
    body.append("secret", secret);
    body.append("response", token);
    if (ip) body.append("remoteip", ip);
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body,
    });
    const data = (await res.json()) as { success?: boolean; action?: string; hostname?: string; "error-codes"?: string[] };
    if (!data.success) return { ok: false, reason: (data["error-codes"] || []).join(",") || "failed" };
    if (options.expectedAction && data.action !== options.expectedAction) return { ok: false, reason: "action-mismatch" };
    const allowed = (options.allowedHostnames || "").split(",").map((value) => value.trim().toLowerCase()).filter(Boolean);
    const hostname = data.hostname?.toLowerCase() || "";
    const hostnameAllowed = allowed.some((pattern) =>
      pattern.startsWith("*.") ? hostname.endsWith(pattern.slice(1)) : hostname === pattern,
    );
    if (allowed.length && !hostnameAllowed) {
      return { ok: false, reason: "hostname-mismatch" };
    }
    return { ok: true };
  } catch (e) {
    console.error("turnstile verify error", e);
    return { ok: false, reason: "verify-error" };
  }
}

export const clientIp = (req: Request) =>
  req.headers.get("CF-Connecting-IP") || req.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() || "unknown";

export async function hashKey(value: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(buf)].slice(0, 10).map((b) => b.toString(16).padStart(2, "0")).join("");
}
