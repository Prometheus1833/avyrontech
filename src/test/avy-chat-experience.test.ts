import { describe, expect, it } from "vitest";
import {
  AVY_PROMPT_COOLDOWN_MS,
  canShowProactivePrompt,
  normalizePromptList,
  selectProactivePrompt,
} from "@/components/ai/avyChatExperience";

describe("AVY public chat experience", () => {
  it("normalizes dashboard prompts without duplicates or oversized values", () => {
    expect(normalizePromptList(["  Ai nevoie de un site? ", "Ai nevoie de un site?", 42, "x".repeat(121)], ["fallback"]))
      .toEqual(["Ai nevoie de un site?"]);
    expect(normalizePromptList([], ["fallback"])).toEqual(["fallback"]);
  });

  it("prefers a page-relevant invitation", () => {
    const prompts = ["Vrei o estimare rapidă?", "Ai nevoie de un site?", "Cauți un produs?"];
    expect(selectProactivePrompt(prompts, "/servicii/website-prezentare-profesional")).toBe("Ai nevoie de un site?");
    expect(selectProactivePrompt(prompts, "/produse")).toBe("Cauți un produs?");
  });

  it("shows proactive invitations no more than once every fourteen days", () => {
    const now = Date.UTC(2026, 9, 3);
    expect(canShowProactivePrompt(null, now)).toBe(true);
    expect(canShowProactivePrompt(now - AVY_PROMPT_COOLDOWN_MS + 1, now)).toBe(false);
    expect(canShowProactivePrompt(now - AVY_PROMPT_COOLDOWN_MS, now)).toBe(true);
  });
});
