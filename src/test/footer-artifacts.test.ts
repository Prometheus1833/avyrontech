// @vitest-environment node
import { readFileSync, existsSync } from "node:fs";
import { JSDOM } from "jsdom";
import { expect, it } from "vitest";
import { PRERENDER_ROUTES } from "@/seo/publicRoutes";

const built = existsSync("dist/client/index.html") ? "dist/client" : "dist";
it("validates every rendered footer destination and local anchor across the public route registry", () => {
  let checked = 0;
  for (const path of new Set(PRERENDER_ROUTES)) {
    const html = readFileSync(`${built}${path === "/" ? "" : path}/index.html`, "utf8");
    expect(html.match(/<html\b[^>]*>/)?.[0], `${path}: transient visibility must not be prerendered`).not.toContain("data-footer-contact-visible");
    const markup = html.match(/<footer\b[^>]*class="avy-footer"[\s\S]*?<\/footer>/)?.[0];
    if (!markup) continue; // Independent examples/library have their own footer.
    checked++;
    const document = JSDOM.fragment(markup);
    const actions = document.querySelectorAll('[data-testid="footer-contact-actions"] a');
    expect([3, 4], path).toContain(actions.length);
    expect(actions[0].getAttribute("href"), path).toBe("https://wa.me/40734605055");
    expect(actions[actions.length - 2].getAttribute("href"), path).toBe("tel:+40734605055");
    expect(actions[actions.length - 1].getAttribute("href"), path).toBe("mailto:contact@avyron.ro");
    for (const link of document.querySelectorAll("a[href]")) {
      const href = link.getAttribute("href")!;
      expect(href, path).not.toMatch(/retuvo|cutiutamagica|cabinet|javascript:|\/profil|\/intern/i);
      if (link.getAttribute("target") === "_blank") expect(link.getAttribute("rel"), `${path}: ${href}`).toMatch(/noopener/);
      if (!href.startsWith("/") && !href.startsWith("#")) continue;
      const destination = new URL(href, `https://avyron.ro${path}`);
      const target = destination.pathname.replace(/\/$/, "") || "/";
      const file = `${built}${target === "/" ? "" : target}/index.html`;
      expect(existsSync(file), `${path}: missing ${href}`).toBe(true);
      if (destination.hash) {
        const content = target === path ? html : readFileSync(file, "utf8");
        expect(content, `${path}: missing anchor ${href}`).toContain(`id="${decodeURIComponent(destination.hash.slice(1))}"`);
      }
    }
    expect(document.querySelectorAll('[data-testid="footer-legal-row"] a, [data-testid="footer-legal-row"] button'), path).toHaveLength(3);
    if (path === "/" || path === "/en") {
      expect(actions).toHaveLength(4);
      expect(actions[1].getAttribute("href")).toBe("#cta");
      expect(actions[1].textContent).toContain(path === "/" ? "Exemplu Gratuit" : "Free Example");
    }
  }
  expect(checked).toBeGreaterThan(40);
}, 30_000);
