import { expect, test } from "@playwright/test";
import { staffFixture } from "./staff-fixtures";

test("Promoțiile sunt sub Social Media, iar Altele deschide fluxul editorial existent", async ({ page }) => {
  await staffFixture(page);
  await page.route("**/api/blog/staff/settings", route => route.fulfill({
    json: { data: { publication_name: "Blog sintetic", editorial_description: "", default_language: "ro", default_category: "digital" } },
  }));
  await page.route("**/api/blog/staff/posts", route => route.fulfill({ json: { data: [] } }));
  await page.goto("/profil?tab=other-hub");
  const directory = page.getByRole("region", { name: "Alte module AVYRON OS" });
  await expect(directory).toBeVisible();
  const sidebar = page.getByRole("navigation", { name: "Navigare AVYRON OS" });
  if (await sidebar.isVisible()) {
    await expect(sidebar.locator('[data-os-section="social-manager"] + [data-os-section="promotions"]')).toBeVisible();
  } else {
    await page.getByRole("button", { name: "Deschide mai multe secțiuni" }).click();
    const menu = page.getByRole("dialog");
    const social = menu.getByRole("button", { name: /^Manager Social Media/ });
    await expect(social).toBeVisible();
    await expect(social.locator("+ button")).toHaveAccessibleName("Promoții");
    await page.keyboard.press("Escape");
  }
  await expect(directory.getByRole("button", { name: /Documente și resurse|Promoții/ })).toHaveCount(0);
  await directory.getByRole("button", { name: "Deschide Blog · control editorial" }).click();
  await expect(page.getByRole("heading", { name: "Blog · control editorial" })).toBeVisible();
  await page.getByRole("button", { name: "Setări blog" }).click();
  await expect(page).toHaveURL(/tab=blog-editorial.*blogView=settings/);
  await expect(page.getByLabel("Numele publicației")).toHaveValue("Blog sintetic");
  await page.goto("/profil?tab=resources");
  await expect(page).toHaveURL(/tab=documents.*documentView=staff/);
});
