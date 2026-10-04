import { expect, test } from "@playwright/test";

const config = {
  enabled: true,
  promptEnabled: true,
  delaySeconds: 0,
  minPageViews: 2,
  scrollPercent: 10,
  cooldownDays: 30,
  title: { ro: "Idei digitale, fără zgomot", en: "Digital ideas, without the noise" },
  body: { ro: "Primești rar analize AVYRON, exemple aplicate și idei care pot îmbunătăți o afacere.", en: "Occasional AVYRON insights." },
  cta: { ro: "Vreau ideile AVYRON", en: "Send me AVYRON insights" },
  frequency: { ro: "Cel mult 1–2 emailuri pe lună.", en: "At most 1–2 emails per month." },
  consentPolicyVersion: "newsletter-test",
};

test("afișează rar notificarea și finalizează cererea pe mobil", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/newsletter/config", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: config }) }));
  await page.route("**/api/newsletter/subscribe", (route) => route.fulfill({ status: 202, contentType: "application/json", body: JSON.stringify({ ok: true, confirmationRequired: true }) }));
  await page.addInitScript(() => {
    localStorage.setItem("avyron-cookie-consent-v2", JSON.stringify({ necessary: true, analytics: false, marketing: false, savedAt: new Date().toISOString(), policyVersion: "2026-09-12" }));
    sessionStorage.setItem("avyron-newsletter-pages-v1", JSON.stringify(["/servicii", "/despre-noi"]));
  });

  await page.goto("/servicii/website-prezentare-profesional");
  await page.waitForTimeout(750);
  await page.evaluate(() => {
    document.documentElement.scrollTop = document.documentElement.scrollHeight;
    window.scrollTo(0, document.documentElement.scrollHeight);
    window.dispatchEvent(new Event("scroll"));
  });
  const dialog = page.getByRole("dialog", { name: "Idei digitale, fără zgomot" });
  await expect(dialog).toBeVisible();
  await dialog.getByPlaceholder("email@companie.ro").fill("ana@example.ro");
  await dialog.getByRole("checkbox").check();
  await dialog.getByRole("button", { name: "Vreau ideile AVYRON" }).click();
  const confirmation = page.getByRole("dialog", { name: "Încă un pas" });
  await expect(confirmation).toBeVisible();
  await expect(confirmation.getByText(/Verifică inboxul/)).toBeVisible();
});

test("afișează centrul intern newsletter lizibil pe mobil", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/auth/refresh", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ access_token: "test-token", expires_in: 900, user: { id: "owner", roles: ["admin"] } }) }));
  await page.route("**/api/auth/me", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({
    user: { id: "owner", email: "owner@avyron.ro", display_name: "Owner", avatar_url: null, email_verified: 1, must_change_password: 0, created_at: Date.now() },
    profile: { id: "owner", display_name: "Owner", avatar_url: null, phone: null, address: null, entity_type: "srl", company_name: "AVYRON", cui: null, social_facebook: null, social_instagram: null, social_tiktok: null, website: "https://avyron.ro", language: "ro", theme: "dark", pseudonym: null, staff_role: "dev" },
    roles: ["admin"], superadmin: true,
  }) }));
  await page.route("**/api/newsletter/admin**", (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname.endsWith("/settings")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: {
      enabled: 1, prompt_enabled: 1, delay_seconds: 45, min_page_views: 2, scroll_percent: 45, cooldown_days: 30,
      title_ro: config.title.ro, title_en: config.title.en, body_ro: config.body.ro, body_en: config.body.en,
      cta_ro: config.cta.ro, cta_en: config.cta.en, frequency_ro: config.frequency.ro, frequency_en: config.frequency.en,
      consent_policy_version: "newsletter-test", updated_at: Date.now(),
    } }) });
    if (pathname.endsWith("/campaigns")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: [] }) });
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: [{
      id: "subscriber", email: "ana@example.ro", name: "Ana", language: "ro", status: "active", source: "website:/servicii",
      interest: "website", consent_policy_version: "newsletter-test", requested_at: Date.now(), confirmed_at: Date.now(), unsubscribed_at: null, updated_at: Date.now(),
    }], meta: { total: 1, counts: { active: 1 } } }) });
  });

  await page.goto("/profil?tab=newsletter");
  await expect(page.getByRole("heading", { name: "Newsletter AVYRON" })).toBeVisible();
  await expect(page.getByText("ana@example.ro")).toBeVisible();
  await page.getByRole("tab", { name: "Notificare site" }).click();
  await expect(page.getByText("Comportament și conținut")).toBeVisible();
  await expect(page.getByText("Întârziere (sec.)")).toBeVisible();
});
