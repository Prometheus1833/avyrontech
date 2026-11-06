import { test, expect } from "@playwright/test";

for (const width of [390, 1440]) test(`GA4 public cu acord și fără conturi private la ${width}px`, async ({ page }, info) => {
  const collected: string[] = [];
  let tagLoads = 0;
  await page.setViewportSize({ width, height: 900 });
  await page.addInitScript(() => localStorage.setItem("avyron-cookie-consent-v2", JSON.stringify({ necessary: true, analytics: false, marketing: false, savedAt: new Date().toISOString(), policyVersion: "2026-09-12" })));
  await page.route("**/api/**", route => route.fulfill({ status: 401, json: { error: { code: "unauthenticated" } } }));
  await page.route("https://www.google-analytics.com/**", route => {
    const url = new URL(route.request().url());
    collected.push(url.searchParams.get("dl") || "");
    return route.fulfill({ status: 204 });
  });
  // Emulate the documented Google Arguments queue. The former Array queue
  // loads the tag but fails to produce an event with this consumer.
  await page.route("https://www.googletagmanager.com/gtag/js**", route => {
    tagLoads++;
    return route.fulfill({ contentType: "text/javascript", body: `
      const queue=window.dataLayer;
      function receive(command){
        if(Object.prototype.toString.call(command)!=='[object Arguments]')return;
        if(command[0]==='event'&&command[1]==='page_view'&&!window['ga-disable-G-5KMPKNG8WS']){
          fetch('https://www.google-analytics.com/g/collect?dl='+encodeURIComponent(command[2].page_location));
        }
      }
      queue.forEach(receive);const push=queue.push;
      queue.push=function(){for(const command of arguments)receive(command);return push.apply(this,arguments)};
    ` });
  });
  await page.goto("/?email=synthetic%40example.test#test");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(tagLoads).toBe(0);
  await page.getByRole("button", { name: "Setări cookie", exact: true }).click();
  await page.getByRole("switch", { name: "Analiză", exact: true }).click();
  await page.getByRole("button", { name: "Salvează preferințele", exact: true }).click();
  await expect.poll(() => collected.length).toBe(1);
  expect(new URL(collected[0]).pathname).toBe("/");
  expect(new URL(collected[0]).search).toBe("");
  expect(new URL(collected[0]).hash).toBe("");
  const footer = page.getByRole("navigation", { name: "Navigare", exact: true });
  await expect(footer.getByRole("link", { name: "Colaborări & cariere", exact: true })).toBeVisible();
  await expect(footer.getByRole("link", { name: "Demo beauty", exact: true })).toHaveAttribute("href", "/exemple/flawlesstudio");
  await footer.scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath("public-discovery-footer.png") });
  await footer.getByRole("link", { name: "Servicii", exact: true }).click();
  await expect.poll(() => collected.length).toBe(2);
  expect(new URL(collected[1]).pathname).toBe("/servicii");
  await page.getByRole("button", { name: "Setări cookie", exact: true }).click();
  await page.getByRole("button", { name: "Doar necesare", exact: true }).click();
  await page.getByRole("navigation", { name: "Navigare", exact: true }).getByRole("link", { name: "Blog", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(collected).toHaveLength(2);
  await page.goto("/reset-password?token=synthetic");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(tagLoads).toBe(1);
  expect(collected).toHaveLength(2);
});
