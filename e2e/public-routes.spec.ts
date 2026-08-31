import { expect, test } from "@playwright/test";

const canonical = (path: string) => `https://avyron.ro${path === "/" ? "/" : path}`;

test.describe("public SEO routes", () => {
  for (const path of ["/", "/costurisiproduse", "/produse/website-prezentare-premium"] as const) {
    test(`${path} has content and a self canonical`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", canonical(path));
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /index, follow/);
    });
  }

  test("translated pricing cross-links hreflang", async ({ page }) => {
    await page.goto("/en/pricing");
    await expect(page.locator('link[hreflang="ro"]')).toHaveAttribute("href", "https://avyron.ro/costurisiproduse");
    await expect(page.locator('link[hreflang="en"]')).toHaveAttribute("href", "https://avyron.ro/en/pricing");
  });

  test("the Cloudflare currency control converts and persists indicative prices", async ({ page }) => {
    await page.route("**/api/public/exchange-rate", (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          base: "EUR",
          quote: "RON",
          rate: 5.1,
          referenceDate: "2026-08-28",
          fetchedAt: Date.now(),
          provider: "European Central Bank",
          sourceUrl: "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml",
          status: "fresh",
        },
      }),
    }));

    await page.goto("/costurisiproduse");
    const switcher = page.getByTestId("currency-switch").first();
    await expect(switcher.getByRole("button", { name: "Afișează prețurile în EUR" })).toHaveAttribute("aria-pressed", "true");
    await switcher.getByRole("button", { name: "Afișează prețurile în RON" }).click();
    await expect(switcher).toContainText("1 EUR = 5.1000 RON");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Produse digitale create pentru fiecare proiect");
    await expect(page.getByText(/1[.\s]?530 RON/, { exact: false }).first()).toBeVisible();

    await page.goto("/produse/website-prezentare-premium");
    await expect(page.getByTestId("product-hero-facts")).toContainText(/1[.\s]?530 RON/);
    await expect(page.getByTestId("currency-switch").getByRole("button", { name: "Afișează prețurile în RON" })).toHaveAttribute("aria-pressed", "true");
  });

  test("care plans publish the approved prices, recommendations and annual discount rule", async ({ page }) => {
    await page.goto("/pachete-mentenanta");
    await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /50€\/lună/);
    const plans = page.locator("article").filter({ has: page.locator("h3") });
    const plus = page.locator("article").filter({ has: page.getByRole("heading", { level: 3, name: "Plus", exact: true }) }).first();
    const pro = page.locator("article").filter({ has: page.getByRole("heading", { level: 3, name: "Pro", exact: true }) }).first();
    const proActive = page.locator("article").filter({ has: page.getByRole("heading", { level: 3, name: "Pro Activ", exact: true }) }).first();
    await expect(plus).toBeVisible();
    await expect(plus).toContainText(/50\s*€/);
    await expect(plus).toContainText("Site-uri de prezentare, cataloage de produse și bloguri");
    await expect(pro).toContainText("Magazine online, primării și organizații cu actualizări frecvente");
    await expect(proActive).toContainText("Instituții publice, platforme și servicii digitale cu cerințe complexe");
    await expect(page.getByText("ANUALAVY20", { exact: true }).first()).toBeVisible();
    await expect(page.getByText(/orice alt produs sau serviciu din aceeași comandă/i).first()).toBeVisible();
    expect(await plans.count()).toBeGreaterThanOrEqual(3);
  });

  test("homepage displays the approved hero and services wording", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByText("Soluții care aduc clienți, nu doar vizite", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Soluții digitale care extind online activitatea automatizând procesele.",
      }),
    ).toBeVisible();
    await expect(page.getByText("Soluții digitale gândite pentru rezultate", { exact: true })).toBeVisible();
    await expect(page.getByText("Agenție web din Iași · proiecte în România și UE", { exact: true })).toHaveCount(0);
    const productList = page.getByTestId("product-list");
    await expect(productList.getByRole("link")).toHaveCount(5);
    await expect(productList).toHaveCSS("display", "block");

    const desktopNav = page.locator("nav ul");
    await expect(desktopNav.locator("li")).toHaveText(["Blog", "Produse", "Despre noi", "Vezi domenii", "Proces", "FAQ"]);
    await expect(page.locator("header").getByRole("link", { name: /Exemplu Gratuit.*Personalizat/ })).toBeVisible();
    await expect(page.getByRole("link", { name: "Messenger Facebook" })).toHaveCount(0);

    const hero = page.locator("#hero");
    await expect(hero.getByRole("link", { name: /Solicită un demo.*Personalizat cu activitatea ta/ })).toHaveAttribute("href", "#cta");
    await expect(hero.getByRole("link", { name: "Vezi Produse", exact: true })).toHaveAttribute("href", "/costurisiproduse");

    await page.goto("/#faq");
    const portfolioCard = page.getByTestId("portfolio-card");
    const aboutCard = page.getByTestId("about-card");
    await expect(portfolioCard).toHaveAttribute("href", "/portofoliu");
    await expect(portfolioCard).toContainText("Proiecte, exemple și parteneri");
    await expect(portfolioCard).not.toContainText("Despre noi");
    await expect(aboutCard).toHaveAttribute("href", "/despre-noi");
    await expect(aboutCard).toContainText("Despre noi");
    await expect(aboutCard).toContainText("Web design, development, cybersecurity și QA");
  });

  test("About and Portfolio are distinct, indexable bilingual pages", async ({ page }) => {
    await page.goto("/despre-noi");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://avyron.ro/despre-noi");
    await expect(page.locator('link[hreflang="en"]')).toHaveAttribute("href", "https://avyron.ro/en/about");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("produse digitale");
    await expect(page.getByText(/Avyron este o echipă/i).first()).toBeVisible();
    await expect(page.getByText("Cybersecurity", { exact: true })).toBeVisible();
    await expect(page.getByText("QA Testing", { exact: true })).toBeVisible();
    await expect(page.getByText("Vibe Development", { exact: true })).toBeVisible();

    await page.goto("/portofoliu");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://avyron.ro/portofoliu");
    await expect(page.locator('link[hreflang="en"]')).toHaveAttribute("href", "https://avyron.ro/en/portfolio");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Proiecte digitale");

    await page.goto("/despre-si-portofoliu");
    await expect(page).toHaveURL(/\/portofoliu$/);
  });

  test("footer stays compact and publishes the approved navigation and ANPC link", async ({ page }) => {
    await page.goto("/");
    // The landing sections hydrate progressively. Wait for their reserved
    // layout before jumping to the bottom, otherwise scrollTo can run while
    // the prerendered body is still only one viewport tall.
    await page.waitForFunction(() => document.body.scrollHeight > window.innerHeight * 2);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const footer = page.locator("footer");
    await expect(footer).toBeVisible();
    await expect(footer.getByRole("link", { name: /Exemplu Gratuit.*Personalizat/ })).toBeVisible();
    const footerNavLinks = footer.locator("nav a");
    await expect(footerNavLinks).toHaveCount(5);
    expect((await footerNavLinks.allTextContents()).slice(0, 3)).toEqual(["Blog", "Portofoliu", "Produse"]);
    const cookieButton = footer.getByRole("button", { name: "Setări cookie", exact: true });
    const termsLink = footer.getByRole("link", { name: "Termeni de utilizare", exact: true });
    await expect(termsLink).toHaveAttribute("href", "/termeni");
    const legalLabels = await footer.locator("nav a, nav button").allTextContents();
    expect(legalLabels.indexOf("Setări cookie")).toBeLessThan(legalLabels.indexOf("Termeni de utilizare"));
    await expect(footer.getByRole("link", { name: /ANPC/ })).toHaveAttribute("href", "https://anpc.ro/ce-este-sal/");
    await expect(footer.getByText("Instagram", { exact: true })).toHaveCount(0);
    await expect(footer.getByText("Facebook", { exact: true })).toHaveCount(0);
    await expect(footer.getByText("TikTok", { exact: true })).toHaveCount(0);
    await expect(footer.getByText("LinkedIn", { exact: true })).toHaveCount(0);
    await expect(footer.getByText("Proces", { exact: true })).toHaveCount(0);
    await expect(footer.getByText("Întrebări frecvente", { exact: true })).toHaveCount(0);
  });

  test("cookie preference switches stay correctly aligned on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(() => {
      localStorage.setItem(
        "avyron-cookie-consent-v2",
        JSON.stringify({ necessary: true, analytics: false, marketing: false, savedAt: new Date().toISOString(), policyVersion: "2026-08-23" }),
      );
    });
    await page.goto("/termeni");
    const footer = page.locator("footer");
    await footer.scrollIntoViewIfNeeded();
    await footer.getByRole("button", { name: "Setări cookie", exact: true }).click();

    const switches = page.getByRole("dialog", { name: "Setări cookies" }).getByRole("switch");
    await expect(switches).toHaveCount(3);
    const geometry = async (index: number) => {
      const track = (await switches.nth(index).boundingBox())!;
      const thumb = (await switches.nth(index).locator("span").boundingBox())!;
      expect(thumb.x).toBeGreaterThanOrEqual(track.x);
      expect(thumb.x + thumb.width).toBeLessThanOrEqual(track.x + track.width);
      return { track, thumb };
    };

    const necessary = await geometry(0);
    const analyticsOff = await geometry(1);
    await geometry(2);
    expect(necessary.thumb.x + necessary.thumb.width / 2).toBeGreaterThan(necessary.track.x + necessary.track.width / 2);
    expect(analyticsOff.thumb.x + analyticsOff.thumb.width / 2).toBeLessThan(analyticsOff.track.x + analyticsOff.track.width / 2);

    await switches.nth(1).click();
    await expect(switches.nth(1)).toHaveAttribute("aria-checked", "true");
    await expect.poll(async () => (await switches.nth(1).locator("span").boundingBox())!.x).toBeGreaterThan(analyticsOff.thumb.x + 10);
    await geometry(1);
  });

  test("terms pages are complete, bilingual and indexable", async ({ page }) => {
    await page.goto("/termeni");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Termeni clari");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://avyron.ro/termeni");
    await expect(page.locator('link[hreflang="en"]')).toHaveAttribute("href", "https://avyron.ro/en/terms");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /index, follow/);
    await expect(page.getByRole("heading", { level: 2, name: "Drepturile consumatorilor" })).toBeVisible();
    await expect(page.getByRole("link", { name: "ANPC · SAL" })).toHaveAttribute("href", "https://anpc.ro/sal/");
    expect(await page.locator("#ld-graph").textContent()).toContain("WebPage");

    await page.goto("/en/terms");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://avyron.ro/en/terms");
    await expect(page.locator('link[hreflang="ro"]')).toHaveAttribute("href", "https://avyron.ro/termeni");
    await expect(page.getByRole("heading", { level: 2, name: "Consumer rights" })).toBeVisible();
  });

  test("terms page has no horizontal overflow on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/termeni");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
  });

  test("Avyron brand links return to the homepage hero from inner pages", async ({ page }) => {
    for (const path of ["/costurisiproduse", "/despre-noi", "/portofoliu", "/gdpr", "/auth"]) {
      await page.goto(path);
      const brand = page.locator('a[href="/#hero"], a[href="/en#hero"]').filter({ hasText: /Avyron/i }).first();
      await expect(brand).toHaveAttribute("href", /\/(?:en)?#hero$/);
    }
  });

  test("audit remains in the product overview and continues in the request form", async ({ page }) => {
    await page.goto("/costurisiproduse");
    await page.getByRole("link", { name: "Vreau auditul", exact: true }).click();
    await expect(page).toHaveURL(/\/\?request=audit#cta$/);
    await expect(page.locator("#cta form")).toBeVisible();
    await expect(page.locator("#description")).toHaveValue(/audit/i);

    await page.goto("/produse/audit-website");
    await expect(page).toHaveURL(/\/\?request=audit#cta$/);
    await expect(page.locator("#cta form")).toBeVisible();
  });

  test("audit and product detail layouts stay compact on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/costurisiproduse");

    const audit = page.getByTestId("free-audit-card");
    await expect(audit.getByRole("heading", { name: "Audit Produs Digital", exact: true })).toBeVisible();
    await expect(page.getByTestId("audit-coverage-list").locator("li")).toHaveCount(5);
    expect((await audit.boundingBox())!.height).toBeLessThan(500);

    for (const path of [
      "/produse/identitate-social-media",
      "/produse/magazin-online",
      "/produse/agent-ai-personalizat",
      "/produse/aplicatii-web-si-mobile",
    ]) {
      await page.goto(path);

      expect(await page.getByRole("heading", { level: 1 }).evaluate((node) => getComputedStyle(node).textAlign)).toBe("center");

      const actions = page.getByTestId("product-hero-actions").locator("a");
      await expect(actions).toHaveCount(2);
      const actionBoxes = await actions.evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect().toJSON()));
      expect(Math.abs(actionBoxes[0].y - actionBoxes[1].y)).toBeLessThan(1);
      expect(actionBoxes[0].right).toBeLessThanOrEqual(actionBoxes[1].left);

      const facts = page.getByTestId("product-hero-facts").locator(":scope > div");
      await expect(facts).toHaveCount(3);
      const factBoxes = await facts.evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect().toJSON()));
      expect(Math.max(...factBoxes.map((box) => box.y)) - Math.min(...factBoxes.map((box) => box.y))).toBeLessThan(1);

      const related = page.getByTestId("related-product-list").locator("a");
      expect(await related.count()).toBeGreaterThanOrEqual(5);
      await expect(page.getByTestId("related-product-list")).not.toContainText(/Audit (Produs Digital|Website)/i);
      expect((await related.first().boundingBox())!.height).toBeLessThanOrEqual(70);
    }
  });

  test("real blog article owns canonical and BlogPosting schema", async ({ page }) => {
    const path = "/blog/importanta-website-afacere-2026";
    await page.goto(path);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", canonical(path));
    const graph = await page.locator("#ld-graph").textContent();
    expect(graph).toContain("BlogPosting");
    expect(graph).not.toContain("#importanta-website-afacere-2026");
    await expect(page.getByRole("heading", { level: 2, name: "Ce face un website util, nu doar frumos" })).toBeVisible();
  });

  test("complete English legal and blog variants are indexable", async ({ page }) => {
    await page.goto("/en/privacy");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /index, follow/);
    await expect(page.getByRole("heading", { level: 2, name: "Legal identity and collaboration structure" })).toBeVisible();
    await expect(page.locator('link[hreflang="ro"]')).toHaveAttribute("href", "https://avyron.ro/gdpr");

    await page.goto("/en/blog/importanta-website-afacere-2026");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /index, follow/);
    await expect(page.getByRole("heading", { level: 2, name: "What makes a website useful, not merely attractive" })).toBeVisible();
    await expect(page.locator('link[hreflang="ro"]')).toHaveAttribute("href", "https://avyron.ro/blog/importanta-website-afacere-2026");
  });

  test("article exposes complete native and network sharing actions", async ({ page }) => {
    await page.goto("/blog/importanta-website-afacere-2026");
    await expect(page.getByRole("button", { name: "Distribuie" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Distribuie pe Facebook" }).first()).toHaveAttribute("href", /facebook\.com\/sharer/);
    await expect(page.getByRole("link", { name: "Distribuie pe LinkedIn" }).first()).toHaveAttribute("href", /linkedin\.com\/sharing/);
    await expect(page.getByRole("link", { name: "Distribuie pe WhatsApp" }).first()).toHaveAttribute("href", /wa\.me/);
    await expect(page.getByRole("button", { name: "Copiază linkul" })).toHaveCount(0);
    await expect(page.getByTestId("article-share-row").first()).toHaveCSS("flex-wrap", "nowrap");
    expect(await page.locator(".article-copy p").first().evaluate((node) => getComputedStyle(node).textAlign)).toBe("justify");
  });

  test("AI Act article is an individual bilingual, indexable publication", async ({ page }) => {
    const slug = "ai-act-reguli-transparenta-2-august-2026";
    await page.goto(`/blog/${slug}`);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("AI Act după 2 august 2026");
    await expect(page.getByRole("heading", { level: 2, name: "Ce ar trebui să facă o afacere acum" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Întrebările și răspunsurile oficiale/ })).toHaveAttribute("href", /digital-strategy\.ec\.europa\.eu/);
    await expect(page.locator('link[hreflang="en"]')).toHaveAttribute("href", `https://avyron.ro/en/blog/${slug}`);
  });

  test("mobile landing and article controls remain compact and fluid", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    const productList = page.getByTestId("product-list");
    await expect(productList.getByRole("link")).toHaveCount(5);
    expect((await productList.boundingBox())!.height).toBeLessThan(380);

    await page.getByRole("button", { name: "Meniu" }).click();
    const menu = page.getByTestId("mobile-nav-menu");
    await expect(menu.getByRole("link", { name: "Vezi domenii" })).toBeVisible();
    await expect(menu.getByRole("link", { name: /Exemplu Gratuit.*Personalizat/ })).toBeVisible();
    await expect(menu.getByRole("link", { name: "Despre noi", exact: true })).toHaveAttribute("href", "/despre-noi");
    const menuLabels = await menu.locator("a").evaluateAll((links) => links.map((link) => link.textContent?.trim()).filter(Boolean));
    expect(menuLabels).toEqual(expect.arrayContaining(["Blog", "Produse", "Despre noi", "Vezi domenii", "Proces", "FAQ"]));

    await page.mouse.click(4, 700);
    await expect(menu).toBeHidden();
    await page.getByRole("button", { name: "Meniu" }).click();

    await page.getByRole("link", { name: "FAQ", exact: true }).click();
    await expect(page.getByTestId("floating-contact-bar").getByRole("link")).toHaveCount(3);
    const background = await page.getByTestId("cta-visual-panel").evaluate((node) => getComputedStyle(node).backgroundImage);
    expect(background).toContain("gradient");

    await page.goto("/blog/ai-act-reguli-transparenta-2-august-2026");
    const shareRow = page.getByTestId("article-share-row").first();
    expect(await shareRow.evaluate((node) => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
    await expect(page.getByRole("button", { name: "Copiază linkul" })).toHaveCount(0);
    expect(await page.locator(".article-copy p").first().evaluate((node) => getComputedStyle(node).textAlign)).toBe("left");
  });

  test("unknown routes render the 404 experience", async ({ page }) => {
    await page.goto("/route-that-does-not-exist");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  });

  test("every secondary page exposes the shared responsive back control", async ({ page }) => {
    test.setTimeout(90_000);
    const secondaryRoutes = [
      "/gdpr", "/en/privacy", "/termeni", "/en/terms",
      "/costurisiproduse", "/en/pricing",
      "/produse/website-prezentare-premium", "/produse/identitate-social-media",
      "/produse/magazin-online", "/produse/aplicatii-web-si-mobile",
      "/produse/agent-ai-personalizat", "/produse/testare-qa-web-mobile",
      "/pachete-mentenanta", "/en/care-plans",
      "/despre-noi", "/en/about", "/portofoliu", "/en/portfolio",
      "/exemple/flawlesstudio", "/exemple/retuvo",
      "/blog", "/en/blog", "/blog/importanta-website-afacere-2026",
      "/examples/cofetariadulcedor.ro",
      "/auth", "/forgot-password", "/reset-password",
      "/403", "/500", "/mentenanta", "/offline", "/unsubscribe",
      "/route-that-does-not-exist",
    ] as const;

    for (const path of secondaryRoutes) {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      const back = page.getByTestId("page-back-link").first();
      await expect(back, `${path} must expose the shared back control`).toBeVisible();
      await expect(back).toHaveClass(/rounded-full/);
      await expect(back.locator("svg")).toBeVisible();
      expect(await back.evaluate((node) => node.scrollWidth <= node.clientWidth + 1), `${path} back control must not overflow`).toBe(true);
    }

    await page.setViewportSize({ width: 390, height: 844 });
    for (const path of ["/despre-noi", "/blog", "/produse/website-prezentare-premium", "/auth"] as const) {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      const back = page.getByTestId("page-back-link").first();
      await expect(back).toBeVisible();
      const box = await back.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(390);
    }
  });
});

test.describe("forms and authentication", () => {
  test("authenticated staff can open the Cloudflare editorial workspace", async ({ page }) => {
    await page.route("**/api/auth/refresh", (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ access_token: "local-e2e-token", expires_in: 900, user: { id: "staff-1", roles: ["staff"] } }),
    }));
    await page.route("**/api/auth/me", (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        user: { id: "staff-1", email: "staff@example.com", display_name: "Editor Avyron", avatar_url: null, email_verified: 1, must_change_password: 0, created_at: 1 },
        profile: { id: "staff-1", display_name: "Editor Avyron", avatar_url: null, phone: null, address: null, entity_type: "individual", company_name: null, cui: null, social_facebook: null, social_instagram: null, social_tiktok: null, website: null, language: "ro", theme: "system", pseudonym: null, staff_role: "marketing" },
        roles: ["staff"],
      }),
    }));
    await page.route("**/api/blog/posts?*", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: [] }) }));
    await page.route("**/api/blog/staff/posts", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: [] }) }));

    await page.goto("/blog");
    await expect(page.getByRole("heading", { name: "Spațiu editorial" })).toBeVisible();
    await page.getByRole("button", { name: "Articol nou" }).click();
    await expect(page.getByRole("dialog").getByRole("heading", { name: "Articol nou" })).toBeVisible();
    await expect(page.locator("#blog-title")).toBeVisible();
    await expect(page.locator("#blog-content")).toBeVisible();
    await expect(page.getByRole("button", { name: "Publică" })).toBeVisible();

    await page.keyboard.press("Escape");
    await page.goto("/");
    await page.evaluate(() => window.scrollTo(0, Math.max(900, document.body.scrollHeight * 0.65)));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(300);
    await page.getByRole("button", { name: "Profil" }).click();
    const userMenu = page.getByRole("menu");
    await expect(userMenu).toBeVisible();
    await expect(userMenu.getByRole("menuitem", { name: "Despre noi", exact: true })).toBeVisible();
    const menuBox = await userMenu.boundingBox();
    expect(menuBox).not.toBeNull();
    expect(menuBox!.y).toBeGreaterThanOrEqual(0);
    expect(menuBox!.y + menuBox!.height).toBeLessThanOrEqual(page.viewportSize()!.height);

    await page.mouse.click(4, page.viewportSize()!.height - 100);
    await expect(userMenu).toBeHidden();

    await page.goto("/profil");
    await expect(page.getByTestId("page-back-link")).toBeVisible();
    await expect(page.getByRole("tab", { name: "Promoții" })).toHaveCount(0);
  });

  test("only the designated account receives the promotions dashboard", async ({ page }) => {
    await page.route("**/api/auth/refresh", (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ access_token: "promotion-owner-token", expires_in: 900, user: { id: "promo-owner", roles: ["admin"] } }),
    }));
    await page.route("**/api/auth/me", (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        user: { id: "promo-owner", email: "Prometheus@Avyron.ro", display_name: "Prometheus", avatar_url: null, email_verified: 1, must_change_password: 0, created_at: 1 },
        profile: { id: "promo-owner", display_name: "Prometheus", avatar_url: null, phone: null, address: null, entity_type: "individual", company_name: null, cui: null, social_facebook: null, social_instagram: null, social_tiktok: null, website: null, language: "ro", theme: "system", pseudonym: null, staff_role: null },
        roles: ["admin"],
      }),
    }));
    await page.route("**/api/promotions/admin", (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: [
        { id: "promo-avy10", code: "AVY10", label: "Cont înregistrat", discount_percent: 10, discount_scope: "order", active: 1, registration_required: 1, per_user_limit: 1, max_redemptions: null, starts_at: null, expires_at: null, redemptions: 0, discount_total_cents: 0 },
        { id: "promo-anualavy20", code: "ANUALAVY20", label: "Abonament anual", discount_percent: 20, discount_scope: "annual_subscription", active: 1, registration_required: 1, per_user_limit: null, max_redemptions: null, starts_at: null, expires_at: null, redemptions: 0, discount_total_cents: 0 },
      ] }),
    }));

    await page.goto("/profil?tab=promotions");
    await expect(page.getByRole("tab", { name: "Promoții" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Promoții" })).toBeVisible();
    await expect(page.getByText("AVY10", { exact: true })).toBeVisible();
    await expect(page.getByText("ANUALAVY20", { exact: true })).toBeVisible();
    await expect(page.getByText("Numai abonament anual", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Promoție nouă" })).toBeVisible();
  });

  test("Romanian login alias renders the auth page and remains noindex", async ({ page }) => {
    await page.goto("/autentificare");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  });

  test("private profile redirects to login", async ({ page }) => {
    await page.goto("/profil");
    await expect(page).toHaveURL(/\/auth$/);
  });

  test("signup waits for email verification", async ({ page }) => {
    await page.addInitScript(() => {
      window.turnstile = {
        render: (_element, options) => {
          queueMicrotask(() => (options.callback as (token: string) => void)("playwright-turnstile-token"));
          return "playwright-widget";
        },
        remove: () => undefined,
        reset: () => undefined,
      };
    });
    await page.route("**/api/auth/signup", (route) => route.fulfill({
      status: 202,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, verification_required: true, verification_email_sent: true }),
    }));
    await page.goto("/auth");
    await page.getByRole("tab", { name: /înregistr|register/i }).click();
    await page.locator("#rg-name").fill("Test Avyron");
    await page.locator("#rg-email").fill("test@example.com");
    await page.locator("#rg-pass").fill("SecurePass123!");
    await page.getByRole("button", { name: /înregistr|register/i }).click();
    await expect(page.getByRole("status")).toContainText(/verifică emailul|confirmare/i);
  });

  test("example request uses the protected Worker endpoint", async ({ page }) => {
    await page.addInitScript(() => {
      window.turnstile = {
        render: (_element, options) => {
          queueMicrotask(() => (options.callback as (token: string) => void)("playwright-turnstile-token"));
          return "playwright-widget";
        },
        remove: () => undefined,
        reset: () => undefined,
      };
    });
    let payload: Record<string, unknown> | undefined;
    await page.route("**/api/contact/example", async (route) => {
      payload = route.request().postDataJSON() as Record<string, unknown>;
      await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ ok: true, requestId: "test" }) });
    });
    // The hash is the public navigation contract and forces the deferred
    // industry section to mount before Playwright interacts with it.
    await page.goto("/#exemple");
    const necessaryCookies = page.getByRole("button", { name: "Doar necesare" });
    if (await necessaryCookies.isVisible()) await necessaryCookies.click();
    await page.getByRole("button", { name: "Vezi domenii" }).click();
    await page.getByRole("button", { name: /Beauty & Wellness/ }).click();
    await page.getByRole("button", { name: "Solicită un exemplu", exact: true }).click();
    await page.locator("#request-example-email").fill("lead@example.com");
    await page.locator("#request-example-phone").fill("0712345678");
    await page.getByRole("button", { name: "Trimite solicitarea" }).click();
    await expect(page.getByText("Solicitarea a fost trimisă!")).toBeVisible();
    expect(payload).toMatchObject({ email: "lead@example.com", phone: "0712345678", source_category: "beauty" });
  });
});
