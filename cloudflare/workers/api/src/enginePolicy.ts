export const ENGINE_SOURCE_TYPES = ["website", "platform", "marketplace", "repository", "documentation", "api", "mcp"] as const;
export const ENGINE_ACCESS_MODES = ["public", "account_required", "oauth", "api_key", "mixed"] as const;
export const ENGINE_PRICING_MODELS = ["free", "freemium", "paid", "mixed", "unknown"] as const;
export const ENGINE_SOURCE_STATUSES = ["suggested", "reviewing", "approved", "active", "paused", "rejected", "archived"] as const;
export const ENGINE_CAPABILITY_CATEGORIES = ["ui_component", "section", "template", "effect", "animation", "prompt", "agent", "ai_tool", "integration", "api", "mcp", "plugin", "skill", "repository", "documentation", "asset"] as const;

type Valid<T> = { ok: true; value: T };
type Invalid = { ok: false; code: string; field?: string };

const boundedText = (value: unknown, max: number, required = false): string | null | false => {
  if (value === undefined || value === null) return required ? false : null;
  if (typeof value !== "string") return false;
  const normalized = value.trim();
  if (normalized.length > max || (required && !normalized)) return false;
  return normalized || null;
};

const isPrivateIpv4 = (host: string) => {
  const parts = host.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  return parts[0] === 10 || parts[0] === 127 || parts[0] === 0 ||
    (parts[0] === 169 && parts[1] === 254) ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
    (parts[0] === 192 && parts[1] === 168) || parts[0] >= 224;
};

/** Canonicalises externally supplied URLs and blocks obvious SSRF targets. */
export function normalizeEngineUrl(input: unknown): string | null {
  if (typeof input !== "string" || input.length > 2_048) return null;
  try {
    const url = new URL(input.trim());
    const host = url.hostname.toLowerCase();
    if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443")) return null;
    if (!host.includes(".") || host === "localhost" || host.endsWith(".local") || host.endsWith(".internal") || host.startsWith("[") || isPrivateIpv4(host)) return null;
    url.hostname = host;
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

export type EngineSourceCreate = {
  name: string; canonicalUrl: string; sourceType: string; accessMode: string;
  pricingModel: string; summary: string; accountLabel: string | null;
};

export function validateEngineSourceCreate(input: unknown): Valid<EngineSourceCreate> | Invalid {
  if (!input || typeof input !== "object" || Array.isArray(input)) return { ok: false, code: "bad_request" };
  const body = input as Record<string, unknown>;
  const name = boundedText(body.name, 160, true);
  const summary = boundedText(body.summary, 2_000) ?? "";
  const accountLabel = boundedText(body.accountLabel, 180);
  const canonicalUrl = normalizeEngineUrl(body.canonicalUrl);
  const sourceType = String(body.sourceType || "website");
  const accessMode = String(body.accessMode || "public");
  const pricingModel = String(body.pricingModel || "unknown");
  if (name === false || name === null || summary === false || accountLabel === false || !canonicalUrl) return { ok: false, code: "invalid_field" };
  if (!(ENGINE_SOURCE_TYPES as readonly string[]).includes(sourceType)) return { ok: false, code: "invalid_source_type", field: "sourceType" };
  if (!(ENGINE_ACCESS_MODES as readonly string[]).includes(accessMode)) return { ok: false, code: "invalid_access_mode", field: "accessMode" };
  if (!(ENGINE_PRICING_MODELS as readonly string[]).includes(pricingModel)) return { ok: false, code: "invalid_pricing_model", field: "pricingModel" };
  return { ok: true, value: { name, canonicalUrl, sourceType, accessMode, pricingModel, summary: summary || "", accountLabel } };
}

export type EngineSourcePatch = {
  name?: string; summary?: string; lifecycleStatus?: string; verificationStatus?: string;
  securityStatus?: string; accessMode?: string; pricingModel?: string; accountLabel?: string | null;
  robotsReviewed?: boolean; termsReviewed?: boolean; discoveryEnabled?: boolean;
};

export function validateEngineSourcePatch(input: unknown): Valid<EngineSourcePatch> | Invalid {
  if (!input || typeof input !== "object" || Array.isArray(input)) return { ok: false, code: "bad_request" };
  const body = input as Record<string, unknown>, value: EngineSourcePatch = {};
  if (body.name !== undefined) { const parsed = boundedText(body.name, 160, true); if (parsed === false || parsed === null) return { ok: false, code: "invalid_name" }; value.name = parsed; }
  if (body.summary !== undefined) { const parsed = boundedText(body.summary, 2_000); if (parsed === false) return { ok: false, code: "invalid_summary" }; value.summary = parsed || ""; }
  if (body.accountLabel !== undefined) { const parsed = boundedText(body.accountLabel, 180); if (parsed === false) return { ok: false, code: "invalid_account_label" }; value.accountLabel = parsed; }
  if (body.lifecycleStatus !== undefined) { const parsed = String(body.lifecycleStatus); if (!(ENGINE_SOURCE_STATUSES as readonly string[]).includes(parsed)) return { ok: false, code: "invalid_status" }; value.lifecycleStatus = parsed; }
  if (body.verificationStatus !== undefined) { const parsed = String(body.verificationStatus); if (!["unverified","observed","verified","stale","blocked"].includes(parsed)) return { ok: false, code: "invalid_verification" }; value.verificationStatus = parsed; }
  if (body.securityStatus !== undefined) { const parsed = String(body.securityStatus); if (!["pending","reviewed","restricted","blocked"].includes(parsed)) return { ok: false, code: "invalid_security" }; value.securityStatus = parsed; }
  if (body.accessMode !== undefined) { const parsed = String(body.accessMode); if (!(ENGINE_ACCESS_MODES as readonly string[]).includes(parsed)) return { ok: false, code: "invalid_access_mode" }; value.accessMode = parsed; }
  if (body.pricingModel !== undefined) { const parsed = String(body.pricingModel); if (!(ENGINE_PRICING_MODELS as readonly string[]).includes(parsed)) return { ok: false, code: "invalid_pricing_model" }; value.pricingModel = parsed; }
  for (const [field, key] of [["robotsReviewed", "robotsReviewed"], ["termsReviewed", "termsReviewed"], ["discoveryEnabled", "discoveryEnabled"]] as const) {
    if (body[field] !== undefined) { if (typeof body[field] !== "boolean") return { ok: false, code: "invalid_boolean", field }; value[key] = body[field]; }
  }
  if (!Object.keys(value).length) return { ok: false, code: "empty_patch" };
  return { ok: true, value };
}

export function slugifyEngineSource(name: string) {
  return name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 72) || "source";
}

export type PageEvidence = { title: string; description: string; text: string; links: string[] };

const decodeEntities = (value: string) => value
  .replace(/&amp;/gi, "&").replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'")
  .replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&nbsp;/gi, " ");

export function extractPageEvidence(html: string, baseUrl: string): PageEvidence {
  const title = decodeEntities(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() || "").slice(0, 200);
  const description = decodeEntities(html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i)?.[1] || "").slice(0, 500);
  const links = new Set<string>();
  const anchor = /<a\b[^>]*\bhref\s*=\s*["']([^"']+)["']/gi;
  let match: RegExpExecArray | null;
  while ((match = anchor.exec(html)) && links.size < 80) {
    try {
      const normalized = normalizeEngineUrl(new URL(decodeEntities(match[1]), baseUrl).toString());
      if (normalized) links.add(normalized);
    } catch { /* malformed link */ }
  }
  const text = decodeEntities(html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|svg)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()).slice(0, 16_000);
  return { title, description, text, links: [...links] };
}

export type ScoutSuggestion = { name: string; canonicalUrl: string; sourceType: string; rationale: string };

export function parseScoutSuggestions(raw: string, allowedUrls: string[]): ScoutSuggestion[] {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  let value: unknown;
  try { value = JSON.parse(cleaned); } catch { return []; }
  const rows = Array.isArray(value) ? value : (value && typeof value === "object" ? (value as { suggestions?: unknown }).suggestions : null);
  if (!Array.isArray(rows)) return [];
  const allowed = new Set(allowedUrls);
  const output: ScoutSuggestion[] = [];
  for (const item of rows.slice(0, 5)) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const name = boundedText(row.name, 160, true), rationale = boundedText(row.rationale, 800, true);
    const canonicalUrl = normalizeEngineUrl(row.canonicalUrl), sourceType = String(row.sourceType || "website");
    if (name === false || name === null || rationale === false || rationale === null || !canonicalUrl || !allowed.has(canonicalUrl)) continue;
    if (!(ENGINE_SOURCE_TYPES as readonly string[]).includes(sourceType)) continue;
    output.push({ name, canonicalUrl, sourceType, rationale });
  }
  return output;
}

export function inspectEngineDocument(bytes: Uint8Array, declaredType: string) {
  const pdf = bytes.length >= 5 && new TextDecoder().decode(bytes.slice(0, 5)) === "%PDF-";
  const png = bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  const jpeg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const textType = ["text/plain", "text/markdown", "application/json"].includes(declaredType);
  if (pdf) return "application/pdf";
  if (png) return "image/png";
  if (jpeg) return "image/jpeg";
  if (textType) {
    const sample = bytes.slice(0, Math.min(bytes.length, 16_384));
    if (sample.some((byte) => byte === 0)) return null;
    if (declaredType === "application/json") { try { JSON.parse(new TextDecoder("utf-8", { fatal: true, ignoreBOM: false }).decode(bytes)); } catch { return null; } }
    return declaredType;
  }
  return null;
}
