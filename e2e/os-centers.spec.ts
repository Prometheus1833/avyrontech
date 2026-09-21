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
  if(p.endsWith('/briefing'))body={enabled:1,lookahead_days:7,include_finance:1};
  if(p.endsWith('/infrastructure'))body={data:[{service:'api',status:'ok',detail:'HTTP 200',checked_at:Date.now(),source:'probe'},{service:'email',status:'unknown',detail:'Nicio probă',checked_at:null,source:'neconfigurat'}]};
  if(p.endsWith('/comments'))body={data:[{id:'cm',revision:1,path:'/blog/test',author:'Membru',content:'Comentariu de verificat',created_at:Date.now()}]};
  return r.fulfill({json:body});
 });
 await page.addInitScript(()=>localStorage.setItem('avyron-cookie-consent-v2',JSON.stringify({necessary:true,analytics:false,marketing:false,savedAt:new Date().toISOString(),policyVersion:'2026-09-12'})));
}
for(const size of [{width:1440,height:1000},{width:390,height:844}]){
 test(`all 27 operational centers render without overflow ${size.width}`,async({page},info)=>{
  await setup(page);await page.setViewportSize(size);await page.goto('/profil?tab=os-centers');
  for(const center of centers){
   await page.getByLabel('Caută funcționalități').fill(center.name);
   await page.getByRole('button',{name:new RegExp(center.name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'))}).first().click();
   await expect(page.getByRole('heading',{name:center.name,exact:true})).toBeVisible();
   await expect(page.getByRole('status')).toHaveCount(0);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1),center.id).toBe(true);
   if(['domains','sla','vault','backup','security','profitability','newsletter'].includes(center.id)){await page.getByRole('button',{name:'Adaugă',exact:true}).click();await expect(page.getByLabel('Denumire',{exact:true})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1)).toBe(true);if(center.id==='domains')await page.screenshot({path:info.outputPath(`domain-form-${size.width}.png`),fullPage:true});await page.getByRole('button',{name:'Anulează',exact:true}).click();}
   if(['domains','infrastructure','newsletter'].includes(center.id))await page.screenshot({path:info.outputPath(`${center.id}-${size.width}.png`),fullPage:true});
   await page.getByRole('button',{name:'Toate centrele',exact:true}).click();
  }
 });
}
test('persists a domain record with expiry and typed metadata',async({page})=>{
 await setup(page);let payload:Record<string,unknown>|null=null;
 await page.route('**/api/centers/records/domains',r=>{payload=r.request().postDataJSON();return r.fulfill({json:{id:'domain'}});});
 await page.goto('/profil?tab=os-centers&center=domains');await page.getByRole('button',{name:'Adaugă',exact:true}).click();
 await page.getByLabel('Denumire',{exact:true}).fill('Domeniu client');await page.getByLabel('Domeniu',{exact:true}).fill('example.test');await page.getByLabel('Expirare SSL').fill('2026-11-15T12:00');await page.getByLabel('Valoare estimată (RON)').fill('123.45');
 await page.getByRole('button',{name:'Salvează',exact:true}).click();await expect(page.getByText('Înregistrare salvată.',{exact:true})).toBeVisible();
 expect(payload).toMatchObject({title:'Domeniu client',data:{domain:'example.test',estimated_value_minor:12345}});expect(typeof (payload!.data as Record<string,unknown>).ssl_expires_at).toBe('number');
});
test('marketing dashboard hides restricted centers and can moderate comments',async({page})=>{
 await setup(page,false);let decision:unknown;
 await page.route('**/api/centers/comments/cm',r=>{decision=r.request().postDataJSON();return r.fulfill({json:{ok:true}});});
 await page.goto('/profil?tab=os-centers');await expect(page.getByRole('button',{name:/Asset Vault/})).toHaveCount(0);await expect(page.getByRole('button',{name:/Security Center/})).toHaveCount(0);
 await page.getByRole('button',{name:/Comentarii/}).click();await expect(page.getByText('Comentariu de verificat',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Aprobat',exact:true}).click();await expect.poll(()=>decision).toEqual({status:'approved',revision:1});
});
test('command palette opens an authorized operational center',async({page})=>{
 await setup(page);await page.goto('/profil?tab=os-centers');await expect(page.getByRole('heading',{name:'Centre AVYRON OS',exact:true})).toBeVisible();await page.keyboard.press('Control+k');await page.getByPlaceholder('Caută proiecte, leaduri, facturi, agenți…').fill('newsletter');await page.getByRole('dialog').getByRole('button',{name:/Abonați/}).click();await expect(page.getByRole('heading',{name:'Abonați / Newsletter',exact:true})).toBeVisible();
});
