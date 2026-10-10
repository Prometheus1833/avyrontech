import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("cloudflare/d1/migrations/0060_social_content_strategy_v2.sql", "utf8");
const config = JSON.parse(readFileSync("config/avyron-social-studio.json", "utf8")) as {
  schemaVersion: number;
  contentSystem: {
    editorialMechanisms: string[];
    story: { defaultFrameCount: number; microcopyRequiredPerFrame: boolean };
    shortVideo: { framesFor15To30Seconds: number[]; framesFor30To45Seconds: number[]; singleStaticImageVideoForbidden: boolean };
  };
  links: { specificTargets: Record<string, string> };
};

describe("AVYRON Social Studio content strategy v2", () => {
  it("stores compact approved provenance instead of source documents", () => {
    expect(migration).toContain("'aiss_content_lessons_2026'");
    expect(migration).toContain("'aiss_baboon_promotion_2026'");
    expect(migration).toContain("'aiss_gomag_blog_2026'");
    expect(migration).toContain('"storage":"metadata_only"');
    expect(migration).toContain("7a5c27dff0dd800f46e0907e56b9e2e4f3074fe5233695c16564ef99f0763e0f");
    expect(migration).not.toContain("B8296569-A7FA-463F-B35B-4B921F2ED2F5");
  });

  it("promotes the content agent without changing the Leads agent", () => {
    expect(migration).toContain("'agent_version_ai_prod_content_8'");
    expect(migration).toContain("current_version=8");
    expect(migration).toContain("agent_slug='avy'");
    expect(migration).not.toContain("agent_version_leads");
    expect(migration).not.toContain("agent_slug='leads'");
  });

  it("requires complete captions, story microcopy and multi-frame short video", () => {
    expect(config.schemaVersion).toBe(5);
    expect(config.contentSystem.editorialMechanisms).toEqual([
      "information_gap", "self_reference", "proof_story", "immediate_value",
    ]);
    expect(config.contentSystem.story).toMatchObject({
      defaultFrameCount: 3,
      microcopyRequiredPerFrame: true,
    });
    expect(config.contentSystem.shortVideo.framesFor15To30Seconds).toEqual([5, 8]);
    expect(config.contentSystem.shortVideo.framesFor30To45Seconds).toEqual([7, 12]);
    expect(config.contentSystem.shortVideo.singleStaticImageVideoForbidden).toBe(true);
    expect(config.links.specificTargets.professionalWebsite)
      .toBe("https://avyron.ro/servicii/website-prezentare-profesional");
    expect(config.links.specificTargets.onlineStore)
      .toBe("https://avyron.ro/servicii/magazin-online");
  });
});

