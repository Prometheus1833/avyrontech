/** Portable deployment policy. It never grants application roles or enables MFA. */
export interface SecurityBoundaryEnv {
  SECURITY_BOUNDARY_MODE?: string;
  ADMIN_HOSTNAME?: string;
  SECURITY_ACCESS_TEAM_DOMAIN?: string;
  SECURITY_ACCESS_AUD?: string;
  SECURITY_SERVICE_BINDINGS?: string;
  SECURITY_BREAK_GLASS?: string;
  SECURITY_CSP_MODE?: string;
}
export type BoundaryMode = "off" | "observe" | "enforce";
export function boundaryPolicy(env: SecurityBoundaryEnv) {
  const rawMode = env.SECURITY_BOUNDARY_MODE || "off";
  const mode: BoundaryMode =
    rawMode === "off" || rawMode === "observe" ? rawMode : "enforce";
  const hostname = (env.ADMIN_HOSTNAME || "").trim().toLowerCase();
  const issuer = (env.SECURITY_ACCESS_TEAM_DOMAIN || "").replace(/\/$/, "");
  const audience = env.SECURITY_ACCESS_AUD || "";
  const errors: string[] = [];
  if (!["off", "observe", "enforce"].includes(rawMode))
    errors.push("invalid_mode");
  if (
    !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(hostname)
  )
    errors.push("invalid_admin_hostname");
  if (
    !/^https:\/\/[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.cloudflareaccess\.com$/.test(
      issuer,
    )
  )
    errors.push("invalid_access_issuer");
  if (!/^[A-Za-z0-9_-]{16,256}$/.test(audience))
    errors.push("invalid_access_audience");
  return {
    mode,
    hostname,
    issuer,
    audience,
    errors,
    configured: errors.length === 0,
  };
}

export function internalPage(path: string) {
  // React Router accepts case variations and encoded path segments. The outer
  // HTML boundary must classify those URLs exactly as the client router does.
  try {
    path = decodeURIComponent(path).toLowerCase();
  } catch {
    return false;
  }
  return ["/intern", "/staff", "/admin"].some(
    (prefix) => path === prefix || path.startsWith(prefix + "/"),
  );
}

/** These are exclusively internal surfaces. Mixed customer routes retain resource RBAC. */
export function internalApi(path: string) {
  return [
    "/api/admin",
    "/api/internal",
    "/api/os",
    "/api/leads",
    "/api/future-leads",
    "/api/ai-projects",
    "/api/staff-access",
    "/api/skills",
    "/api/antivirus",
    "/api/ai/admin",
    "/api/newsletter/admin",
    "/api/produse/admin",
    "/api/logo-studio/admin",
  ].some((prefix) => path === prefix || path.startsWith(prefix + "/"));
}

export function safeSecurityMetadata(value: Record<string, unknown>) {
  const result: Record<string, unknown> = {};
  const text = (item: string) =>
    item
      .slice(0, 160)
      .replace(/Bearer\s+[^\s]+/gi, "[redacted]")
      .replace(/cfast_[A-Za-z0-9]+/g, "[redacted]");
  // Metadata is deliberately shallow: request bodies, provider replies and
  // arbitrary nested objects must never enter the authentication audit stream.
  for (const [key, item] of Object.entries(value)) {
    if (
      /password|secret|token|authorization|cookie|credential|body|query|email|phone|address/i.test(
        key,
      )
    )
      continue;
    if (
      typeof item === "boolean" ||
      (typeof item === "number" && Number.isFinite(item))
    )
      result[key] = item;
    else if (typeof item === "string") result[key] = text(item);
    else if (
      Array.isArray(item) &&
      item.length <= 30 &&
      item.every(
        (entry) =>
          typeof entry === "string" ||
          typeof entry === "boolean" ||
          (typeof entry === "number" && Number.isFinite(entry)),
      )
    )
      result[key] = item.map((entry) =>
        typeof entry === "string" ? text(entry) : entry,
      );
  }
  return result;
}
