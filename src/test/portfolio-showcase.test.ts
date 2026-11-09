// @vitest-environment node
import { existsSync, readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import { describe, it, expect } from "vitest";
import { PRERENDER_ROUTES, redirectTarget } from "@/seo/publicRoutes";
import { decide } from "@/worker/router";
const built = existsSync("dist/client/portofoliu/index.html")
  ? "dist/client"
  : "dist";
const html = (path: string) =>
  new JSDOM(readFileSync(`${built}${path}/index.html`, "utf8")).window.document;

describe("canonical portfolio pages", () => {
  it.each(["/portofoliu", "/en/portfolio"])(
    "serves %s as an indexable page, without the old redirect",
    (path) => {
      expect(PRERENDER_ROUTES).toContain(path);
      expect(redirectTarget(path)).toBeNull();
      expect(decide(new URL(`https://avyron.ro${path}`))).toMatchObject({
        kind: "page",
        robots: null,
      });
      const doc = html(path);
      expect(
        doc.querySelector('link[rel="canonical"]')?.getAttribute("href"),
      ).toBe(`https://avyron.ro${path}`);
      expect(
        doc.querySelector('meta[name="robots"]')?.getAttribute("content"),
      ).not.toContain("noindex");
      expect(doc.querySelectorAll("h1")).toHaveLength(1);
      const preload = doc.querySelector(
        'link[rel="modulepreload"][href*="/Portfolio-"]',
      );
      expect(preload).not.toBeNull();
      expect(existsSync(`${built}${preload!.getAttribute("href")}`)).toBe(true);
      expect(
        doc.head.querySelector("#avyron-portfolio-styles")?.textContent,
      ).toContain(".pf-page");
      expect(doc.querySelector(".pf-scene")?.getAttribute("data-motion")).toBe(
        "paused",
      );
      expect(doc.querySelector(".pf-motion")?.hasAttribute("disabled")).toBe(
        true,
      );
      expect(doc.querySelectorAll(".pf-case")).toHaveLength(6);
      expect(doc.querySelectorAll(".pf-sector")).toHaveLength(4);
      expect(doc.querySelectorAll(".pf-case img[loading=lazy]")).toHaveLength(
        6,
      );
      expect(
        doc.querySelector('meta[property="og:image"]')?.getAttribute("content"),
      ).toBe("https://avyron.ro/og/portfolio-2026.jpg");
      const graph = JSON.parse(doc.querySelector("#ld-graph")!.textContent!)[
        "@graph"
      ];
      const page = graph.find(
        (node: Record<string, unknown>) => node["@type"] === "CollectionPage",
      );
      expect(page.mainEntity.numberOfItems).toBe(6);
    },
  );
  it("keeps public discovery links and the legacy about alias", () => {
    const doc = html("/servicii/website-prezentare-profesional");
    expect(doc.querySelector('a[href="/portofoliu"]')?.textContent).toContain(
      "Explorează portofoliul",
    );
    expect(redirectTarget("/despre-si-portofoliu")).toContain(
      "website-prezentare-profesional",
    );
    const home = new JSDOM(readFileSync(`${built}/index.html`, "utf8")).window
      .document;
    expect(
      home.querySelector('link[rel="modulepreload"][href*="/Portfolio-"]'),
    ).toBeNull();
    expect(readFileSync(`${built}/sitemap.xml`, "utf8")).toContain(
      "https://avyron.ro/portofoliu</loc>",
    );
    expect(readFileSync(`${built}/llms.txt`, "utf8")).toContain(
      "https://avyron.ro/en/portfolio",
    );
  });
});
