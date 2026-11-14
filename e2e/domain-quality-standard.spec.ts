import { test, expect } from "@playwright/test";
test.beforeEach(async ({ page }) => {
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
  });
});
for (const width of [390, 1440]) {
  test(`website benefits follow scroll in perspective at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/#avantaje");
    await expect(page.locator("main")).toHaveAttribute("data-anchor-ready", "true", { timeout: 15000 });
    const cards = page.locator("#avantaje").getByRole("article");
    await expect(cards).toHaveCount(6);
    const first = cards.first();
    const panel = first.locator(".website-benefit-panel");
    const place = (fraction: number) => first.evaluate((card, fraction) => {
      window.scrollBy({ top: card.getBoundingClientRect().top - innerHeight * fraction, behavior: "instant" });
    }, fraction);
    const arrival = () => first.evaluate(card => Number(card.style.getPropertyValue("--benefit-arrival")));
    const lateralOffsets = await cards.evaluateAll(elements => elements.slice(0, 2)
      .map(element => parseFloat(getComputedStyle(element).getPropertyValue("--benefit-x"))));
    expect(lateralOffsets[0]).toBeLessThan(-80);
    expect(lateralOffsets[1]).toBeGreaterThan(60);

    await place(.94);
    await expect.poll(arrival).toBeGreaterThan(.85);
    await place(.77);
    await expect.poll(arrival).toBeLessThan(.8);
    expect(await arrival()).toBeGreaterThan(.15);
    const matrix = await panel.evaluate(card => new DOMMatrixReadOnly(getComputedStyle(card).transform).m43);
    expect(matrix).toBeLessThan(-25);

    await place(.53);
    await expect.poll(arrival).toBe(0);
    await expect(panel).toHaveCSS("opacity", "1");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await place(.94);
    await expect(panel).toHaveCSS("transform", "none");
    await expect(panel).toHaveCSS("opacity", "1");
  });
}
for (const width of [320, 1440])
  for (const language of ["ro", "en"])
    test(`quality standard animates five targets at ${width}px in ${language}`, async ({
      page,
    }, info) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(
        (language === "ro" ? "/" : "/en") + "#avyron-quality-standard",
      );
      await expect(page.locator("main[data-anchor-ready]")).toHaveAttribute(
        "data-anchor-ready",
        "true",
        { timeout: 10000 },
      );
      const section = page.locator("#avyron-quality-standard");
      await expect(section).toBeAttached();
      await section.evaluate((el) => {
        document.documentElement.style.scrollBehavior = "auto";
        window.scrollTo({
          top: window.scrollY + el.getBoundingClientRect().top - 110,
          behavior: "instant",
        });
      });
      await expect(section).toHaveAttribute("data-quality-progress", "100");
      await expect(section.locator("article")).toHaveCount(5);
      await expect(section.locator(".avy-quality-ring")).toHaveCount(5);
      for (const ring of await section.locator(".avy-quality-ring").all()) {
        const rect = await ring.boundingBox();
        expect(rect).not.toBeNull();
        expect(Math.abs(rect!.width - rect!.height)).toBeLessThan(1);
        await expect(ring.locator(".avy-quality-ring-fill")).toHaveAttribute("stroke-dashoffset", "0");
      }
      await expect(
        section.getByRole("heading", {
          name:
            language === "ro"
              ? "Standardul de calitate Avyron"
              : "The Avyron quality standard",
          exact: true,
        }),
      ).toBeVisible();
      await expect(section.locator(".avy-quality-description")).toContainText(
        language === "ro"
          ? "Identitate de brand profesionistă"
          : "professional brand identity",
      );
      const seo = section.getByRole("article").filter({ has: page.getByRole("heading", { name: "SEO", exact: true }) });
      await expect(seo.getByRole("listitem").last()).toHaveText(
        language === "ro" ? "SEO/GEO/AEO Extins" : "Extended SEO/GEO/AEO",
      );
      for (const category of await section.locator("article").all()) {
        const features = category.getByRole("listitem");
        await expect(features).toHaveCount(4);
        for (const feature of await features.all()) {
          await expect(feature).toBeVisible();
          expect(await feature.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
        }
      }
      expect(
        await section.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
      ).toBe(true);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      ).toBe(true);
      await section.screenshot({
        path: info.outputPath(`quality-${language}-${width}.png`),
      });
    });
test("quality carousel is separate from the description and responds to drag and keyboard", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto("/#avyron-quality-standard");
  await expect(page.locator("main")).toHaveAttribute("data-anchor-ready", "true", { timeout: 15000 });
  const section = page.locator("#avyron-quality-standard");
  const intro = section.locator(".avy-quality-intro");
  const lane = section.locator(".avy-quality-viewport");
  await expect(intro.locator(".avy-quality-viewport")).toHaveCount(0);
  const [header, track] = await Promise.all([intro.boundingBox(), lane.boundingBox()]);
  expect(track!.y).toBeGreaterThan(header!.y + header!.height);
  expect(track!.x + track!.width).toBeLessThanOrEqual(390);
  await expect(section.getByRole("button")).toHaveCount(0);
  await expect(lane).toHaveAttribute("data-carousel-ready", "true");
  await lane.evaluate(element => element.scrollIntoView({ block: "center", behavior: "instant" }));
  const cards = lane.getByRole("article");
  const horizontal = (index: number) => cards.nth(index).evaluate(card => card.getBoundingClientRect().left);
  const start = await horizontal(0);
  await lane.focus();
  await lane.press("ArrowRight");
  await expect.poll(async () => Math.abs(await horizontal(1) - start)).toBeLessThan(2);
  const bounds = (await lane.boundingBox())!;
  const y = bounds.y + bounds.height / 2;
  await page.mouse.move(bounds.x + bounds.width * .82, y);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width * .16, y, { steps: 12 });
  await page.mouse.up();
  await expect.poll(async () => Math.abs(await horizontal(2) - start)).toBeLessThan(2);
  for (const index of [3, 4, 0]) {
    await lane.press("ArrowRight");
    await expect.poll(async () => Math.abs(await horizontal(index) - start)).toBeLessThan(2);
  }
});
test("quality standard respects reduced motion and stays after the website benefits", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/#avyron-quality-standard");
  await expect(page.locator("main[data-anchor-ready]")).toHaveAttribute(
    "data-anchor-ready",
    "true",
    { timeout: 10000 },
  );
  const section = page.locator("#avyron-quality-standard");
  await section.evaluate((el) =>
    window.scrollTo({
      top: window.scrollY + el.getBoundingClientRect().top - 100,
      behavior: "instant",
    }),
  );
  await expect(section).toHaveAttribute("data-quality-progress", "100");
  await expect(section.getByRole("button")).toHaveCount(0);
  await expect
    .poll(() =>
      page.evaluate(() => {
        const quality = document.querySelector("#avyron-quality-standard"),
          benefits = document.querySelector("#avantaje");
        return (
          !!quality &&
          !!benefits &&
          !!(
            quality.compareDocumentPosition(benefits) &
            Node.DOCUMENT_POSITION_PRECEDING
          )
        );
      }),
    )
    .toBe(true);
});
test("domain check keeps a late .ro verdict attached to the submitted name and prevents duplicate requests", async ({
  page,
}) => {
  let count = 0,
    release: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/public/domain-check", async (route) => {
    count++;
    const body = route.request().postDataJSON();
    await pending;
    await route.fulfill({
      status: 201,
      json: {
        domain: body.domain,
        status: "available",
        source: "openprovider",
        checkedAt: new Date().toISOString(),
        label: { ro: "Disponibil", en: "Available" },
        message: {
          ro: "Verificat prin API registrar.",
          en: "Checked through the registrar API.",
        },
      },
    });
  });
  await page.goto("/#verificare-domeniu");
  await expect(page.locator("main[data-anchor-ready]")).toHaveAttribute(
    "data-anchor-ready",
    "true",
    { timeout: 10000 },
  );
  const section = page.locator("#verificare-domeniu");
  await section.evaluate((el) =>
    window.scrollTo({
      top: window.scrollY + el.getBoundingClientRect().top - 100,
      behavior: "instant",
    }),
  );
  await section.getByRole("textbox").fill("atelier-test");
  await section.getByRole("textbox").press("Enter");
  await section.getByRole("textbox").press("Enter");
  await expect(
    section.getByRole("button", { name: "Verifică", exact: true }),
  ).toHaveCount(0);
  await section.getByRole("textbox").fill("alt-nume");
  release!();
  await expect(
    section.getByText("atelier-test.ro", { exact: true }),
  ).toBeVisible();
  await expect(section.getByText("Disponibil", { exact: true })).toBeVisible();
  await expect(
    section.getByText("Verificat prin API registrar."),
  ).toBeVisible();
  expect(count).toBe(1);
  await expect(section.getByRole("link", { name: /RoTLD/ })).toHaveCount(0);
  await expect(section).not.toContainText("Pentru .ro poți confirma direct");
});
test("domain lookup recovers from network failure without claiming unavailable evidence is free", async ({
  page,
}) => {
  let failed = true;
  await page.route("**/api/public/domain-check", async (route) => {
    const domain = route.request().postDataJSON().domain;
    if (failed)
      return route.fulfill({
        status: 503,
        json: { error: { message: "Serviciu temporar indisponibil" } },
      });
    return route.fulfill({
      status: 201,
      json: {
        domain,
        status: "unknown",
        source: "cloudflare-doh",
        label: { ro: "Necesită confirmare" },
        message: { ro: "Disponibilitatea nu a putut fi confirmată acum." },
      },
    });
  });
  await page.goto("/#verificare-domeniu");
  await expect(page.locator("main[data-anchor-ready]")).toHaveAttribute(
    "data-anchor-ready",
    "true",
    { timeout: 10000 },
  );
  const section = page.locator("#verificare-domeniu");
  await section.getByRole("textbox").fill("atelier-test");
  await section.getByRole("button", { name: "Verifică", exact: true }).click();
  await expect(
    page.getByText("Serviciu temporar indisponibil", { exact: true }),
  ).toBeVisible();
  failed = false;
  await expect(
    section.getByRole("button", { name: "Verifică", exact: true }),
  ).toBeEnabled();
  await section.getByRole("button", { name: "Verifică", exact: true }).click();
  await expect(
    section.getByText("Necesită confirmare", { exact: true }),
  ).toBeVisible();
  await expect(
    section.getByText("Domeniul pare disponibil.", { exact: false }),
  ).toHaveCount(0);
});
