import { test, expect, type Page } from "@playwright/test";
import { createRequire } from "node:module";
import { defaultWebsitePlans } from "../src/shared/websiteSubscriptions";
import { readFileSync } from "node:fs";
const carousel = JSON.parse(
  readFileSync("src/shared/exampleCarouselDefaults.json", "utf8"),
);
import { staffFixture } from "./staff-fixtures";
const path = "/servicii/website-prin-abonament";
test("the subscription artifact is styled and readable before JavaScript", async ({browser,baseURL}) => {
  const context=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});
  try {
    const page=await context.newPage();
    // Vite's plain preview needs the directory URL to serve this route's HTML;
    // the production Worker maps the canonical URL to the same artifact.
    await page.goto(`${baseURL}${path}/`,{waitUntil:'domcontentloaded'});
    await expect(page.getByRole('heading',{level:1})).toContainText('Fără costuri de dezvoltare.');
    await expect(page.locator('.ws-hero')).toHaveCSS('display','grid');
    await expect(page.locator('footer')).toHaveCSS('background-color','rgb(10, 6, 18)');
    await expect.poll(()=>page.locator('.ws-project-main img').evaluate((el:HTMLImageElement)=>el.complete&&el.naturalWidth>0)).toBe(true);
    await expect(page.locator('footer a[href^="/exemple/"]')).toHaveCount(0);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  } finally {await context.close();}
});
test("subscription tells the benefits-first story with actual agency work and compact plan choices", async ({page}, info) => {
  await publicFixture(page);
  for (const width of [320,390,1440]) {
    await page.setViewportSize({width,height:900});
    await page.goto(path);
    const hero=page.locator('.ws-hero');
    await expect(hero.getByRole('link',{name:/Flawless Studio/})).toHaveAttribute('href','https://flawlesstudio.ro/');
    await expect(hero.getByRole('link',{name:/Ruller/})).toHaveAttribute('href','https://ruller.eu/');
    await expect(hero).not.toContainText('FORMA');
    const top=await page.evaluate(()=>['website-benefits','website-personalisation','website-process','website-connections','website-plans','website-account','website-care','portofoliu','website-brief'].map(id=>document.getElementById(id)!.getBoundingClientRect().top));
    expect(top.every((y,i)=>i===0||y>top[i-1])).toBe(true);
    for (const plan of await page.locator('.ws-plan').all()) {
      await expect(plan.locator('.ws-plan-metrics>div')).toHaveCount(4);
      expect((await plan.boundingBox())!.height).toBeLessThan(650);
      await plan.locator('.ws-plan-features summary').click();
      await expect(plan.locator('.ws-plan-features li').first()).toBeVisible();
      await plan.locator('.ws-plan-features summary').click();
    }
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
    await hero.screenshot({path:info.outputPath(`subscription-hero-${width}.png`)});
    const footer=page.locator('footer');
    await footer.scrollIntoViewIfNeeded();
    await expect(footer.locator('a[href^="/exemple/"]')).toHaveCount(0);
    await expect(footer.locator('.avy-footer-cta')).toHaveCount(1);
    await footer.screenshot({path:info.outputPath(`subscription-footer-${width}.png`)});
  }
});
async function publicFixture(page: Page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    localStorage.setItem(
      "avyron-cookie-consent-v2",
      JSON.stringify({
        necessary: true,
        analytics: false,
        marketing: false,
        savedAt: new Date().toISOString(),
        policyVersion: "2026-09-12",
      }),
    );
    // Local synthetic challenge only. Backend runtime tests enforce verification.
    window.turnstile = {
      render: () => "synthetic",
      remove: () => {},
      reset: () => {},
    };
  });
  await page.route("**/api/**", (r) => {
    const p = new URL(r.request().url()).pathname;
    if (p === "/api/auth/refresh" || p === "/api/auth/me")
      return r.fulfill({
        status: 401,
        json: { error: { code: "unauthorized" } },
      });
    if (p === "/api/website-subscriptions/plans")
      return r.fulfill({ json: { data: defaultWebsitePlans() } });
    if (p === "/api/public/example-carousels/premium-website")
      return r.fulfill({ json: { config: carousel } });
    return r.fulfill({ json: { data: [], total: 0 } });
  });
}
for (const width of [320, 390, 768, 1440])
  test(`public service at ${width}px`, async ({ page }, info) => {
    await publicFixture(page);
    await page.setViewportSize({ width, height: 960 });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Fără costuri de dezvoltare.",
    );
    await expect(page.locator(".ws-plan")).toHaveCount(3);
    const homeCrumb = page
      .getByRole("navigation", { name: "Breadcrumb" })
      .getByRole("link", { name: "Acasă", exact: true });
    expect(
      await homeCrumb.evaluate((el) => {
        const r = el.getBoundingClientRect();
        return el.contains(
          document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2),
        );
      }),
    ).toBe(true);
    await expect(
      page.locator('[data-example-carousel="premium-website"]'),
    ).toBeAttached();
    await expect(page.locator("link[rel=canonical]")).toHaveAttribute(
      "href",
      "https://avyron.ro" + path,
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath(`website-${width}-hero.png`),
    });
    await page.screenshot({
      path: info.outputPath(`website-${width}.png`),
      fullPage: true,
    });
    expect(errors).toEqual([]);
  });
test("chooser keeps all three compact options within the viewport, cinematic stays unavailable", async ({
  page,
}, info) => {
  await publicFixture(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/#servicii");
  const trigger = page
    .getByTestId("service-list")
    .getByRole("button", { name: /Site Prezentare Profesional/ });
  await trigger.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  const choices = page.getByTestId("website-choices");
  for (const viewport of [{width:320,height:568},{width:390,height:844},{width:844,height:390},{width:1440,height:900}]) {
    await page.setViewportSize(viewport);
    const bounds = await choices.locator(":scope > *").evaluateAll(nodes => nodes.map(node => { const r=node.getBoundingClientRect(); return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}; }));
    expect(bounds).toHaveLength(3);
    for (const [i, rect] of bounds.entries()) {
      expect(rect.left).toBeGreaterThanOrEqual(8);
      expect(rect.right).toBeLessThanOrEqual(viewport.width-8);
      expect(rect.top).toBeGreaterThanOrEqual(8);
      expect(rect.bottom).toBeLessThanOrEqual(viewport.height-8);
      expect(rect.width).toBeGreaterThan(rect.height);
      if (i) expect(rect.top).toBeGreaterThanOrEqual(bounds[i-1].bottom);
    }
    expect(await choices.evaluate(el => el.scrollWidth<=el.clientWidth+1)).toBe(true);
  }
  await expect(choices.locator(":scope > *")).toHaveCount(3);
  await expect(choices.locator(":scope > *").nth(1)).toHaveAttribute(
    "aria-disabled",
    "true",
  );
  await expect(choices.locator(":scope > *").nth(2)).toHaveAttribute(
    "href",
    path,
  );
  await page.screenshot({ path: info.outputPath("chooser-desktop.png") });
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
  await page.setViewportSize({ width: 320, height: 800 });
  await trigger.click();
  await choices
    .getByRole("link", { name: /Website prin abonament/ })
    .scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath("chooser-mobile.png") });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  await choices.getByRole("link", { name: /Website prin abonament/ }).click();
  await expect(page).toHaveURL(path);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Fără costuri de dezvoltare.");
  await page.goto("/servicii");
  await expect(page.locator(`main a[href="${path}"]`)).toHaveCount(0);
});
test("three-step brief preserves progress, never requires login, retries one request", async ({
  page,
}) => {
  await publicFixture(page);
  await page.goto(path + "#website-brief");
  const form = page.locator(".ws-form");
  await form
    .getByRole("button", { name: "Mai multe servicii", exact: true })
    .click();
  await form.getByRole("button", { name: "Continuă", exact: true }).click();
  await form.getByLabel("Denumirea afacerii").fill("Afacere sintetică");
  await form.getByLabel("Domeniu de activitate").fill("Consultanță");
  await form
    .getByLabel("Ce vrei să obții?")
    .fill("Mai multe solicitări calificate");
  await page.reload();
  await expect(form.getByLabel("Denumirea afacerii")).toHaveValue(
    "Afacere sintetică",
  );
  await form.getByRole("button", { name: "Continuă", exact: true }).click();
  await form.getByLabel("Nume", { exact: true }).fill("Client sintetic");
  await form.getByLabel("E-mail", { exact: true }).fill("client@example.test");
  const sends: { body: Record<string, unknown>; key: string | undefined }[] =
    [];
  await page.route("**/api/website-subscriptions/requests", (r) => {
    sends.push({
      body: r.request().postDataJSON(),
      key: r.request().headers()["idempotency-key"],
    });
    return sends.length === 1
      ? r.fulfill({ status: 503, json: { error: { code: "temporary" } } })
      : r.fulfill({
          status: 201,
          json: { reference: "00000000-0000-4000-8000-000000000001" },
        });
  });
  const submit = form.getByRole("button", {
    name: "Construiește-mi website-ul",
    exact: true,
  });
  await submit.click();
  expect(sends).toHaveLength(0);
  await form.getByRole("checkbox").check();
  await submit.click();
  await expect(form.getByRole("alert")).toBeVisible();
  await submit.click();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Cererea ta este înregistrată." }),
  ).toBeVisible();
  expect(sends).toHaveLength(2);
  expect(sends[0].key).toBe(sends[1].key);
  expect(sends[1].body).toMatchObject({
    planId: "business",
    company: "Afacere sintetică",
    consent: true,
  });
});
test("English metadata and keyboard/contrast checks", async ({ page }) => {
  await publicFixture(page);
  await page.goto("/en/services/website-subscription");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Without development costs.",
  );
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
    "content",
    "https://avyron.ro/en/services/website-subscription",
  );
  await page.goto(path);
  await expect(page.locator(".ws-page h1")).toBeVisible();
  await page.addScriptTag({
    path: createRequire(import.meta.url).resolve("axe-core/axe.min.js"),
  });
  const violations = await page.evaluate(async () => {
    const axe = (
      window as unknown as {
        axe: {
          run: (
            selector: string,
            options: object,
          ) => Promise<{
            violations: {
              id: string;
              impact: string;
              nodes: { target: string[] }[];
            }[];
          }>;
        };
      }
    ).axe;
    return (
      await axe.run(".ws-page", {
        runOnly: {
          type: "tag",
          values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"],
        },
      })
    ).violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      nodes: v.nodes.map((n) => n.target),
    }));
  });
  expect(violations).toEqual([]);
});
for (const width of [390, 1440])
  test(`native staff configuration at ${width}px`, async ({ page }, info) => {
    await staffFixture(page);
    await page.setViewportSize({ width, height: 950 });
    await page.route("**/api/website-subscriptions/account/projects", (r) =>
      r.fulfill({ json: { data: [], canManage: true } }),
    );
    await page.route("**/api/website-subscriptions/internal/options", (r) =>
      r.fulfill({
        json: {
          canManage: true,
          plans: defaultWebsitePlans(),
          clients: [],
          accounts: [],
          staff: [],
          requests: [],
        },
      }),
    );
    await page.goto("/profil?tab=website-subscriptions");
    await expect(
      page.getByRole("heading", {
        name: "Site-uri prin abonament",
        exact: true,
      }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Configurări", exact: true })
      .click();
    await expect(
      page.getByRole("group").filter({ hasText: "Site Start" }).first(),
    ).toBeVisible();
    await page.screenshot({
      path: info.outputPath(`admin-website-${width}.png`),
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    await page
      .getByRole("button", { name: "Creează proiect", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(
      page
        .getByRole("dialog")
        .getByRole("button", { name: "Creează și sincronizează", exact: true }),
    ).toBeDisabled();
  });
