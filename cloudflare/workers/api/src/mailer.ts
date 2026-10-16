import type { Env } from "./types";
import { sendMailSmtp, type Attachment, type MailMessage } from "./smtp";

// Câmpuri opționale (nu union discriminat) pentru narrowing corect și fără `strictNullChecks`.
export type DeliveryResult = { delivered: boolean; error?: string };

const errorMessage = (error: unknown) => error instanceof Error ? error.message.slice(0, 500) : "Unknown email delivery error";

export function smtpConfigured(env: Env): boolean {
  return Boolean(env.SMTP_PASS && (env.SMTP_FROM || env.SMTP_USER));
}

export async function deliverMail(
  env: Env,
  message: Omit<MailMessage, "from"> & { from?: string; attachments?: Attachment[] },
): Promise<DeliveryResult> {
  const user = env.SMTP_USER || "api_token";
  const from = message.from || env.SMTP_FROM;
  if (!from) return { delivered: false, error: "Email sender is not configured" };

  // Keep the existing SMTP route available for accounts that configured it.
  // The native Email Sending binding needs no secret and can reach customer
  // addresses once avyron.ro is onboarded for outbound mail.
  if (!env.SMTP_PASS && env.TRANSACTIONAL_EMAIL) {
    try {
      const namedSender = /^\s*([^<>]+?)\s*<([^<>]+)>\s*$/.exec(from);
      await env.TRANSACTIONAL_EMAIL.send({
        to: message.to,
        from: namedSender ? { name: namedSender[1].trim(), email: namedSender[2].trim() } : from,
        replyTo: message.replyTo,
        subject: message.subject,
        text: message.text,
        html: message.html,
        attachments: message.attachments?.map((attachment) => ({
          disposition: "attachment" as const,
          filename: attachment.filename,
          type: attachment.contentType,
          content: attachment.content,
        })),
      });
      return { delivered: true };
    } catch (error) {
      return { delivered: false, error: errorMessage(error) };
    }
  }
  if (!env.SMTP_PASS) return { delivered: false, error: "Email sending is not configured" };

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
    crypto.randomUUID(), input.kind, input.entityId || null, input.recipient,
    env.SMTP_PASS ? "smtp" : env.TRANSACTIONAL_EMAIL ? "cloudflare_email" : "unconfigured",
    input.result.delivered ? "sent" : "failed",
    input.result.delivered ? null : input.result.error,
    Date.now(),
  ).run();
}
