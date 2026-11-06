// @vitest-environment node
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import sharp from "sharp";
import { expect, it } from "vitest";
import { JSDOM } from "jsdom";
import { SERVICE_SOCIAL, serviceSocialForPath } from "../seo/serviceSocial";

it("publishes valid, compact content-addressed JPEGs and complete crawler HTML for every service", async () => {
  const dist = existsSync("dist/client/index.html") ? "dist/client" : "dist";
  const titles = new Set<string>(), descriptions = new Set<string>();
  let bytes = 0;
  for (const entry of SERVICE_SOCIAL) for (const lang of ["ro", "en"] as const) {
    const image = serviceSocialForPath(entry.path[lang])!;
    const data = readFileSync(`public${image.image}`);
    const hash = createHash("sha256").update(data).digest("hex").slice(0, 12);
    expect(image.image).toContain(hash);
    expect(data.length).toBeLessThan(120_000);
    bytes += data.length;
    expect(await sharp(data).metadata()).toMatchObject({ width: 1200, height: 630, format: "jpeg" });
    expect(readFileSync(`${dist}${image.image}`).equals(data)).toBe(true);
    const dom = new JSDOM(readFileSync(`${dist}${entry.path[lang]}/index.html`, "utf8"));
    const d = dom.window.document;
    const meta = (key: string) => d.querySelector(`meta[property="${key}"],meta[name="${key}"]`)?.getAttribute("content");
    expect(meta("og:image")).toBe(`https://avyron.ro${image.image}`);
    expect(meta("twitter:image")).toBe(meta("og:image"));
    expect(meta("og:title")).toBe(d.title);
    expect(meta("twitter:title")).toBe(d.title);
    expect(meta("og:description")).toBe(meta("description"));
    expect(meta("twitter:description")).toBe(meta("description"));
    expect(meta("og:image:alt")!.length).toBeGreaterThan(10);
    expect(meta("og:locale")).toBe(lang === "ro" ? "ro_RO" : "en_US");
    expect(meta("og:url")).toBe(`https://avyron.ro${entry.path[lang]}`);
    for (const key of ["og:image", "og:title", "og:description", "twitter:image"]) {
      expect(d.querySelectorAll(`meta[property="${key}"],meta[name="${key}"]`)).toHaveLength(1);
    }
    titles.add(d.title); descriptions.add(meta("description")!);
    dom.window.close();
  }
  expect(titles.size).toBe(SERVICE_SOCIAL.length * 2);
  expect(descriptions.size).toBe(SERVICE_SOCIAL.length * 2);
  expect(bytes).toBeLessThan(1_500_000);
});
