// Protecție anti-spam pentru formularele publice.
//   • burst limiting la edge + ferestre exacte în D1
//   • verificare Cloudflare Turnstile (dacă TURNSTILE_SECRET e setat)
//   • honeypot (câmp ascuns care trebuie să rămână gol)

export type RateRule = { key: string; limit: number; windowSec: number };

export type RateResult = { ok: true } | { ok: false; retryAfter: number };

export async function checkRateLimit(
  db: D1Database,
  rules: RateRule[],
  burst?: { limiter: RateLimit; key: string },
): Promise<RateResult> {
  if (burst) {
    try {
      const { success } = await burst.limiter.limit({ key: burst.key });
      if (!success) return { ok: false, retryAfter: 60 };
    } catch (error) {
      // The atomic D1 window below remains the security boundary if the
      // low-latency edge limiter is temporarily unavailable.
      console.error("edge rate limiter unavailable", error);
    }
  }

  const timestamp = Math.floor(Date.now() / 1000);
  for (const rule of rules) {
    const windowStart = Math.floor(timestamp / rule.windowSec) * rule.windowSec;
    const row = await db.prepare(
      `INSERT INTO rate_limit_counters (scope_key,window_start,count,expires_at)
       VALUES (?,?,1,?)
       ON CONFLICT(scope_key,window_start)
       DO UPDATE SET count = rate_limit_counters.count + 1
       RETURNING count`,
    ).bind(`rate:v1:${rule.key}`, windowStart, windowStart + rule.windowSec + 300).first<{ count: number }>();
    if ((row?.count || 1) > rule.limit) {
      return { ok: false, retryAfter: Math.max(1, windowStart + rule.windowSec - timestamp) };
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
