import { describe, expect, it } from "vitest";
import { plannedSocialJobs, type SocialPolicy } from "../../cloudflare/workers/api/src/socialStudioScheduler";

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
      defaultLink: "https://avyron.ro",
      safeZone: { top: 180, bottom: 250, left: 72, right: 72 },
    });
    expect(jobs.find((job) => job.kind === "daily_post")?.brief).toMatchObject({
      websiteOfferVisible: true,
      linkRequired: true,
    });
    expect(jobs.find((job) => job.kind === "engagement_review")?.brief).toMatchObject({
      storyLikeTarget: 8,
      feedLikeTarget: 6,
      actionsAreProposals: true,
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
    const reelDays = [0, 1, 2].filter((offset) => plannedSocialJobs(
      policy,
      Date.UTC(2026, 9, 3 + offset, 16, 0),
    ).some((job) => job.kind === "reel"));
    expect(reelDays).toHaveLength(1);
  });
});
