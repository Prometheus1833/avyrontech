import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import opentype from "opentype.js";
import {
  CONCEPT_JSON_SCHEMA,
  LAYOUTS,
  SHAPES,
  STUDIO_PRICES,
  buildPrompt,
  cleanBrief,
  cleanConcept,
  decodeDesign,
  encodeDesign,
  initials,
  localConcepts,
} from "@/data/logoStudio";
import { STUDIO_FAQ, STUDIO_PATHS, STUDIO_UI, KIND_COPY } from "@/data/logoStudioCopy";
import { FONT_FILES, compose, outlineText, toSvg } from "@/components/logoStudio/render";
import { ROUTE_ALTERNATES } from "@/i18n/routes";
import { PRERENDER_ROUTES } from "@/seo/publicRoutes";

const brief = cleanBrief({ name: "Știință & Co", tagline: "laborator", industry: "tech", style: "modern", kind: "static", lang: "ro" })!;

const fontsFor = (key: keyof typeof FONT_FILES) =>
  FONT_FILES[key].files.map((f) => {
    const buf = readFileSync(resolve(__dirname, "../../public/fonts/logo-studio", f));
    return opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  });

describe("Logo Studio — model", () => {
  it("keeps the proposed delivery prices", () => {
    expect(STUDIO_PRICES).toEqual({ static: 75, dynamic: 150 });
  });

  it("cleans briefs and rejects empty names", () => {
    expect(cleanBrief({ name: "   " })).toBeNull();
    const b = cleanBrief({ name: "<b>Ana</b>\u0007", industry: "nope", style: "nope" })!;
    expect(b.name).toBe("bAna/b");
    expect(b.industry).toBe("other");
    expect(b.style).toBe("modern");
  });

  it("takes initials with diacritics", () => {
    expect(initials("Știință & Co")).toBe("ȘC");
    expect(initials("nordis")).toBe("N");
  });

  it("forces AI output back into the closed vocabulary", () => {
    const fallback = localConcepts(brief, 1)[0];
    const c = cleanConcept(
      { symbol: "dragon", monogram: "XQZ", palette: { primary: "red", accent: "#12AB34" }, tracking: 9, layout: "badge" },
      brief,
      fallback,
    );
    expect(SHAPES).toContain(c.symbol);
    expect(c.monogram).toBe(""); // letters not in the name are dropped
    expect(c.palette.primary).toBe(fallback.palette.primary);
    expect(c.palette.accent).toBe("#12ab34");
    expect(c.tracking).toBe(0.3);
    expect(c.layout).toBe("badge");
  });

  it("generates deterministic, varied local concepts", () => {
    const a = localConcepts(brief, 6, "x");
    const b = localConcepts(brief, 6, "x");
    expect(a).toEqual(b);
    expect(new Set(a.map((c) => c.layout)).size).toBeGreaterThan(3);
  });

  it("describes the layout, not a hidden symbol, for badges and wordmarks", () => {
    for (const c of localConcepts(brief, 6, "y")) {
      if (c.layout === "wordmark") expect(c.idea).toMatch(/Doar numele/);
      if (c.layout === "badge") expect(c.idea).toMatch(/emblemă/);
    }
  });

  it("round-trips a design through the share link", () => {
    const c = localConcepts(brief, 1)[0];
    const back = decodeDesign(encodeDesign(brief, c));
    expect(back?.brief.name).toBe(brief.name);
    expect(back?.concept).toEqual(c);
    expect(decodeDesign("not-a-design")).toBeNull();
  });

  it("builds a prompt and a schema limited to the vocabulary", () => {
    const { system, user } = buildPrompt(brief);
    expect(system).toMatch(/Romanian/);
    expect(JSON.parse(user).brand_name).toBe(brief.name);
    expect(CONCEPT_JSON_SCHEMA.properties.concepts.items.properties.symbol.enum).toEqual([...SHAPES]);
  });
});

describe("Logo Studio — renderer", () => {
  it("finds a real glyph for every Romanian letter in every font", () => {
    for (const key of Object.keys(FONT_FILES) as Array<keyof typeof FONT_FILES>) {
      const fonts = fontsFor(key);
      for (const ch of [..."ăâîșțĂÂÎȘȚ"]) expect(fonts.some((f) => f.charToGlyphIndex(ch) > 0), `${key} ${ch}`).toBe(true);
    }
  });

  it("outlines Romanian text with the latin-ext fallback", () => {
    const t = outlineText(fontsFor("geometric"), "ȘȚĂÎÂ", 100, 0);
    expect(t.d.length).toBeGreaterThan(200);
    expect(t.width).toBeGreaterThan(200);
  });

  it("renders every symbol in every layout without invalid numbers", () => {
    const fonts = fontsFor("grotesk");
    for (const symbol of SHAPES)
      for (const layout of LAYOUTS) {
        const concept = { ...localConcepts(brief, 1)[0], symbol, layout, monogram: "Ș" };
        const comp = compose(concept, brief, fonts, fonts);
        const svg = toSvg(comp, { background: "paper", watermark: "PREVIZUALIZARE" });
        expect(svg).not.toMatch(/NaN|undefined|Infinity/);
        expect(comp.width).toBeGreaterThan(0);
        expect(comp.height).toBeGreaterThan(0);
      }
  });

  it("ships every font file it references", () => {
    for (const key of Object.keys(FONT_FILES) as Array<keyof typeof FONT_FILES>) expect(fontsFor(key)).toHaveLength(2);
  });
});

describe("Logo Studio — page", () => {
  it("is a bilingual, prerendered route", () => {
    expect(ROUTE_ALTERNATES).toContainEqual({ ro: STUDIO_PATHS.ro, en: STUDIO_PATHS.en });
    expect(PRERENDER_ROUTES).toEqual(expect.arrayContaining([STUDIO_PATHS.ro, STUDIO_PATHS.en]));
  });

  it("has matching Romanian and English copy", () => {
    expect(STUDIO_FAQ.ro.length).toBe(STUDIO_FAQ.en.length);
    expect(Object.keys(STUDIO_UI.ro).sort()).toEqual(Object.keys(STUDIO_UI.en).sort());
    expect(KIND_COPY.ro.static.gets.length).toBe(KIND_COPY.en.static.gets.length);
  });
});

describe("Logo pages — social images", () => {
  it("ship a 1200×630 JPEG for every page and language", () => {
    for (const name of ["logo-dinamic-3d", "logo-dinamic-3d-en", "logo-studio", "logo-studio-en"]) {
      const buf = readFileSync(resolve(__dirname, "../../public/og", `${name}.jpg`));
      expect(buf.subarray(0, 3).toString("hex")).toBe("ffd8ff");
      // Find the SOF0/SOF2 marker and read height/width.
      let i = 2;
      let size: [number, number] | null = null;
      while (i < buf.length) {
        const marker = buf[i + 1];
        const len = buf.readUInt16BE(i + 2);
        if (marker === 0xc0 || marker === 0xc2) {
          size = [buf.readUInt16BE(i + 7), buf.readUInt16BE(i + 5)];
          break;
        }
        i += 2 + len;
      }
      expect(size).toEqual([1200, 630]);
      expect(buf.length).toBeLessThan(120 * 1024);
    }
  });
});
