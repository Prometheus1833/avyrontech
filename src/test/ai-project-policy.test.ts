import { describe, expect, it } from "vitest";
import { canTransitionContent, contentExpiry, editorialExpiry, parseGeneratedContent, validateAiProjectPatch, validateContentGeneration } from "../../cloudflare/workers/api/src/aiProjectPolicy";

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
    expect(editorialExpiry(1_000, "avyron-web", 45)).toBe(1_000 + 3 * 86_400_000);
    expect(editorialExpiry(1_000, "client-project", 45)).toBe(1_000 + 45 * 86_400_000);
  });

  it("requires editorial review before approval and keeps approved content stable", () => {
    expect(canTransitionContent("draft", "approved")).toBe(false);
    expect(canTransitionContent("draft", "pending_approval")).toBe(true);
    expect(canTransitionContent("pending_approval", "approved")).toBe(true);
    expect(canTransitionContent("approved", "rejected")).toBe(false);
    expect(canTransitionContent("rejected", "draft")).toBe(true);
  });
});
