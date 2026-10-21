import { describe, expect, it } from "vitest";
import {
  canonicalAvyronConversionUrl,
  plannedSocialJobs,
  recoverStaleSocialGenerationJobs,
  removeSocialPriceDetails,
  sanitizeFacebookCaptionLinks,
  sanitizeInstagramCaptionLinks,
  type SocialPolicy,
} from "../../cloudflare/workers/api/src/socialStudioScheduler";

const policy: SocialPolicy = {
  project_id: "aip_avyron_web",
  timezone: "Europe/Bucharest",
  daily_post_count: 1,
  daily_image_count: 1,
  reel_interval_days: 3,
  weekly_article_weekday: 5,
  weekly_article_hour: 16,
  weekly_article_minute: 0,
  engagement_interval_minutes: 180,
  story_like_target: 8,
  feed_like_target: 6,
  time_slots_json: '{"post":"10:15","image":"13:15","reel":"18:15","story":"20:15"}',
  channel_priority_json: '["instagram","facebook","linkedin","threads"]',
  industry_rotation_json: '["horeca","sanatate","constructii"]',
};

describe("Social Studio scheduler", () => {
  it("plans daily content in Europe/Bucharest and keeps stable schedule keys", () => {
    const timestamp = Date.UTC(2026, 9, 3, 17, 30); // 20:30 in Bucharest
    const jobs = plannedSocialJobs(policy, timestamp);
    expect(jobs.map((job) => job.kind)).toEqual(expect.arrayContaining([
      "daily_post", "daily_image", "story", "engagement_review",
    ]));
    expect(jobs.every((job) => job.key.includes("2026-10-03"))).toBe(true);
    expect(jobs.find((job) => job.kind === "story")?.brief).toMatchObject({
      shortCopy: true,
      nativeLinkPreferred: true,
      defaultLink: "https://avyron.ro/servicii/website-prezentare-profesional",
      frameCount: 3,
      storyMicrocopyRequired: true,
      storyCaptionRequiredWhenSupported: true,
      storyCaptionFallback: "unsupported",
      conversionFrameOptional: true,
      conversionCta: "Cere o cotație",
      conversionModes: ["native_organic_form", "verified_hosted_form", "link_sticker", "action_button"],
      formFields: ["name", "email"],
      formStatusRequired: true,
      privacyNoticeRequired: true,
      postStoryForm: true,
      actualFormOpensAfterTap: true,
      fakeInteractiveFieldsForbidden: true,
      formUx: {
        persistentLabels: true,
        minimumTouchTargetPx: 44,
        correctInputTypesAndAutocomplete: true,
        errorsAfterInteraction: true,
        loadingAndSuccessStates: true,
        doubleSubmitProtection: true,
        readBackTestRequired: true,
      },
      freeOnly: true,
      safeZone: { top: 180, bottom: 250, left: 72, right: 72 },
    });
    expect(jobs.find((job) => job.kind === "daily_post")?.brief).toMatchObject({
      websiteOfferVisible: true,
      linkRequired: true,
      prohibitPrices: true,
      targetUrl: "https://avyron.ro/servicii/website-prezentare-profesional",
      productionToolPlanRequired: true,
      realAssetsFirst: true,
      assetProvenanceRequired: true,
      visualQaPasses: ["editorial_factual", "visual_mobile", "native_conversion"],
      serviceFocus: "professional_website",
      renderSpec: {
        preferredMasterPortrait: { width: 2160, height: 3840 },
        forbidSyntheticUpscaleClaim: true,
        nativeExport: { width: 1080, height: 1920 },
      },
    });
    expect(jobs.find((job) => job.kind === "engagement_review")?.brief).toMatchObject({
      storyLikeTarget: 8,
      feedLikeTarget: 6,
      actionsAreProposals: true,
    });
  });

  it("rotates an online-store brief with a real business problem and exact service URL", () => {
    const jobs = plannedSocialJobs(policy, Date.UTC(2026, 9, 6, 18, 0)); // 21:00 in Bucharest
    expect(jobs.find((job) => job.kind === "daily_post")).toMatchObject({
      topic: expect.stringContaining("Magazin online"),
      brief: {
        serviceFocus: "online_store",
        targetUrl: "https://avyron.ro/servicii/magazin-online",
        conversionCta: "Evaluează magazinul",
        serviceOfferVisible: true,
        websiteOfferVisible: false,
      },
    });
    expect(jobs.find((job) => job.kind === "story")?.brief).toMatchObject({
      serviceFocus: "online_store",
      defaultLink: "https://avyron.ro/servicii/magazin-online",
      survey: {
        publicRoot: "https://surveys.avyron.ro/",
        exactRouteAndSubmissionTestRequired: true,
      },
      universalDomains: {
        illustrativeOnly: true,
        neverConversionDestination: true,
      },
    });
  });

  it("creates the editorial article on Friday at 16:00 local time", () => {
    const before = plannedSocialJobs(policy, Date.UTC(2026, 9, 2, 12, 45));
    const due = plannedSocialJobs(policy, Date.UTC(2026, 9, 2, 13, 0));
    expect(before.some((job) => job.kind === "weekly_article")).toBe(false);
    expect(due.find((job) => job.kind === "weekly_article")).toMatchObject({
      format: "article", channel: "blog",
    });
  });

  it("plans exactly one reel across each three-day window", () => {
    const reels = [0, 1, 2].flatMap((offset) => plannedSocialJobs(
      policy,
      Date.UTC(2026, 9, 3 + offset, 16, 0),
    ).filter((job) => job.kind === "reel"));
    expect(reels).toHaveLength(1);
    expect(reels[0].brief).toMatchObject({
      nativeVariants: ["instagram_reel", "facebook_reel", "tiktok"],
      productionToolPlanRequired: true,
      realAssetsFirst: true,
      premiumTransitions: true,
      criticalTextGeneratedInImage: false,
    });
  });

  it("keeps Facebook conversion links canonical and removes demo or tracking URLs", () => {
    expect(canonicalAvyronConversionUrl("https://avyron.ro/servicii/website-prezentare-profesional?utm_source=facebook#oferta"))
      .toBe("https://avyron.ro/servicii/website-prezentare-profesional");
    expect(canonicalAvyronConversionUrl("https://avyron.ro/exemple/restaurant-demo"))
      .toBe("https://avyron.ro/servicii/website-prezentare-profesional");
    expect(canonicalAvyronConversionUrl("https://example.com/a-very-long-demo-url"))
      .toBe("https://avyron.ro/servicii/website-prezentare-profesional");
    expect(sanitizeFacebookCaptionLinks(
      "Descoperă proiectul https://example.com/demo?utm_source=facebook și discută cu noi.",
      "https://avyron.ro/servicii/website-prezentare-profesional?utm_campaign=demo",
    )).toBe("Descoperă proiectul și discută cu noi.\n\nhttps://avyron.ro/servicii/website-prezentare-profesional");
  });

  it("keeps Instagram honest about link behavior and removes price details", () => {
    const caption = removeSocialPriceDetails("Website clar pentru rezervări.\nPreț de la 999 lei.\nDiscutăm despre structură și conținut.");
    expect(caption).toBe("Website clar pentru rezervări.\nDiscutăm despre structură și conținut.");
    expect(sanitizeInstagramCaptionLinks(
      caption,
      "https://avyron.ro/servicii/website-prezentare-profesional?utm_source=instagram",
    )).toBe(
      "Website clar pentru rezervări.\nDiscutăm despre structură și conținut.\n\n" +
      "Vezi serviciul: https://avyron.ro/servicii/website-prezentare-profesional\nLink în bio.",
    );
  });

  it("requeues stale generation leases and stops automatic retries after three attempts", async () => {
    const calls: Array<{ sql: string; values: unknown[] }> = [];
    const db = {
      prepare(sql: string) {
        return {
          bind(...values: unknown[]) {
            calls.push({ sql, values });
            return { run: async () => ({ meta: { changes: sql.includes("attempt_count>=") ? 1 : 2 } }) };
          },
        };
      },
    };
    const timestamp = Date.UTC(2026, 9, 11, 10, 0);
    const recovered = await recoverStaleSocialGenerationJobs({ DB: db as never }, timestamp);
    expect(recovered).toEqual({ requeued: 2, failed: 1 });
    expect(calls).toHaveLength(2);
    expect(calls[0].values).toEqual([timestamp, timestamp - 15 * 60_000, 3]);
    expect(calls[1].values).toEqual([timestamp, timestamp - 15 * 60_000, 3]);
  });
});
