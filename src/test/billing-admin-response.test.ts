import { describe, expect, it } from "vitest";
import { validateBillingAdminStatus } from "@/lib/billingApi";

describe("billing admin response", () => {
  it("rejects an incomplete live response before the finance page can render it", () => {
    expect(() => validateBillingAdminStatus({ providers: { oblio: { enabled: false } }, sessions: [] }))
      .toThrow("Serviciul de facturare a trimis date incomplete");
  });
});
