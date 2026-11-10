import {test,expect,type Page} from '@playwright/test';
import {staffFixture} from './staff-fixtures';
import {SITE_DOMAIN_PLAYBOOKS,SITE_FEATURES,SITE_MARKET_SOURCES,SITE_DELIVERY_GATES,SITE_REUSABLE_CAPABILITIES} from '../src/shared/skills/siteKnowledge';
import {SKILL_SEEDS} from '../src/shared/skills/catalog';
const now=Date.now();
async function setup(page:Page){
 await staffFixture(page);let assigned=false,synced=false;
 await page.route('**/api/finance/commercial-codes',route=>route.fulfill({json:{data:[{id:'catalog',entity_type:'service',entity_key:'premium-website',accounting_code:'AVY-PRZ-001',sku:'svc-premium-website',category:'presence',currency:'RON',base_price_minor:145000,tax_status:'unverified',payment_status:'needs_configuration',vat_basis_points:0}],services:[{entity_key:"premium-website",display_name:"Site Prezentare Profesional",category:"presence",base_price_minor:145000}],products:[{entity_key:'product-demo',display_name:'Produs demonstrativ',category:'component',base_price_minor:12900,status:'live'}],references:[]}}));
 await page.route('**/api/newsletter/admin**',route=>{
 const path=new URL(route.request().url()).pathname;
 if(path.endsWith('/assignment')){assigned=true;return route.fulfill({json:{ok:true,revision:2}})}
 if(path.endsWith('/operations/reconcile')){synced=true;return route.fulfill({json:{data:[{id:'campaign',status:'sent'}],more:false}})}
 if(path.endsWith('/operations'))return route.fulfill({json:{provider:{configured:true,apiKey:true,segment:true,sender:true,webhook:true,isolatedSender:true},contacts:{total:3,active:2,pending:1,awaitingSync:0,errors:0,lastSync:now},lastWebhook:now,events:[{event_type:'email.delivered',events:2,recipients:2,latest:now}],interests:[{interest:'Website',language:'ro',total:2}],staff:[{id:'staff',name:'Membru demonstrativ'}],campaigns:[{id:'campaign',name:'Campanie demonstrativă',subject:'Noutăți AVYRON',language:'ro',status:'ready',provider_status:synced?'sent':'provider_draft',provider_checked_at:synced?now:null,provider_raw_status:synced?'sent':null,provider_error:null,provider_broadcast_id:'broadcast-1',assigned_user_id:assigned?'staff':null,assigned_name:assigned?'Membru demonstrativ':null,operations_revision:assigned?2:1,scheduled_at:null,sent_at:synced?now:null,updated_at:now}],periodDays:30,source:'D1 + webhookuri',generatedAt:now}});
 if(path.endsWith('/campaigns'))return route.fulfill({json:{data:[]}});
 if(path.endsWith('/settings'))return route.fulfill({json:{data:{enabled:1,prompt_enabled:0}}});
 if(path.endsWith('/provider'))return route.fulfill({json:{data:{configured:true,active:2,pending:0,failed:0,webhook:true}}});
 return route.fulfill({json:{data:[],meta:{counts:{active:2,pending:1},total:3}}});
 });
 await page.route('**/api/skills/**',route=>{
 const path=new URL(route.request().url()).pathname;
 if(path.endsWith('/knowledge'))return route.fulfill({json:{version:'2026-11-10.2',deliveryGates:SITE_DELIVERY_GATES,connections:SITE_REUSABLE_CAPABILITIES.map(c=>({...c,href:`/profil?tab=${c.tab}`,state:'available_in_repository'})),domains:SITE_DOMAIN_PLAYBOOKS,features:SITE_FEATURES,marketSources:SITE_MARKET_SOURCES,examples:[{key:'demo',name:'Exemplu demonstrativ',url:'https://avyron.ro/examples/pensiuneacerbul.ro',description:'Exemplu de structură, fără rezultate inventate.',page:'premium-website',revision:1,domain:'hospitality',kind:'mockup'}],library:[{id:'demo',name:'Website',effects:[{code:'PRZ-S1',name:'Hero cinematic',description:'Profunzime cu fallback',demo:'cinematic-descent',webgl:true,state:'demo'}]}],agents:[{agent_slug:'leads',status:'active',agent_status:'active',bindings:1}],resourceDomains:[{domain:'medical',total:1,approved:1}]}});
 if(path.includes('/agents/'))return route.fulfill({contentType:'text/markdown',headers:{'Content-Disposition':'attachment; filename="handoff.md"'},body:'# Instrucțiuni aprobate\n\nCalitate maximă și context progresiv.'});
 if(path.endsWith('/sources/sync'))return route.fulfill({json:{created:1,references:1,archived:0,reviewRequired:true}});
 if(path.endsWith('/runs'))return route.fulfill({json:{data:[],nextOffset:null}});
 return route.fulfill({json:{slug:'site-builder',name:'Site Builder',summary:SKILL_SEEDS[0].summary,instructions:SKILL_SEEDS[0].instructions,revision:1,current_version:1,published_version:1,paused:0,resources:[],resourceTotal:0,resourceNextOffset:null,resourceDomains:[{domain:'acoperisuri',total:1,approved:1}],permissions:{read:true,use:true,manage:true,approve:true,platform:true},uploadBlock:'scanner_unconfigured',stats:{total:0,ready:0,queued:0,failed:0},runtime:{queueConfigured:true,aiConfigured:true,textModel:'registered-model'}}});
 });
}
for(const width of [320,1440])test(`listele de coduri sunt compacte și separă serviciile de produse la ${width}px`,async({page},info)=>{
 await setup(page);await page.setViewportSize({width,height:900});await page.goto('/profil?tab=commercial-codes');await page.getByRole('button',{name:'Coduri servicii',exact:true}).click();let dialog=page.getByRole('dialog',{name:'Coduri servicii'});await dialog.getByRole('textbox',{name:'Caută în lista de coduri'}).fill('premium-website');await expect(dialog.getByText('AVY-PRZ-001',{exact:true})).toBeVisible();await expect(dialog.getByText('svc-premium-website',{exact:true})).toBeVisible();expect(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);await page.screenshot({path:info.outputPath(`codes-${width}.png`)});await dialog.getByRole('button',{name:'Close',exact:true}).click();await page.getByRole('button',{name:'Coduri produse',exact:true}).click();dialog=page.getByRole('dialog',{name:'Coduri produse'});await expect(dialog.getByText('Produs demonstrativ',{exact:true})).toBeVisible();await expect(dialog.getByText('Necompletat',{exact:true})).toHaveCount(2);await expect(dialog.getByText('Site Prezentare Profesional',{exact:true})).toHaveCount(0);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});
for(const width of [320,1440])test(`Resend arată feedbackul real, sincronizează starea și alocă responsabil la ${width}px`,async({page},info)=>{
 await setup(page);await page.setViewportSize({width,height:900});await page.goto('/profil?tab=newsletter');await page.getByRole('tab',{name:'Resend',exact:true}).click();const region=page.getByRole('region',{name:'Resend · operațiuni newsletter'});await expect(region.getByRole('heading',{name:'Resend · centru de livrare'})).toBeVisible();await region.getByRole('button',{name:'Alocă responsabil'}).click();const dialog=page.getByRole('dialog',{name:'Responsabil campanie'});await dialog.getByRole('combobox',{name:'Responsabil newsletter'}).click();await page.getByRole('option',{name:'Membru demonstrativ'}).click();await dialog.getByRole('button',{name:'Salvează alocarea'}).click();await expect(region.getByText('Responsabil: Membru demonstrativ')).toBeVisible();await region.getByRole('button',{name:'Sincronizează starea',exact:true}).click();await expect(region.locator('article').getByText('Trimisă',{exact:true})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await page.screenshot({path:info.outputPath(`resend-${width}.png`)});
});
for(const width of [320,1440])test(`Site Builder oferă profil, handoff și resurse pe domenii la ${width}px`,async({page},info)=>{
 await setup(page);await page.setViewportSize({width,height:900});await page.goto('/profil?tab=skill-site-builder');await page.getByRole('button',{name:'Cunoștințe și agenți',exact:true}).click();const region=page.getByRole('region',{name:'Site Builder · cunoștințe și agenți'});await region.getByRole('combobox',{name:'Domeniu Site Builder'}).selectOption('medical');await expect(region.getByRole('heading',{name:'Cabinete medicale',exact:true})).toBeVisible();const downloaded=page.waitForEvent('download');await region.getByRole('button',{name:'Claude · instrucțiuni'}).click();expect((await downloaded).suggestedFilename()).toContain('claude-medical.md');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await page.screenshot({path:info.outputPath(`site-builder-${width}.png`)});await region.getByRole('button',{name:'Folosește în brief'}).click();await expect(page.getByLabel('Punct de pornire')).toHaveValue('medical');await page.getByRole('button',{name:'Resurse',exact:true}).click();await expect(page.getByRole('button',{name:'acoperisuri · 1'})).toBeVisible();
});

for (const width of [320, 1440]) test(`Registrul distinge codurile de TVA, exportă și păstrează jurnalul la ${width}px`, async ({ page }, info) => {
  await setup(page); await page.setViewportSize({ width, height: 900 });
  let synced = false;
  const service = { id: 'catalog', entity_type: 'service', entity_key: 'premium-website', display_name: 'Site Prezentare Profesional', accounting_code: 'AVS001', sku: 'AVY-SRV-WEB-001', category: 'presence', currency: 'RON', base_price_minor: 145000, tax_status: 'unverified', payment_status: 'needs_configuration', vat_basis_points: 0 };
  const product = { ...service, id: 'product', entity_type: 'product', entity_key: 'new-product', display_name: 'Produs nou', sku: 'AVY-DIG-CMP-0001', accounting_code: 'AVD0001' };
  const own = { ...service, id: 'history', entity_key: 'historical-custom', display_name: 'Articol propriu', sku: 'HISTORIC', accounting_code: 'OLD001' };
  await page.route('**/api/finance/commercial-codes', route => route.fulfill({ json: { data: [service, own, ...(synced ? [product] : [])], services: [{ entity_key: service.entity_key, display_name: service.display_name, category: service.category, base_price_minor: 145000 }], products: [{ entity_key: 'new-product', display_name: 'Produs nou', category: 'component', status: 'live', base_price_minor: 10000 }], references: [] } }));
  await page.route('**/api/finance/commercial-codes/sync', route => { synced = true; return route.fulfill({ json: { ok: true, created: 1, completed: 0, existing: 2, total: 3 } }); });
  await page.route('**/api/finance/commercial-codes/journal?*', route => route.fulfill({ json: { data: [{ id: 'event', created_at: now, entity_type: 'product', entity_key: 'new-product', display_name: 'Produs nou', before_sku: null, before_article: null, sku: 'AVY-DIG-CMP-0001', article: 'AVD0001', action: 'catalog_sync' }], nextOffset: null } }));
  await page.goto('/profil?tab=commercial-codes');
  const region = page.getByRole('region', { name: 'Coduri servicii și produse', exact: true });
  await expect(region.getByText('2/3 identități complete', { exact: false })).toBeVisible();
  await expect(region.getByRole('heading', { name: 'Articol propriu' })).toBeVisible();
  await region.getByRole('button', { name: 'Sincronizează codurile', exact: true }).click();
  await expect(region.getByText('3/3 identități complete', { exact: false })).toBeVisible();
  await region.getByRole('combobox', { name: 'Filtrează nomenclatorul' }).selectOption('missing');
  await expect(region.getByText('Nicio înregistrare pentru filtrul ales.')).toBeVisible();
  await region.getByRole('combobox', { name: 'Filtrează nomenclatorul' }).selectOption('tax');
  await expect(region.getByRole('heading', { name: 'Produs nou' })).toBeVisible();
  const downloading = page.waitForEvent('download');
  await region.getByRole('button', { name: 'Export registru', exact: true }).click();
  const downloaded = await downloading; expect(downloaded.suggestedFilename()).toBe('AVYRON-registru-coduri.json');
  const { readFile } = await import('node:fs/promises');
  const artifact = JSON.parse(await readFile((await downloaded.path())!, 'utf8'));
  expect(artifact.entries.find((entry: { key: string }) => entry.key === 'new-product')).toMatchObject({ sku: 'AVY-DIG-CMP-0001', article: 'AVD0001', taxStatus: 'unverified' });
  await region.getByRole('button', { name: 'Jurnalul modificărilor', exact: true }).click();
  await expect(region.getByRole('region', { name: 'Jurnal coduri' }).getByText('Înregistrare din catalog', { exact: false })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.screenshot({ path: info.outputPath(`catalog-reference-${width}.png`) });
});

for (const width of [320, 1440]) test(`Site Builder explică standardul și deschide resursele native la ${width}px`, async ({ page }, info) => {
  await setup(page); await page.setViewportSize({ width, height: 900 }); await page.goto('/profil?tab=skill-site-builder');
  const workspace = page.getByRole('region', { name: 'Standard de lucru Site Builder' });
  await expect(workspace.getByRole('heading', { name: 'Un concept propriu. Un rezultat la standard maxim.' })).toBeVisible();
  await workspace.getByRole('button', { name: 'Bibliotecă și instrumente' }).click();
  const tools = page.getByRole('region', { name: 'Resurse conectate Site Builder' });
  await expect(tools.getByRole('link', { name: 'Deschide AVY Core' })).toHaveAttribute('href', '/profil?tab=maintenance');
  await expect(tools.getByRole('link', { name: 'Deschide Registru comercial' })).toHaveAttribute('href', '/profil?tab=commercial-codes');
  await page.getByText('Criterii de prezentare către client', { exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Mastere premium', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.screenshot({ path: info.outputPath(`builder-quality-${width}.png`) });
});

for (const width of [320, 1440]) test(`Registrul și atelierul au verificări automate de accesibilitate la ${width}px`, async ({ page }) => {
  await setup(page); await page.setViewportSize({ width, height: 900 });
  const { default: axe } = await import('axe-core');
  for (const [tab, selector] of [
    ['commercial-codes', '[role="region"][aria-label="Coduri servicii și produse"]'],
    ['skill-site-builder', 'section[aria-label="Standard de lucru Site Builder"]'],
  ]) {
    await page.goto(`/profil?tab=${tab}`); await expect(page.locator(selector)).toBeVisible();
    await page.addScriptTag({ content: axe.source });
    const result = await page.evaluate(async (include) => {
      const runner = (window as unknown as { axe: { run: (scope: { include: string[] }, options: unknown) => Promise<{ violations: { id: string; nodes: { target: string[]; failureSummary?: string }[] }[] }> } }).axe;
      return runner.run({ include: [include] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } });
    }, selector);
    expect(result.violations, JSON.stringify(result.violations)).toEqual([]);
  }
});
