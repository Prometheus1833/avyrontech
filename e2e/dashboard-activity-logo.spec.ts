import { test,expect,type Page } from '@playwright/test';
import { localConcepts,cleanBrief } from '../src/data/logoStudio';
const now=Date.now();
const brief={name:'Atelier sintetic',industry:'law',style:'modern',notes:'Detaliile introduse pentru un logo viitor',tagline:'Calitate',color:'#8855aa',kind:'static',lang:'ro'};
const leadBase={organization_id:null,name:'Cerere 2D',business:'Atelier',phone:null,email:'test@example.test',status:'new',lifecycle_stage:'new_lead',preferred_channel:null,next_follow_up_at:null,urgent:0,converted_project_id:null,estimate_ron:150,delivery_status:'pending',created_at:now,updated_at:1,can_archive:1};
const leads=[{...leadBase,id:'2d',product:'logo-studio',source:'logo-studio:ai',config_json:JSON.stringify({kind:'static',source:'ai',brief})},{...leadBase,id:'3d',name:'Produs 3D distinct',product:'logo-studio-3d',source:'logo-product:3d',config_json:JSON.stringify({productSlug:'logo-studio-3d'})},{...leadBase,id:'legacy',name:'Serviciu dinamic istoric',product:'logo-studio',source:'logo-studio:dynamic',config_json:JSON.stringify({kind:'dynamic',brief:{...brief,kind:'dynamic'}})}];
async function setup(page:Page){
 await page.addInitScript(()=>{localStorage.setItem('avyron-cookie-consent-v2',JSON.stringify({necessary:true,analytics:false,marketing:false,savedAt:new Date().toISOString(),policyVersion:'2026-09-12'}));localStorage.setItem('avyron-os-open-groups',JSON.stringify({activity:true,os:true,platform:true,produse:true}));});
 let announced=false;let countsCalls=0;let standardCalls=0;
 await page.route('**/api/**',route=>{
  const u=new URL(route.request().url()),path=u.pathname;
  if(path==='/api/auth/refresh')return route.fulfill({json:{access_token:'synthetic-local-token',expires_in:900}});
  if(path==='/api/auth/me')return route.fulfill({json:{user:{id:'owner',email:'prometheus@avyron.ro',email_verified:1,must_change_password:0},profile:{display_name:'Operator sintetic'},roles:['admin'],superadmin:true}});
  if(path==='/api/workspace/activity-counts'){countsCalls++;return route.fulfill({json:{counts:{intern:7,'staff-tickets':3,announcements:announced?0:2,'social-manager':4},generatedAt:now}});}
  if(path==='/api/workspace/announcements/a/read'){announced=true;return route.fulfill({json:{ok:true}});}
  if(path==='/api/workspace/announcements')return route.fulfill({json:{data:[{id:'a',author_id:'other',title:'Anunț de verificat',content:'Informații interne',priority:'normal',created_at:now,read_at:announced?now:null}]}});
  if(path==='/api/operations/notifications')return route.fulfill({json:{data:[]}});
  if(path==='/api/logo-studio/admin/overview')return route.fulfill({json:{product:{slug:'logo-studio-3d',name_ro:'Logo Studio 3D',price_ron_cents:7500,access:'pro',status:'live'},version:null,simulations:[{id:'s',kind:'static',source:'standard',brief_json:JSON.stringify(brief),concept_count:4,lead_id:null,created_at:now}],summary:[{source:'standard',total:1}],nextOffset:null,canFinance:true,canManageCatalog:true,scope:'authorized_all',variants:4,prices:{standard:0,assistedAi:150},finances:u.searchParams.get('mode')==='3d'?{orders:[],totals:[],limit:100,source:'commerce_orders'}:null,infrastructure:{database:'D1',storage:'R2 privat',packageScan:'Verificare obligatorie la download',payment:'Checkout nativ'}}});
  if(path==='/api/logo-studio/simulations'){standardCalls++;return route.fulfill({json:{concepts:localConcepts(cleanBrief(brief)!,4),simulationId:'new-simulation'}});}
  if(path==='/api/leads')return route.fulfill({json:{data:leads,platformRole:'platform_owner'}});
  return route.fulfill({json:{data:[]}});
 });
 return {countsCalls:()=>countsCalls,standardCalls:()=>standardCalls};
}
for(const width of [320,1440])test(`meniul și contoarele sunt organizate pe desktop/mobil ${width}px`,async({page},info)=>{
 await setup(page);await page.setViewportSize({width,height:900});await page.goto('/profil?tab=logo-2d-simulations');await expect(page.getByRole('heading',{name:'Simulări Logo 2D',exact:true})).toBeVisible();
 await expect(page.locator(width<1024?'.staff-dashboard-actions-mobile':'.staff-dashboard-actions-desktop').getByRole('button',{name:/Deschide mesaje/}).locator('svg')).toBeVisible();
 if(width<1024)await page.getByRole('button',{name:'Deschide mai multe secțiuni'}).click();
 const nav=page.getByRole('navigation',{name:width<1024?'Toate secțiunile AVYRON OS':'Navigare AVYRON OS',exact:true});
 const group=(name:string)=>nav.locator('button[aria-expanded]').filter({hasText:new RegExp(`^${name}$`)}).locator('..');
 for(const name of ['Cariere','Biblioteca Artefacte','Antivirus'])await expect(group('AVYRON OS').getByRole('button',{name,exact:true})).toBeVisible();
 await expect(group('Platformă').getByRole('button',{name:'AVY STAFF',exact:true})).toBeVisible();await expect(group('Platformă').getByRole('button',{name:'Simulări Logo 2D',exact:true})).toBeVisible();await expect(group('Produse AVYRON').getByRole('button',{name:'Simulări Logo 3D',exact:true})).toBeVisible();await expect(group('Activitate').getByRole('button',{name:/Manager Social Media/})).toBeVisible();
 await expect(group('Activitate').locator('span[aria-label]').filter({hasText:'7'})).toBeVisible();await expect(group('Activitate').locator('span[aria-label]').filter({hasText:'3'})).toBeVisible();
 const contrasts=await group('Activitate').locator('span[aria-label]').evaluateAll(elements=>elements.map(el=>{const s=getComputedStyle(el);const luminance=(value:string)=>{const c=(value.match(/[\d.]+/g)||[]).slice(0,3).map(Number).map(v=>{const n=v/255;return n<=.04045?n/12.92:((n+.055)/1.055)**2.4;});return .2126*c[0]+.7152*c[1]+.0722*c[2];};const a=luminance(s.color),b=luminance(s.backgroundColor);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);}));for(const contrast of contrasts)expect(contrast).toBeGreaterThanOrEqual(4.5);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await page.screenshot({path:info.outputPath(`activity-navigation-${width}.png`),animations:'disabled'});
});
for(const width of [320,1440])test(`pipeline 2D separat de produsul 3D și brief lizibil la ${width}px`,async({page},info)=>{
 await setup(page);await page.setViewportSize({width,height:900});await page.goto('/profil?tab=logo-2d-simulations');await expect(page.getByRole('heading',{name:'Pipeline livrare Logo 2D',exact:true})).toBeVisible();await expect(page.locator('article').getByRole('button',{name:/Cerere 2D/})).toBeVisible();await expect(page.locator('article').getByRole('button',{name:/Produs 3D distinct|Serviciu dinamic istoric/})).toHaveCount(0);
 await page.getByRole('button',{name:'Deschide brief',exact:true}).click();const dialog=page.getByRole('dialog',{name:'Brief simulare Logo 2D'});await expect(dialog.getByText(brief.notes)).toBeVisible();expect(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);await page.screenshot({path:info.outputPath(`logo-brief-${width}.png`),animations:'disabled'});await dialog.getByRole('button',{name:'Close',exact:true}).click();
 await page.goto('/profil?tab=logo-simulations');await expect(page.getByRole('heading',{name:'Pipeline produs Logo Studio 3D',exact:true})).toBeVisible();await expect(page.locator('article').getByRole('button',{name:/Produs 3D distinct/})).toBeVisible();await expect(page.locator('article').getByRole('button',{name:/Cerere 2D|Serviciu dinamic istoric/})).toHaveCount(0);await expect(page.getByText('Nicio versiune încărcată',{exact:true})).toBeVisible();await expect(page.getByText('Nu există comenzi confirmate pentru acest produs.')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await page.screenshot({path:info.outputPath(`logo-product-${width}.png`),animations:'disabled'});
});
test('confirmarea unui anunț actualizează contoarele fără drept de publicare implicit',async({page})=>{
 const state=await setup(page);await page.goto('/profil?tab=announcements');await expect(page.getByRole('button',{name:'Am citit'})).toBeVisible();const before=state.countsCalls();await page.getByRole('button',{name:'Am citit'}).click();await expect(page.getByRole('button',{name:'Am citit'})).toHaveCount(0);await expect.poll(()=>state.countsCalls()).toBeGreaterThan(before);await expect(page.getByRole('navigation',{name:'Navigare AVYRON OS'}).getByRole('button',{name:'Anunțuri',exact:true})).toBeVisible();
});
test('simulatorul standard salvează patru variante în cont fără apel AI',async({page})=>{
 const state=await setup(page);let aiCalls=0;await page.route('**/api/logo-studio/generate',r=>{aiCalls++;return r.fulfill({status:503,json:{error:'ai_unavailable'}});});await page.goto('/servicii/creare-logo-3d-dinamic-cinematic/creeaza');await page.locator('#brief input').first().fill(brief.name);await page.getByRole('button',{name:'Vezi logo-ul tău',exact:true}).first().click();await expect(page.locator('.ls-grid > li')).toHaveCount(4);expect(state.standardCalls()).toBe(1);expect(aiCalls).toBe(0);
});
test('produsul 3D salvează configurația explicită în fluxul nativ al coșului',async({page})=>{
 await setup(page);let config:Record<string,unknown>|null=null,key='';await page.route('**/api/logo-studio/product-interest',route=>{config=route.request().postDataJSON().config;key=route.request().headers()['idempotency-key'];return route.fulfill({status:201,json:{id:'saved-3d-intent'}});});await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/produse/logo');await page.getByRole('textbox',{name:'Numele brandului',exact:true}).fill('BRAND3D');await page.getByRole('button',{name:/Pachet descărcare —/}).click();await expect.poll(()=>config?.text).toBe('BRAND3D');expect(key).toBeTruthy();await expect(page.getByText(/Pachetul este în coș/)).toBeVisible();
});
test('previzualizarea anonimă standard este locală și nu colectează briefuri',async({page})=>{
 const state=await setup(page);await page.route('**/api/auth/me',route=>route.fulfill({status:401,json:{error:'unauthorized'}}));await page.route('**/api/auth/refresh',route=>route.fulfill({status:401,json:{error:'unauthorized'}}));await page.goto('/servicii/creare-logo-3d-dinamic-cinematic/creeaza');await page.locator('#brief input').first().fill(brief.name);await page.getByRole('button',{name:'Vezi logo-ul tău',exact:true}).click();await expect(page.locator('.ls-grid > li')).toHaveCount(4);expect(state.standardCalls()).toBe(0);await expect(page.getByText('4 variante standard fără AI, export standard gratuit cu cont.',{exact:false})).toBeVisible();
});
