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
      await expect(section.locator(".avy-quality-note")).toContainText("audit");
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
