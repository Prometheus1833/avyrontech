// @vitest-environment node
import { describe, it, expect } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { DOCUMENT_TEMPLATES, applicableTemplatePayload, templateFields } from "../shared/documents/templates";
import { automaticDocumentFields } from "../shared/documents/autofill";
import { blankPayload, paragraph, documentIssues, payloadSchema, plainText, replaceVariables, type CommercialLine } from "../shared/documents/model";
import { commercialTotals } from "../shared/documents/design";
import { unzipSync } from "fflate";
import { exportDocument, pdfDefinition } from "../../cloudflare/workers/api/src/documentExports";

describe("AVYRON editorial document release", () => {
  it("provides complete modern families and uses configured fiscal data without inventing missing values", () => {
    const fields = automaticDocumentFields({ legal_name: "Emitent demonstrativ SRL", tax_id: "CUI-DEMO", address: "Sediu confirmat", share_capital: "500 RON", registration_number: "ONRC-DEMO", contact_email: "issuer@example.test" }, undefined, "06.11.2026", false);
    for (const model of DOCUMENT_TEMPLATES) {
      expect(payloadSchema.safeParse(model.payload).success, model.id).toBe(true);
      expect(plainText(model.payload.body).length, model.id).toBeGreaterThan(1700);
      expect(model.required).toEqual(expect.arrayContaining(["provider.registration_number", "provider.address", "provider.share_capital"]));
      const generated = replaceVariables(model.payload, fields);
      expect(plainText(generated.body)).toContain("Sediu confirmat");
      expect(plainText(generated.body)).toContain("ONRC-DEMO");
      expect(plainText(generated.body)).toContain("500 RON");
      expect(documentIssues(generated, model.required)).not.toContain("Completează: provider.share_capital");
    }
    expect(automaticDocumentFields({}, undefined, "06.11.2026", false)["provider.share_capital"]).toBe("");
  });

  it("only adds the DPA and optional commercial extras when explicitly selected/completed", () => {
    const privacy = DOCUMENT_TEMPLATES.find(t => t.id === "privacy")!;
    const offer = DOCUMENT_TEMPLATES.find(t => t.id === "offer")!;
    expect(plainText(applicableTemplatePayload(privacy.payload, "privacy", {}).body)).not.toContain("Art. 3.");
    expect(plainText(applicableTemplatePayload(privacy.payload, "privacy", { privacy_mode: "DPA" }).body)).toContain("Art. 4.");
    const without = applicableTemplatePayload(offer.payload, "offer", {});
    expect(templateFields(without)).not.toContain("optional_extras");
    expect(plainText(without.body)).toContain("06 Acceptare");
    const withExtras = applicableTemplatePayload(offer.payload, "offer", { optional_extras: "Propunere suplimentară de analizat" });
    expect(templateFields(withExtras)).toContain("optional_extras");
    expect(plainText(withExtras.body)).toContain("Nu intră în totalul ofertei");
    expect(templateFields(offer.payload)).toContain("optional_extras");
  });

  it("separates one-time and recurring totals, with native line rounding and no silent currency conversion", () => {
    const base: CommercialLine = { catalogId: "demo", label: "Test", sku: "DEMO", quantity: 1, catalogPriceMinor: 10000, offeredPriceMinor: 8000, discountReason: "Reducere demonstrativă", currency: "RON", vatBasisPoints: 2100, taxVerified: true, priceConfirmed: true, billingCycle: "one_time", priceModel: "fixed", package: "" };
    const totals = commercialTotals([base, { ...base, offeredPriceMinor: 1000, billingCycle: "monthly" }, { ...base, currency: "EUR", catalogPriceMinor: null, offeredPriceMinor: 500 }]);
    expect(totals).toEqual([
      { currency: "RON", cycle: "one_time", net: 8000, tax: 1680, gross: 9680, catalog: 10000 },
      { currency: "RON", cycle: "monthly", net: 1000, tax: 210, gross: 1210, catalog: 10000 },
      { currency: "EUR", cycle: "one_time", net: 500, tax: 105, gross: 605, catalog: null },
    ]);
  });

  it("adds new master versions without altering old content or replacing customized masters/company data", () => {
    const db = new DatabaseSync(":memory:");
    try {
      const paths = readdirSync("cloudflare/d1/migrations").filter(p => p.endsWith(".sql") && p < "0099_").sort();
      for (const path of paths) db.exec(readFileSync(`cloudflare/d1/migrations/${path}`, "utf8"));
      const previous = db.prepare("SELECT payload_json FROM document_template_versions WHERE id='offer_v1'").get()!.payload_json;
      db.exec("INSERT INTO document_template_versions(id,template_id,version,payload_json,required_fields_json,created_at) SELECT 'framework_custom_v2',template_id,2,payload_json,required_fields_json,1 FROM document_template_versions WHERE id='framework_v1'");
      db.exec("UPDATE document_template_versions SET review_status='retired' WHERE id='report_v1'");
      const identity = db.prepare("SELECT legal_name,tax_id,address,registration_number,representative FROM document_company_profile").get();
      db.exec(readFileSync("cloudflare/d1/migrations/0099_document_editorial_design.sql", "utf8"));
      expect(db.prepare("SELECT payload_json FROM document_template_versions WHERE id='offer_v1'").get()!.payload_json).toBe(previous);
      expect(db.prepare("SELECT * FROM document_template_versions WHERE id='framework_v2_avyron2026'").get()).toBeUndefined();
      expect(db.prepare("SELECT count(*) n FROM document_template_versions WHERE id LIKE '%_v2_avyron2026' AND review_status='review_required'").get()!.n).toBe(9);
      expect(db.prepare("SELECT legal_name,tax_id,address,registration_number,representative FROM document_company_profile").get()).toEqual(identity);
      expect(db.prepare("SELECT share_capital FROM document_company_profile").get()!.share_capital).toBeNull();
      expect(db.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
      expect(() => db.exec("UPDATE document_template_versions SET payload_json='{}' WHERE id='offer_v1'")).toThrow(/immutable/);
    } finally { db.close(); }
  }, 20_000);

  it("applies modern pagination only to the selected design and preserves old payload shape", () => {
    const model = DOCUMENT_TEMPLATES[0].payload;
    const modern = pdfDefinition(model, "DEMO-1", 1, true);
    expect(modern.pageBreakBefore).toBeTypeOf("function");
    const old = { ...model, labels: {} };
    const validated = payloadSchema.parse(old);
    expect(validated.labels).toEqual({});
    expect(pdfDefinition(old, "DEMO-1", 1, true).pageBreakBefore).toBeUndefined();
  });
  it("exports readable missing fields and refuses to display incomplete prices as final totals", async () => {
    const payload = blankPayload("Ciornă de verificare");
    payload.labels["provider.registration_number"] = "Registrul Comerțului";
    payload.body = { type: "doc", content: [paragraph("Identificarea emitentului: {{provider.registration_number}}. Acesta este un exemplu sintetic de verificare.")] };
    payload.lines = [{ catalogId: "quote", label: "Serviciu de ofertat", sku: "DEMO", quantity: 1, catalogPriceMinor: null, offeredPriceMinor: 0, priceConfirmed: false, discountReason: "", currency: "RON", vatBasisPoints: 0, taxVerified: false, billingCycle: "monthly", priceModel: "quote", package: "" }];
    const pdf = JSON.stringify(pdfDefinition(payload, "DEMO-1", 1, true));
    expect(pdf).toContain("De completat: Registrul Comerțului");
    expect(pdf).toContain("De confirmat");
    expect(pdf).not.toContain("Total cu taxele înscrise");
    const zip = unzipSync(await exportDocument(payload, "DEMO-1", 1, "docx", true));
    const xml = new TextDecoder().decode(zip["word/document.xml"]);
    expect(xml).toContain("De completat: Registrul Comerțului");
    expect(xml).toContain("De confirmat");
    expect(xml).not.toContain("Total cu taxele înscrise");
    expect(new TextDecoder().decode(zip["word/footer1.xml"])).toContain("CIORNĂ NEAPROBATĂ");
    expect(documentIssues(payload)).toContain("Variabilă necompletată: Registrul Comerțului");
    expect(plainText(payload.body)).toContain("{{provider.registration_number}}");
  });

});
