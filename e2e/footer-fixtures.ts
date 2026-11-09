import { expect, type Page } from "@playwright/test";

export async function showFooter(page: Page) {
  const footer = page.locator("footer.avy-footer");
  // React replaces the prerendered DOM. The observer attribute proves that
  // the interactive footer is ready, without a fixed timeout or a forced click.
  await expect(async () => {
    await footer.scrollIntoViewIfNeeded({ timeout: 5_000 });
    await expect(footer).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("data-footer-contact-visible", "");
  }).toPass({ timeout: 15_000 });
  return footer;
}
