import { expect, test, type Page } from "@playwright/test";
import { createRequire } from "node:module";
import { BLOG_SLUGS } from "../src/data/blogSlugs";
import { staffFixture } from "./staff-fixtures";
import { showFooter } from "./footer-fixtures";
const require = createRequire(import.meta.url);

async function preferences(page: Page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => localStorage.setItem("avyron-cookie-consent-v2", JSON.stringify({
    necessary: true, analytics: false, marketing: false, savedAt: new Date().toISOString(), policyVersion: "2026-09-12",
  })));
}
const cases = [
  ["/servicii", "#cta", "Cere ofertă personalizată"],
  ["/servicii/website-prezentare-profesional", "#contact", "Discutăm despre proiectul tău"],
  ["/servicii/website-prin-abonament", "#website-brief", "Vreau site la 0 lei"],
  ["/en/services/website-subscription", "#website-brief", "I want a website with no development fee"],
  ["/servicii/blog-profesional", "#configurator-blog", "Configurează blogul"],
  ["/servicii/qa-testing-web-mobile", "#cta", "Discutăm despre testare"],
  ["/servicii/seo-ai-visibility-performance", "#growth-cta-title", "Discutăm despre obiective"],
  ["/servicii/creare-logo-3d-dinamic-cinematic/creeaza", "#brief", "Completează brieful"],
  ["/produse", "/produse/ghid", "Ghidul produselor"],
  ["/en/products/guide", "/en/products", "All products"],
  [`/blog/${BLOG_SLUGS[0]}`, "/blog", "Alte articole"],
  ["/despre-noi", "/portofoliu", "Vezi portofoliul"],
  ["/portofoliu", "#contact-title", "Discutăm proiectul tău"],
  ["/mentenanta-si-colaborari", "#comparatie", "Compară abonamentele"],
  ["/cariere", "#candidatura", "Trimite candidatura"],
  ["/configurator", "/servicii/website-prezentare-profesional", "Vezi serviciul website"],
] as const;

for (const width of [320, 1440]) {
  test(`footer route actions and working anchors at ${width}px`, async ({ page }) => {
    test.setTimeout(180_000);
    await preferences(page);
    await page.setViewportSize({ width, height: 960 });
    for (const [path, target, label] of cases) {
      await page.goto(path);
      const footer = await showFooter(page);
      const action = footer.locator(".avy-footer-cta");
      await expect(action, path).toContainText(label);
      await expect(action).toHaveAttribute("href", target);
      await expect(footer.getByTestId("footer-contact-actions").locator("a")).toHaveCount(4);
      if (path === "/despre-noi") {
        await expect(footer.getByRole("link", { name: "Cariere", exact: true })).toHaveAttribute("href", "/cariere");
      }
      expect(await footer.evaluate(el => el.scrollWidth <= el.clientWidth + 1), path).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), path).toBe(true);
      const box = (await action.boundingBox())!;
      expect(box.height, path).toBeGreaterThanOrEqual(44);
      if (target.startsWith("#")) {
        await action.click();
        await expect(page).toHaveURL(new RegExp(`${target}$`));
        await expect(page.locator(target), path).toBeInViewport();
      }
    }
  });
}

for (const state of ["visitor", "client", "staff"] as const) {
  test(`landing keeps the original actions for ${state}`, async ({ page }, info) => {
    test.setTimeout(90_000);
    await preferences(page);
    if (state === "staff") await staffFixture(page);
    if (state === "client") {
      await page.route("**/api/**", route => route.fulfill({ json: { data: [] } }));
      await page.route("**/api/auth/refresh", route => route.fulfill({ json: { access_token: "synthetic-client-token", expires_in: 900 } }));
      await page.route("**/api/auth/me", route => route.fulfill({ json: {
        user: { id: "synthetic-client", email: "client@example.test", email_verified: 1 },
        profile: { display_name: "Client sintetic", language: "ro" }, roles: ["user"], capabilities: [], superadmin: false,
      } }));
    }
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 960 });
      await page.goto("/");
      const footer = await showFooter(page);
      const actions = footer.getByTestId("footer-contact-actions").locator("a");
      const navigation = footer.locator(".avy-footer-pills");
      await expect(navigation.getByRole("link")).toHaveText(["Blog", "Produse", "Servicii", "Despre Noi", "Abonamente", "Bibliotecă"]);
      await expect(footer.locator(".avy-footer-login")).toHaveCount(state === "visitor" ? 1 : 0);
      expect(await actions.evaluateAll(links => links.map(link => link.getAttribute("href")))).toEqual([
        "https://wa.me/40734605055", "tel:+40734605055", "mailto:contact@avyron.ro",
      ]);
      await expect(footer.locator(".avy-footer-cta")).toHaveCount(0);
      const email = actions.last();
      await expect(email).toHaveCSS("width", "44px");
      await expect(email).toHaveCSS("height", "44px");
      const contactTops = await actions.evaluateAll(links =>
        links.map(link => link.getBoundingClientRect().top)
      );
      expect(Math.max(...contactTops) - Math.min(...contactTops)).toBeLessThan(1);
      for (const action of await actions.all()) {
        await expect(async () => {
          // Jumping straight to the deferred homepage footer loads intervening
          // sections. WebKit may replace its layout nodes while auth settles.
          await action.scrollIntoViewIfNeeded();
          await expect(action).toBeVisible();
          expect(await action.evaluate(el => {
            const box = el.getBoundingClientRect();
            return box.width >= 44 && box.height >= 44 && el.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2));
          }), `${state} / ${width}: contact must be unobstructed`).toBe(true);
        }).toPass({ timeout: 10_000 });
        // Enter keyboard modality before programmatic focus. Mobile WebKit's
        // default Tab navigation can skip links unless Full Keyboard Access is on.
        await expect(async () => {
          await page.keyboard.press("ArrowRight");
          await action.focus();
          await expect(action).toBeFocused({ timeout: 750 });
          await expect(action).toHaveCSS("outline-style", "solid", { timeout: 750 });
        }).toPass({ timeout: 5_000 });
      }
      await expect(footer.locator('a[href*="/profil"], a[href*="/intern"], a[href*="retuvo"], a[href^="/exemple/"]')).toHaveCount(0);
      expect(await footer.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
      if (state === "visitor") await footer.screenshot({ path: info.outputPath(`footer-${width}.png`) });
    }
  });
}

test("informational pages keep direct contact and the cookie settings work with the keyboard", async ({ page }) => {
  test.setTimeout(90_000);
  await preferences(page);
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of ["/blog", "/en/blog", "/termeni", "/gdpr", "/politica-cookies", "/en/terms"]) {
    await page.goto(path);
    const footer = await showFooter(page);
    await expect(footer.locator(".avy-footer-cta")).toHaveCount(0);
    await expect(footer.getByTestId("footer-contact-actions").locator("a")).toHaveCount(3);
  }
  const cookie = page.locator("footer").getByRole("button", { name: "Cookie settings", exact: true });
  await cookie.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: "Cookie settings", exact: true })).toBeVisible();
});

test("floating contact shortcuts never cover footer links and return when scrolling away", async ({ page }) => {
  test.setTimeout(90_000);
  await preferences(page);
  for (const width of [320, 1440]) {
    await page.setViewportSize({ width, height: 960 });
    for (const path of ["/", "/cariere", "/mentenanta-si-colaborari", "/despre-noi", "/servicii/blog-profesional"]) {
      await page.goto(path);
      const footer = page.locator("footer.avy-footer");
      await expect(async () => {
        await showFooter(page);
        await expect(page.locator(".public-contact-shortcut"), path).toBeHidden({ timeout: 2_000 });
      }).toPass({ timeout: 20_000 });
      for (const action of await footer.locator("a, button").all()) {
        await expect.poll(async () => {
          await action.scrollIntoViewIfNeeded();
          return action.evaluate(el => {
            const b = el.getBoundingClientRect();
            return el.contains(document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2));
          });
        }, { message: `${path}: footer links must not be covered`, timeout: 8_000 }).toBe(true);
      }
      await page.getByRole("heading", { level: 1 }).first().scrollIntoViewIfNeeded();
      await expect(page.locator(".public-contact-shortcut"), path).toBeVisible();
    }
  }
});

test("footer has accessible names, contrast and touch targets", async ({ page }) => {
  test.setTimeout(60_000);
  await preferences(page);
  for (const width of [320, 1440]) {
    await page.setViewportSize({ width, height: 960 });
    for (const path of ["/", "/en/terms"]) {
      await page.goto(path);
      await showFooter(page);
      await page.addScriptTag({ path: require.resolve("axe-core/axe.min.js") });
      const violations = await page.evaluate(async () => {
        const axe = (window as unknown as { axe: typeof import("axe-core") }).axe;
        return (await axe.run("footer.avy-footer", { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"] } })).violations.map(item => ({ id: item.id, nodes: item.nodes.map(node => node.target) }));
      });
      expect(violations, `${path} / ${width}: automated WCAG footer checks`).toEqual([]);
    }
  }
});
