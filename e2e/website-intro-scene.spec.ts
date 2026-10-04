import { expect, test, type Page } from "@playwright/test";

const viewports = [
  { name: "mobile", width: 402, height: 800 },
  { name: "desktop", width: 1280, height: 900 },
] as const;

const scrollToProgress = async (page: Page, target: number) => {
  await page.evaluate((t) => {
    const el = document.querySelector<HTMLElement>('[data-testid="website-intro-scene"]')!;
    const top = el.getBoundingClientRect().top + window.scrollY;
    const travel = el.offsetHeight - window.innerHeight;
    window.scrollTo({ top: top + travel * t, behavior: "instant" as ScrollBehavior });
  }, target);
  await page.waitForTimeout(350);
};

const visibleIndex = (page: Page) =>
  page.$$eval('[data-testid="website-intro-paragraph"]', (ps) =>
    ps.map((p) => Number(getComputedStyle(p).opacity)),
  );

for (const vp of viewports) {
  test(`website intro scene advances with scroll and stays readable (${vp.name})`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto("/servicii/website-prezentare-profesional");
    const scene = page.getByTestId("website-intro-scene");
    await scene.scrollIntoViewIfNeeded();
    await expect(page.getByTestId("website-intro-paragraph")).toHaveCount(3);

    for (const [target, expected] of [[0.02, 0], [0.5, 1], [0.98, 2]] as const) {
      await scrollToProgress(page, target);
      const progress = Number(await scene.getAttribute("data-progress"));
      expect(Math.abs(progress - target)).toBeLessThan(0.12);

      const opacities = await visibleIndex(page);
      const best = opacities.indexOf(Math.max(...opacities));
      expect(best).toBe(expected);
      expect(opacities[best]).toBeGreaterThan(0.8);
      opacities.forEach((o, i) => i !== best && expect(o).toBeLessThan(0.35));

      // Sticky stage pinned in the viewport, active paragraph fully on-screen and legible.
      const sticky = await page.getByTestId("website-intro-sticky").boundingBox();
      expect(Math.abs(sticky!.y)).toBeLessThan(4);
      const para = page.getByTestId("website-intro-paragraph").nth(best);
      const box = await para.boundingBox();
      expect(box!.y).toBeGreaterThanOrEqual(0);
      expect(box!.y + box!.height).toBeLessThanOrEqual(vp.height);
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(vp.width);
      const fontSize = await para.evaluate((p) => parseFloat(getComputedStyle(p).fontSize));
      expect(fontSize).toBeGreaterThanOrEqual(16);
    }
  });
}
