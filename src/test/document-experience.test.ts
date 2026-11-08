// @vitest-environment node
import { describe, expect, it } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import {
  automaticDocumentFields,
  consistentSubscriptionBilling,
} from "../shared/documents/autofill";
import { allowedDocumentViews } from "../features/documents/presentation";
import type { DocumentBootstrap } from "../lib/documentsApi";
it("orders staff document tools without exposing company documents to unauthorized roles", () => {
  const bootstrap = (staff: boolean, create: boolean, owner: boolean) =>
    ({
      staff,
      permissions: {
        "documents.create": create,
        "documents.company.owner": owner,
      },
    }) as DocumentBootstrap;
  expect(allowedDocumentViews(bootstrap(true, true, true))).toEqual([
    "generator",
    "templates",
    "staff",
    "company",
    "library",
    "hub",
  ]);
  expect(allowedDocumentViews(bootstrap(true, false, false))).toEqual([
    "templates",
    "staff",
    "library",
    "hub",
  ]);
  expect(allowedDocumentViews(bootstrap(false, false, false))).toEqual([
    "library",
  ]);
});
const company = {
  legal_name: "Emitent configurat",
  tax_id: "CUI configurat",
  address: "Sediu configurat",
  contact_email: "contact@example.test",
  representative: null,
  registration_number: null,
};
const billing = {
  entity_type: "company",
  legal_name: "Beneficiar configurat",
  tax_id: "CUI beneficiar",
  billing_address: "Adresă beneficiar",
  invoice_email: "billing@example.test",
  payment_terms_days: 15,
};
describe("Document generator trustworthy autofill", () => {
  it("uses the real issuer and beneficiary without guessing missing representatives or registration", () => {
    const fields = automaticDocumentFields(
      company,
      {
        company_name: "CRM Client",
        legal_name: "Beneficiar PJ",
        entity_type: "PJ",
        tax_id: "CUI PJ",
        email: "client@example.test",
      },
      "05.11.2026",
      false,
    );
    expect(fields).toMatchObject({
      "provider.legal_name": "Emitent configurat",
      "provider.tax_id": "CUI configurat",
      "provider.registration_number": "",
      "provider.representative": "",
      "beneficiary.legal_name": "Beneficiar PJ",
      "beneficiary.tax_id": "CUI PJ",
      signatories: "",
    });
    expect(
      automaticDocumentFields(company, undefined, "05.11.2026", true)[
        "beneficiary.legal_name"
      ],
    ).toBe("Emitent configurat");
  });
  it("keeps PF data minimal and selected subscription billing contextual", () => {
    const fields = automaticDocumentFields(
      company,
      { company_name: "Persoană", entity_type: "PF" },
      "05.11.2026",
      false,
    );
    expect(fields["beneficiary.identification"]).toContain("Persoană fizică");
    expect(fields).not.toHaveProperty("beneficiary.cnp");
    const contextual = automaticDocumentFields(
      company,
      { company_name: "CRM Client" },
      "05.11.2026",
      false,
      billing,
    );
    expect(contextual["beneficiary.legal_name"]).toBe("Beneficiar configurat");
    expect(contextual.payment_terms).toContain("15 zile");
    expect(consistentSubscriptionBilling([billing, { ...billing }])).toEqual(
      billing,
    );
    expect(
      consistentSubscriptionBilling([
        billing,
        { ...billing, legal_name: "Alt beneficiar" },
      ]),
    ).toBeUndefined();
    expect(consistentSubscriptionBilling([])).toBeUndefined();
  });
});
describe("Additive company identity migration", () => {
  it.each(["blank", "configured", "different-issuer"])(
    "backfills only blank fields of the known issuer: %s",
    (mode) => {
      const db = new DatabaseSync(":memory:");
      try {
        for (const file of readdirSync("cloudflare/d1/migrations")
          .filter((f) => f.endsWith(".sql") && f < "0082_")
          .sort())
          db.exec(readFileSync(`cloudflare/d1/migrations/${file}`, "utf8"));
        if (mode === "configured")
          db.exec(
            "UPDATE document_company_profile SET tax_id='existing-tax',address='existing-address',contact_email='existing@example.test'",
          );
        if (mode === "different-issuer")
          db.exec(
            "UPDATE document_company_profile SET legal_name='Alt emitent',tax_id=NULL,address=NULL,contact_email=NULL",
          );
        db.exec(
          readFileSync(
            "cloudflare/d1/migrations/0082_document_center_experience.sql",
            "utf8",
          ),
        );
        const row = db
          .prepare("SELECT * FROM document_company_profile WHERE id='avyron'")
          .get()!;
        if (mode === "blank")
          expect(row).toMatchObject({
            tax_id: "55055976",
            contact_email: "contact@avyron.ro",
            registration_number: null,
            representative: null,
          });
        if (mode === "configured")
          expect(row).toMatchObject({
            tax_id: "existing-tax",
            address: "existing-address",
            contact_email: "existing@example.test",
          });
        if (mode === "different-issuer")
          expect(row).toMatchObject({
            tax_id: null,
            address: null,
            contact_email: null,
          });
        expect(db.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
      } finally {
        db.close();
      }
    },
  );
});
