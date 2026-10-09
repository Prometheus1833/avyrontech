// @vitest-environment node
import { existsSync, readFileSync } from "node:fs";
import sharp from "sharp";
import { describe, expect, it } from "vitest";

describe("public Avyron identity", () => {
  it("publishes one coherent favicon family with a browser fallback", async () => {
    const html = readFileSync("index.html", "utf8");
    const manifest = JSON.parse(readFileSync("public/site.webmanifest", "utf8")) as {
      name: string;
      icons: Array<{ src: string; sizes: string }>;
    };

    expect(html).toContain('href="/favicon.ico"');
    expect(html).toContain('sizes="96x96" href="/favicon.png"');
    expect(html.toLowerCase()).not.toContain("lovable");
    expect(manifest.name).toBe("Avyron");
    expect(manifest.icons.map((icon) => icon.src)).toEqual(["/favicon.png", "/icon-192.png", "/icon-512.png"]);
    expect(existsSync("public/favicon.ico")).toBe(true);

    await expect(sharp("public/favicon.png").metadata()).resolves.toMatchObject({ width: 96, height: 96, format: "png" });
    await expect(sharp("public/icon-512.png").metadata()).resolves.toMatchObject({ width: 512, height: 512, format: "png" });
  });
});
