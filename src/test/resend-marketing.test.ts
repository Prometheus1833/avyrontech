// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  campaignHtml,
  createResendBroadcast,
  resendMarketingStatus,
  suppressResendContact,
  syncResendContact,
} from "../../cloudflare/workers/api/src/resendMarketing";
import type { Env } from "../../cloudflare/workers/api/src/types";

const env = {
  RESEND_API_KEY: "test-key",
  RESEND_MARKETING_SEGMENT_ID: "segment-1",
  RESEND_MARKETING_FROM: "AVYRON <newsletter@news.avyron.ro>",
  SMTP_FROM: "contact@avyron.ro",
} as Env;

afterEach(() => vi.restoreAllMocks());

describe("Resend marketing transport", () => {
  it("reports configuration without exposing secret values", () => {
    expect(resendMarketingStatus(env)).toMatchObject({ configured: true, apiKey: true, segment: true, sender: true, webhook: false, isolatedSender: true });
    expect(JSON.stringify(resendMarketingStatus(env))).not.toContain("test-key");
  });

  it("creates a consented contact directly in the configured segment", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ id: "contact-1" }), { status: 200 }));
    await expect(syncResendContact(env, { email: "ana@example.ro", name: "Ana Pop", language: "ro", interest: "website" })).resolves.toBe("contact-1");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.resend.com/contacts");
    expect(JSON.parse(String(init?.body))).toMatchObject({ email: "ana@example.ro", unsubscribed: false, segments: [{ id: "segment-1" }] });
  });

  it("creates a draft broadcast with provider-managed unsubscribe and never auto-sends", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ id: "broadcast-1" }), { status: 200 }));
    await expect(createResendBroadcast(env, { name: "Octombrie", subject: "Idei AVYRON", content: "Salut!\n\nUn studiu nou.", language: "ro" })).resolves.toBe("broadcast-1");
    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(String(init?.body));
    expect(body).not.toHaveProperty("send");
    expect(body.segment_id).toBe("segment-1");
    expect(body.html).toContain("{{{RESEND_UNSUBSCRIBE_URL}}}");
  });

  it("escapes authored content and does nothing externally when Resend is absent", async () => {
    expect(campaignHtml({ content: "<script>alert(1)</script>", language: "ro" })).not.toContain("<script>");
    const fetchMock = vi.spyOn(globalThis, "fetch");
    await suppressResendContact({} as Env, "ana@example.ro");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
