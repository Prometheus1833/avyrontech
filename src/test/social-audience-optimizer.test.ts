import { describe, expect, it } from "vitest";
import {
  plannedAudienceRun, proposeAudienceCandidates,
  type AudienceAccountPolicy, type AudienceProfile,
} from "../../cloudflare/workers/api/src/socialAudienceOptimizer";

const account: AudienceAccountPolicy = {
  id: "asa_instagram_avyron", project_id: "aip_avyron_web", provider: "instagram",
  surface: "professional", connection_status: "connected", timezone: "Europe/Bucharest",
  daily_review_hour: 15, daily_review_minute: 0, cleanup_limit: 25, growth_limit: 25,
};

const profile = (patch: Partial<AudienceProfile>): AudienceProfile => ({
  id: "profile", relationship: "following", profileKind: "unknown", websiteState: "unknown",
  activityState: "unknown", followsBack: null, relevanceScore: 0, intentScore: 0,
  protections: [], ...patch,
});

describe("Social audience optimizer", () => {
  it("plans one daily review at 15:00 Europe/Bucharest", () => {
    expect(plannedAudienceRun(account, Date.UTC(2026, 9, 3, 11, 59))).toBeNull();
    expect(plannedAudienceRun(account, Date.UTC(2026, 9, 3, 12, 0))).toMatchObject({
      reviewDate: "2026-10-03", status: "awaiting_data",
    });
  });

  it("never proposes removal for protected profiles", () => {
    const proposals = proposeAudienceCandidates([
      profile({ id: "conversation", activityState: "inactive", followsBack: false, protections: ["conversation"] }),
      profile({ id: "engaged", activityState: "inactive", followsBack: false, protections: ["engagement"] }),
      profile({ id: "contacted", activityState: "inactive", followsBack: false, protections: ["contacted"] }),
    ], { cleanup: 25, growth: 25 });
    expect(proposals).toEqual([]);
  });

  it("separates cleanup from relevant business growth candidates", () => {
    const proposals = proposeAudienceCandidates([
      profile({ id: "irrelevant", activityState: "inactive", followsBack: false, profileKind: "personal" }),
      profile({
        id: "business", relationship: "suggested", profileKind: "business", websiteState: "none",
        activityState: "active", followsBack: null, relevanceScore: 85, intentScore: 70,
      }),
    ], { cleanup: 25, growth: 25 });
    expect(proposals).toEqual(expect.arrayContaining([
      expect.objectContaining({ relationshipId: "irrelevant", action: "unfollow" }),
      expect.objectContaining({ relationshipId: "business", action: "friend_request" }),
    ]));
  });

  it("never proposes follow-back for an existing follower", () => {
    const proposals = proposeAudienceCandidates([
      profile({
        id: "valuable-follower", relationship: "follower", profileKind: "business", websiteState: "none",
        activityState: "active", followsBack: true, relevanceScore: 100, intentScore: 100,
      }),
    ], { cleanup: 25, growth: 25 });
    expect(proposals).toEqual([]);
  });
});
