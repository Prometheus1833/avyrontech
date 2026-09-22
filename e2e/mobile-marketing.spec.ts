import {test,expect,type Page} from '@playwright/test';
import {centers,defaultReads} from '../src/shared/osCatalog';
async function setup(page:Page,owner=true){
 await page.route('**/api/auth/refresh',r=>r.fulfill({json:{access_token:'fixture-local-token',expires_in:900}}));
 await page.route('**/api/auth/me',r=>r.fulfill({json:{user:{id:'owner',email:'owner@example.test',display_name:'Test',email_verified:1},profile:{id:'owner',display_name:'Test'},roles:[owner?'admin':'staff'],superadmin:owner,staffPolicy:{department:owner?'general':'marketing',job_title:'Marketing',read:defaultReads('marketing'),write:['comments'],revision:1}}}));
 await page.route('**/api/operations/**',r=>{const p=new URL(r.request().url()).pathname;return r.fulfill({json:p.endsWith('config')?{clients:[],projects:[],staff:[],canManageIntegrations:true}:p.endsWith('integrations')?{providers:{},data:[],canEdit:true}:p.endsWith('automations')?{data:[],jobs:[]}:p.endsWith('agents')?{data:[],runs:[],evaluations:[]}:{data:[],total:0}});});
 await page.route('**/api/centers/**',r=>{const p=new URL(r.request().url()).pathname;
  let body:unknown={data:[],total:0};
  if(p.endsWith('/catalog'))body={modules:centers.filter(c=>owner||defaultReads('marketing').includes(c.id)).map(c=>({...c,canWrite:owner||c.id==='comments'})),policy:{department:'marketing'}};
  if(p.endsWith('/config'))body={clients:[{id:'c',name:'Client test'}],projects:[{id:'p',name:'Proiect test',client_id:'c'}]};
  if(p.endsWith('/marketing'))body={campaigns:[],posts:[],accounts:[],audits:[],canApprove:owner};
  if(p.endsWith('/backups'))body={settings:{enabled:0,account_id:null,interval_hours:24,retention_days:30,keep_count:7,max_bytes:1073741824,include_files:1,include_media:1,revision:1},runs:[],accounts:[]};
  if(p.endsWith('/briefing'))body={enabled:1,lookahead_days:7,include_finance:1};
  if(p.endsWith('/infrastructure'))body={data:[{service:'api',status:'ok',detail:'HTTP 200',checked_at:Date.now(),source:'probe'},{service:'email',status:'unknown',detail:'Nicio probă',checked_at:null,source:'neconfigurat'}]};
  if(p.endsWith('/comments'))body={data:[{id:'cm',revision:1,path:'/blog/test',author:'Membru',content:'Comentariu de verificat',created_at:Date.now()}]};
  return r.fulfill({json:body});
 });
 await page.addInitScript(()=>localStorage.setItem('avyron-cookie-consent-v2',JSON.stringify({necessary:true,analytics:false,marketing:false,savedAt:new Date().toISOString(),policyVersion:'2026-09-12'})));
}
for(const width of [390,1440]){
 test(`marketing strategy form and safe approval controls ${width}`,async({page},info)=>{
  await setup(page);await page.setViewportSize({width,height:900});let saved:unknown;
  await page.route('**/api/centers/marketing/campaigns',r=>{saved=r.request().postDataJSON();return r.fulfill({json:{id:'campaign'}});});
  await page.goto('/profil?tab=os-centers&center=marketing');await page.getByRole('button',{name:'Campanie nouă',exact:true}).click();await page.getByLabel('Denumire',{exact:true}).fill('Campanie Avyron');await page.getByLabel('Strategie și pași').fill('Educație și studii de caz');await page.getByLabel('Buget',{exact:true}).fill('250');await page.getByRole('button',{name:'Salvează strategia'}).click();expect(saved).toMatchObject({name:'Campanie Avyron',budget_minor:25000,status:'draft'});
  await page.getByRole('button',{name:'Conținut & publicare'}).click();await page.getByRole('button',{name:'Creează postare',exact:true}).click();await expect(page.getByRole('button',{name:'Generează cu AVY Marketing Studio'})).toBeDisabled();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await page.screenshot({path:info.outputPath(`marketing-${width}.png`),fullPage:true,animations:'disabled'});
 });
 test(`account vault, assisted device and backup safety dialogs ${width}`,async({page},info)=>{
  await setup(page);await page.setViewportSize({width,height:900});await page.goto('/profil?tab=os-centers&center=accounts');await page.getByRole('button',{name:'Adaugă cont',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();await expect(page.getByLabel('Metodă de acces')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await page.screenshot({path:info.outputPath(`accounts-${width}.png`),fullPage:true,animations:'disabled'});await page.keyboard.press('Escape');await page.goto('/profil?tab=os-centers&center=backup');await page.getByRole('button',{name:'Creează backup',exact:true}).click();await expect(page.getByRole('button',{name:'Confirmă și pornește'})).toBeDisabled();await page.getByLabel('Accept posibila pauză pe durata exportului.').check();await expect(page.getByRole('button',{name:'Confirmă și pornește'})).toBeEnabled();await page.screenshot({path:info.outputPath(`backup-${width}.png`),fullPage:true,animations:'disabled'});
 });
 test(`staff installation instructions ${width}`,async({page})=>{
  await setup(page);await page.setViewportSize({width,height:900});await page.goto('/profil?tab=os-centers');await page.getByRole('button',{name:'Descarcă aplicația web',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('iPhone / iPad');await expect(page.getByRole('dialog')).toContainText('Android');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 });
 test(`cinematic login preserves registration and password recovery ${width}`,async({page},info)=>{
  await page.addInitScript(()=>localStorage.setItem('avyron-cookie-consent-v2',JSON.stringify({necessary:true,analytics:false,marketing:false,savedAt:new Date().toISOString(),policyVersion:'2026-09-12'})));
  await page.route('**/api/auth/refresh',r=>r.fulfill({status:401,json:{error:{code:'unauthorized'}}}));await page.setViewportSize({width,height:900});await page.goto('/autentificare');await expect(page.getByRole('heading',{name:'Ideile tale. Un spațiu conectat.'})).toBeVisible();await expect(page.getByRole('link',{name:/uitat parola/i})).toBeVisible();await page.getByRole('tab',{name:/înregistrează/i}).click();await expect(page.getByLabel(/nume/i).first()).toBeVisible();await expect(page.getByRole('tabpanel')).toHaveCSS('opacity','1');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await page.screenshot({path:info.outputPath(`login-${width}.png`),fullPage:true,animations:'disabled'});
 });
}
test('PWA manifest and public-only offline cache',async({page,context})=>{
 await page.goto('/autentificare');const manifest=await(await page.request.get('/site.webmanifest')).json();expect(manifest).toMatchObject({start_url:'/profil?source=pwa',display:'standalone',scope:'/'});
 await page.evaluate(async()=>{await navigator.serviceWorker.register('/sw.js');await navigator.serviceWorker.ready;});await page.reload();await expect.poll(()=>page.evaluate(()=>!!navigator.serviceWorker.controller)).toBe(true);
 const paths=await page.evaluate(async()=>{const cache=await caches.open('avyron-public-offline-v2');return (await cache.keys()).map(r=>new URL(r.url).pathname);});expect(paths.sort()).toEqual(['/icon-192.png','/pwa-offline']);await context.setOffline(true);await page.goto('/profil');await expect(page.getByText(/conexiune/i).first()).toBeVisible();await context.setOffline(false);
});
