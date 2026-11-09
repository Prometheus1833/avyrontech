import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { PRERENDER_ROUTES, redirectTarget } from "@/seo/publicRoutes";
import { decide } from "@/worker/router";

describe("existing client websites are not duplicated by AVYRON demos", () => {
  it.each([["retuvo", "servicii"], ["flawlesstudio", "wellness"]])("retires the %s demo through the common edge router", (slug, sector) => {
    const path=`/exemple/${slug}`;
    expect(PRERENDER_ROUTES).not.toContain(path);
    expect(redirectTarget(path)).toBe(`/portofoliu#${sector}`);
    expect(decide(new URL(`https://avyron.ro${path}`))).toMatchObject({kind:"redirect",status:301});
  });
  it("does not bundle invented client sites or publish demo links in either footer language", () => {
    const app=readFileSync("src/App.tsx","utf8");
    expect(app).not.toContain('import("./pages/demos/RetuvoDemo');
    expect(app).not.toContain('import("./pages/demos/FlawlesstudioDemo');
    expect(existsSync('src/pages/demos/RetuvoDemo.tsx')).toBe(false);
    const copy=readFileSync('src/i18n/translations.ts','utf8');
    expect(copy).not.toContain('h: "/exemple/retuvo"');
    expect(copy).not.toContain('h: "/exemple/flawlesstudio"');
  });
});
