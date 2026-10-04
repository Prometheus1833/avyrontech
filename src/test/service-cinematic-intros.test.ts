import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  SERVICE_INTRO_DURATION_MS,
  SERVICE_INTRO_EXIT_MS,
  SERVICE_INTRO_GUARD_MS,
  SERVICE_INTRO_KEYS,
  SERVICE_INTRO_MAX_MS,
  SERVICE_INTRO_REPEAT_MS,
  SERVICE_INTRO_SPECS,
} from "@/data/serviceIntros";

describe("service cinematic intros", () => {
  it("covers every service page that does not already have a dedicated intro", () => {
    expect(SERVICE_INTRO_KEYS).toEqual([
      "premium-website",
      "social-identity",
      "online-store",
      "apps",
      "ai-agent",
      "qa-testing",
    ]);
    expect(Object.keys(SERVICE_INTRO_SPECS)).toEqual(SERVICE_INTRO_KEYS);
  });

  it("keeps the full and repeat experiences below three seconds", () => {
    expect(SERVICE_INTRO_DURATION_MS + SERVICE_INTRO_GUARD_MS + SERVICE_INTRO_EXIT_MS).toBe(SERVICE_INTRO_MAX_MS);
    expect(SERVICE_INTRO_REPEAT_MS + SERVICE_INTRO_EXIT_MS).toBeLessThan(SERVICE_INTRO_DURATION_MS);
    expect(SERVICE_INTRO_MAX_MS).toBeLessThanOrEqual(3000);
  });

  it("retains the specialized logo and blog intros", () => {
    const logoPage = readFileSync(resolve(__dirname, "../pages/services/LogoDinamic3DPage.tsx"), "utf8");
    const blogPage = readFileSync(resolve(__dirname, "../pages/services/BlogProfessional.tsx"), "utf8");
    const servicePage = readFileSync(resolve(__dirname, "../pages/services/ServicePage.tsx"), "utf8");
    const qaPage = readFileSync(resolve(__dirname, "../pages/services/QaTestingPage.tsx"), "utf8");

    expect(logoPage).toContain("<LogoLoader");
    expect(blogPage).toContain("<BlogPreloader");
    expect(servicePage).toContain("<ServiceCinematicIntro");
    expect(qaPage).toContain('service="qa-testing"');
  });

  it("uses a distinct motif and complete bilingual copy for every new intro", () => {
    const motifs = new Set<string>();
    for (const key of SERVICE_INTRO_KEYS) {
      const spec = SERVICE_INTRO_SPECS[key];
      motifs.add(spec.motif);
      expect(spec.label.ro && spec.label.en && spec.micro.ro && spec.micro.en).toBeTruthy();
      expect(spec.sequence.ro).toHaveLength(3);
      expect(spec.sequence.en).toHaveLength(3);
    }
    expect(motifs.size).toBe(SERVICE_INTRO_KEYS.length);
  });
});
