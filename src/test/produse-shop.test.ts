import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { bucketForType, dayKey, effectiveAccess } from "../../cloudflare/workers/api/src/produseShop";
import { stripeSignatureValid } from "../../cloudflare/workers/api/src/produseCheckout";
import { issueFgoInvoice } from "../../cloudflare/workers/api/src/invoicingFgo";
import { ITEMS } from "@/features/produse/data/items";
import { PLANS, PROGRESSION } from "@/features/produse/data/plans";

/**
 * Testele părții de comerț: aici se decid banii și accesul, deci fiecare regulă
 * din pagină („o a doua copiere în aceeași zi nu consumă”, „Studio coboară în
 * Pro după 60 de zile”, „plata nu merge fără chei”) are un test care cade dacă
 * cineva o schimbă din greșeală.
 */

const day = 86400000;

describe("limitele zilnice", () => {
  it("trimite fiecare tip de produs în coșul lui de limită", () => {
    expect(bucketForType("section")).toBe("sections");
    expect(bucketForType("template")).toBe("templates");
    // Restul tipurilor consumă din cota de componente — inclusiv cele noi.
    for (const type of ["component", "effect", "tool", "api", "doc", "logo", "necunoscut"]) {
      expect(bucketForType(type)).toBe("components");
    }
  });

  it("numără zilele după ora României, nu după UTC", () => {
    // 31 decembrie 22:30 UTC e deja 1 ianuarie la București.
    expect(dayKey(Date.UTC(2026, 11, 31, 22, 30))).toBe("2027-01-01");
    expect(dayKey(Date.UTC(2026, 5, 15, 12, 0))).toBe("2026-06-15");
  });
});

describe("progresia accesului", () => {
  const released = Date.UTC(2026, 0, 1);
  const studio = { access: "studio" as const, pro_at: released + 60 * day, free_at: released + 365 * day };
  const pro = { access: "pro" as const, pro_at: null, free_at: released + 365 * day };

  it("ține produsul Studio în Studio până la termen", () => {
    expect(effectiveAccess(studio, released + 59 * day)).toBe("studio");
    expect(effectiveAccess(studio, released + 61 * day)).toBe("pro");
  });

  it("coboară produsele în Free după un an", () => {
    expect(effectiveAccess(pro, released + 364 * day)).toBe("pro");
    expect(effectiveAccess(pro, released + 366 * day)).toBe("free");
    expect(effectiveAccess(studio, released + 366 * day)).toBe("free");
  });

  it("lasă produsele gratuite gratuite", () => {
    expect(effectiveAccess({ access: "free", pro_at: null, free_at: null }, Date.now())).toBe("free");
  });
});

describe("catalogul din D1", () => {
  const seed = readFileSync(resolve(__dirname, "../../cloudflare/d1/migrations/0033_produse_catalog_seed.sql"), "utf8");

  it("are un rând pentru fiecare produs din catalogul paginii", () => {
    for (const item of ITEMS) {
      expect(seed.includes(`('${item.slug}','${item.type}'`), `lipsește din migrare: ${item.slug}`).toBe(true);
    }
  });

  it("duce prețurile în bani, nu în lei", () => {
    const paid = ITEMS.find((item) => item.priceRon)!;
    expect(seed).toContain(`'${paid.slug}'`);
    expect(seed).toMatch(new RegExp(`'${paid.slug}'.*,${paid.priceRon! * 100},`));
  });

  it("ține limitele parteneriatelor identice cu cele afișate", () => {
    for (const plan of PLANS) {
      expect(seed).toContain(
        `('${plan.id}','${plan.name}',${plan.priceRon * 100},${plan.priceEur * 100},${plan.limits.components},${plan.limits.sections},${plan.limits.templates},`,
      );
    }
  });

  it("calculează termenele de progresie din aceleași reguli ca pagina", () => {
    const studio = ITEMS.find((item) => item.access === "studio")!;
    const released = new Date(`${studio.released}T00:00:00Z`).getTime();
    expect(seed).toContain(`,${released + PROGRESSION.proAfterDays * day},${released + PROGRESSION.freeAfterDays * day},`);
  });
});

describe("semnătura Stripe", () => {
  const secret = "whsec_test_123";
  const payload = JSON.stringify({ id: "evt_1", type: "checkout.session.completed" });

  const sign = async (timestampSeconds: number) => {
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestampSeconds}.${payload}`));
    return [...new Uint8Array(mac)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  };

  it("acceptă o semnătură validă și proaspătă", async () => {
    const now = Date.now();
    const seconds = Math.floor(now / 1000);
    expect(await stripeSignatureValid(secret, `t=${seconds},v1=${await sign(seconds)}`, payload, now)).toBe(true);
  });

  it("refuză semnătura greșită, corpul modificat și evenimentul vechi", async () => {
    const now = Date.now();
    const seconds = Math.floor(now / 1000);
    const valid = await sign(seconds);
    expect(await stripeSignatureValid(secret, `t=${seconds},v1=${"0".repeat(valid.length)}`, payload, now)).toBe(false);
    expect(await stripeSignatureValid(secret, `t=${seconds},v1=${valid}`, `${payload} `, now)).toBe(false);
    // Reluare la mai mult de 5 minute după emitere.
    expect(await stripeSignatureValid(secret, `t=${seconds - 400},v1=${await sign(seconds - 400)}`, payload, now)).toBe(false);
    expect(await stripeSignatureValid(secret, "fără semnătură", payload, now)).toBe(false);
  });
});

describe("facturarea FGO", () => {
  const input = {
    buyer: { name: "Client Test", email: "client@example.com" },
    lines: [{ name: "Parteneriat AVY pro", quantity: 1, unitPriceMinor: 27000 }],
    currency: "RON" as const,
    issuedAt: Date.UTC(2026, 8, 24),
  };

  it("nu trimite nimic fără chei", async () => {
    const result = await issueFgoInvoice({}, input, () => {
      throw new Error("nu trebuia apelat");
    });
    expect(result).toEqual({ issued: false, reason: "fgo_not_configured" });
  });

  it("nu ghicește cota de TVA", async () => {
    const env = { FGO_CUI: "RO123", FGO_PRIVATE_KEY: "k", FGO_CLIENT_NAME: "Avyron", FGO_PLATFORM_URL: "https://avyron.ro" };
    const result = await issueFgoInvoice(env, input, () => {
      throw new Error("nu trebuia apelat");
    });
    expect(result).toEqual({ issued: false, reason: "fgo_vat_rate_missing" });
  });

  it("trimite hash-ul și liniile în formatul cerut de FGO", async () => {
    const env = {
      FGO_CUI: "RO123",
      FGO_PRIVATE_KEY: "cheie",
      FGO_CLIENT_NAME: "Avyron",
      FGO_PLATFORM_URL: "https://avyron.ro",
      FGO_VAT_RATE: "21",
      FGO_API_URL: "https://api-testuat.fgo.ro/v1/",
    };
    let seen: { url: string; body: Record<string, unknown> } | null = null;
    const result = await issueFgoInvoice(env, input, (async (url: string, init: RequestInit) => {
      seen = { url, body: JSON.parse(String(init.body)) };
      return new Response(JSON.stringify({ Success: true, Factura: { Serie: "AVY", Numar: "1042", Link: "https://fgo.ro/f.pdf" } }), {
        headers: { "content-type": "application/json" },
      });
    }) as unknown as typeof fetch);

    expect(seen!.url).toBe("https://api-testuat.fgo.ro/v1/factura/emitere");
    expect(seen!.body).toMatchObject({
      CodUnic: "RO123",
      Hash: createHash("sha1").update("RO123cheieAvyron").digest("hex"),
      PlatformaUrl: "https://avyron.ro",
      Valuta: "RON",
      Client: { Denumire: "Client Test", Tip: "PF" },
      Continut: [{ Denumire: "Parteneriat AVY pro", NrProduse: 1, UM: "buc", CotaTVA: 21, PretUnitar: 270 }],
    });
    expect(result).toMatchObject({ issued: true, series: "AVY", number: "1042" });
  });

  it("raportează refuzul FGO în loc să arunce", async () => {
    const env = { FGO_CUI: "RO1", FGO_PRIVATE_KEY: "k", FGO_CLIENT_NAME: "A", FGO_PLATFORM_URL: "https://a.ro", FGO_VAT_RATE: "21" };
    const result = await issueFgoInvoice(env, input, (async () =>
      new Response(JSON.stringify({ Success: false, Message: "CUI invalid" }), { headers: { "content-type": "application/json" } })) as unknown as typeof fetch);
    expect(result).toEqual({ issued: false, reason: "fgo_refuzat: CUI invalid" });
  });
});
