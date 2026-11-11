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
    await expect(page.getByRole('heading',{level:1})).toContainText('0 lei pentru dezvoltare.');
    await expect(page.locator('.ws-hero')).toHaveCSS('display','grid');
    await expect(page.locator('footer')).toHaveCSS('background-color','rgb(10, 6, 18)');
    await expect(page.locator(".ws-offer")).toContainText("de la 199 lei/lună");
    await expect(page.locator(".ws-hero picture img")).toHaveAttribute("alt", "");
    await expect(page.locator(".ws-plans")).toHaveCSS("scroll-snap-type", "x mandatory");
    await expect(page.locator('footer a[href^="/exemple/"]')).toHaveCount(0);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  } finally {await context.close();}
});
test("subscription explains the offer and presents plans in a mobile carousel", async ({page}, info) => {
  test.setTimeout(90_000);
  await publicFixture(page);
  for (const width of [320,390,1440]) {
    await page.setViewportSize({width,height:900});
    await page.goto(path);
    const hero=page.locator('.ws-hero');
    await expect(hero).toContainText("Plătești doar hosting, securitate și mentenanță de la 199 lei/lună");
    await expect(hero).not.toContainText(/abonament/i);
    const image = hero.locator("picture img");
    await expect.poll(() => image.evaluate(img => (img as HTMLImageElement).currentSrc)).toMatch(
      width < 760 ? /glass-mobile-\d+\.webp$/ : /glass-wide-\d+\.webp$/,
    );
    await expect.poll(() => image.evaluate(img => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    await expect(hero.getByRole("heading", { name: "Primești gratuit" })).toBeVisible();
    await expect(hero.getByRole("heading", { name: "În plus, ai" })).toBeVisible();
    await expect(hero.locator("a[href^='http']")).toHaveCount(0);
    await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toHaveCount(0);
    const sections = ["website-benefits", "website-personalisation", "website-connections", "website-plans", "portofoliu", "website-brief"];
    const top = await page.evaluate(ids => ids.map(id => document.getElementById(id)!.getBoundingClientRect().top), sections);
    expect(top.every((y, index) => index === 0 || y > top[index - 1])).toBe(true);
    await expect(page.locator("#website-benefits article p")).toHaveCount(8);
    await expect(page.locator("#website-personalisation button")).toHaveCount(0);
    await expect(page.locator('[data-example-carousel="premium-website"]')).toHaveCount(1);
    const plans = page.locator(".ws-plans");
    const cards = plans.locator(".ws-plan");
    await expect(cards).toHaveCount(3);
    const bounds = await cards.evaluateAll(elements => elements.map(element => element.getBoundingClientRect().top));
    expect(bounds.every(y => Math.abs(y - bounds[0]) < 1)).toBe(true);
    const navigation = page.getByRole("navigation", { name: "Navigare pachete website" });
    if (width < 760) {
      await expect(plans).toHaveCSS("scroll-snap-type", "x mandatory");
      await plans.scrollIntoViewIfNeeded();
      await plans.evaluate(element => element.scrollBy({ left: element.clientWidth, behavior: "instant" }));
      await expect(navigation.getByRole("link", { name: "Site Business" })).toHaveAttribute("aria-current", "true");
      const premium = navigation.getByRole("link", { name: "Site Premium" });
      await premium.click();
      await expect(premium).toHaveAttribute("aria-current", "true");
      await expect(cards.last()).toBeInViewport({ ratio: 0.8 });
      await cards.last().getByRole("button", { name: "Aleg Site Premium" }).click();
      await expect(page.locator("#website-brief").getByRole("button", { name: /Site Premium/ })).toHaveAttribute("aria-pressed", "true");
      await navigation.getByRole("link", { name: "Site Start" }).click();
    } else {
      await expect(navigation).toBeHidden();
      expect(await plans.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
    }
    for (const plan of await cards.all()) {
      await expect(plan.locator(".ws-plan-metrics>div")).toHaveCount(4);
      const features = plan.locator(".ws-plan-features summary");
      await features.click();
      await expect(plan.locator(".ws-plan-features li").first()).toBeVisible();
      await features.click();
    }
    await page.locator("#website-plans").screenshot({ path: info.outputPath(`subscription-plans-${width}.png`) });
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
    await hero.screenshot({path:info.outputPath(`subscription-hero-${width}.png`)});
    const footer=page.locator('footer');
    await footer.scrollIntoViewIfNeeded();
    await expect(footer.locator('a[href^="/exemple/"]')).toHaveCount(0);
    await expect(footer.locator('.avy-footer-cta')).toHaveCount(1);
    await footer.screenshot({path:info.outputPath(`subscription-footer-${width}.png`)});
  }
});
test("website offer bar compacts at scroll and keeps anchor destinations visible", async ({ page }) => {
  test.setTimeout(60_000);
  await publicFixture(page);
  for (const width of [320, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(path);
    const bar = page.locator(".ws-top");
    await expect(bar).not.toHaveAttribute("data-compact");
    const start = (await bar.boundingBox())!;
    await page.evaluate(() => window.scrollTo(0, 240));
    await expect(bar).toHaveAttribute("data-compact", "true");
    const compact = (await bar.boundingBox())!;
    expect(compact.width).toBeLessThan(start.width);
    expect(compact.y).toBeGreaterThan(start.y);
    expect(Math.abs(compact.x + compact.width / 2 - start.x - start.width / 2)).toBeLessThan(2);
    await expect(bar).toHaveCSS("backdrop-filter", "none");
    await bar.getByRole("link", { name: "Cere o ofertă" }).click();
    await expect(page).toHaveURL(/#website-brief$/);
    await expect.poll(async () => (await page.locator("#website-brief").boundingBox())!.y).toBeGreaterThan(compact.y + compact.height);
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(bar).not.toHaveAttribute("data-compact");
  }
});
for (const width of [390, 1440]) {
  test(`the conversation wire follows scroll at ${width}px and respects reduced motion`, async ({ page }, info) => {
    await publicFixture(page);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.setViewportSize({ width, height: 800 });
    await page.goto(path);
    const journey = page.locator(".ws-contact-journey");
    await expect(journey.locator(".ws-journey-card")).toHaveCount(3);
    const scrub = (progress: number) => journey.evaluate((element, amount) => {
      const box = element.getBoundingClientRect();
      const y = box.top + scrollY + box.height / 6 + amount * box.height * 2 / 3 - innerHeight * 0.66;
      window.scrollTo({ top: y, behavior: "instant" });
    }, progress);
    for (const progress of [0.2, 0.55, 0.96, 0.33]) {
      await scrub(progress);
      await expect.poll(async () => Math.abs(Number(await journey.getAttribute("data-wire-progress")) - progress * 100)).toBeLessThan(2);
      const offset = await journey.locator(".ws-wire-light").evaluate(path => parseFloat(getComputedStyle(path).strokeDashoffset));
      expect(Math.abs(offset - (1 - progress) * 100)).toBeLessThan(2);
      if (progress === 0.55) await journey.screenshot({ path: info.outputPath(`subscription-journey-${width}.png`) });
    }
    await expect(journey.locator("[data-reached]")).toHaveCount(1);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(journey).not.toHaveAttribute("data-wire-progress");
    await expect(journey.locator(".ws-wire-light")).toHaveCSS("stroke-dashoffset", "0px");
  });
}
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
    if (info.project.name === "webkit-mobile") test.setTimeout(60_000);
    await publicFixture(page);
    await page.setViewportSize({ width, height: 960 });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "0 lei pentru dezvoltare.",
    );
    await expect(page.locator(".ws-plan")).toHaveCount(3);
    const launcher = page.getByRole("button", {name: "Discută cu AVY, asistentul Avyron", exact: true});
    await expect(launcher).toHaveCSS("bottom", "16px");
    await launcher.click();
    await expect(page.getByRole("button", {name: "Închide conversația", exact: true})).toBeVisible();
    await page.getByRole("button", {name: "Închide conversația", exact: true}).click();
    await expect(launcher).toHaveCSS("bottom", "16px");
    await expect(launcher).toHaveCSS("right", "16px");
    await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toHaveCount(0);
    await expect(page.getByTestId("page-back-link")).toBeVisible();
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
test("website chooser recommends the professional site, puts the subscription second and keeps cinematic unavailable", async ({
  page,
}, info) => {
  // WebKit rotates/resizes four viewports and captures six frames in this journey.
  if (info.project.name === "webkit-mobile") test.setTimeout(60_000);
  await publicFixture(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/#servicii");
  await expect(page.locator('main[data-anchor-ready="true"]')).toBeVisible();
  const trigger = page
    .getByTestId("service-list")
    .getByRole("button", { name: /Site Prezentare Profesional/ });
  await expect(page.locator(`main a[href="${path}"]`)).toHaveCount(0);
  await trigger.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  const choices = page.getByTestId("website-choices");
  await expect(choices.locator(':scope > *').first()).toHaveAttribute('data-recommended','true');
  await expect(choices.locator(':scope > *').first()).toHaveAttribute('href','/servicii/website-prezentare-profesional');
  await expect(choices.locator(':scope > *').first()).toBeFocused();
  await expect(choices.locator(':scope > *').first()).toContainText('Plată unică de la 1.450 lei');
  for (const detail of ['Design personalizat', 'versiune mobilă', 'SEO tehnic', 'Acces complet']) await expect(choices.locator(':scope > *').first()).toContainText(detail);
  expect(await choices.locator('strong').allTextContents()).toEqual(['Site Prezentare Profesional','Website la 0 lei','Website Cinematic 3D']);
  const subscription = choices.locator(':scope > *').nth(1);
  await expect(subscription).toHaveAttribute('href',path);
  for (const benefit of ['hosting','securitate','SEO inițial','mentenanță','199 lei/lună','Schimbi treapta oricând']) await expect(subscription).toContainText(benefit);
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
    await dialog.screenshot({path:info.outputPath(`chooser-${viewport.width}-${viewport.height}.png`)});
  }
  await expect(choices.locator(":scope > *")).toHaveCount(3);
  await expect(choices.locator(":scope > *").nth(2)).toHaveAttribute(
    "aria-disabled",
    "true",
  );
  await page.screenshot({ path: info.outputPath("chooser-desktop.png") });
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
  await page.setViewportSize({ width: 320, height: 800 });
  await expect(page.locator(`main a[href="${path}"]`)).toHaveCount(0);
  await trigger.click();
  const offer=page.getByRole("dialog").getByRole("link",{name:/Website la 0 lei/});
  await expect(offer).toContainText("De la 199 lei/lună");
  await expect(offer).toHaveAttribute("href",path);
  await page.screenshot({path:info.outputPath("website-chooser-mobile.png")});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await offer.click();
  await expect(page).toHaveURL(path);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("0 lei pentru dezvoltare.");
  await page.goto("/servicii");
  await expect(page.locator(`main a[href="${path}"]`)).toHaveCount(0);
});
test("English website chooser preserves recommendation and opens the middle subscription offer", async ({page}) => {
  await publicFixture(page);
  await page.goto('/en#servicii');
  await expect(page.locator('main[data-anchor-ready="true"]')).toBeVisible();
  await expect(page.locator('main a[href="/en/services/website-subscription"]')).toHaveCount(0);
  await page.getByTestId('service-list').getByRole('button',{name:/Business websites/}).click();
  const choices=page.getByTestId('website-choices');
  expect(await choices.locator('strong').allTextContents()).toEqual(['Business Website','Website with no development fee','Cinematic 3D Website']);
  await expect(choices.locator(':scope > *').first()).toBeFocused();
  await expect(choices.locator(':scope > *').first()).toContainText('One-time development from RON 1,450');
  const subscription=choices.locator(':scope > *').nth(1);
  await expect(subscription).toContainText('From RON 199 / month');
  await expect(subscription).toContainText('initial SEO');
  await expect(choices.locator(':scope > *').nth(2)).toHaveAttribute('aria-disabled','true');
  await subscription.click();
  await expect(page).toHaveURL('/en/services/website-subscription');
  await expect(page.getByRole('heading',{level:1})).toBeVisible();
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
    "No development fee.",
  );
  await expect(page.getByRole("button", {name: "Chat with AVY, the Avyron assistant", exact: true})).toHaveCSS("bottom", "16px");
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

for (const width of [320,390,1440]) test(`library brand stays readable at ${width}px`, async ({page},info) => {
  await publicFixture(page);await page.setViewportSize({width,height:844});await page.goto('/biblioteca');
  const header=page.locator('.sticky').first();
  await expect(header.getByRole('link',{name:'Avyron Bibliotecă Artefacte',exact:true})).toBeVisible();
  const boxes=await header.locator(':scope > div > *').evaluateAll(nodes=>nodes.map(node=>{const r=node.getBoundingClientRect();return {x:r.x,right:r.right,y:r.y,bottom:r.bottom};}));
  for(const [i,rect] of boxes.entries()){expect(rect.x).toBeGreaterThanOrEqual(0);expect(rect.right).toBeLessThanOrEqual(width);if(i)expect(rect.x).toBeGreaterThanOrEqual(boxes[i-1].right);}
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await page.screenshot({path:info.outputPath(`library-header-${width}.png`),animations:'disabled'});
});
