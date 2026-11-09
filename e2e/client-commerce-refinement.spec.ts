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
    const nav = width<1024?page.getByRole("navigation",{name:"Navigare mobilă",exact:true}):page.locator("header").first();
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
    page.getByRole("heading", { name: "Plăți/Istoric", exact: true }),
  ).toBeVisible();
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Descarcă factura AVY-101", exact: true })
    .click();
  expect((await download).suggestedFilename()).toBe("Factura-AVY-101.pdf");
  await page.getByText("Datele de facturare",{exact:true}).click();
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
    page.getByRole("heading", { name: "Suport Staff", exact: true }),
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
  const nav = page.getByRole("navigation", {
    name: "Navigare cont",
    exact: true,
  });
  await expect(
    nav.getByRole("button", { name: "Suport Staff", exact: true }),
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
  expect(headings.filter(title=>!['Principal','Secțiuni','Contul meu'].includes(title)).slice(0,6)).toEqual(['Proiectele mele','Mentenanță / Abonamente','Produsele mele','Servicii','Documente','Plăți/Istoric']);
  await expect(page.getByRole('button',{name:/Explorează catalogul|favorite/i})).toHaveCount(0);
  const header = page.locator('header').first();
  await expect(header.getByRole('link',{name:'Avyron Web — Acasă'})).toBeVisible();
  await expect(header.getByRole('button',{name:'Deschide Avy Cont'})).toBeVisible();
  const brandBox=await header.getByRole('link',{name:'Avyron Web — Acasă'}).boundingBox(),accountBox=await header.getByRole('button',{name:'Deschide Avy Cont'}).boundingBox();expect(brandBox!.x+brandBox!.width).toBeLessThanOrEqual(accountBox!.x-3);
  await header.getByRole('button',{name:'Profil',exact:true}).click();
  await page.getByRole('menuitem',{name:'Blog Avyron',exact:true}).scrollIntoViewIfNeeded();
  await expect(page.getByRole('menuitem',{name:'Blog Avyron',exact:true})).toBeVisible();
  await expect(page.getByRole('menuitem',{name:'Blog Avyron',exact:true})).toHaveAttribute('href','https://avyron.ro/blog');
  await expect(page.getByRole('menuitem',{name:'Biblioteca Artefacte',exact:true})).toHaveAttribute('href','https://avyron.ro/biblioteca');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('menu')).toBeHidden();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({path:test.info().outputPath(`avy-cont-${width}.png`),fullPage:true,animations:"disabled"});
  await page.getByRole('button',{name:/Plăți\/Istoric/}).last().click();
  await expect(page).toHaveURL(/tab=payments/);
  await page.getByText('Datele de facturare',{exact:true}).click();
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
  await expect(page.getByRole('alert').filter({hasText:'Proiectele nu pot fi încărcate.'})).toBeVisible();
  failing=false;
  await page.getByRole('button',{name:'Reîncearcă',exact:true}).click();
  await expect(page.getByText('Proiectele și serviciile alocate vor apărea aici.',{exact:true})).toBeVisible();
});

test('mentenanța păstrează colaborările autorizate fără butoane duplicate de plăți sau activități',async({page})=>{
 const state=await setup(page,{collaborations:true});await page.goto('/profil?tab=subscriptions');await page.getByRole('button',{name:'Colaborările mele',exact:true}).click();await expect.poll(()=>state.requests.some(path=>path.startsWith('/api/my/collaborations?'))).toBe(true);await expect(page.getByRole('link',{name:'Plăți și facturi',exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'Activități și materiale',exact:true})).toHaveCount(0);
});

for (const width of [320,390,1280]) test(`catalogul public și contul elimină favoritele și păstrează adăugarea în coș la ${width}px`, async ({page}) => {
  await page.setViewportSize({width,height:900});
  const state=await setup(page);
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/profil?tab=catalog');
  await expect(page.getByRole('button',{name:/favorite|colecție/i})).toHaveCount(0);
  await page.getByRole('article').filter({hasText:'Site profesional'}).getByRole('button',{name:'Adaugă în coș',exact:true}).click();
  await expect((width<1024?page.getByRole("navigation",{name:"Navigare mobilă",exact:true}):page.locator("header").first()).getByRole('button',{name:/Coș, 1 produs/})).toBeVisible();
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

for(const width of [320,390,1440])test(`contul separă catalogul de achiziții și păstrează meniul compact la ${width}px`,async({page},info)=>{
 await setup(page);await page.setViewportSize({width,height:900});await page.goto('/profil?tab=catalog');await expect(page.getByRole('heading',{name:'Servicii',exact:true})).toBeVisible();await expect(page.getByRole('heading',{name:'Componentă digitală',exact:true})).toHaveCount(0);
 if(width<1024){await page.getByRole('navigation',{name:'Navigare mobilă',exact:true}).getByRole('button',{name:'Produse',exact:true}).click()}else await page.goto('/profil?tab=product-catalog');
 await expect(page).toHaveURL(/tab=product-catalog/);await expect(page.getByRole('heading',{name:'Produse',exact:true})).toBeVisible();await expect(page.getByRole('heading',{name:'Componentă digitală',exact:true})).toBeVisible();await expect(page.getByRole('heading',{name:'Produse Development Achitate',exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'Adaugă în coș',exact:true}).click();await expect(page.getByText('Adăugat în coșul contului.',{exact:true})).toBeVisible();
 if(width<1024)await page.getByRole('button',{name:'Deschide mai multe secțiuni'}).click();const nav=page.getByRole('navigation',{name:width<1024?'Secțiunile contului':'Navigare cont',exact:true});
 const labels=['Acasă','Suport Staff','Proiectele mele','Mentenanță / Abonamente','Produsele mele','Servicii','Documente','Plăți/Istoric'];for(const label of labels)await expect(nav.getByRole('button',{name:label,exact:true})).toBeVisible();
 for(const label of ['Coș','Notificări','Istoric și plăți','Plăți și facturi'])await expect(nav.getByRole('button',{name:label,exact:true})).toHaveCount(0);
 for(let i=0;i<labels.length;i+=2){const a=await nav.getByRole('button',{name:labels[i],exact:true}).boundingBox(),b=await nav.getByRole('button',{name:labels[i+1],exact:true}).boundingBox();expect(Math.abs(a!.y-b!.y)).toBeLessThan(2)}
 await nav.getByRole('button',{name:'Produsele mele',exact:true}).click();await expect(page).toHaveURL(/tab=collection/);await expect(page.getByRole('heading',{name:'Produse Development Achitate',exact:true})).toBeVisible();
 await page.goto('/profil?tab=subscriptions');await expect(page.getByRole('button',{name:'Activități și materiale',exact:true})).toHaveCount(0);await expect(page.getByRole('link',{name:'Plăți și facturi',exact:true})).toHaveCount(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await page.screenshot({path:info.outputPath(`simple-account-${width}.png`),fullPage:true});
});
for(const width of [320,1440])test(`plățile au cardul sus și istoricul fără filtre la ${width}px`,async({page},info)=>{
 const state=await setup(page);await page.setViewportSize({width,height:900});
 await page.route('**/api/workspace/payments*',r=>r.fulfill({json:{data:[{id:'receipt:test',title:'Website achitat',amount_minor:24000,currency:'RON',paid_at:Date.UTC(2026,10,1),date_kind:'payment',invoice_id:'invoice-a',invoice_number:'AVY-101',order_id:null,provider:'stripe',download_available:1}],nextOffset:null}}));
 await page.route('**/api/billing/payment-methods',r=>r.fulfill({json:{methods:[{id:'masked',provider:'stripe',type:'card',brand:'visa',last4:'4242',expiry_month:12,expiry_year:2028,is_default:1}],refreshed:{stripe:true,revolut:false}}}));
 await page.goto('/profil?tab=orders');await expect(page).toHaveURL(/tab=payments/);await expect(page.getByRole('heading',{name:'Plăți/Istoric',exact:true})).toBeVisible();await expect(page.getByText('Visa •••• 4242',{exact:true})).toBeVisible();await expect(page.getByRole('heading',{name:'Website achitat',exact:true})).toBeVisible();
 const card=await page.getByText('Cardul tău pentru plăți',{exact:true}).boundingBox(),history=await page.getByRole('heading',{name:'Istoricul plăților',exact:true}).boundingBox();expect(card!.y).toBeLessThan(history!.y);
 await expect(page.getByRole('searchbox')).toHaveCount(0);await expect(page.getByLabel('Starea facturii')).toHaveCount(0);await expect(page.locator('input[autocomplete="cc-number"],input[autocomplete="cc-csc"]')).toHaveCount(0);
 const wait=page.waitForEvent('download');await page.getByRole('button',{name:'Descarcă factura pentru Website achitat',exact:true}).click();expect((await wait).suggestedFilename()).toBe('Factura-AVY-101.pdf');
 await expect(page.getByRole('button',{name:'Descarcă factura pentru Website achitat',exact:true})).toBeEnabled();await page.mouse.move(0,0);await page.evaluate(()=>window.scrollTo(0,0));
 await page.locator('main').evaluate(async element=>{await Promise.all(element.getAnimations({subtree:true}).filter(a=>a.effect?.getTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>undefined)))});
 const {createRequire}=await import('node:module');await page.addScriptTag({path:createRequire(import.meta.url).resolve('axe-core/axe.min.js')});
 const violations=await page.evaluate(async()=>{const axe=(window as unknown as {axe:{run:(selector:string,options:object)=>Promise<{violations:{id:string;impact:string;nodes:{target:string[];failureSummary:string}[]}[]}>}}).axe;return(await axe.run('main',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.filter(v=>['serious','critical'].includes(v.impact)).map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,reason:n.failureSummary}))}))});expect(violations).toEqual([]);
 expect(state.requests.filter(path=>path==='/api/billing/account').length).toBe(1);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await page.screenshot({path:info.outputPath(`payment-history-${width}.png`),fullPage:true});
});

test('adăugarea cardului folosește formularul Stripe, permite reîncercare și nu colectează date de card în AVYRON',async({page})=>{
 await setup(page);let attempts=0;
 await page.route('**/api/billing/account',r=>r.fulfill({json:{profile:null,methods:[],subscriptions:[],invoices:[],revolutPlans:[],providers:{stripe:{enabled:true},revolut:{enabled:false},oblio:{enabled:false},netopia:{enabled:false}}}}));
 await page.route('**/api/billing/payment-methods/setup',r=>{attempts++;expect(r.request().postDataJSON()).toEqual({provider:'stripe'});return attempts===1?r.fulfill({status:503,json:{error:{message:'Procesator indisponibil temporar'}}}):r.fulfill({status:201,json:{url:'https://checkout.stripe.com/c/pay/fixture-secure-card'}})});
 await page.route('https://checkout.stripe.com/c/pay/fixture-secure-card',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><html lang="ro"><title>Procesator sintetic</title><h1>Formular securizat al procesatorului</h1></html>'}));
 await page.goto('/profil?tab=payments');const add=page.getByRole('button',{name:'Adaugă card securizat',exact:true});await expect(add).toBeEnabled();await add.focus();await page.keyboard.press('Enter');await expect(page.getByText('Procesator indisponibil temporar',{exact:true})).toBeVisible();await expect(add).toBeEnabled();await expect(page.locator('input[autocomplete="cc-number"],input[autocomplete="cc-csc"]')).toHaveCount(0);await add.click();await expect(page).toHaveURL('https://checkout.stripe.com/c/pay/fixture-secure-card');expect(attempts).toBe(2);
});


test('istoricul raportează erorile recuperabil și nu atribuie o factură fără legătura comenzii',async({page})=>{
 await setup(page);let available=false;
 await page.route('**/api/billing/account',r=>r.fulfill({json:{profile:null,methods:[],subscriptions:[],invoices:[{id:'unrelated',order_id:null,status:'issued',document_url:'/api/workspace/invoices/unrelated/content'}],revolutPlans:[],providers:{stripe:{enabled:false},revolut:{enabled:false},oblio:{enabled:false},netopia:{enabled:false}}}}));
 await page.route('**/api/workspace/payments*',r=>available?r.fulfill({json:{data:[{id:'receipt:without-file',title:'Plată fără factură atașată',amount_minor:9000,currency:'RON',paid_at:10,date_kind:'payment',invoice_id:'without-file',invoice_number:null,order_id:null,provider:null,download_available:0}],nextOffset:null}}):r.fulfill({status:503,json:{error:{code:'unavailable'}}}));
 await page.goto('/profil?tab=payments');const history=page.getByRole('region',{name:'Istoricul plăților efectuate',exact:true});await expect(history.getByRole('alert')).toContainText('Istoricul plăților nu poate fi încărcat');available=true;await history.getByRole('button',{name:'Reîncearcă',exact:true}).click();await expect(history.getByRole('heading',{name:'Plată fără factură atașată',exact:true})).toBeVisible();await expect(history.getByRole('button',{name:/Descarcă factura/})).toHaveCount(0);
});

test('factura găzduită la furnizor se deschide fără tokenul sau refererul AVYRON',async({page,context})=>{
 await setup(page);const invoiceUrl='https://www.oblio.eu/facturi/fixture-client.pdf';let headers:Record<string,string>|undefined;
 await context.route(invoiceUrl,route=>{headers=route.request().headers();return route.fulfill({contentType:'text/html',body:'<!doctype html><html lang="ro"><title>Factură sintetică</title><h1>Factura furnizorului</h1></html>'})});
 await page.route('**/api/billing/account',r=>r.fulfill({json:{profile:null,methods:[],subscriptions:[],invoices:[{id:'provider-invoice',order_id:'confirmed-order',status:'issued',document_url:invoiceUrl}],revolutPlans:[],providers:{stripe:{enabled:false},revolut:{enabled:false},oblio:{enabled:false},netopia:{enabled:false}}}}));
 await page.route('**/api/workspace/payments*',r=>r.fulfill({json:{data:[{id:'online:confirmed',title:'Comandă cu factură externă',amount_minor:9000,currency:'RON',paid_at:10,date_kind:'confirmation',invoice_id:null,invoice_number:null,order_id:'confirmed-order',provider:'stripe',download_available:0}],nextOffset:null}}));
 await page.goto('/profil?tab=payments');const popupEvent=page.waitForEvent('popup');await page.getByRole('button',{name:'Descarcă factura pentru Comandă cu factură externă',exact:true}).click();const popup=await popupEvent;await expect(popup.getByRole('heading',{name:'Factura furnizorului',exact:true})).toBeVisible();expect(headers?.authorization).toBeUndefined();expect(headers?.referer).toBeUndefined();await popup.close();
});

test('comenzile în așteptare păstrează o eroare recuperabilă și actualizează disponibilitatea procesatorului',async({page})=>{
 const state=await setup(page);let available=false;await page.route('**/api/commerce/orders',r=>available?r.fulfill({json:{data:[{id:'pending',items_json:'[{"sku":"svc-site","name":"Website","quantity":1}]',total_cents:24000,currency:'RON',status:'requested',requires_manual_quote:0,created_at:1}]}}):r.fulfill({status:503,json:{error:{code:'unavailable'}}}));
 await page.goto('/profil?tab=payments');await expect(page.getByRole('alert').filter({hasText:'Comenzile nu pot fi încărcate'})).toBeVisible();available=true;await page.locator('header').filter({has:page.getByRole('heading',{name:'Comenzi în așteptare',exact:true})}).getByRole('button',{name:'Actualizează',exact:true}).click();await expect(page.getByRole('heading',{name:'Website',exact:true})).toBeVisible();await expect(page.getByRole('alert').filter({hasText:'Comenzile nu pot fi încărcate'})).toHaveCount(0);expect(state.requests.filter(path=>path==='/api/billing/account').length).toBe(2);
});
