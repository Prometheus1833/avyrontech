import { describe, expect, it } from "vitest";
import { routeKeyForSocialJob } from "../../cloudflare/workers/api/src/socialModelRouting";

describe("social remote model routing", () => {
  it("reserves the stronger editorial route for articles and reels", () => {
    expect(routeKeyForSocialJob("weekly_article")).toBe("premium_editorial");
    expect(routeKeyForSocialJob("reel")).toBe("premium_editorial");
  });

  it("uses the efficient copy route for daily social work", () => {
    expect(routeKeyForSocialJob("daily_post")).toBe("routine_copy");
    expect(routeKeyForSocialJob("daily_image")).toBe("routine_copy");
    expect(routeKeyForSocialJob("story")).toBe("routine_copy");
    expect(routeKeyForSocialJob("engagement_review")).toBe("routine_copy");
  });
});
