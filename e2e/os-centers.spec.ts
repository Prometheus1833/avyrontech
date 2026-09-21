import {test,expect,type Page} from '@playwright/test';
import {centers,defaultReads} from '../src/shared/osCatalog';
async function setup(page:Page,owner=true){
 await page.route('**/api/auth/refresh',r=>r.fulfill({json:{access_token:'fixture-local-token',expires_in:900}}));
 await page.route('**/api/auth/me',r=>r.fulfill({json:{user:{id:'owner',email:'owner@example.test',display_name:'Test',email_verified:1},profile:{id:'owner',display_name:'Test'},roles:[owner?'admin':'staff'],superadmin:owner,staffPolicy:{department:owner?'general':'marketing',job_title:'Marketing',read:defaultReads('marketing'),write:['comments'],revision:1}}}));
 await page.route('**/api/survey-admin/**',r=>r.fulfill({json:{data:[],canManage:owner}}));
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
 await setup(page);await page.goto('/profil?tab=os-centers');await expect(page.getByRole('heading',{name:'Centre AVYRON OS',exact:true})).toBeVisible();await page.keyboard.press('Control+k');await page.getByPlaceholder('Caută proiecte, leaduri, facturi, agenți…').fill('newsletter');await page.getByRole('dialog').getByRole('option',{name:/Abonați/}).click();await expect(page.getByRole('heading',{name:'Abonați / Newsletter',exact:true})).toBeVisible();
});
for(const width of [390,1440])test(`Documents Hub saves categories and displays grounded AI citations ${width}`,async({page},info)=>{
 await setup(page);await page.setViewportSize({width,height:900});let saved:Record<string,unknown>|null=null;
 await page.route(/\/api\/centers\/documents(?:\/|\?|$)/,r=>{
  const path=new URL(r.request().url()).pathname;
  if(path.endsWith('/audits'))return r.fulfill({json:{data:[]}});
  if(path.endsWith('/ai'))return r.fulfill({json:{answer:'Mentenanța include backup zilnic.',citations:[{id:'d',quote:'backup zilnic'}],sources:[{id:'d',title:'Contract client',revision:1}]}});
  if(r.request().method()==='POST'){saved=r.request().postDataJSON();return r.fulfill({json:{id:'d'}});}
  return r.fulfill({json:{data:saved?[{...saved,id:'d',revision:1,file_name:null,updated_at:Date.now()}]:[],total:saved?1:0,stale:[]}});
 });
 await page.goto('/profil?tab=os-centers&center=documents');await page.getByRole('button',{name:'Adaugă document',exact:true}).click();await page.getByLabel('Titlu document').fill('Contract client');await page.getByLabel('Categorie document',{exact:true}).selectOption('contract');await page.getByLabel('Conținut pentru căutare și AI').fill('Mentenanța include backup zilnic.');await page.getByLabel('Stare document').selectOption('approved');await page.getByRole('button',{name:'Salvează documentul'}).click();await expect(page.getByRole('heading',{name:'Contract client',exact:true})).toBeVisible();expect(saved).toMatchObject({category:'contract',status:'approved'});
 await page.getByLabel('Întrebare pentru documente').fill('Ce include mentenanța?');await page.getByRole('button',{name:'Caută cu AI',exact:true}).click();await expect(page.getByText('„backup zilnic”',{exact:true})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await page.screenshot({path:info.outputPath(`documents-${width}.png`),fullPage:true});
});
test('command palette executes unpaid invoices, opens client and generates explicit month report',async({page})=>{
 await setup(page);let report:unknown;
 await page.route('**/api/centers/commands/**',r=>{
  const url=new URL(r.request().url());
  if(url.pathname.endsWith('/report')){report=r.request().postDataJSON();return r.fulfill({json:{id:'report',title:'Raport operațional 2026-08',text:'Raport lunar salvat.'}});}
  if(url.pathname.endsWith('/client/c'))return r.fulfill({json:{title:'Fișa clientului',data:[{id:'c',company_name:'Acme',email:'acme@example.test'},{id:'p',name:'Website Acme',status:'live'}]}});
  return r.fulfill({json:url.searchParams.get('type')==='invoices'?{title:'Facturi neachitate',data:[{id:'invoice',invoice_number:'AVY-10',gross_amount_minor:12345,currency:'RON'}]}:{title:'Clienți',data:[{id:'c',company_name:'Acme'}]}});
 });
 await page.goto('/profil?tab=os-centers');await expect(page.getByRole('heading',{name:'Centre AVYRON OS',exact:true})).toBeVisible();await page.keyboard.press('Control+k');const input=page.getByLabel('Comandă rapidă');await input.fill('arată facturile neachitate');await input.press('Enter');await expect(page.getByText('AVY-10',{exact:true})).toBeVisible();await input.fill('deschide clientul Acme');await input.press('Enter');await page.getByRole('button',{name:'Deschide fișa clientului'}).click();await expect(page.getByText('Website Acme',{exact:true})).toBeVisible();await input.fill('generează raportul august 2026');await input.press('Enter');await expect(page.getByText('Raport lunar salvat.',{exact:true})).toBeVisible();expect(report).toEqual({month:'2026-08'});
});
test('marketing cannot execute privileged commands through the palette',async({page})=>{
 await setup(page,false);await page.goto('/profil?tab=os-centers');await expect(page.getByRole('heading',{name:'Centre AVYRON OS',exact:true})).toBeVisible();await page.keyboard.press('Control+k');await page.getByLabel('Comandă rapidă').fill('arată facturile neachitate');await expect(page.getByRole('option',{name:'Arată facturile neachitate'})).toHaveCount(0);
});
test('editing an older domain fills new ownership and SSL defaults',async({page})=>{
 await setup(page);let saved:unknown;
 await page.route('**/api/centers/records/domains**',r=>r.fulfill({json:{data:[{id:'legacy',kind:'domains',title:'Domeniu existent',description:'',status:'active',client_id:null,project_id:null,assignee_id:null,due_at:null,revision:1,data:{domain:'example.test',dns:'',redirect:'',estimated_value_minor:null,opportunity:''}}],total:1}}));
 await page.route('**/api/centers/records/domains/legacy',r=>{saved=r.request().postDataJSON();return r.fulfill({json:{id:'legacy'}});});
 await page.goto('/profil?tab=os-centers&center=domains');await page.getByRole('button',{name:'Editează',exact:true}).click();await page.getByRole('button',{name:'Salvează',exact:true}).click();await expect.poll(()=>saved).toMatchObject({data:{ownership:'avyron',ssl_status:'unknown'},revision:1});
});
