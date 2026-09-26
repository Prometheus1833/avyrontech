import { describe, expect, it } from "vitest";

import {
  EFFECTS_BY_CODE,
  LIBRARY_SECTIONS,
  TOTAL_EFFECTS,
  TOTAL_SIGNATURE,
  WEBGL_DEMOS,
  type DemoKey,
} from "@/data/bibliotecaCatalog";
import { DEMO_LOADERS, WEBGL_LOADERS } from "@/components/biblioteca/demos/registry";
import { PRODUCTS } from "@/data/products";

/**
 * Catalogul Bibliotecii e sursa unică pentru pagină, pentru coșul de brief și
 * pentru datele structurate. Dacă se desincronizează de rutele produselor sau
 * de registrul de demo-uri, pagina se strică tăcut — de aici testele.
 */
describe("catalogul Bibliotecii", () => {
  const effects = LIBRARY_SECTIONS.flatMap((section) => section.effects);

  it("are coduri unice, în formatul {SERVICIU}-{S|F}{n}", () => {
    const codes = effects.map((effect) => effect.code);
    expect(new Set(codes).size).toBe(codes.length);
    for (const effect of effects) {
      expect(effect.code).toMatch(/^[A-Z]{3}-[SF]\d+$/);
      expect(effect.code.startsWith(`${LIBRARY_SECTIONS.find((s) => s.effects.includes(effect))!.code}-`)).toBe(true);
    }
  });

  it("marchează treapta corect în cod: S pentru semnătură, F pentru fundație", () => {
    for (const effect of effects) {
      const marker = effect.code.split("-")[1][0];
      expect(marker).toBe(effect.tier === "signature" ? "S" : "F");
    }
  });

  it("are text în ambele limbi pentru fiecare efect și secțiune", () => {
    for (const section of LIBRARY_SECTIONS) {
      expect(section.name.ro.length).toBeGreaterThan(0);
      expect(section.name.en.length).toBeGreaterThan(0);
      expect(section.claim.ro.length).toBeGreaterThan(0);
      expect(section.claim.en.length).toBeGreaterThan(0);
    }
    for (const effect of effects) {
      expect(effect.name.ro.length).toBeGreaterThan(0);
      expect(effect.name.en.length).toBeGreaterThan(0);
      expect(effect.desc.ro.length).toBeGreaterThan(0);
      expect(effect.desc.en.length).toBeGreaterThan(0);
    }
  });

  it("are un loader pentru fiecare demo, în familia potrivită", () => {
    const used = new Set(effects.map((effect) => effect.demo).filter(Boolean) as DemoKey[]);
    for (const key of used) {
      const loader = WEBGL_DEMOS.has(key) ? WEBGL_LOADERS[key] : DEMO_LOADERS[key];
      expect(loader, `lipsește loaderul pentru ${key}`).toBeTypeOf("function");
    }
  });

  it("marchează drept WebGL exact efectele care cer un context grafic", () => {
    for (const effect of effects) {
      if (!effect.demo) {
        expect(effect.webgl).toBeUndefined();
        continue;
      }
      expect(Boolean(effect.webgl)).toBe(WEBGL_DEMOS.has(effect.demo));
    }
  });

  it("folosește ancore identice cu slug-urile paginilor de produs", () => {
    const productPaths = new Set(PRODUCTS.map((product) => product.path.ro));
    for (const section of LIBRARY_SECTIONS) {
      if (!section.product) continue;
      expect(section.id).toBe(section.product.ro.split("/").pop());
      // Blogul are pagină proprie, în afara listei PRODUCTS.
      if (section.id === "blog-profesional") continue;
      expect(productPaths.has(section.product.ro), `ruta ${section.product.ro} nu există`).toBe(true);
    }
  });

  it("nu leagă biblioteca de paginile de produs excluse", () => {
    const excluse = LIBRARY_SECTIONS.filter((section) => !section.entry).map((section) => section.id);
    expect(excluse.sort()).toEqual(["agent-ai-personalizat", "aplicatii-web-si-mobile"]);
  });

  it("are exemple concrete în ambele limbi pentru fiecare secțiune", () => {
    for (const section of LIBRARY_SECTIONS) {
      expect(section.cases.length).toBeGreaterThanOrEqual(3);
      for (const example of section.cases) {
        expect(example.ro.length).toBeGreaterThan(20);
        expect(example.en.length).toBeGreaterThan(20);
      }
    }
  });

  it("ține totalurile în acord cu conținutul", () => {
    expect(TOTAL_EFFECTS).toBe(effects.length);
    expect(TOTAL_SIGNATURE).toBe(effects.filter((effect) => effect.tier === "signature").length);
    expect(EFFECTS_BY_CODE.size).toBe(effects.length);
  });
});
