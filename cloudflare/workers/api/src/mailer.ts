import type { Env } from "./types";
import { sendMailSmtp, type Attachment, type MailMessage } from "./smtp";

export type DeliveryResult = { delivered: true } | { delivered: false; error: string };

const errorMessage = (error: unknown) => error instanceof Error ? error.message.slice(0, 500) : "Unknown SMTP error";

export function smtpConfigured(env: Env): boolean {
  return Boolean(env.SMTP_PASS && (env.SMTP_FROM || env.SMTP_USER));
}

export async function deliverMail(
  env: Env,
  message: Omit<MailMessage, "from"> & { from?: string; attachments?: Attachment[] },
): Promise<DeliveryResult> {
  const user = env.SMTP_USER || "api_token";
  const from = message.from || env.SMTP_FROM;
  if (!env.SMTP_PASS || !from) return { delivered: false, error: "SMTP is not configured" };

  try {
    await sendMailSmtp(
      {
        host: env.SMTP_HOST || "smtp.mx.cloudflare.net",
        port: Number(env.SMTP_PORT || 465),
        user,
        pass: env.SMTP_PASS,
      },
      { ...message, from },
    );
    return { delivered: true };
  } catch (error) {
    return { delivered: false, error: errorMessage(error) };
  }
}

export async function logDelivery(
  env: Env,
  input: { kind: string; entityId?: string; recipient: string; result: DeliveryResult },
): Promise<void> {
  await env.DB.prepare(
    "INSERT INTO email_delivery_log (id,kind,entity_id,recipient,provider,status,error,created_at) VALUES (?,?,?,?,?,?,?,?)",
  ).bind(
    crypto.randomUUID(), input.kind, input.entityId || null, input.recipient, "smtp",
    input.result.delivered ? "sent" : "failed",
    input.result.delivered ? null : input.result.error,
    Date.now(),
  ).run();
}
