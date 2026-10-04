import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { ROUTE_ALTERNATES } from "@/i18n/routes";
import { isNoindexPath, PRERENDER_ROUTES } from "@/seo/publicRoutes";

const root = process.cwd();
const appSource = readFileSync(resolve(root, "src/App.tsx"), "utf8");
const menuSource = readFileSync(resolve(root, "src/components/auth/UserMenu.tsx"), "utf8");
const pageSource = readFileSync(resolve(root, "src/pages/Careers.tsx"), "utf8");

describe("careers page", () => {
  it("is bilingual, canonical and included in prerendering", () => {
    expect(ROUTE_ALTERNATES).toContainEqual({ ro: "/cariere", en: "/en/careers" });
    expect(PRERENDER_ROUTES).toEqual(expect.arrayContaining(["/cariere", "/en/careers"]));
    expect(isNoindexPath("/cariere")).toBe(false);
    expect(isNoindexPath("/en/careers")).toBe(false);
  });

  it("registers both routes and exposes them only through the authenticated user menu", () => {
    expect(appSource).toContain('<Route path="/cariere" element={<Careers />} />');
    expect(appSource).toContain('<Route path="/en/careers" element={<Careers />} />');
    expect(menuSource).toContain('const careersPath = lang === "en" ? "/en/careers" : "/cariere"');
  });

  it("uses honest WebPage structured data instead of advertising fictional vacancies", () => {
    expect(pageSource).toContain('"@type": "WebPage"');
    expect(pageSource).not.toContain('"@type": "JobPosting"');
    expect(pageSource).toContain("Nu publicăm roluri fictive");
  });
});
