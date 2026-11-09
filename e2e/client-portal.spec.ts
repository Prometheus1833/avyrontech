import { test, expect, type Page } from "@playwright/test";
import { blankPayload } from "../src/shared/documents/model";
const now = Date.now(),
  doc = {
    id: "d1",
    number: "D-001",
    title: "Contract Cafenea",
    scope: "client",
    collection: "library",
    beneficiary_id: "ca",
    company_name: "Cafenea SRL",
    current_version_id: "draft-hidden",
    published_version_id: "v1",
    revision: 2,
    archived_at: null,
    approved: "approval",
    updated_at: now,
    legal: 1,
    template_version_id: null,
  };
async function setup(page: Page) {
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
    localStorage.setItem(
      "avyron-os-open-groups",
      JSON.stringify({
        projects: true,
        billing: true,
        account: true,
        activity: true,
      }),
    );
  });
  const requests: string[] = [],
    shares: Record<string, unknown>[] = [];
  let canExport = true,
    deny = false,
    failList = false;
  await page.route("**/api/**", (r) => {
    const u = new URL(r.request().url()),
      p = u.pathname;
    requests.push(p + u.search);
    if (p === "/api/auth/refresh")
      return r.fulfill({
        json: { access_token: "synthetic-client-token", expires_in: 900 },
      });
    if (p === "/api/auth/me")
      return r.fulfill({
        json: {
          user: {
            id: "client-a",
            email: "client@example.test",
            email_verified: 1,
            must_change_password: 0,
          },
          profile: {
            display_name: "Client sintetic",
            theme: "dark",
            language: "ro",
          },
          roles: ["user"],
          superadmin: false,
          capabilities: [],
        },
      });
    if (p === "/api/projects")
      return r.fulfill({
        json: {
          data: [
            {
              id: "pa",
              slug: "cafenea",
              name: "Proiect Cafenea",
              kind: "website_prezentare",
              status: "in_progress",
              banner_status: "testing",
              url: "https://example.test",
              updated_at: now,
              client_name: "Cafenea SRL",
            },
          ],
          purchases: [],
          sales: [],
        },
      });
    if (p === "/api/documents")
      return failList
        ? r.fulfill({
            status: 503,
            json: { error: { code: "temporarily_unavailable" } },
          })
        : r.fulfill({
            json: {
              data: deny ? [] : [doc],
              total: deny ? 0 : 1,
              nextOffset: null,
            },
          });
    if (p === "/api/documents/d1")
      return deny
        ? r.fulfill({ status: 404, json: { error: { code: "not_found" } } })
        : r.fulfill({
            json: {
              document: doc,
              version: {
                id: "v1",
                version: 1,
                payload: { ...blankPayload(doc.title), body: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Condițiile aprobate ale proiectului Cafenea." }] }] } },
                sha256: "synthetic-checksum",
              },
              versions: [
                { id: "v1", version: 1, approved_at: now, created_at: now },
              ],
              assignments: [{ project_id: "pa" }],
              files: [],
              events: [],
              shares: [],
              approvals: [],
              grants: [],
              actions: { read: true, export: canExport, share: true },
              issues: [],
            },
          });
    if (p === "/api/documents/d1/export/pdf")
      return deny
        ? r.fulfill({ status: 404, json: { error: { code: "not_found" } } })
        : r.fulfill({
            contentType: "application/pdf",
            body: Buffer.from("%PDF-1.4\n%synthetic transport fixture\n%%EOF"),
          });
    if (p === "/api/documents/d1/export/docx")
      return r.fulfill({
        contentType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        body: Buffer.from("PK\x03\x04synthetic transport fixture"),
      });
    if (p === "/api/documents/d1/recipients")
      return r.fulfill({
        json: {
          data: [
            {
              id: "client-a",
              email: "client@example.test",
              display_name: "Client sintetic",
            },
          ],
        },
      });
    if (p === "/api/documents/d1/share") {
      shares.push(r.request().postDataJSON());
      return r.fulfill({
        json: {
          status: "prepared",
          link: "https://app.avyron.ro/profil?tab=documents&document=d1&version=v1",
          manualUrl: null,
        },
      });
    }
    if (p.startsWith("/api/documents/"))
      return r.fulfill({ status: 404, json: { error: { code: "not_found" } } });
    if (p === "/api/workspace/maintenance/config")
      return r.fulfill({
        json: {
          canManage: false,
          projects: [
            {
              id: "pa",
              slug: "cafenea",
              name: "Proiect Cafenea",
              client_id: "ca",
              status: "maintenance",
            },
          ],
          clients: [],
          products: [],
          staff: [],
          plans: [],
        },
      });
    if (p === "/api/workspace/maintenance")
      return r.fulfill({ json: { data: [], canManage: false } });
    if (p === "/api/billing/account")
      return r.fulfill({
        json: {
          subscriptions: [],
          orders: [],
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
    if (p.startsWith("/api/admin/"))
      return r.fulfill({ status: 403, json: { error: { code: "forbidden" } } });
    return r.fulfill({ json: { data: [], total: 0 } });
  });
  return {
    requests,
    shares,
    disableExport: () => { canExport = false; },
    deny: () => {
      deny = true;
    },
    failList: () => {
      failList = true;
    },
  };
}
for (const width of [320, 390, 1440])
  test(`portal client simplificat fără biblioteci și comenzi interne la ${width}px`, async ({
    page,
  }, info) => {
    const state = await setup(page);
    await page.setViewportSize({ width, height: 950 });
    await page.goto("/profil?tab=documents");
    await expect(
      page.getByRole("heading", { name: "Documentele Mele", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Contract Cafenea", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("AVYRON OS · Documente", { exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByText("Bibliotecă Agenție", { exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Publicate", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Generator", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "AVY Core", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("combobox", { name: "Caută un proiect sau document" }),
    ).toHaveAttribute("placeholder", "Caută un proiect sau document");
    if (width < 1024)
      await page
        .getByRole("button", { name: "Deschide mai multe secțiuni" })
        .click();
    const nav = page.getByRole("navigation", {
      name: width < 1024 ? "Secțiunile contului" : "Navigare cont",
      exact: true,
    });
    await expect(
      page.getByText("Avyron Tech", { exact: true }).last(),
    ).toBeVisible();
    await expect(
      page
        .getByText("Serviciile, produsele și anexele într-un singur loc", {
          exact: true,
        })
        .last(),
    ).toBeVisible();
    for (const label of [
      "Serviciile mele",
      "Mentenanță / Abonamente",
      "Plăți/Istoric",
    ])
      await expect(
        nav.getByRole("button", { name: label, exact: true }),
      ).toBeVisible();
    await expect(
      nav.getByRole("button", { name: "Mentenanță Clienți", exact: true }),
    ).toHaveCount(0);
    if(width<1024){
      const blog=nav.getByRole("link",{name:"Blogul Avyron",exact:true}),logout=nav.getByRole("button",{name:"Deconectare",exact:true});
      await blog.scrollIntoViewIfNeeded();await expect(blog).toHaveAttribute("href","https://avyron.ro/blog");
      const a=await blog.boundingBox(),b=await logout.boundingBox();expect(a!.y+a!.height).toBeLessThanOrEqual(b!.y);expect(Math.abs(a!.width-b!.width)).toBeLessThan(2);
      const text=await blog.locator("span").boundingBox();expect(Math.abs((text!.x+text!.width/2)-(a!.x+a!.width/2))).toBeLessThan(2);
    }
    expect(
      state.requests.some(
        (p) =>
          p.includes("/api/documents/context") ||
          p.includes("/api/admin/system"),
      ),
    ).toBe(false);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath(`client-portal-${width}.png`),
      animations: "disabled",
    });
  });
for (const width of [320,1440]) test(`meniul personal păstrează ordinea cerută și Blogul Avyron înainte de deconectare la ${width}px`, async ({ page }, info) => {
  await setup(page);await page.setViewportSize({width,height:950});
  await page.goto("/");
  await page.locator("header").first().getByRole("button", { name: "Profil", exact: true }).click();
  const menu = page.getByRole("menu");
  const entries=[["Profil","profile"],["Servicii","catalog"],["Mentenanță / Abonamente","subscriptions"],["Plăți și Facturi","payments"],["Produse Development","collection"],["Documentele Mele","documents"],["Creează Logo",null],["Coș","cart"],["Suport Staff","tickets"]];
  expect((await menu.getByRole("menuitem").allTextContents()).slice(0,9).map(t=>t.trim())).toEqual(entries.map(([label])=>label));
  for(const [label,tab] of entries)if(tab)await expect(menu.getByRole("menuitem",{name:label!,exact:true})).toHaveAttribute("href",`/profil?tab=${tab}`);
  await expect(menu.getByRole("menuitem", { name: /AVY Core|Bibliotecă Agenție|AI AVY Prod|Proiecte AI|Financiar/ })).toHaveCount(0);
  const blog=menu.getByRole("menuitem",{name:"Blogul Avyron",exact:true}),logout=menu.getByRole("menuitem",{name:"Deconectează-te",exact:true});
  await blog.scrollIntoViewIfNeeded();await expect(blog).toHaveAttribute("href","https://avyron.ro/blog");
  const blogBox=await blog.boundingBox(),logoutBox=await logout.boundingBox();expect(blogBox!.y+blogBox!.height).toBeLessThanOrEqual(logoutBox!.y);expect(Math.abs(blogBox!.width-logoutBox!.width)).toBeLessThan(2);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await page.screenshot({path:info.outputPath(`client-avatar-menu-${width}.png`),animations:"disabled"});
  await menu.getByRole("menuitem",{name:"Profil",exact:true}).click();await expect(page).toHaveURL(/tab=profile/);
});
test("clientul poate citi documentul fără permisiune de descărcare", async ({ page }, info) => {
  const state = await setup(page);
  state.disableExport();
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto("/profil?tab=documents&document=d1");
  await expect(page.getByRole("article", { name: "Conținutul documentului" })).toContainText("Condițiile aprobate ale proiectului Cafenea.");
  await expect(page.getByRole("button", { name: "Descarcă PDF", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Descarcă Word", exact: true })).toHaveCount(0);
  expect(state.requests.some(p => p.includes("/export/"))).toBe(false);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  for (const label of ["Servicii", "Coș", "Produse"]) {
    const caption = page.getByRole("navigation", { name: "Navigare mobilă", exact: true }).getByRole("button", { name: label, exact: true }).locator("span").last();
    const metrics = await caption.evaluate(el => ({ fits: el.scrollWidth <= el.clientWidth + 1, text: el.textContent, scroll: el.scrollWidth, width: el.clientWidth, font: getComputedStyle(el).font, padding: getComputedStyle(el.parentElement!).padding }));
    expect(metrics.fits, JSON.stringify(metrics)).toBe(true);
  }
  const { createRequire } = await import("node:module");
  await page.addScriptTag({ path: createRequire(import.meta.url).resolve("axe-core/axe.min.js") });
  const violations = await page.evaluate(async () => {
    const axe = (window as unknown as { axe: { run: (selector: string, options: object) => Promise<{ violations: { id: string; impact: string }[] }> } }).axe;
    return (await axe.run("main", { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] } })).violations.filter(v => ["serious", "critical"].includes(v.impact)).map(v => v.id);
  });
  expect(violations).toEqual([]);
  await page.screenshot({ path: info.outputPath("client-document-reader-320.png"), animations: "disabled" });
});
test("căutarea găsește documente alocate și proiecte personale fără modal", async ({
  page,
}) => {
  const state = await setup(page);
  await page.goto("/profil?tab=overview");
  const search = page.getByRole("combobox", {
    name: "Caută un proiect sau document",
  });
  await search.fill("cafenea");
  await expect(
    page.getByRole("option", { name: /Proiect Cafenea/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("option", { name: /Contract Cafenea/ }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(state.requests).toContain("/api/projects?scope=mine");
  await page.getByRole("option", { name: /Contract Cafenea/ }).click();
  await expect(page).toHaveURL(/tab=documents.*document=d1/);
  await expect(
    page.getByRole("heading", { name: "Contract Cafenea", exact: true }),
  ).toBeVisible();
});
test("descărcarea și distribuirea reutilizează versiunea permisă și cer confirmare", async ({
  page,
}) => {
  const state = await setup(page);
  await page.goto("/profil?tab=documents&document=d1&documentView=company");
  await expect(
    page.getByRole("heading", { name: "Contract Cafenea", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("draft-hidden", { exact: true })).toHaveCount(0);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Descarcă PDF", exact: true }).click();
  expect((await download).suggestedFilename()).toBe("D-001-v1.pdf");
  expect(
    state.requests.some((p) => p === "/api/documents/d1/export/pdf?version=v1"),
  ).toBe(true);
  await page.getByRole("button", { name: "Distribuie", exact: true }).click();
  await page
    .getByLabel("Destinatar autorizat", { exact: true })
    .selectOption("client-a");
  const confirm = page.getByRole("button", {
    name: "Confirmă distribuirea",
    exact: true,
  });
  await expect(confirm).toBeDisabled();
  await page.getByRole("checkbox").check();
  await confirm.click();
  await expect(page.getByRole("status")).toContainText(
    "Pregătit · transmiterea nu este confirmată",
  );
  expect(state.shares[0]).toMatchObject({
    versionId: "v1",
    recipientId: "client-a",
    attachment: "none",
    confirmed: true,
  });
  state.deny();
  await page.getByRole("button", { name: "Descarcă PDF", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Accesul și fișierul trebuie să fie verificate",
  );
});
test("legătura veche de mentenanță ajunge în zona comună și nu în AVY Core", async ({
  page,
}) => {
  const state = await setup(page);
  await page.goto("/profil?tab=maintenance");
  await expect(page).toHaveURL(/tab=subscriptions/);
  await expect(
    page.getByRole("heading", { name: "Mentenanță / Abonamente", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Înapoi la abonamente", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Mentenanță nouă",
      exact: true,
    }),
  ).toHaveCount(0);
  expect(state.requests.some((p) => p.startsWith("/api/admin/"))).toBe(false);
});
test("un document inaccesibil și o eroare de listă nu afișează conținut sau registru gol fictiv", async ({
  page,
}) => {
  const state = await setup(page);
  state.deny();
  await page.goto("/profil?tab=documents&document=private-company-id");
  await expect(page.getByRole("alert")).toContainText("accesul a fost retras");
  await expect(
    page.getByRole("button", { name: "Descarcă PDF", exact: true }),
  ).toHaveCount(0);
  state.failList();
  await page
    .getByRole("button", { name: "Înapoi la documente", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "nu au putut fi încărcate",
  );
  await expect(
    page.getByText("Nu ai încă documente disponibile.", { exact: false }),
  ).toHaveCount(0);
});

for (const width of [320,390,1440]) test(`servicii proprii, contor necitite și ordinea din Mai multe la ${width}px`,async({page},info)=>{
  const state=await setup(page);
  await page.setViewportSize({width,height:950});
  let unread=3;
  await page.route('**/api/project-chat/unread-count',r=>r.fulfill({json:{unread}}));
  await page.route('**/api/projects?view=services',r=>r.fulfill({json:{data:[
    {id:'pa',slug:'cafenea',name:'Website Cafenea',kind:'website_prezentare',status:'live',banner_status:'online',url:null,updated_at:1},
    {id:'pb',slug:'brand',name:'Identitate Cafenea',kind:'identitate_completa',status:'in_progress',banner_status:'testing',url:null,updated_at:1},
    {id:'external',slug:'external',name:'Produs extern fără servicii',kind:'external_asset',status:'live',banner_status:'online',url:null,updated_at:1}
  ],services:[{id:'sa',project_id:'pa',service_name:'Website profesional finalizat'}],servicePurchases:[{order_id:'order-a',line_index:0,name:'Audit SEO achiziționat'}]}}));
  await page.goto('/profil?tab=overview');
  const openDrawer=async()=>{
    if(width<1024) await page.getByRole('button',{name:'Deschide mai multe secțiuni'}).click();
    return page.getByRole('navigation',{name:width<1024?'Secțiunile contului':'Navigare cont',exact:true});
  };
  let nav=await openDrawer();
  if(width>=1024)expect((await page.locator('header').first().boundingBox())!.height).toBeLessThanOrEqual(72);
  const support=nav.getByRole('button',{name:'Suport Staff, 3 mesaje necitite',exact:true});
  await expect(support).toBeVisible();
  {const position=await support.evaluate(card=>{const a=card.getBoundingClientRect(),b=card.querySelector('[aria-label="3 mesaje necitite"]')!.getBoundingClientRect();return {right:a.right-b.right,top:b.top-a.top};});expect(position.right).toBeLessThan(14);expect(position.right).toBeGreaterThan(0);expect(position.top).toBeLessThan(14);expect(position.top).toBeGreaterThan(0);}
  const labels=await nav.getByRole('button').allTextContents();
  expect(labels.findIndex(s=>s.includes('Mentenanță / Abonamente'))).toBeLessThan(labels.findIndex(s=>s.includes('Proiectele mele')));
  await expect(nav.getByRole('button',{name:'Servicii',exact:true})).toHaveCount(0);
  await page.screenshot({path:info.outputPath(`client-more-${width}.png`),animations:'disabled'});
  await nav.getByRole('button',{name:'Serviciile mele',exact:true}).click();
  await expect(page).toHaveURL(/tab=my-services/);
  await expect(page.getByRole('heading',{name:'Serviciile mele',exact:true})).toBeVisible();
  await expect(page.getByText('Website profesional finalizat',{exact:true})).toBeVisible();
  await expect(page.getByText('Audit SEO achiziționat',{exact:true})).toBeVisible();
  await expect(page.getByText('Finalizat',{exact:true})).toBeVisible();
  await expect(page.getByText('Testare',{exact:true})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Produs extern fără servicii'})).toHaveCount(0);
  expect(state.requests.some(p=>p.startsWith('/api/commerce/catalog')||p.startsWith('/api/workspace/activity-counts'))).toBe(false);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await page.screenshot({path:info.outputPath(`client-services-${width}.png`),animations:'disabled'});
  unread=0;
  await page.evaluate(()=>window.dispatchEvent(new Event('avyron:activity-changed')));
  nav=await openDrawer();
  await expect(nav.getByRole('button',{name:'Suport Staff',exact:true})).toBeVisible();
  await expect(nav.getByLabel('3 mesaje necitite',{exact:true})).toHaveCount(0);
  if(width<1024){const blog=nav.getByRole('link',{name:'Blogul Avyron',exact:true});await blog.scrollIntoViewIfNeeded();
  const b=await blog.boundingBox(),text=await blog.locator('span').boundingBox();expect(Math.abs(b!.x+b!.width/2-text!.x-text!.width/2)).toBeLessThan(2);}
});

test('citirea conversației elimină contorul din meniu, iar valorile mari rămân compacte',async({page})=>{
 await setup(page);await page.setViewportSize({width:390,height:844});let unread=120,reads=0;
 await page.route('**/api/project-chat/unread-count',r=>r.fulfill({json:{unread}}));
 await page.route('**/api/project-chat/projects?*',r=>r.fulfill({json:{canWrite:true,data:[{id:'pa',slug:'cafenea',name:'Proiect Cafenea',kind:'website_prezentare',status:'in_progress',last_content:'Mesaj de la echipă',last_at:1,unread}]}}));
 await page.route('**/api/project-chat/pa/messages',r=>r.fulfill({json:{data:[{id:'m1',author_id:'staff-a',author_name:'Echipa proiectului',content:'Mesaj de la echipă',created_at:1}]}}));
 await page.route('**/api/project-chat/pa/read',r=>{unread=0;reads++;return r.fulfill({json:{ok:true}})});
 await page.goto('/profil?tab=overview');await page.getByRole('button',{name:'Deschide mai multe secțiuni'}).click();
 const nav=page.getByRole('navigation',{name:'Secțiunile contului',exact:true});
 await expect(nav.getByLabel('120 mesaje necitite',{exact:true})).toHaveText('99+');
 await nav.getByRole('button',{name:'Suport Staff, 120 mesaje necitite',exact:true}).click();
 await page.getByRole('button',{name:'Mesaje proiecte',exact:true}).click();
 await page.getByRole('navigation',{name:'Proiecte autorizate'}).getByRole('button',{name:/Proiect Cafenea/}).click();
 await expect.poll(()=>reads).toBe(1);
 await page.getByRole('button',{name:'Deschide mai multe secțiuni'}).click();
 await expect(nav.getByRole('button',{name:'Suport Staff',exact:true})).toBeVisible();await expect(nav.getByLabel('120 mesaje necitite',{exact:true})).toHaveCount(0);
});

test('Suport Staff însumează solicitările și proiectele, confirmând citirea numai când răspunsurile sunt vizibile',async({page})=>{
 await setup(page);await page.setViewportSize({width:390,height:844});let supportUnread=2,reads=0,failRead=true;
 await page.route('**/api/project-chat/unread-count',r=>r.fulfill({json:{unread:3}}));
 await page.route('**/api/workspace/support-unread-count',r=>r.fulfill({json:{unread:supportUnread}}));
 await page.route('**/api/workspace/tickets',r=>r.fulfill({json:{data:[{id:'ticket-a',subject:'Solicitare mentenanță',revision:1,description:null,status:'open',priority:'medium',created_at:new Date().toISOString()}]}}));
 await page.route('**/api/workspace/tickets/ticket-a/messages?*',r=>r.fulfill({json:{data:[{id:'reply-old',ticket_id:'ticket-a',author_id:'staff-a',content:'Primul răspuns primit',is_staff_reply:true,created_at:new Date(Date.now()-1000).toISOString()},{id:'reply-a',ticket_id:'ticket-a',author_id:'staff-a',content:'Răspuns de suport primit',is_staff_reply:true,created_at:new Date().toISOString()}]}}));
 await page.route('**/api/workspace/tickets/ticket-a/read',r=>{expect(r.request().postDataJSON()).toEqual({messageId:'reply-a'});reads++;if(failRead)return r.fulfill({status:503,json:{error:{code:'temporarily_unavailable'}}});supportUnread=0;return r.fulfill({json:{ok:true}})});
 await page.goto('/profil?tab=overview');await page.getByRole('button',{name:'Deschide mai multe secțiuni'}).click();
 const nav=page.getByRole('navigation',{name:'Secțiunile contului',exact:true});
 await expect(nav.getByRole('button',{name:'Suport Staff, 5 mesaje necitite',exact:true})).toBeVisible();expect(reads).toBe(0);
 await nav.getByRole('button',{name:'Suport Staff, 5 mesaje necitite',exact:true}).click();
 expect(reads).toBe(0);await page.getByRole('button',{name:/Solicitare mentenanță/}).click();
 await expect(page.getByText('Răspuns de suport primit',{exact:true})).toBeVisible();
 await expect(page.getByText('Citirea mesajelor nu a putut fi confirmată.',{exact:false})).toBeVisible();
 failRead=false;await page.getByRole('button',{name:'Reîncearcă',exact:true}).click();
 await expect.poll(()=>supportUnread).toBe(0);
 await page.getByRole('button',{name:'Deschide mai multe secțiuni'}).click();
 await expect(nav.getByRole('button',{name:'Suport Staff, 3 mesaje necitite',exact:true})).toBeVisible();
});
