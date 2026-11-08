import { describe, it, expect } from "vitest";
import { briefSchema, blankBrief } from "../shared/skills/model";
import {
  mediaPrompt,
  logoConceptSvg,
  creativeQualityContext,
} from "../shared/skills/creative";
import { renderSkillPreview, preparedBrief } from "../shared/skills/render";
describe("creative studio contracts", () => {
  const brief = () => ({
    ...blankBrief(),
    business: "Nord Studio",
    activity: "Beauty și wellness",
  });
  it("migrates old JSON briefs through defaults and validates bounded art direction", () => {
    const { logo, media, ...legacy } = brief();
    void logo;
    void media;
    const next = briefSchema.parse(legacy);
    expect(next.logo.kind).toBe("combination");
    expect(next.media.composition).toBe("left");
    expect(
      briefSchema.safeParse({
        ...next,
        media: { ...next.media, subject: "x".repeat(281) },
      }).success,
    ).toBe(false);
    expect(
      briefSchema.safeParse({
        ...next,
        logo: { ...next.logo, palette: "invented" },
      }).success,
    ).toBe(false);
  });
  it("keeps the prepared media prompt identical to model input and prioritizes direction", () => {
    const b = brief();
    b.media = {
      purpose: "product",
      subject: "Serum în sticlă mată",
      lighting: "studio",
      composition: "center",
      avoid: "plastic, text fals",
    };
    b.preferences = "Calm și realist";
    const prompt = mediaPrompt(b);
    expect(prompt).toContain(b.media.subject);
    expect(prompt).toContain("studio");
    expect(prompt).toContain("plastic, text fals");
    expect(prompt.length).toBeLessThan(4096);
    expect(preparedBrief("media-generate", b, "approved")).toContain(prompt);
    expect(preparedBrief("media-generate", b, "")).not.toContain(
      "înainte de site-ul final",
    );
  });
  it("escapes untrusted brand text and exports three distinct editable concept SVGs", () => {
    const b = brief();
    b.business = "Nord <script>alert(1)</script> & Co";
    b.logo.tagline = '" onload="bad';
    const svgs = [0, 1, 2].map((i) => logoConceptSvg(b, i));
    expect(new Set(svgs).size).toBe(3);
    for (const s of svgs) {
      expect(s).not.toMatch(
        /<script|<foreignObject|<image|<a\b|<[^>]+\sonload=/i,
      );
      expect(s).toContain("&lt;script&gt;");
      expect(s).toContain("studiu de compoziție");
    }
    b.logo.kind = "monogram";
    expect(new Set([0, 1, 2].map((i) => logoConceptSvg(b, i))).size).toBe(3);
  });
  it("uses dedicated studios rather than client website mockups and separates concepts from delivery", () => {
    const b = brief();
    for (const slug of ["logo-engine", "media-generate"] as const) {
      const html = renderSkillPreview(slug, b);
      expect(html).not.toContain("Contact rapid");
      expect(html).not.toContain("URMĂREȘTE-NE");
      expect(html).toContain("noindex,nofollow");
      expect(html).toContain("Verificare înainte de livrare");
      expect(creativeQualityContext(slug)).toContain("2026-11-08.1");
    }
    expect(renderSkillPreview("logo-engine", b).match(/<svg /g)).toHaveLength(
      3,
    );
  });
});
