import { test, expect } from "@playwright/test";
import { staffFixture } from "./staff-fixtures";

for (const width of [320, 1440]) test(`Altele: pagini fără buton, căutare și navigare la ${width}px`, async ({ page }, testInfo) => {
  await staffFixture(page);
  await page.setViewportSize({width,height:900});
  await page.goto("/profil?tab=other-hub");
  const directory=page.getByRole("region",{name:"Alte module AVYRON OS",exact:true});
  await expect(directory.getByRole("button",{name:"Deschide Promoții",exact:true})).toHaveCount(0);
  await expect(directory.getByRole("button",{name:"Deschide Documente și resurse",exact:true})).toHaveCount(0);
  await expect(directory.getByRole("button",{name:"Deschide Colecția mea",exact:true})).toBeVisible();
  await page.getByLabel("Caută în Altele").fill("colectia");
  await expect(directory.getByRole("button")).toHaveCount(1);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await page.screenshot({path:testInfo.outputPath(`altele-${width}.png`),fullPage:true});
  await directory.getByRole("button",{name:"Deschide Colecția mea",exact:true}).click();
  await expect(page).toHaveURL(/tab=collection/);
});
