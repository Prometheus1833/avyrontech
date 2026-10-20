import { describe, expect, it } from "vitest";
import { registerSchema } from "@/lib/validators/auth";
import { authValidationMessage } from "@/pages/authCopy";

const base = { email: "ana@example.com", password: "SecurePass123!", displayName: "Ana Popescu", organizationName: "", taxId: "" };

describe("registration account categories", () => {
  it("keeps individual sign-up minimal", () => {
    expect(registerSchema.safeParse({ ...base, entityType: "individual" }).success).toBe(true);
  });

  it("requires the relevant organization and tax details for registered businesses", () => {
    for (const entityType of ["srl", "pfa", "ii"] as const) {
      expect(registerSchema.safeParse({ ...base, entityType }).success).toBe(false);
      expect(registerSchema.safeParse({ ...base, entityType, organizationName: "Atelier Nord", taxId: "RO12345678" }).success).toBe(true);
    }
  });

  it("accepts a name without a fiscal identifier for newer or noncommercial organizations", () => {
    for (const entityType of ["startup", "public_institution", "avyron_partner", "other"] as const) {
      expect(registerSchema.safeParse({ ...base, entityType }).success).toBe(false);
      expect(registerSchema.safeParse({ ...base, entityType, organizationName: "Atelier Nord" }).success).toBe(true);
    }
  });

  it("shows field errors in the chosen language", () => {
    expect(authValidationMessage("organization_name_required", "en")).toBe("Enter your organization, institution or brand name.");
    expect(authValidationMessage("invalid_tax_id", "ro")).toContain("CUI valid");
  });
});
