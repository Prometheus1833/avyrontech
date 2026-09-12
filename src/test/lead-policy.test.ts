import { describe, expect, it } from "vitest";
import { coarseLeadStatus, normalizedLeadPhone, validateNewLead } from "../../cloudflare/workers/api/src/leadPolicy";

describe("lead policy", () => {
  it("normalizes contact data and accepts a bounded manual lead", () => {
    const result = validateNewLead({
      name: "  Ana Popescu  ",
      email: " ANA@EXAMPLE.RO ",
      phone: "+40 (721) 123-456",
      website: "https://example.ro/oferta#contact",
      source: "manual",
      preferredChannel: "whatsapp",
      estimateRon: 5000,
    });
    expect(result).toMatchObject({
      ok: true,
      value: {
        name: "Ana Popescu",
        email: "ana@example.ro",
        website: "https://example.ro/oferta",
        preferredChannel: "whatsapp",
        estimateRon: 5000,
      },
    });
    expect(normalizedLeadPhone("+40 (721) 123-456")).toBe("40721123456");
  });

  it("rejects missing identity, unsafe URLs and invalid channels", () => {
    expect(validateNewLead({ email: "contact@example.ro" })).toMatchObject({ ok: false, code: "missing_identity" });
    expect(validateNewLead({ business: "Demo", website: "javascript:alert(1)" })).toMatchObject({ ok: false, code: "invalid_url" });
    expect(validateNewLead({ business: "Demo", preferredChannel: "telegram" })).toMatchObject({ ok: false, code: "invalid_channel" });
  });

  it("maps detailed stages to the compatible pipeline status", () => {
    expect(coarseLeadStatus("new_lead")).toBe("new");
    expect(coarseLeadStatus("discussion")).toBe("contacted");
    expect(coarseLeadStatus("offer")).toBe("qualified");
    expect(coarseLeadStatus("accepted")).toBe("won");
    expect(coarseLeadStatus("rejected")).toBe("lost");
  });
});
