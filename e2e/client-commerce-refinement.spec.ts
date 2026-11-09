import { test, expect, type Page } from "@playwright/test";

async function setup(
  page: Page,
  options: { slowLoad?: boolean; oldQuote?: boolean; failSave?: boolean;quotedSitePrice?:number;userId?:string;collaborations?:boolean } = {},
) {
  let cloud: Record<string, unknown>[] = [],
    failSave = !!options.failSave,
    quoteCount = 0;
  const requests: string[] = [],
    saves: unknown[] = [],
    quotes: unknown[] = [];
  let releaseLoad!: () => void, releaseQuote!: () => void;
  const loadGate = new Promise<void>((resolve) => {
      releaseLoad = resolve;
    }),
    quoteGate = new Promise<void>((resolve) => {
      releaseQuote = resolve;
    });
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
  await page.route("**/api/**", async (route) => {
    const req = route.request(),
      url = new URL(req.url()),
      path = url.pathname;
    requests.push(path + url.search);
    if (path === "/api/auth/refresh")
      return route.fulfill({
        json: { access_token: "synthetic-client", expires_in: 900 },
      });
    if (path === "/api/auth/me")
      return route.fulfill({
        json: {
          user: {
            id: options.userId || "customer",
            email: "test@example.test",
            email_verified: 1,
            must_change_password: 0,
          },
          profile: { display_name: "Client test", language: "ro" },
          roles: ["user"],
          capabilities: [],
          superadmin: false,
          hasCollaborations: options.collaborations === true,
        },
      });
    if (path === "/api/commerce/cart" && req.method() === "GET") {
      if (options.slowLoad) await loadGate;
      return route.fulfill({ json: { data: cloud, updatedAt: 1 } });
    }
    if (path === "/api/commerce/cart" && req.method() === "PUT") {
      const body = req.postDataJSON();
      saves.push(body);
      if (failSave)
        return route.fulfill({
          status: 503,
          json: { error: { code: "cart_unavailable" } },
        });
      cloud = body.items;
      return route.fulfill({ json: { data: cloud, updatedAt: Date.now() } });
    }
    if (path === "/api/commerce/catalog")
      return route.fulfill({
        json: {
          services: [
            {
              key: "site",
              name: "Site profesional",
              category: "Web",
              sku: "svc-site",
              priceMinor: 24000,
              currency: "RON",
              payable: true,
            },
          ],
          products: [
            {
              key: "component",
              name: "Componentă digitală",
              category: "Componente",
              sku: "prod-component",
              priceMinor: 3500,
              currency: "RON",
              payable: true,
            },
          ],
          subscriptions: [],
        },
      });
    if (path === "/api/commerce/quote") {
      const body = req.postDataJSON();
      quotes.push(body);
      const index = ++quoteCount;
      if (options.oldQuote && index === 1) await quoteGate;
      const total = body.items.reduce(
        (sum: number, item: { sku: string }) =>
          sum +
          (item.sku === "svc-site"
            ? options.quotedSitePrice??24000
            : item.sku === "prod-component"
              ? 3500
              : 0),
        0,
      );
      return route.fulfill({
        json: {
          quote: {
            items:body.items.map((item:{sku:string})=>{const value=item.sku==="svc-site"?(options.quotedSitePrice??24000):3500;return {lineTotalCents:value,referenceUnitPriceCents:value,referenceCurrency:"RON",billingMonths:1};}),
            subtotalCents: total,
            totalCents: total,
            discountCents: 0,
            promotion: null,
            requiresManualQuote: false,
          },
        },
      });
    }
    if (path === "/api/billing/account")
      return route.fulfill({
        json: {
          profile: {
            entity_type: "individual",
            legal_name: "Client test",
            invoice_email: "test@example.test",
            country_code: "RO",
            default_provider: "stripe",
          },
          methods: [],
          subscriptions: [],
          invoices: [],
          revolutPlans: [],
          providers: {
            stripe: { enabled: false },
            revolut: { enabled: false },
            oblio: { enabled: false },
            netopia: { enabled: false },
          },
        },
      });
    if (path === "/api/billing/payment-methods")
      return route.fulfill({
        json: { methods: [], refreshed: { stripe: false, revolut: false } },
      });
    if (path === "/api/produse/account/state")
      return route.fulfill({
        json: {
          day: "2026-11-06",
          plan: "free",
          planExpiresAt: null,
          limits: {
            components: { used: 0, limit: 3 },
            sections: { used: 0, limit: 3 },
            templates: { used: 0, limit: 1 },
          },
          collection: [],
          purchases: [],
          recent: [],
        },
      });
    if (path === "/api/produse/public/plans")
      return route.fulfill({
        json: { data: [{ id: "pro", price_ron_cents: 120000 }] },
      });
    if (path === "/api/billing/profile")
      return route.fulfill({ json: { ok: true } });
    if (path === "/api/workspace/invoices")
      return route.fulfill({
        json: {
          data: [
            {
              id: "invoice-a",
              invoice_number: "AVY-101",
              amount_cents: 24000,
              currency: "RON",
              status: "paid",
              issued_at: "2026-11-01T10:00:00Z",
              due_at: null,
              download_url: "/api/workspace/invoices/invoice-a/content",
            },
          ],
          nextOffset: null,
        },
      });
    if (path === "/api/workspace/invoices/invoice-a/content")
      return route.fulfill({
        contentType: "application/pdf",
        body: "%PDF-1.7 synthetic transport fixture",
      });
    if (path.startsWith("/api/project-chat/projects"))
      return route.fulfill({ json: { data: [], canWrite: false } });
    return route.fulfill({ json: { data: [], total: 0 } });
  });
  return {
    requests,
    saves,
    quotes,
    releaseLoad,
    releaseQuote,
    setCloud: (items: Record<string, unknown>[]) => {
      cloud = items;
    },
    recover: () => {
      failSave = false;
    },
  };
}
for (const width of [320, 390, 1440])
  test(`coș compact, contor și navigare client la ${width}px`, async ({
    page,
  }, info) => {
    const state = await setup(page);
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/profil?tab=catalog");
    await page
      .getByRole("button", { name: "Adaugă în coș", exact: true })
      .first()
      .click();
    const nav = page.getByRole("navigation", {
      name: width < 1024 ? "Navigare mobilă" : "Navigare cont",
      exact: true,
    });
    await expect(
      nav.getByRole("button", { name: "Coș, 1 produs în coș", exact: true }),
    ).toBeVisible();
    if (width < 1024)
      await expect(nav.getByRole("button")).toHaveText([
        "Acasă",
        "Servicii",
        "1Coș",
        "Produse",
        "Mai multe",
      ]);
    await page
      .getByRole("button", { name: "Adaugă în coș", exact: true })
      .first()
      .click();
    await expect(
      nav.getByRole("button", { name: "Coș, 1 produs în coș", exact: true }),
    ).toBeVisible();
    await nav
      .getByRole("button", { name: "Coș, 1 produs în coș", exact: true })
      .click();
    await expect(
      page.getByRole("heading", {
        name: "Conținutul coșului (1)",
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.getByText("240 RON", { exact: true })).toHaveCount(2);
    await expect(
      page.getByText(/ANUALAVY20 oferă|eligibil ANUALAVY20/),
    ).toHaveCount(0);
    await expect(
      page.getByRole("form", { name: "Adaugă în coș", exact: true }),
    ).toHaveCount(0);
    await page.getByRole("button", { name: "Adaugă un element" }).click();
    await page
      .getByRole("combobox", { name: "Tip", exact: true })
      .selectOption("product");
    await page
      .getByRole("combobox", { name: "Produs", exact: true })
      .selectOption("component");
    await page
      .getByRole("button", { name: "Adaugă în coș", exact: true })
      .click();
    await expect(
      page.getByRole("heading", {
        name: "Conținutul coșului (2)",
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.getByText("275 RON", { exact: true })).toBeVisible();
    if (width === 320) {
      const toast = page.locator("[data-sonner-toast]").last();
      await expect(toast).toBeVisible();
      await expect
        .poll(async () => {
          const notice = await toast.boundingBox(),
            bar = await nav.boundingBox();
          return !!notice && !!bar && notice.y + notice.height <= bar.y + 1;
        })
        .toBe(true);
      const { createRequire } = await import("node:module");
      await page.addScriptTag({
        path: createRequire(import.meta.url).resolve("axe-core/axe.min.js"),
      });
      const violations = await page.evaluate(async () => {
        const axe = (
          window as unknown as {
            axe: {
              run: (
                selector: string,
                options: object,
              ) => Promise<{ violations: { id: string; impact: string }[] }>;
            };
          }
        ).axe;
        return (
          await axe.run("main", {
            runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
          })
        ).violations
          .filter((v) => ["serious", "critical"].includes(v.impact))
          .map((v) => v.id);
      });
      expect(violations).toEqual([]);
    }
    await page
      .getByRole("button", { name: "Șterge Site profesional", exact: true })
      .click();
    await expect(
      page.getByRole("heading", {
        name: "Conținutul coșului (1)",
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.getByText("35 RON", { exact: true })).toHaveCount(2);
    await expect.poll(() => state.saves.length).toBeGreaterThan(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath(`cart-${width}.png`),
      animations: "disabled",
    });
    await page.reload();
    await expect(
      page.getByRole("heading", {
        name: "Conținutul coșului (1)",
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.getByText("35 RON", { exact: true })).toHaveCount(2);
  });
test("o adăugare în timpul încărcării păstrează coșul din cont și nu dublează elementul", async ({
  page,
}) => {
  const state = await setup(page, { slowLoad: true });
  state.setCloud([
    {
      id: "remote",
      source: "products",
      type: "product",
      sku: "prod-component",
      name: "Nume vechi",
      productSlug: "component",
    },
  ]);
  await page.goto("/profil?tab=catalog");
  await page
    .getByRole("button", { name: "Adaugă în coș", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("button", { name: "Se adaugă…", exact: true }),
  ).toBeDisabled();
  state.releaseLoad();
  await expect(
    page.getByRole("button", { name: "Adaugă în coș", exact: true }).first(),
  ).toBeEnabled();
  await expect.poll(() => JSON.stringify(state.saves)).toContain("remote");
  await expect.poll(() => JSON.stringify(state.saves)).toContain("svc-site");
  await page.goto("/profil?tab=cart");
  await expect(
    page.getByRole("heading", { name: "Conținutul coșului (2)", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("275 RON", { exact: true })).toBeVisible();
});
test("un răspuns vechi de preț nu suprascrie totalul după ștergere", async ({
  page,
}) => {
  const state = await setup(page, { oldQuote: true });
  state.setCloud([
    {
      id: "site",
      source: "services",
      type: "service",
      sku: "svc-site",
      name: "Site vechi",
      serviceKey: "site",
    },
    {
      id: "product",
      source: "products",
      type: "product",
      sku: "prod-component",
      name: "Produs",
      productSlug: "component",
    },
  ]);
  await page.goto("/profil?tab=cart");
  await expect.poll(() => state.quotes.length).toBe(1);
  await page
    .getByRole("button", { name: "Șterge Site profesional", exact: true })
    .click();
  await expect(page.getByText("35 RON", { exact: true })).toHaveCount(2);
  state.releaseQuote();
  await expect(page.getByText("275 RON", { exact: true })).toHaveCount(0);
  await expect(page.getByText("35 RON", { exact: true })).toHaveCount(2);
});
test("o eroare de salvare păstrează selecția, contorul și permite reîncercarea", async ({
  page,
}) => {
  const state = await setup(page, { failSave: true });
  await page.goto("/profil?tab=catalog");
  await page
    .getByRole("button", { name: "Adaugă în coș", exact: true })
    .first()
    .click();
  await page.goto("/profil?tab=cart");
  await expect(
    page.getByRole("heading", { name: "Conținutul coșului (1)", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("alert").filter({ hasText: /salvat local/ }),
  ).toBeVisible();
  state.recover();
  await page.getByRole("button", { name: "Reîncearcă sincronizarea" }).click();
  await expect(
    page.getByText("Sincronizat în cont", { exact: true }),
  ).toBeVisible();
});
test("facturile, datele fiscale și metodele salvate folosesc o singură secțiune", async ({
  page,
}, info) => {
  const state = await setup(page);
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto("/profil?tab=invoices");
  await expect(page).toHaveURL(/tab=payments.*billingView=invoices/);
  await expect(
    page.getByRole("heading", { name: "Plăți și facturi", exact: true }),
  ).toBeVisible();
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Descarcă factura AVY-101", exact: true })
    .click();
  expect((await download).suggestedFilename()).toBe("Factura-AVY-101.pdf");
  await page.getByRole("button", { name: "Date și metode de plată" }).click();
  await page
    .getByLabel("Nume pentru factură", { exact: true })
    .fill("Client Actualizat");
  await page
    .getByRole("button", { name: "Salvează datele de facturare" })
    .click();
  await expect(
    page.getByText("Datele de facturare au fost salvate."),
  ).toBeVisible();
  expect(
    state.requests.filter((path) => path === "/api/billing/account").length,
  ).toBeLessThan(5);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  await page.screenshot({
    path: info.outputPath("billing-320.png"),
    animations: "disabled",
  });
});
test("mesajele și suportul sunt unificate fără canale sau membri staff", async ({
  page,
}) => {
  const state = await setup(page);
  await page.goto("/profil?tab=intern");
  await expect(page).toHaveURL(/tab=tickets.*supportView=messages/);
  await expect(
    page.getByRole("heading", { name: "Suport și mesaje", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Mesaje proiecte", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Solicitări de suport", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Cerere nouă", exact: false }),
  ).toBeVisible();
  expect(
    state.requests.some((path) =>
      /\/api\/workspace\/(staff-directory|chat)/.test(path),
    ),
  ).toBe(false);
  let nav = page.getByRole("navigation", {
    name: "Navigare cont",
    exact: true,
  });
  if (!await nav.isVisible()) {
    await page.getByRole("button", {name:"Deschide toate secțiunile", exact:true}).click();
    nav = page.getByRole("dialog").getByRole("navigation", {name:"Secțiunile contului", exact:true});
  }
  await expect(
    nav.getByRole("button", { name: "Suport și mesaje", exact: true }),
  ).toBeVisible();
  await expect(
    nav.getByRole("button", {
      name: /Chat intern|Mesaje proiecte|^Facturi$|Metodă de plată salvată/,
    }),
  ).toHaveCount(0);
});
test("deschiderea unui coș public gol nu șterge produsele deja salvate în cont", async ({
  page,
}) => {
  const state = await setup(page);
  state.setCloud([
    {
      id: "existing-product",
      source: "products",
      type: "product",
      sku: "prod-component",
      name: "Componentă digitală",
      productSlug: "component",
    },
  ]);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/produse");
  await page.getByRole("button", { name: "Coș (0)", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Coș", exact: true }),
  ).toBeVisible();
  await expect
    .poll(
      () =>
        state.requests.filter((path) => path === "/api/produse/account/state")
          .length,
    )
    .toBeGreaterThan(0);
  expect(
    state.requests.some((path) => path === "/api/commerce/cart/sync"),
  ).toBe(false);
  expect(state.saves).toEqual([]);
  await page.goto("/profil?tab=cart");
  await expect(
    page.getByRole("heading", { name: "Conținutul coșului (1)", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("35 RON", { exact: true })).toHaveCount(2);
});
test("un plan AVY Partener păstrează prețul și checkoutul nativ fără să blocheze serviciile din coș", async ({
  page,
}) => {
  const state = await setup(page);
  state.setCloud([
    {
      id: "plan",
      source: "products",
      type: "partnership",
      sku: "partnership-pro",
      name: "AVY Partener Pro",
      period: "annual",
    },
    {
      id: "site",
      source: "services",
      type: "service",
      sku: "svc-site",
      name: "Site profesional",
      serviceKey: "site",
    },
  ]);
  await page.goto("/profil?tab=cart");
  await expect(page.getByText("1.200 RON / an", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Deschide planul în Produse" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Continuă cu comanda" }),
  ).toBeEnabled();
  expect((state.quotes[0] as { items: unknown[] }).items).toHaveLength(1);
});

test('prețul verificat de Worker actualizează și linia, și totalul după schimbarea catalogului',async({page})=>{
 const state=await setup(page,{quotedSitePrice:27000});state.setCloud([{id:'site',source:'services',type:'service',sku:'svc-site',name:'Site profesional',serviceKey:'site'}]);
 await page.goto('/profil?tab=cart');await expect(page.getByText('270 RON',{exact:true})).toHaveCount(2);await expect(page.getByText('240 RON',{exact:true})).toHaveCount(0);
});

test('două conturi în file diferite nu își amestecă produsele sau notele din coș',async({page,context})=>{
 const first=await setup(page,{userId:'account-a'});first.setCloud([{id:'site-a',source:'services',type:'service',sku:'svc-site',name:'Site profesional',serviceKey:'site',notes:'Notă privată A'}]);
 await page.goto('/profil?tab=cart');await expect(page.getByText('Notă privată A',{exact:true})).toBeVisible();
 const second=await context.newPage();const other=await setup(second,{userId:'account-b'});other.setCloud([{id:'product-b',source:'products',type:'product',sku:'prod-component',name:'Componentă digitală',productSlug:'component',notes:'Notă privată B'}]);
 await second.goto('/profil?tab=cart');await expect(second.getByText('Notă privată B',{exact:true})).toBeVisible();
 await expect(page.getByText('Notă privată A',{exact:true})).toBeVisible();await expect(page.getByText('Notă privată B',{exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'Șterge Site profesional',exact:true}).click();await expect(page.getByText('Coșul este gol.',{exact:true})).toBeVisible();
 await expect(second.getByText('Notă privată B',{exact:true})).toBeVisible();expect(await second.evaluate(()=>JSON.parse(localStorage.getItem('avyron_cart_v2')||'[]')[0]?.notes)).toBe('Notă privată B');await second.close();
});

for (const width of [320, 390, 1440]) test(`Avy Cont organizează proiectele și accesurile la ${width}px`, async ({page}) => {
  await page.setViewportSize({width, height:width === 320 ? 568 : 900});
  const state = await setup(page);
  await page.route('**/api/projects**', route => route.fulfill({json:{data:[
    {id:'project-current',slug:'in-dezvoltare',name:'Website în dezvoltare',kind:'website_prezentare',status:'in_progress',banner_status:'in_progress',url:null,updated_at:1},
    {id:'project-done',slug:'finalizat',name:'Magazin finalizat',kind:'magazin_online',status:'completed',banner_status:'online',url:null,updated_at:1},
  ],purchases:[{id:'paid-service',name:'Pachet SEO achiziționat',kind:'service',status:'paid',total_cents:90000,currency:'RON',updated_at:1}]}}));
  await page.goto('/profil?tab=overview');
  await expect(page.getByRole('heading',{name:'Bună, Client test.',exact:true})).toBeVisible();
  await expect(page.getByText('Proiectele, serviciile și produsele într-un singur loc de unde le gestionezi simplu și inteligent.',{exact:true})).toBeVisible();
  await expect(page.getByRole('link',{name:/Website în dezvoltare/})).toBeVisible();
  await expect(page.getByRole('link',{name:/Magazin finalizat/})).toBeVisible();
  await expect(page.getByRole('button',{name:/Pachet SEO achiziționat/})).toBeVisible();
  const headings = await page.locator('main h2, [role="region"] h2').allTextContents();
  expect(headings.slice(0,4)).toEqual(['Proiectele mele','Mentenanță','Profil','Metode de plată salvate']);
  await expect(page.getByRole('button',{name:/Explorează catalogul|favorite/i})).toHaveCount(0);
  const header = page.locator('header').first();
  await expect(header.getByRole('link',{name:'Avyron Web — Acasă'})).toBeVisible();
  await expect(header.getByRole('button',{name:'Deschide Avy Cont'})).toBeVisible();
  await header.getByRole('button',{name:'Profil',exact:true}).click();
  await page.getByRole('menuitem',{name:'Blog Avyron',exact:true}).scrollIntoViewIfNeeded();
  await expect(page.getByRole('menuitem',{name:'Blog Avyron',exact:true})).toBeVisible();
  await expect(page.getByRole('menuitem',{name:'Blog Avyron',exact:true})).toHaveAttribute('href','https://avyron.ro/blog');
  await expect(page.getByRole('menuitem',{name:'Biblioteca Artefacte',exact:true})).toHaveAttribute('href','https://avyron.ro/biblioteca');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('menu')).toBeHidden();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({path:test.info().outputPath(`avy-cont-${width}.png`),fullPage:true,animations:"disabled"});
  await page.getByRole('button',{name:'Metode de plată salvate',exact:false}).click();
  await expect(page).toHaveURL(/tab=payments.*billingView=settings/);
  await expect(page.getByLabel('Nume pentru factură',{exact:true})).toBeVisible();
  await header.getByRole('button',{name:'Deschide Avy Cont'}).click();
  await expect(page).toHaveURL(/tab=overview/);
  expect(state.requests.some(path=>path.includes('/favorites/')||path.includes('/account/collection'))).toBe(false);
});

test('prima pagină distinge eroarea proiectelor de un cont fără alocări și permite reîncercarea', async ({page}) => {
  await setup(page);
  let failing=true;
  await page.route('**/api/projects**', route => failing ? route.fulfill({status:503,json:{error:{code:'unavailable'}}}) : route.fulfill({json:{data:[],purchases:[],sales:[]}}));
  await page.goto('/profil?tab=overview');
  await expect(page.getByRole('alert').filter({hasText:'Proiectele nu pot fi încărcate acum.'})).toBeVisible();
  failing=false;
  await page.getByRole('button',{name:'Reîncearcă',exact:true}).click();
  await expect(page.getByText('Proiectele și achizițiile confirmate vor apărea aici după alocarea în cont.',{exact:true})).toBeVisible();
});

test('mentenanța deschide colaborările autorizate și facturile în fluxurile native', async ({page}) => {
  const state=await setup(page,{collaborations:true});
  await page.goto('/profil?tab=overview');
  await page.getByRole('button',{name:'Colaborările mele',exact:true}).click();
  await expect(page).toHaveURL(/recurringView=collaborations/);
  await expect.poll(()=>state.requests.some(path=>path.startsWith('/api/my/collaborations?'))).toBe(true);
  await page.getByRole('link',{name:'Plăți și facturi',exact:true}).click();
  await expect(page).toHaveURL(/tab=payments&billingView=invoices/);
  await expect(page.getByText('AVY-101',{exact:true})).toBeVisible();
});

for (const width of [320,390,1280]) test(`catalogul public și contul elimină favoritele și păstrează adăugarea în coș la ${width}px`, async ({page}) => {
  await page.setViewportSize({width,height:900});
  const state=await setup(page);
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/profil?tab=catalog');
  await expect(page.getByRole('button',{name:/favorite|colecție/i})).toHaveCount(0);
  await page.getByRole('article').filter({hasText:'Site profesional'}).getByRole('button',{name:'Adaugă în coș',exact:true}).click();
  await expect(page.getByRole("navigation", {name:width < 1024 ? "Navigare mobilă" : "Navigare cont",exact:true}).getByRole('button',{name:/Coș, 1 produs/})).toBeVisible();
  await page.goto('/produse');
  await expect(page.locator('header').getByRole('link',{name:'Avyron Web — Acasă'})).toBeVisible();
  await expect(page.getByRole('link',{name:'Deschide Avy Cont'})).toBeVisible();
  await expect(page.getByRole('button',{name:/favorite|Salvează în colecție/})).toHaveCount(0);
  await expect(page.getByRole('link',{name:'Vezi colecția de componente'})).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Adaugă în coș',exact:true}).first()).toBeVisible();
  const itemHref = await page.getByRole('button',{name:'Adaugă în coș',exact:true}).first().locator('xpath=ancestor::article').getByRole('link').first().getAttribute('href');
  await page.getByRole('button',{name:'Adaugă în coș',exact:true}).first().click();
  await expect(page.getByRole('button',{name:'Coș (1)',exact:true})).toBeVisible();
  await expect(page.locator('footer').getByRole('link',{name:/Conectează-te|Înregistrează/})).toHaveCount(0);
  const selector = page.locator('#selector input[type="checkbox"]').first();
  await selector.scrollIntoViewIfNeeded();
  await expect(selector).toBeVisible();
  await selector.check();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  await page.screenshot({path:test.info().outputPath(`public-catalog-${width}.png`),animations:'disabled'});
  if (width === 390) {
    expect(itemHref).toBeTruthy();
    await page.goto(itemHref!);
    await expect(page.getByRole('button',{name:'Adaugă în coș',exact:true})).toBeVisible();
    await expect(page.getByRole('button',{name:/Salvează în colecție|favorite/})).toHaveCount(0);
  }
  expect(state.requests.some(path=>path.includes('/favorites/')||path.includes('/account/collection'))).toBe(false);
});


test('Blogul și Biblioteca Artefacte ies din hostul privat către site-ul public', async ({page, baseURL}) => {
  await setup(page);
  await page.route('https://app.avyron.ro/**', async route => {
    const path = new URL(route.request().url());
    if (path.pathname.startsWith('/api/')) return route.fallback();
    const response = await route.fetch({url: baseURL + path.pathname + path.search});
    return route.fulfill({response});
  });
  await page.goto('https://app.avyron.ro/profil?tab=overview');
  await expect(page.getByRole('heading',{name:'Bună, Client test.',exact:true})).toBeVisible();
  await expect(page.getByRole('link',{name:/Blog Avyron/})).toHaveAttribute('href','https://avyron.ro/blog');
  await expect(page.getByRole('link',{name:/Biblioteca Artefacte/})).toHaveAttribute('href','https://avyron.ro/biblioteca');
  await page.locator('header').getByRole('button',{name:'Profil',exact:true}).click();
  await expect(page.getByRole('menuitem',{name:'Blog Avyron',exact:true})).toHaveAttribute('href','https://avyron.ro/blog');
  await expect(page.getByRole('menuitem',{name:'Biblioteca Artefacte',exact:true})).toHaveAttribute('href','https://avyron.ro/biblioteca');
});
