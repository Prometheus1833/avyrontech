import { describe, expect, it } from "vitest";
import { parseReviewSubmission, WEBSITE_REVIEW_SURFACE } from "../../cloudflare/workers/api/src/reviewsPolicy";

const valid = {
  surfaceKey: WEBSITE_REVIEW_SURFACE,
  displayName: "Ana Popescu",
  email: "ana@example.com",
  entityType: "individual",
  brandName: "",
  rating: 5,
  reviewText: "Am colaborat pentru un site de prezentare și comunicarea a fost clară.",
  publishConsent: true,
};

describe("public review submission", () => {
  it("accepts a minimal individual review and normalizes private contact details", () => {
    const result = parseReviewSubmission({ ...valid, email: "  ANA@EXAMPLE.COM " });
    expect(result.data?.email).toBe("ana@example.com");
    expect(result.data?.brandName).toBeNull();
    expect(parseReviewSubmission({ ...valid, brandName: "Brand ascuns" }).data?.brandName).toBeNull();
  });

  it("requires the represented brand for a company and explicit publication consent", () => {
    expect(parseReviewSubmission({ ...valid, entityType: "srl" }).error).toBe("invalid_brand");
    expect(parseReviewSubmission({ ...valid, publishConsent: false }).error).toBe("consent_required");
    expect(parseReviewSubmission({ ...valid, entityType: "srl", brandName: "Atelier Nord" }).data?.brandName).toBe("Atelier Nord");
  });

  it("rejects unsupported surfaces and invalid ratings", () => {
    expect(parseReviewSubmission({ ...valid, surfaceKey: "homepage" }).error).toBe("unsupported_surface");
    expect(parseReviewSubmission({ ...valid, rating: 6 }).error).toBe("invalid_rating");
  });
});
