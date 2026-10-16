import { describe, expect, it, vi } from "vitest";
import { deliverMail } from "../../cloudflare/workers/api/src/mailer";
import type { Env } from "../../cloudflare/workers/api/src/types";

vi.mock("../../cloudflare/workers/api/src/smtp", () => ({ sendMailSmtp: vi.fn() }));

const message = {
  to: "client@example.com",
  subject: "Confirmă adresa",
  text: "Confirmă adresa.",
  html: "<p>Confirmă adresa.</p>",
};

describe("transactional account email", () => {
  it("uses the native Cloudflare binding when SMTP credentials are absent", async () => {
    const send = vi.fn().mockResolvedValue({ messageId: "email-1" });
    const env = { SMTP_FROM: "contact@avyron.ro", TRANSACTIONAL_EMAIL: { send } } as unknown as Env;

    expect(await deliverMail(env, message)).toEqual({ delivered: true });
    expect(send).toHaveBeenCalledWith({ ...message, from: "contact@avyron.ro", replyTo: undefined, attachments: undefined });
  });

  it("keeps a failed delivery visible so signup cannot claim a sent verification link", async () => {
    const send = vi.fn().mockRejectedValue(new Error("E_SENDER_NOT_VERIFIED"));
    const env = { SMTP_FROM: "contact@avyron.ro", TRANSACTIONAL_EMAIL: { send } } as unknown as Env;

    expect(await deliverMail(env, message)).toEqual({ delivered: false, error: "E_SENDER_NOT_VERIFIED" });
  });
});
