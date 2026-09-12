export const AI_PROJECT_OBJECTIVES = ["sales", "promotion", "visibility", "monetization", "community"] as const;
export const AI_PROJECT_AUTOMATION_MODES = ["manual", "approval", "automatic"] as const;
export const AI_PROJECT_STATUSES = ["setup", "active", "paused", "archived"] as const;
export const AI_CONTENT_FORMATS = ["post", "story", "reel", "carousel", "message", "article"] as const;
export const AI_CHANNEL_PROVIDERS = ["facebook", "instagram", "tiktok", "linkedin", "whatsapp", "messenger"] as const;

export type AiProjectObjective = (typeof AI_PROJECT_OBJECTIVES)[number];
export type AiProjectAutomationMode = (typeof AI_PROJECT_AUTOMATION_MODES)[number];
export type AiProjectStatus = (typeof AI_PROJECT_STATUSES)[number];
export type AiContentFormat = (typeof AI_CONTENT_FORMATS)[number];
export type AiChannelProvider = (typeof AI_CHANNEL_PROVIDERS)[number];

type Valid<T> = { ok: true; value: T };
type Invalid = { ok: false; code: string; field?: string };

const optionalText = (value: unknown, max: number) => {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value.length > max) return false;
  return value.trim();
};

export type AiProjectPatch = {
  status?: AiProjectStatus;
  primaryObjective?: AiProjectObjective;
  automationMode?: AiProjectAutomationMode;
  brandTone?: string;
  targetAudience?: string;
  coreOffer?: string;
  agentInstructions?: string;
  dailyGenerationLimit?: number;
  contentRetentionDays?: number;
  rawDataRetentionDays?: number;
  maxAssetBytes?: number;
  allowOutboundMessages?: boolean;
};

export function validateAiProjectPatch(input: unknown): Valid<AiProjectPatch> | Invalid {
  if (!input || typeof input !== "object" || Array.isArray(input)) return { ok: false, code: "bad_request" };
  const body = input as Record<string, unknown>;
  const value: AiProjectPatch = {};
  const enumField = <T extends string>(field: string, allowed: readonly T[]) => {
    if (body[field] === undefined) return true;
    if (typeof body[field] !== "string" || !allowed.includes(body[field] as T)) return false;
    return body[field] as T;
  };
  const status = enumField("status", AI_PROJECT_STATUSES);
  if (status === false) return { ok: false, code: "invalid_project_state", field: "status" };
  if (status !== true) value.status = status;
  const objective = enumField("primaryObjective", AI_PROJECT_OBJECTIVES);
  if (objective === false) return { ok: false, code: "invalid_project_state", field: "primaryObjective" };
  if (objective !== true) value.primaryObjective = objective;
  const automation = enumField("automationMode", AI_PROJECT_AUTOMATION_MODES);
  if (automation === false) return { ok: false, code: "invalid_project_state", field: "automationMode" };
  if (automation !== true) value.automationMode = automation;

  for (const [wire, target, max] of [
    ["brandTone", "brandTone", 1_000], ["targetAudience", "targetAudience", 2_000],
    ["coreOffer", "coreOffer", 2_000], ["agentInstructions", "agentInstructions", 8_000],
  ] as const) {
    const result = optionalText(body[wire], max);
    if (result === false) return { ok: false, code: "invalid_project_field", field: wire };
    if (result !== undefined) value[target] = result;
  }

  const boundedInteger = (field: string, min: number, max: number) => {
    if (body[field] === undefined) return undefined;
    const number = Number(body[field]);
    return Number.isSafeInteger(number) && number >= min && number <= max ? number : false;
  };
  for (const [wire, target, min, max] of [
    ["dailyGenerationLimit", "dailyGenerationLimit", 0, 100],
    ["contentRetentionDays", "contentRetentionDays", 7, 365],
    ["rawDataRetentionDays", "rawDataRetentionDays", 1, 30],
    ["maxAssetBytes", "maxAssetBytes", 1_000_000, 100_000_000],
  ] as const) {
    const result = boundedInteger(wire, min, max);
    if (result === false) return { ok: false, code: "invalid_project_field", field: wire };
    if (result !== undefined) value[target] = result;
  }
  if (body.allowOutboundMessages !== undefined) {
    if (typeof body.allowOutboundMessages !== "boolean") {
      return { ok: false, code: "invalid_project_field", field: "allowOutboundMessages" };
    }
    value.allowOutboundMessages = body.allowOutboundMessages;
  }
  if (!Object.keys(value).length) return { ok: false, code: "nothing_to_update" };
  return { ok: true, value };
}

export type ContentGenerationRequest = {
  format: AiContentFormat;
  channel: AiChannelProvider;
  topic: string;
  objective: AiProjectObjective;
  context: string;
};

export function validateContentGeneration(input: unknown): Valid<ContentGenerationRequest> | Invalid {
  if (!input || typeof input !== "object" || Array.isArray(input)) return { ok: false, code: "bad_request" };
  const body = input as Record<string, unknown>;
  const format = String(body.format || "");
  const channel = String(body.channel || "");
  const objective = String(body.objective || "");
  const topic = typeof body.topic === "string" ? body.topic.trim() : "";
  const context = typeof body.context === "string" ? body.context.trim() : "";
  if (!(AI_CONTENT_FORMATS as readonly string[]).includes(format)) return { ok: false, code: "invalid_format", field: "format" };
  if (!(AI_CHANNEL_PROVIDERS as readonly string[]).includes(channel)) return { ok: false, code: "invalid_channel", field: "channel" };
  if (!(AI_PROJECT_OBJECTIVES as readonly string[]).includes(objective)) return { ok: false, code: "invalid_objective", field: "objective" };
  if (topic.length < 3 || topic.length > 500) return { ok: false, code: "invalid_topic", field: "topic" };
  if (context.length > 2_000) return { ok: false, code: "invalid_context", field: "context" };
  return {
    ok: true,
    value: {
      format: format as AiContentFormat,
      channel: channel as AiChannelProvider,
      objective: objective as AiProjectObjective,
      topic,
      context,
    },
  };
}

export const contentExpiry = (createdAt: number, retentionDays: number) =>
  createdAt + Math.max(7, Math.min(365, retentionDays)) * 86_400_000;

export type GeneratedContent = {
  title: string;
  caption: string;
  visualDirection: string;
  cta: string;
  hashtags: string[];
};

export function parseGeneratedContent(raw: string): GeneratedContent {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  let parsed: Record<string, unknown> = {};
  try { parsed = JSON.parse(cleaned) as Record<string, unknown>; } catch { parsed = { caption: cleaned }; }
  const take = (key: string, max: number, fallback = "") =>
    (typeof parsed[key] === "string" ? parsed[key] as string : fallback).trim().slice(0, max);
  const hashtags = Array.isArray(parsed.hashtags)
    ? parsed.hashtags.filter((item): item is string => typeof item === "string")
      .map((item) => item.trim().replace(/^#/, "").slice(0, 60)).filter(Boolean).slice(0, 16)
    : [];
  return {
    title: take("title", 180, "Ciornă AI"),
    caption: take("caption", 5_000, cleaned.slice(0, 5_000)),
    visualDirection: take("visualDirection", 2_000),
    cta: take("cta", 500),
    hashtags: [...new Set(hashtags)],
  };
}
