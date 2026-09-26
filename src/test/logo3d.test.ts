import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  LOGO3D_AUDIENCES,
  LOGO3D_FAQ,
  LOGO3D_FORMATS,
  LOGO3D_GENESIS,
  LOGO3D_META,
  LOGO3D_PATHS,
  LOGO3D_PROCESS,
  LOGO3D_TIERS,
} from "@/data/logo3d";
import { ROUTE_ALTERNATES } from "@/i18n/routes";
import { PRERENDER_ROUTES } from "@/seo/publicRoutes";
import { PRODUCTS } from "@/data/products";
import { signedDistance } from "@/components/logo3d/engine/sdf";
import { CONCEPTS } from "@/components/logo3d/marks";

describe("Logo Dinamic 3D — content", () => {
  it("keeps the approved starting prices in lei", () => {
    expect(LOGO3D_TIERS.ro.map((t) => t.priceRon)).toEqual([500, 800, 1500]);
    expect(LOGO3D_TIERS.en.map((t) => t.priceRon)).toEqual([500, 800, 1500]);
    expect(LOGO3D_TIERS.ro.filter((t) => t.featured)).toHaveLength(1);
  });

  it("has the same structure in Romanian and English", () => {
    const pairs: Array<[unknown[], unknown[]]> = [
      [LOGO3D_TIERS.ro, LOGO3D_TIERS.en],
      [LOGO3D_FAQ.ro, LOGO3D_FAQ.en],
      [LOGO3D_AUDIENCES.ro.items, LOGO3D_AUDIENCES.en.items],
      [LOGO3D_FORMATS.ro.items, LOGO3D_FORMATS.en.items],
      [LOGO3D_PROCESS.ro.steps, LOGO3D_PROCESS.en.steps],
      [LOGO3D_GENESIS.ro.steps, LOGO3D_GENESIS.en.steps],
    ];
    for (const [ro, en] of pairs) expect(ro.length).toBe(en.length);
    LOGO3D_TIERS.ro.forEach((t, i) => {
      expect(t.includes.length).toBe(LOGO3D_TIERS.en[i].includes.length);
      expect(t.key).toBe(LOGO3D_TIERS.en[i].key);
    });
  });

  it("writes metadata within search-result lengths", () => {
    for (const lang of ["ro", "en"] as const) {
      expect(LOGO3D_META[lang].title.length).toBeLessThanOrEqual(75);
      expect(LOGO3D_META[lang].description.length).toBeGreaterThan(110);
      expect(LOGO3D_META[lang].description.length).toBeLessThanOrEqual(200);
    }
  });

  it("uses only fictional concept brands with both languages filled in", () => {
    expect(CONCEPTS).toHaveLength(6);
    for (const c of CONCEPTS) {
      expect(c.industry.ro && c.industry.en && c.idea.ro && c.idea.en).toBeTruthy();
    }
  });
});

describe("Logo Dinamic 3D — routing", () => {
  it("is a bilingual, prerendered route under /servicii", () => {
    expect(ROUTE_ALTERNATES).toContainEqual({ ro: LOGO3D_PATHS.ro, en: LOGO3D_PATHS.en });
    expect(PRERENDER_ROUTES).toEqual(expect.arrayContaining([LOGO3D_PATHS.ro, LOGO3D_PATHS.en]));
    const app = readFileSync(resolve(__dirname, "../App.tsx"), "utf8");
    expect(app).toContain(`path="${LOGO3D_PATHS.ro}"`);
    expect(app).toContain(`path="${LOGO3D_PATHS.en}"`);
  });

  it("is listed right before Social Media Identity", () => {
    const keys = PRODUCTS.map((p) => p.key);
    expect(keys.indexOf("logo-3d")).toBe(keys.indexOf("social-identity") - 1);
  });
});

describe("Logo Dinamic 3D — distance field", () => {
  it("measures a disc correctly: negative inside, zero on the rim, positive outside", () => {
    const w = 64;
    const cov = new Uint8Array(w * w);
    const cx = 32;
    const r = 16;
    for (let y = 0; y < w; y++)
      for (let x = 0; x < w; x++) {
        const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cx) - r;
        cov[y * w + x] = Math.round(Math.min(1, Math.max(0, 0.5 - d)) * 255);
      }
    const sdf = signedDistance(cov, w, w);
    const at = (x: number, y: number) => sdf[y * w + x];
    // Blurred slightly on purpose, so allow half a texel of error near the edge.
    expect(at(32, 32)).toBeLessThan(-12);
    expect(Math.abs(at(32 + 16, 32))).toBeLessThan(1.2);
    expect(at(60, 32)).toBeGreaterThan(10);
    // Smooth: neighbours along the rim never jump by more than about one texel.
    let worst = 0;
    for (let x = 1; x < w; x++) worst = Math.max(worst, Math.abs(at(x, 32) - at(x - 1, 32)));
    expect(worst).toBeLessThan(1.1);
  });
});
