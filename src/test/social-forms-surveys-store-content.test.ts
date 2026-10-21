import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("cloudflare/d1/migrations/0072_social_forms_surveys_store_content.sql", "utf8");
const config = JSON.parse(readFileSync("config/avyron-social-studio.json", "utf8")) as {
  schemaVersion: number;
  composition: { rendering: Record<string, unknown> };
  contentSystem: { serviceModules: { onlineStore: { targetUrl: string; problemFamilies: string[] } } };
  conversion: {
    formUx: Record<string, unknown>;
    surveys: { publicRoot: string; eligibleIntents: string[] };
    universalDomains: { allowedPatterns: string[]; neverConversionDestination: boolean };
  };
};

describe("AVYRON Social Studio forms, surveys and store content", () => {
  it("adds structured variant metadata and promotes the content agent to version 10", () => {
    expect(migration).toContain("ADD COLUMN form_ux_json");
    expect(migration).toContain("ADD COLUMN survey_json");
    expect(migration).toContain("ADD COLUMN render_spec_json");
    expect(migration).toContain("ADD COLUMN universal_domain_json");
    expect(migration).toContain("'agent_version_ai_prod_content_10'");
    expect(migration).toContain("current_version=10");
    expect(migration).toContain("'post_story_form_plan'");
    expect(migration).toContain("'form_ux_review'");
    expect(migration).toContain("'survey_route_review'");
    expect(migration).toContain("'online_store_content_brief'");
    expect(migration).toContain("'render_spec_review'");
  });

  it("requires real post-tap forms, exact Surveys routing and safe universal domains", () => {
    expect(config.schemaVersion).toBe(7);
    expect(config.conversion.formUx).toMatchObject({
      persistentLabels: true,
      minimumTouchTargetPx: 44,
      errorsAfterInteraction: true,
      doubleSubmitProtection: true,
      readBackTestRequired: true,
    });
    expect(config.conversion.surveys).toMatchObject({
      publicRoot: "https://surveys.avyron.ro/",
      eligibleIntents: ["diagnostic", "brief", "service_selection", "self_assessment"],
    });
    expect(config.conversion.universalDomains).toEqual(expect.objectContaining({
      allowedPatterns: ["*.test", "example.com", "example.org"],
      neverConversionDestination: true,
    }));
  });

  it("adds online-store problems and honest high-resolution masters", () => {
    expect(config.contentSystem.serviceModules.onlineStore.targetUrl)
      .toBe("https://avyron.ro/servicii/magazin-online");
    expect(config.contentSystem.serviceModules.onlineStore.problemFamilies)
      .toEqual(expect.arrayContaining(["descoperirea produsului", "stoc și livrare", "coș și checkout"]));
    expect(config.composition.rendering).toMatchObject({
      preferredMasterPortrait: { width: 2160, height: 3840 },
      allow8kStillMasterOnlyWhenSourceSupports: true,
      forbidSyntheticUpscaleClaim: true,
    });
  });
});
