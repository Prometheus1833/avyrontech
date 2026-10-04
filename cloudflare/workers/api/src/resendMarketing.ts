import { Webhook } from "svix";
import type { Env } from "./types";

const RESEND_API = "https://api.resend.com";
const UNSUBSCRIBE_MARKER = "{{{RESEND_UNSUBSCRIBE_URL}}}";

export type MarketingContact = {
  email: string;
  name: string | null;
  language: "ro" | "en";
  interest: string | null;
};

type ResendResponse = Record<string, unknown> & { id?: string; message?: string; name?: string };

export class ResendMarketingError extends Error {
  constructor(message: string, readonly status = 502) {
    super(message);
    this.name = "ResendMarketingError";
  }
}

export const resendMarketingStatus = (env: Env) => ({
  configured: Boolean(env.RESEND_API_KEY && env.RESEND_MARKETING_SEGMENT_ID && env.RESEND_MARKETING_FROM),
  apiKey: Boolean(env.RESEND_API_KEY),
  segment: Boolean(env.RESEND_MARKETING_SEGMENT_ID),
  sender: Boolean(env.RESEND_MARKETING_FROM),
  webhook: Boolean(env.RESEND_WEBHOOK_SECRET),
  isolatedSender: Boolean(env.RESEND_MARKETING_FROM && env.SMTP_FROM && (() => {
    const sender = env.RESEND_MARKETING_FROM?.match(/@([^>\s]+)/)?.[1]?.toLowerCase();
    const essential = env.SMTP_FROM?.match(/@([^>\s]+)/)?.[1]?.toLowerCase();
    return sender && essential && sender !== essential;
  })()),
});

const requireConfig = (env: Env) => {
  if (!env.RESEND_API_KEY || !env.RESEND_MARKETING_SEGMENT_ID || !env.RESEND_MARKETING_FROM) {
    throw new ResendMarketingError("Resend marketing nu este configurat complet", 503);
  }
  return {
    apiKey: env.RESEND_API_KEY,
    segmentId: env.RESEND_MARKETING_SEGMENT_ID,
    from: env.RESEND_MARKETING_FROM,
  };
};

async function resendRequest(
  env: Env,
  path: string,
  init: { method?: string; body?: Record<string, unknown>; allow?: number[] } = {},
): Promise<{ status: number; data: ResendResponse }> {
  const { apiKey } = requireConfig(env);
  const response = await fetch(`${RESEND_API}${path}`, {
    method: init.method || "GET",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
      "user-agent": "avyron-newsletter-worker/1.0",
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
    signal: AbortSignal.timeout(12_000),
  });
  const data: ResendResponse = await response.json<ResendResponse>().catch(() => ({} as ResendResponse));
  if (!response.ok && !(init.allow || []).includes(response.status)) {
    const detail = String(data.message || data.name || `HTTP ${response.status}`).slice(0, 300);
    throw new ResendMarketingError(`Resend: ${detail}`, response.status >= 500 ? 502 : response.status);
  }
  return { status: response.status, data };
}

const firstName = (name: string | null) => name?.trim().split(/\s+/)[0]?.slice(0, 80) || undefined;

export async function syncResendContact(env: Env, contact: MarketingContact): Promise<string | null> {
  const { segmentId } = requireConfig(env);
  const payload: Record<string, unknown> = {
    email: contact.email,
    unsubscribed: false,
    segments: [{ id: segmentId }],
  };
  const givenName = firstName(contact.name);
  if (givenName) payload.first_name = givenName;

  const created = await resendRequest(env, "/contacts", { method: "POST", body: payload, allow: [409] });
  if (created.status !== 409) return typeof created.data.id === "string" ? created.data.id : null;

  const identifier = encodeURIComponent(contact.email);
  const updated = await resendRequest(env, `/contacts/${identifier}`, {
    method: "PATCH",
    body: { unsubscribed: false },
  });
  await resendRequest(env, `/contacts/${identifier}/segments/${encodeURIComponent(segmentId)}`, {
    method: "POST",
    allow: [409],
  });
  return typeof updated.data.id === "string" ? updated.data.id : null;
}

export async function suppressResendContact(env: Env, email: string): Promise<void> {
  if (!resendMarketingStatus(env).configured) return;
  const { segmentId } = requireConfig(env);
  const identifier = encodeURIComponent(email);
  await resendRequest(env, `/contacts/${identifier}`, {
    method: "PATCH",
    body: { unsubscribed: true },
    allow: [404],
  });
  await resendRequest(env, `/contacts/${identifier}/segments/${encodeURIComponent(segmentId)}`, {
    method: "DELETE",
    allow: [404],
  });
}

const escapeHtml = (value: string) => value
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#039;");

export function campaignHtml(input: { content: string; preheader?: string; language: "ro" | "en" | "all" }) {
  const content = input.content.split(/\n{2,}/).map((paragraph) =>
    `<p style="margin:0 0 18px;line-height:1.7">${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`,
  ).join("");
  const unsubscribe = input.language === "en"
    ? { reason: "You are receiving this because you subscribed to AVYRON.", action: "Unsubscribe" }
    : { reason: "Primești acest mesaj deoarece te-ai abonat la AVYRON.", action: "Dezabonare" };
  return `<!doctype html><html><body style="margin:0;background:#070b14;color:#e5e7eb;font-family:Arial,sans-serif"><div style="display:none;max-height:0;overflow:hidden">${escapeHtml(input.preheader || "")}</div><main style="max-width:640px;margin:0 auto;padding:40px 24px"><div style="font-weight:700;letter-spacing:.16em;color:#a78bfa;margin-bottom:32px">AVYRON</div>${content}<footer style="margin-top:36px;padding-top:20px;border-top:1px solid #253047;color:#94a3b8;font-size:12px">${unsubscribe.reason} <a href="${UNSUBSCRIBE_MARKER}" style="color:#c4b5fd">${unsubscribe.action}</a>.</footer></main></body></html>`;
}

export async function createResendBroadcast(env: Env, input: {
  name: string;
  subject: string;
  preheader?: string;
  content: string;
  language: "ro" | "en" | "all";
}): Promise<string> {
  const { segmentId, from } = requireConfig(env);
  const { data } = await resendRequest(env, "/broadcasts", {
    method: "POST",
    body: {
      segment_id: segmentId,
      from,
      name: input.name,
      subject: input.subject,
      html: campaignHtml(input),
      text: `${input.content}\n\n${input.language === "en" ? "Unsubscribe" : "Dezabonare"}: ${UNSUBSCRIBE_MARKER}`,
    },
  });
  if (typeof data.id !== "string") throw new ResendMarketingError("Resend nu a returnat identificatorul draftului");
  return data.id;
}

export async function sendResendBroadcast(env: Env, broadcastId: string, scheduledAt?: string): Promise<string> {
  const { data } = await resendRequest(env, `/broadcasts/${encodeURIComponent(broadcastId)}/send`, {
    method: "POST",
    body: scheduledAt ? { scheduled_at: scheduledAt } : {},
  });
  return typeof data.id === "string" ? data.id : broadcastId;
}

export type ResendWebhookEvent = {
  type: string;
  created_at?: string;
  data?: Record<string, unknown> & { email?: string; unsubscribed?: boolean; to?: string[]; broadcast_id?: string };
};

export function verifyResendWebhook(env: Env, payload: string, headers: Headers): ResendWebhookEvent {
  if (!env.RESEND_WEBHOOK_SECRET) throw new ResendMarketingError("Webhook Resend neconfigurat", 503);
  const verified = new Webhook(env.RESEND_WEBHOOK_SECRET).verify(payload, {
    "svix-id": headers.get("svix-id") || "",
    "svix-timestamp": headers.get("svix-timestamp") || "",
    "svix-signature": headers.get("svix-signature") || "",
  });
  if (!verified || typeof verified !== "object") throw new Error("Invalid webhook payload");
  return verified as ResendWebhookEvent;
}
