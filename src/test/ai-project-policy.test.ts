import { describe, expect, it } from "vitest";
import { contentExpiry, parseGeneratedContent, validateAiProjectPatch, validateContentGeneration } from "../../cloudflare/workers/api/src/aiProjectPolicy";

describe("AI project policy", () => {
  it("validates bounded strategy changes", () => {
    expect(validateAiProjectPatch({
      primaryObjective: "sales", automationMode: "approval",
      dailyGenerationLimit: 8, contentRetentionDays: 30,
    })).toEqual({ ok: true, value: {
      primaryObjective: "sales", automationMode: "approval",
      dailyGenerationLimit: 8, contentRetentionDays: 30,
    } });
    expect(validateAiProjectPatch({ automationMode: "unlimited" })).toMatchObject({ ok: false });
  });

  it("accepts only supported generation inputs", () => {
    expect(validateContentGeneration({
      format: "reel", channel: "instagram", objective: "visibility",
      topic: "Lansare produs", context: "Accent pe claritate.",
    })).toMatchObject({ ok: true });
    expect(validateContentGeneration({
      format: "video", channel: "unknown", objective: "viral", topic: "x",
    })).toMatchObject({ ok: false });
  });

  it("normalizes model output and calculates expiry", () => {
    const parsed = parseGeneratedContent('```json\n{"title":"Demo","caption":"Text","hashtags":["#avyron","avyron"]}\n```');
    expect(parsed).toMatchObject({ title: "Demo", caption: "Text", hashtags: ["avyron"] });
    expect(contentExpiry(1_000, 30)).toBe(1_000 + 30 * 86_400_000);
  });
});
