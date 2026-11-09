import { describe, it, expect } from "vitest";
import {
  agencyMargin,
  platformInput,
  platformPolicy,
  opportunityInput,
  canonicalRequestUrl,
  emptyChecks,
  safeAgencyUrl,
} from "../shared/agency/model";
import { AGENCY_PLATFORMS } from "../shared/agency/catalog";
import { SECTIONS, buildAccess, canOpenSection } from "../lib/access";
import { newAgencyOpportunity } from "./leads-agency-fixture";
describe("Free-first acquisition invariants", () => {
  it("places Leads Agency immediately after Leads and restricts the client menu", () => {
    const i = SECTIONS.findIndex((s) => s.id === "leads");
    expect(SECTIONS[i + 1].id).toBe("leads-agency");
    for (const roles of [["user"], ["staff"], ["admin"]] as const)
      expect(
        canOpenSection("leads-agency", buildAccess({ roles: [...roles] })),
      ).toBe(false);
    expect(
      canOpenSection(
        "leads-agency",
        buildAccess({ roles: ["admin"], superadmin: true }),
      ),
    ).toBe(true);
    expect(
      canOpenSection(
        "leads-agency",
        buildAccess({ roles: ["staff"], capabilities: ["leads_agency.read"] }),
      ),
    ).toBe(true);
  });
  it("keeps free sources primary, success secondary and AgencyListed unvalidated", () => {
    expect(
      AGENCY_PLATFORMS.filter((p) => p.category === "free").map((p) => p.id),
    ).toEqual(["infinum", "goodfirms", "techbehemoths", "clutch", "een"]);
    expect(
      AGENCY_PLATFORMS.filter((p) => p.category === "success").map((p) => p.id),
    ).toEqual(["breef", "unbench", "influr"]);
    expect(
      AGENCY_PLATFORMS.find((p) => p.id === "agencylisted")?.category,
    ).toBe("review");
    expect(AGENCY_PLATFORMS.map((p) => p.id)).not.toContain("upwork");
  });
  it("does not invent a margin when fees or delivery costs are unknown", () => {
    expect(agencyMargin(100000, null, 0)).toMatchObject({
      complete: false,
      estimatedNetMinor: null,
    });
    expect(agencyMargin(100000, 1500, 20000)).toEqual({
      complete: true,
      commissionMinor: 15000,
      estimatedNetMinor: 65000,
    });
    expect(agencyMargin(100000, 1000, 120000).estimatedNetMinor).toBe(-30000);
  });
  it("rejects invalid dates and unsafe external profile schemes", () => {
    expect(
      opportunityInput.safeParse({
        ...newAgencyOpportunity(),
        deadline: "2026-02-31",
      }).success,
    ).toBe(false);
    expect(
      opportunityInput.safeParse({
        ...newAgencyOpportunity(),
        deadline: "2026-99-99",
      }).success,
    ).toBe(false);
    for (const s of [
      "javascript:alert(1)",
      "https://user:secret@infinum.com/",
      "http://infinum.com/",
      "https://infinum.com.evil.example/",
    ])
      expect(safeAgencyUrl(s, ["infinum.com"])).toBe(false);
  });
  it("canonicalizes request identity without advertising parameters", () => {
    expect(
      canonicalRequestUrl("https://clutch.co/a?utm_source=x&b=2&a=1#fragment"),
    ).toBe("https://clutch.co/a?a=1&b=2");
  });
  it("requires complete human evidence before promotion or activation", () => {
    const input = platformInput.parse({
      revision: 0,
      status: "active",
      category: "free",
      profileUrl: "",
      ownerId: null,
      notes: "",
      nextReview: "",
      checks: emptyChecks(),
      verificationNote: "",
      evidenceUrls: [],
    });
    expect(platformPolicy("agencylisted", input)).toBeTruthy();
  });
  it("keeps currency arithmetic exact at supported high values", () => {
    expect(agencyMargin(9000000000000, 3333, 0).commissionMinor).toBe(
      2999700000000,
    );
    expect(agencyMargin(NaN, 1000, 0).complete).toBe(false);
  });
});
