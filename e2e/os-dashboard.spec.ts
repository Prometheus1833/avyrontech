import { expect, test, type Page } from "@playwright/test";

const now = Date.now();

const mockAuthenticatedSuperAdmin = async (page: Page) => {
  await page.route("**/api/auth/refresh", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      access_token: "local-visual-test-token",
      expires_in: 900,
      user: { id: "user-superadmin", roles: ["admin"] },
    }),
  }));
  await page.route("**/api/auth/me", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      user: {
        id: "user-superadmin",
        email: "prometheus@avyron.ro",
        display_name: "Andrei",
        avatar_url: null,
        email_verified: 1,
        must_change_password: 0,
        created_at: now - 30 * 86_400_000,
      },
      profile: {
        id: "user-superadmin",
        display_name: "Andrei",
        avatar_url: null,
        phone: null,
        address: null,
        entity_type: null,
        company_name: "Avyron",
        cui: null,
        social_facebook: null,
        social_instagram: null,
        social_tiktok: null,
        website: "https://avyron.ro",
        language: "ro",
        theme: "dark",
        pseudonym: null,
        staff_role: "dev",
      },
      roles: ["admin"],
      superadmin: true,
    }),
  }));
  await page.route('**/api/operations/**',r=>{
    const path=new URL(r.request().url()).pathname;
    return r.fulfill({json:path.endsWith('/config')?{clients:[],projects:[],staff:[{id:'user-superadmin',name:'Andrei'}],canManageIntegrations:true}:path.endsWith('/integrations')?{providers:{},data:[],canEdit:false}:path.endsWith('/automations')?{data:[],jobs:[]}:path.endsWith('/agents')?{data:[],runs:[],evaluations:[]}:{data:[],total:0}});
  });
  await page.route("**/api/os/overview", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      generatedAt: now,
      role: "super_admin",
      briefing: "Astăzi ai 3 leaduri cu prioritate mare, două proiecte necesită atenție și o aprobare AI este în așteptare.",
      metrics: {
        projects: 18,
        activeProjects: 12,
        leads: 128,
        openLeads: 42,
        clients: 24,
        visits: 2840,
        approvals: 1,
        expensesMinor: 824_000,
        revenuesMinor: 2_458_000,
        criticalAlerts: 1,
      },
      attention: [
        { id: "lead-1", kind: "lead", severity: "critic", title: "3 leaduri fierbinți așteaptă răspuns", detail: "Prioritate ridicată în pipeline.", destination: "leads" },
        { id: "project-1", kind: "proiect", severity: "atenție", title: "2 proiecte necesită actualizare", detail: "Termenul intern se apropie.", destination: "projects" },
      ],
      approvals: [
        { id: "approval-1", revision:1, summary: "AVY AI propune publicarea unei postări pentru Avyron WEB.", action_class: "publish", requested_at: now - 120_000, expires_at: now + 86_400_000, agent_slug: "avy-social", run_status: "waiting_approval" },
      ],
      agentRuns: [
        { id: "run-1", agent_slug: "Lead Hunter", status: "succeeded", input_tokens: 1250, output_tokens: 430, estimated_cost_micros: 0, steps: 46, started_at: now - 300_000, completed_at: now - 180_000, created_at: now - 300_000 },
      ],
      health: [
        { id: "api", label: "API AVYRON", status: "funcțional", detail: "Worker disponibil" },
        { id: "auth", label: "Autentificare", status: "funcțional", detail: "Sesiune validă" },
        { id: "d1", label: "Baza de date D1", status: "funcțional", detail: "Interogare reușită" },
        { id: "r2", label: "Stocare R2", status: "funcțional", detail: "Binding configurat" },
      ],
      integrations: [
        { name: "Cloudflare", category: "infrastructure", status: "conectat", checkedAt: now, errorCode: null },
        { name: "GitHub", category: "development", status: "în_verificare", checkedAt: now, errorCode: null },
      ],
    }),
  }));
};

test.describe("dashboard AVYRON OS în română", () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthenticatedSuperAdmin(page);
    await page.addInitScript(() => localStorage.setItem("avyron-cookie-consent-v2", JSON.stringify({
      necessary: true,
      analytics: false,
      marketing: false,
      savedAt: new Date().toISOString(),
      policyVersion: "2026-09-12",
    })));
  });

  test("afișează sumarul operațional și centrele principale pe desktop", async ({ page }, testInfo) => {
    await page.goto("/profil?tab=overview");

    await expect(page.getByRole("heading", { name: "Bun venit, Andrei." })).toBeVisible();
    await expect(page.getByText("Necesită atenție · Azi")).toBeVisible();
    await expect(page.getByText("Centru de aprobări")).toBeVisible();
    await expect(page.getByText("Activitatea agenților")).toBeVisible();
    await expect(page.getByText("Infrastructură", { exact: true })).toBeVisible();
    await expect(page.getByText("Încasări luna aceasta")).toBeVisible();
    await expect(page.getByText("Informare AVY", { exact: false })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Navigare AVYRON OS" })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "ro");
    await page.screenshot({path:testInfo.outputPath('overview-desktop.png'),fullPage:true});
  });

  test("oferă staffului acces rapid OS din bara landing page", async ({ page }, testInfo) => {
    await page.goto("/");

    const osButton = page.getByRole("button", { name: "Deschide accesul rapid AVYRON OS" });
    await expect(osButton).toBeVisible();
    await expect(osButton).toHaveText(/OS/);
    const brandBox = await page.getByRole("link", { name: /Avyron — mergi la hero/ }).boundingBox();
    const osBox = await osButton.boundingBox();
    const languageBox = await page.getByRole("button", { name: /Schimbă limba/ }).boundingBox();
    expect(brandBox!.x + brandBox!.width).toBeLessThan(osBox!.x);
    expect(osBox!.x + osBox!.width).toBeLessThan(languageBox!.x);
    await osButton.click();

    const quickAccess = page.getByLabel("Acces rapid OS");
    await expect(quickAccess.getByRole("menuitem", { name: /Privire de ansamblu/ })).toHaveAttribute("href", "/profil?tab=overview");
    await expect(quickAccess.getByRole("menuitem", { name: /Leaduri & CRM/ })).toHaveAttribute("href", "/profil?tab=leads");
    await expect(quickAccess.getByRole("menuitem", { name: /Agenți AI/ })).toHaveAttribute("href", "/profil?tab=ai-os");
    await expect(page.getByRole("menuitem", { name: "Către Panoul de comandă" })).toHaveAttribute("href", "/profil?tab=overview");
    await expect(page.getByRole("menu")).toHaveCSS("opacity", "1");
    await page.screenshot({ path: testInfo.outputPath("landing-os-quick-menu.png") });

    await osButton.click();
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(osButton).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
    await osButton.click();
    await expect(page.getByRole("menuitem", { name: "Către Panoul de comandă" })).toBeVisible();
    await expect(page.getByRole("menu")).toHaveCSS("opacity", "1");
    await page.screenshot({ path: testInfo.outputPath("landing-os-quick-menu-mobile.png") });
  });

  test("rămâne utilizabil pe mobil și oferă Command Center", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/profil?tab=overview");

    await expect(page.getByRole("navigation", { name: "Navigare mobilă" })).toBeVisible();
    await page.getByRole("button", { name: /Caută clienți, proiecte/ }).click();
    await expect(page.getByPlaceholder("Caută proiecte, leaduri, facturi, agenți…")).toBeVisible();
    await expect(page.getByText("Comenzi disponibile", { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
  });

  test("pune prioritățile înaintea KPI-urilor și leagă centrele existente", async ({page}) => {
    await page.goto('/profil?tab=overview');
    const attention = page.getByText('Necesită atenție · Azi');
    await expect(attention).toBeVisible();
    const priorityBox = await attention.boundingBox();
    const revenueBox = await page.getByText('Încasări luna aceasta').boundingBox();
    expect(priorityBox!.y).toBeLessThan(revenueBox!.y);
    await expect(page.getByTestId('page-back-link')).toHaveAttribute('href','https://avyron.ro');
    await page.getByRole('tab',{name:'Centre AVYRON OS',exact:true}).first().click();
    await page.getByText('Inventarul extins al platformei și module planificate',{exact:true}).click();
    await page.getByLabel('Caută funcționalități').fill('reinnoiri');
    await expect(page.getByRole('heading',{name:'Contracte și reînnoiri',exact:true})).toBeVisible();
    await page.getByLabel('Caută funcționalități').fill('aprobari');
    await page.getByRole('button',{name:'Deschide funcțiile disponibile'}).click();
    await expect(page.getByRole('heading',{name:'Bun venit, Andrei.'})).toBeVisible();
  });

  test("Super Admin poate gestiona controlat accesul unui membru", async ({ page }) => {
    let submitted: { access_level?: string; client_ids?: string[] } | null = null;
    await page.route("**/api/admin/users", (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: [{ id: "staff-1", email: "coleg@avyron.ro", display_name: "Coleg Avyron", company_name: "Avyron", staff_role: "marketing", disabled_at: null, roles: "user,staff" }],
      }),
    }));
    await page.route("**/api/clients", route=>route.fulfill({json:{data:[{id:'client-a',company_name:'Client A'}]}}));
    await page.route("**/api/workspace/account-access/staff-1", async (route) => {
      if (route.request().method()==='GET') return route.fulfill({json:{data:[]}});
      submitted = route.request().postDataJSON() as { access_level?: string; client_ids?: string[] };
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, userId: "staff-1", roles: ["user", "admin"] }) });
    });

    await page.goto("/profil?tab=team-staff");
    await expect(page.getByRole("heading", { name: "Echipă și personal" })).toBeVisible();
    await page.getByRole("button", { name: "Gestionează" }).click();
    await page.getByLabel("Nivel de acces").selectOption("admin");
    await page.getByLabel("Client A", {exact:true}).check();
    await page.getByRole("button", { name: "Salvează accesul" }).click();

    await expect(page.getByText("Accesul și asocierile client au fost actualizate și auditate.")).toBeVisible();
    expect(submitted).toEqual({ access_level: "admin", client_ids:["client-a"] });
  });
  test('chatul mobil trimite către destinatarul ales și păstrează mesajul după reload', async ({page},testInfo)=>{
    await page.setViewportSize({width:390,height:844});
    await page.route('**/api/workspace/staff',r=>r.fulfill({json:{data:[{id:'peer',display_name:'Coleg',staff_role:'dev'}]}}));
    const messages:{id:string;author_id:string;content:string;created_at:string}[]=[];
    let payload:unknown;
    await page.route('**/api/workspace/chat**',async r=>{
      if(r.request().method()==='POST'){payload=r.request().postDataJSON();messages.push({id:'m1',author_id:'user-superadmin',content:'Status local verificat',created_at:new Date().toISOString()});return r.fulfill({json:{id:'m1'}});}
      return r.fulfill({json:{data:r.request().url().includes('recipient_id=peer')?messages:[]}});
    });
    await page.goto('/profil?tab=intern');
    await page.getByLabel('Conversație',{exact:true}).selectOption('dm:peer');
    await page.getByLabel('Mesaj',{exact:true}).fill('Status local verificat');
    await page.getByRole('button',{name:'Trimite',exact:true}).click();
    await expect(page.getByText('Status local verificat',{exact:true})).toBeVisible();
    expect(payload).toEqual({content:'Status local verificat',channel:'general',recipient_id:'peer'});
    await page.reload();await page.getByLabel('Conversație',{exact:true}).selectOption('dm:peer');
    await expect(page.getByText('Status local verificat',{exact:true})).toBeVisible();
    await page.screenshot({path:testInfo.outputPath('chat-mobile.png'),fullPage:true});
  });
  test('înregistrează o plată parțială cu suma în unități minore',async({page})=>{
    let payload:unknown;
    await page.route('**/api/finance/revenues',r=>r.fulfill({json:{data:[{id:'r1',service_name:'Site',invoice_number:'INV-1',status:'sent',currency:'RON',gross_amount_minor:10000}]}}));
    await page.route('**/api/finance/receipts**',async r=>{
      if(r.request().method()==='POST'){payload=r.request().postDataJSON();return r.fulfill({json:{id:'receipt'}});}
      return r.fulfill({json:{data:[],totals:[],canWrite:true}});
    });
    await page.goto('/profil?tab=payments');
    await page.getByRole('combobox',{name:'Document',exact:true}).selectOption('r1');
    await page.getByLabel('Suma primită (RON)',{exact:true}).fill('30,25');
    await page.getByLabel('Referință unică încasare').fill('bank-fixture');
    await page.getByLabel('Data încasării').fill('2026-09-01T10:00');
    await page.getByRole('button',{name:'Înregistrează încasarea'}).click();
    await expect(page.getByText('Încasare înregistrată.',{exact:true})).toBeVisible();
    expect(payload).toMatchObject({revenue_id:'r1',amount_minor:3025,reference:'bank-fixture'});
  });

  test('creează și aprobă versiunea unui contract din centrul operațional',async({page},testInfo)=>{
    const records:Record<string,unknown>[]=[];let approved:unknown;
    await page.route(/\/api\/operations\/records/,async r=>{
      if(r.request().method()==='POST'){
        if(r.request().url().endsWith('/approve')){approved=r.request().postDataJSON();records[0].status='approved';records[0].revision=2;records[0].approved_revision=1;return r.fulfill({json:{ok:true}});}
        records.push({...r.request().postDataJSON(),id:'record',revision:1,approved_revision:null});return r.fulfill({json:{id:'record'}});
      }
      return r.fulfill({json:{data:records,total:records.length}});
    });
    await page.goto('/profil?tab=os-centers');await expect(page.getByRole('heading',{name:'Centrul operațional',exact:true})).toBeVisible();
    await page.getByRole('button',{name:'Adaugă înregistrare',exact:true}).click();await page.getByLabel('Titlu',{exact:true}).fill('Contract de mentenanță');await page.getByRole('combobox',{name:'Stare',exact:true}).selectOption('pending');await page.getByLabel('Valoare',{exact:true}).fill('1200,25');await page.getByRole('button',{name:'Salvează înregistrarea'}).click();
    await expect(page.getByRole('heading',{name:'Contract de mentenanță'})).toBeVisible();expect(records[0].amount_minor).toBe(120025);await page.getByRole('button',{name:'Aprobă versiunea 1'}).click();await expect(page.getByText(/aprobare v1/)).toBeVisible();expect(approved).toEqual({revision:1});await page.screenshot({path:testInfo.outputPath('operations-desktop.png'),fullPage:true});
  });
  test('simulează și programează rapoarte fără apel de model',async({page})=>{
    let rule:unknown,job:unknown;
    await page.route('**/api/operations/preview',r=>r.fulfill({json:{generated_at:now,source:'D1',work:[],records:[]}}));
    await page.route('**/api/operations/automations',r=>{if(r.request().method()==='POST'){rule=r.request().postDataJSON();return r.fulfill({json:{id:'rule'}});}return r.fulfill({json:{data:[],jobs:[]}});});
    await page.route('**/api/operations/jobs',r=>{job=r.request().postDataJSON();return r.fulfill({json:{id:'job'}});});
    await page.goto('/profil?tab=os-centers');await page.getByRole('button',{name:'Automatizări',exact:true}).click();await page.getByLabel('Nume automatizare').fill('Informarea de dimineață');await page.getByLabel('Programare activă').check();await page.getByRole('button',{name:'Creează automatizarea'}).click();await expect.poll(()=>rule).toMatchObject({name:'Informarea de dimineață',action:'briefing',enabled:true});await page.getByRole('button',{name:'Simulează raportul'}).click();await expect(page.getByText(/^Generat:/)).toBeVisible();await page.getByRole('button',{name:'Execută acum'}).click();await expect.poll(()=>job).toEqual({action:'briefing'});
  });
  test('configurează o integrare fără a reafișa credentialul',async({page})=>{
    let saved:unknown;let revision=1;
    await page.route('**/api/operations/integrations',r=>r.fulfill({json:{providers:{stripe:{name:'Stripe',description:'Citire facturi',documentation:'https://docs.stripe.com/api/invoices/list'}},canEdit:true,data:[{id:'stripe',provider:'stripe',label:'Facturare test',environment:'test',status:'configured',revision,has_credential:revision>1?1:0}]}}));
    await page.route('**/api/operations/integrations/stripe/credential',r=>{saved=r.request().postDataJSON();revision++;return r.fulfill({json:{ok:true}});});
    await page.goto('/profil?tab=os-centers');await page.getByRole('button',{name:'Integrări',exact:true}).click();await page.getByRole('button',{name:'Configurează cheia'}).click();await expect(page.getByLabel('Token API')).toHaveAttribute('type','password');await page.getByLabel('Token API').fill('sk_test_fixture_not_a_real_key');await page.getByRole('button',{name:'Salvează cheia'}).click();await expect(page.getByLabel('Token API')).toHaveCount(0);expect(saved).toEqual({token:'sk_test_fixture_not_a_real_key',revision:1});await expect(page.getByRole('button',{name:'Verifică',exact:true})).toBeEnabled();expect(await page.locator('body').innerText()).not.toContain('sk_test_fixture_not_a_real_key');
  });
  test('afișează evaluarea agenților și consumul necunoscut separat',async({page})=>{
    await page.route('**/api/operations/agents',r=>r.fulfill({json:{data:[{slug:'avy',name:'AVY',status:'active',current_version:1,version_status:'approved',model:'@cf/meta/fixture',max_tokens:600,stopped:0}],runs:[{id:'run',agent_slug:'avy',status:'succeeded',input_tokens:0,output_tokens:0,usage_source:'retrieval',actual_cost_micros:null,started_at:now}],evaluations:[]}}));
    await page.route('**/api/operations/agents/avy/evaluate',r=>r.fulfill({json:{score:1,checks:[{name:'approved_version',passed:true}],matches:[],reply:'Răspuns validat'}}));
    await page.goto('/profil?tab=os-centers');await page.getByRole('button',{name:'Agenți și evaluări'}).click();await page.getByLabel('Întrebare pentru evaluare').fill('Cum funcționează Cloudflare?');await page.getByRole('button',{name:'Verifică agentul'}).click();await expect(page.getByText('Răspuns validat',{exact:true})).toBeVisible();await expect(page.getByRole('cell',{name:'Necunoscut'})).toBeVisible();await expect(page.getByRole('cell',{name:'Fără apel de model'})).toBeVisible();
  });
  test('păstrează toate modulele operaționale utilizabile pe mobil',async({page},testInfo)=>{
    await page.setViewportSize({width:390,height:844});await page.goto('/profil?tab=os-centers');
    for(const tab of ['Registre','Automatizări','Integrări','Agenți și evaluări','Notificări']){
      await page.getByRole('button',{name:tab,exact:true}).click();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1)).toBe(true);
    }
    await page.getByRole('button',{name:'Registre',exact:true}).click();await page.getByRole('button',{name:'Adaugă înregistrare'}).click();await page.screenshot({path:testInfo.outputPath('operations-mobile.png'),fullPage:true});
  });

});
