import { expect, test } from "@playwright/test";
import { staffFixture } from "./staff-fixtures";

test("Control editorial se deschide din Platformă și aplică setările la ciornele noi", async ({ page }) => {
  await staffFixture(page);
  let settings = {
    publication_name: "Blog sintetic", editorial_description: "Direcția editorială de verificare.",
    default_language: "ro", default_category: "digital",
  };
  const posts = [
    { id: "a", title: "Știri publicate", language: "ro", slug: "stiri", category: "digital", tags: [], status: "published", updated_at: 1783000800000 },
    { id: "b", title: "Ciornă despre căutare", language: "en", slug: "cautare", category: "seo", tags: [], status: "draft", updated_at: 1783000800000 },
  ];
  let created: Record<string, unknown> | undefined;
  await page.route("**/api/blog/staff/settings", async route => {
    if (route.request().method() === "PATCH") {
      const body = route.request().postDataJSON();
      settings = { publication_name: body.publicationName, editorial_description: body.editorialDescription, default_language: body.defaultLanguage, default_category: body.defaultCategory };
      return route.fulfill({ json: { ok: true } });
    }
    return route.fulfill({ json: { data: settings } });
  });
  await page.route("**/api/blog/staff/posts", route => {
    if (route.request().method() === "POST") {
      created = route.request().postDataJSON();
      return route.fulfill({ status: 201, json: { id: "new", status: "draft" } });
    }
    return route.fulfill({ json: { data: posts } });
  });
  await page.goto("/profil?tab=other-hub");
  const directory = page.getByRole("region", { name: "Alte module AVYRON OS" });
  await expect(directory).toBeVisible();
  await expect(directory.getByRole("button", { name: /Documente și resurse|Promoții|Control editorial/i })).toHaveCount(0);
  const sidebar = page.getByRole("navigation", { name: "Navigare AVYRON OS" });
  if (await sidebar.isVisible()) {
    await expect(sidebar.locator('[data-os-section="social-manager"] + [data-os-section="promotions"]')).toBeVisible();
    const platform = sidebar.getByRole("button", { name: "Platformă", exact: true });
    if (await platform.getAttribute("aria-expanded") === "false") await platform.click();
    await platform.locator("..").getByRole("button", { name: "Control editorial", exact: true }).click();
  } else {
    await page.getByRole("button", { name: "Deschide mai multe secțiuni" }).click();
    const menu = page.getByRole("dialog");
    const social = menu.getByRole("button", { name: /^Manager Social Media/ });
    await expect(social.locator("+ button")).toHaveAccessibleName("Promoții");
    await menu.getByRole("button", { name: "Control editorial", exact: true }).click();
  }
  await expect(page.getByRole("heading", { name: "Control editorial", exact: true })).toBeVisible();
  const list = page.getByRole("list", { name: "Articole din registru" });
  await expect(list.getByRole("listitem")).toHaveCount(2);
  await page.getByRole("button", { name: /Ciorne 1/ }).click();
  await expect(list).not.toContainText("Știri publicate");
  await page.getByRole("textbox", { name: "Caută articole în registru" }).fill("cautare");
  await expect(list).toContainText("Ciornă despre căutare");
  await page.getByLabel("Filtrează după limbă").selectOption("ro");
  await expect(list.getByRole("listitem")).toHaveCount(0);

  await page.getByRole("button", { name: "Setări blog" }).click();
  await expect(page).toHaveURL(/tab=blog-editorial.*blogView=settings/);
  await expect(page.getByLabel("Numele publicației")).toHaveValue("Blog sintetic");
  await page.getByLabel("Limba implicită").selectOption("en");
  await page.getByLabel("Categoria implicită").selectOption("seo");
  await page.getByRole("button", { name: "Salvează setările" }).click();
  await expect(page.getByRole("button", { name: "Salvează setările" })).toBeDisabled();
  await page.getByRole("button", { name: "Articole", exact: true }).click();
  await page.getByRole("button", { name: "Articol nou" }).click();
  const editor = page.getByRole("dialog", { name: "Articol nou" });
  await expect(editor.getByLabel("Limbă")).toHaveValue("en");
  await expect(editor.getByLabel("Categorie")).toHaveValue("seo");
  await editor.getByLabel("Titlu", { exact: true }).fill("Articol sintetic pentru fluxul editorial");
  await editor.getByLabel("Rezumat scurt").fill("Acesta este un rezumat sintetic suficient de lung pentru verificare.");
  await editor.getByLabel("Articol (Markdown)").fill("Conținut de verificare pentru fluxul editorial al agenției. ".repeat(4));
  await editor.getByLabel("Etichete").fill("SEO, Marketing local");
  await editor.getByRole("button", { name: "Salvează ciorna" }).click();
  await expect(editor).toBeHidden();
  expect(created).toMatchObject({ language: "en", category: "seo", status: "draft", tags: ["seo", "marketing-local"], slug: "articol-sintetic-pentru-fluxul-editorial" });
  await page.goto("/profil?tab=resources");
  await expect(page).toHaveURL(/tab=documents.*documentView=staff/);
});

test("un rang fără blog.manage nu vede controlul editorial", async ({ page }) => {
  await staffFixture(page, { role: "vibe_dev" });
  await page.goto("/profil?tab=profile");
  await expect(page.getByRole("heading", { name: /Profilul meu|My profile/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Control editorial", exact: true })).toHaveCount(0);
  await page.goto("/intern/blog");
  await expect(page).toHaveURL(/\/403$/);
});
