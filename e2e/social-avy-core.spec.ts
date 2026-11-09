import {expect,test,type Page} from '@playwright/test';
const stamp=Date.now();
const project={id:'pa',slug:'project-a',name:'Proiect A demonstrativ',client_id:'a',status:'in_progress',kind:'website_prezentare',banner_status:'in_progress',updated_at:stamp};
const subscription={id:'sub-a',status:'active',next_billing_date:stamp+86400000,service_id:'service-a',service_name:'Mentenanță Plus',price:125.5,billing_cycle:'monthly',client_id:'a',company_name:'Beneficiar A',project_id:'pa',project_name:project.name,project_status:'maintenance',plan_sku:'plan-fixture',specifications_json:'{"Ore incluse":"2 ore/lună"}',product_slug:null,external_url:null,target_label:'Website A',revision:1,maintenance_enabled:1,staff:[{id:'staff',name:'Daria · demo'}]};
const configuration={canManage:true,projects:[project],clients:[{id:'a',company_name:'Beneficiar A'}],products:[{slug:'product-fixture',name:'Produs demonstrativ'}],staff:[{id:'staff',name:'Daria · demo'}],plans:[{sku:'plan-fixture',name:'Mentenanță Plus',category:'Website',priceMinor:12550,specifications:{'Ore incluse':'2 ore/lună','Backup':'Conform acordului aprobat'}}]};
async function setup(page:Page,client=false){
 await page.addInitScript(()=>localStorage.setItem('avyron-cookie-consent-v2',JSON.stringify({necessary:true,analytics:false,marketing:false,savedAt:new Date().toISOString(),policyVersion:'2026-09-12'})));
 await page.route('**/api/**',route=>{
  const path=new URL(route.request().url()).pathname;
  if(path==='/api/auth/refresh')return route.fulfill({json:{access_token:'fixture-local-browser',expires_in:900}});
  if(path==='/api/auth/me')return route.fulfill({json:{user:{id:client?'client':'owner',email:client?'client@example.test':'prometheus@avyron.ro',display_name:client?'Client demo':'Owner demo',email_verified:1,must_change_password:0},profile:{display_name:client?'Client demo':'Owner demo'},roles:client?['user']:['admin'],superadmin:!client}});
  if(path==='/api/projects')return route.fulfill({json:{data:[project],purchases:[],sales:[]}});
  if(path==='/api/projects/project-a')return route.fulfill({json:{project,permission:{read:true,write:!client}}});
  if(path==='/api/workspace/maintenance/config')return route.fulfill({json:{...configuration,canManage:!client,clients:client?[]:configuration.clients,staff:client?[]:configuration.staff}});
  if(path==='/api/workspace/maintenance')return route.fulfill({json:{data:[subscription],canManage:!client}});
  if(path.startsWith('/api/workspace/work-items/'))return route.fulfill({json:{data:[],canWrite:!client}});
  if(path.endsWith('/social-manager'))return route.fulfill({json:{project:{id:'ai-web',slug:'avyron-web',name:'AVYRON WEB',automation_mode:'approval'},permission:{canReview:!client,canCreate:!client},counts:{draft:0,pending_approval:0,approved:0},content:[],total:0,nextOffset:null,activities:[],scheduled:[],generatedAt:stamp}});
  if(path==='/api/ai-projects')return route.fulfill({json:{data:[{id:'ai-web',slug:'avyron-web',name:'AVYRON WEB'}]}});
  return route.fulfill({json:{data:[]}});
 });
}
test('Managerul Social Media aprobă numai versiunea revizuită și arată activitățile viitoare',async({page},testInfo)=>{
 await setup(page);let status='pending_approval',submitted:unknown;
 const item={id:'social-item',format:'post',objective:'visibility',channels_json:'["facebook"]',title:'Material de verificare',caption:'Textul exact pentru decizia umană.',visual_direction:'Design demonstrativ',cta:'Consultă proiectul.',hashtags_json:'[]',status,expires_at:stamp+86400000,created_at:stamp,updated_at:17};
 await page.route('**/api/ai-projects/avyron-web/social-manager*',route=>route.fulfill({json:{project:{id:'ai-web',slug:'avyron-web',name:'AVYRON WEB',automation_mode:'approval'},permission:{canReview:true,canCreate:true},counts:{draft:0,pending_approval:status==='pending_approval'?1:0,approved:status==='approved'?1:0},content:status==='pending_approval'?[item]:[],total:status==='pending_approval'?1:0,nextOffset:null,activities:[{id:'job',topic:'Raport editorial viitor',primary_channel:'facebook',status:'queued',due_at:stamp+86400000}],scheduled:[],generatedAt:stamp}}));
 await page.route('**/api/ai-projects/ai-web/content/social-item',route=>{submitted=route.request().postDataJSON();status='approved';return route.fulfill({json:{ok:true}});});
 await page.goto('/profil?tab=social-manager');await page.getByRole('button',{name:'Aprobă',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:item.title});await expect(dialog.getByText(item.caption)).toBeVisible();await expect(dialog.getByRole('button',{name:'Confirmă aprobarea'})).toBeDisabled();await dialog.getByRole('checkbox').check();await dialog.getByRole('button',{name:'Confirmă aprobarea'}).click();await expect(page.getByText('Nu există materiale pentru starea selectată.')).toBeVisible();expect(submitted).toEqual({status:'approved',expectedUpdatedAt:17});
 await page.getByRole('button',{name:/Activități viitoare/}).click();await expect(page.getByRole('dialog',{name:'Activități viitoare și în lucru'}).getByText('Raport editorial viitor')).toBeVisible();await page.screenshot({path:testInfo.outputPath('social-upcoming.png')});
});
test('o ciornă trece în aprobare, iar un responsabil fără drept de decizie nu primește butoane de aprobare',async({page})=>{
 await setup(page);let submitted:unknown;
 const item={id:'draft',format:'story',objective:'visibility',channels_json:'["instagram"]',title:'Ciornă demonstrativă',caption:'Textul ciornei.',visual_direction:'',cta:'',hashtags_json:'[]',status:'draft',expires_at:stamp+86400000,created_at:stamp,updated_at:9};
 const snapshot={project:{id:'ai-web',slug:'avyron-web',name:'AVYRON WEB',automation_mode:'approval'},permission:{canReview:false,canCreate:true},counts:{draft:1,pending_approval:0,approved:0},content:[item],total:1,nextOffset:null,activities:[],scheduled:[],generatedAt:stamp};
 await page.route('**/api/ai-projects/avyron-web/social-manager*',route=>route.fulfill({json:snapshot}));
 await page.route('**/api/ai-projects/ai-web/content/draft',route=>{submitted=route.request().postDataJSON();return route.fulfill({json:{ok:true}});});
 await page.goto('/profil?tab=social-manager');await expect(page.getByRole('button',{name:'Aprobă',exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'Respinge',exact:true})).toHaveCount(0);await page.getByRole('button',{name:'Trimite la aprobare'}).click();await page.getByRole('dialog').getByRole('checkbox').check();await page.getByRole('button',{name:'Confirmă trimiterea la aprobare'}).click();await expect.poll(()=>submitted).toEqual({status:'pending_approval',expectedUpdatedAt:9});
});
test('Mentenanță Clienți configurează planul, specificațiile și stafful după confirmarea rezumatului',async({page},testInfo)=>{
 await setup(page);let submitted:Record<string,unknown>|undefined;let rows:unknown[]=[];
 await page.route('**/api/workspace/maintenance',route=>{if(route.request().method()==='POST'){submitted=route.request().postDataJSON();rows=[subscription];return route.fulfill({json:{id:'sub-a',projectId:'pa',revision:1}});}return route.fulfill({json:{data:rows,canManage:true}});});
 await page.goto('/profil?tab=client-maintenance');await expect(page.getByRole('heading',{name:'Mentenanță Clienți',exact:true})).toBeVisible();await page.getByRole('button',{name:'Mentenanță nouă'}).click();
 const dialog=page.getByRole('dialog');await dialog.getByRole('combobox',{name:'Proiect asociat',exact:true}).click();await page.getByRole('option',{name:/Proiect A demonstrativ/}).click();await dialog.getByRole('combobox',{name:'Plan din catalog',exact:true}).click();await page.getByRole('option',{name:/Mentenanță Plus/}).click();await expect(dialog.getByLabel('Tarif lunar RON')).toHaveValue('125.5');await dialog.getByRole('checkbox',{name:'Daria · demo'}).check();await dialog.getByRole('button',{name:'Verifică abonamentul'}).click();await expect(dialog.getByRole('button',{name:'Confirmă și salvează abonamentul'})).toBeDisabled();await expect(dialog.getByText('2 ore/lună',{exact:true})).toBeVisible();await dialog.getByRole('checkbox').check();await dialog.getByRole('button',{name:'Confirmă și salvează abonamentul'}).click();await expect(page.getByRole('heading',{name:'Mentenanță Plus',exact:true})).toBeVisible();expect(submitted).toMatchObject({projectId:'pa',planSku:'plan-fixture',priceMinor:12550,staffIds:['staff'],specifications:{'Ore incluse':'2 ore/lună','Backup':'Conform acordului aprobat'}});await page.screenshot({path:testInfo.outputPath('avy-core-saved.png'),fullPage:true});
});
test('un client vede mentenanța autorizată și nu poate configura planuri sau personal',async({page})=>{
 await setup(page,true);await page.goto('/profil?tab=maintenance');await expect(page.getByRole('heading',{name:'Mentenanță Plus',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Mentenanță nouă'})).toHaveCount(0);await expect(page.getByRole('button',{name:'Editează abonamentul'})).toHaveCount(0);await expect(page.getByRole('button',{name:'Sistem AVYRON'})).toHaveCount(0);await page.getByText('Plan și specificații',{exact:false}).click();await expect(page.getByText('2 ore/lună',{exact:true})).toBeVisible();await expect(page.getByText('Daria · demo',{exact:true})).toBeVisible();
});
test('etapele se închid independent, iar lista păstrează aceleași proiecte',async({page})=>{
 await setup(page);await page.goto('/profil?tab=projects');const pipeline=page.getByLabel('Pipeline proiecte');await expect(pipeline).toBeVisible();const category=pipeline.locator('details[aria-label="În dezvoltare"]');await expect(category.getByRole('link',{name:'Deschide proiectul',exact:true})).toBeVisible();await category.locator('summary').click();await expect(category.getByRole('link',{name:'Deschide proiectul',exact:true})).not.toBeVisible();await category.locator('summary').click();await expect(category.getByRole('link',{name:'Deschide proiectul',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Listă',exact:true}).click();const listed=page.getByLabel('Lista proiectelor');await expect(listed.getByRole('link',{name:'Deschide proiectul',exact:true})).toBeVisible();await expect(listed.locator('details')).toHaveCount(0);
 const menu=page.getByRole('button',{name:'Deschide toate secțiunile',exact:true});if(await menu.isVisible())await menu.click();await expect(page.getByRole('button',{name:'Fluxuri și pipeline'})).toHaveCount(0);await expect(page.getByRole('button',{name:'AVY Core',exact:true})).toBeVisible();
});
for(const width of [320,390])test(`Manager Social și AVY Core încap la ${width}px`,async({page},testInfo)=>{
 await setup(page);await page.setViewportSize({width,height:844});await page.goto('/profil?tab=client-maintenance');await expect(page.getByRole('heading',{name:'Mentenanță Clienți',exact:true})).toBeVisible();await page.getByRole('button',{name:'Mentenanță nouă'}).click();await expect(page.getByRole('dialog')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1)).toBe(true);await page.screenshot({path:testInfo.outputPath(`avy-core-${width}.png`)});await page.getByRole('dialog').getByRole('button',{name:'Close',exact:true}).click();await page.goto('/profil?tab=social-manager');await expect(page.getByRole('heading',{name:'Manager Social Media',exact:true})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1)).toBe(true);
});

test('respingerea unui material este confirmată și actualizează lista',async({page})=>{
 await setup(page);let rejected=false;let decision:unknown;
 const item={id:'reject-item',format:'post',objective:'visibility',channels_json:'["facebook"]',title:'Material pentru respingere',caption:'Text sintetic de revizuit.',visual_direction:'',cta:'',hashtags_json:'[]',status:'pending_approval',expires_at:stamp+86400000,created_at:stamp,updated_at:25};
 await page.route('**/api/ai-projects/avyron-web/social-manager*',route=>route.fulfill({json:{project:{id:'ai-web',slug:'avyron-web',name:'AVYRON WEB',automation_mode:'approval'},permission:{canReview:true,canCreate:true},counts:{draft:0,pending_approval:rejected?0:1,approved:0},content:rejected?[]:[item],total:rejected?0:1,nextOffset:null,activities:[],scheduled:[],generatedAt:stamp}}));
 await page.route('**/api/ai-projects/ai-web/content/reject-item',route=>{decision=route.request().postDataJSON();rejected=true;return route.fulfill({json:{ok:true}});});
 await page.goto('/profil?tab=social-manager');await page.getByRole('button',{name:'Respinge',exact:true}).click();const dialog=page.getByRole('dialog');await expect(dialog.getByRole('button',{name:'Confirmă respingerea'})).toBeDisabled();await dialog.getByRole('checkbox').check();await dialog.getByRole('button',{name:'Confirmă respingerea'}).click();await expect(page.getByText('Nu există materiale pentru starea selectată.')).toBeVisible();expect(decision).toEqual({status:'rejected',expectedUpdatedAt:25});
});

for (const [stage,label,banner,status] of [['proposed','Propus','proposed','lead'],['in_progress','În dezvoltare','in_progress','in_progress'],['testing','Testare','testing','in_progress'],['completed','Finalizat','online','live']]) test(`creează proiect fără client direct în etapa ${label}`,async({page},testInfo)=>{
 await setup(page);let submitted:Record<string,unknown>|undefined;let created=false;
 await page.route('**/api/projects',route=>{
  if(route.request().method()==='POST'){submitted=route.request().postDataJSON();created=true;expect(route.request().headers()['idempotency-key']).toBeTruthy();return route.fulfill({status:201,json:{id:'new-project',slug:'proiect-generat'}});}
  return route.fulfill({json:{data:created?[{...project,id:'new-project',name:'Proiect generat',slug:'proiect-generat',banner_status:banner,status}]:[]}});
 });
 await page.goto('/profil?tab=projects');await page.getByRole('button',{name:'Creează proiect',exact:true}).click();const dialog=page.getByRole('dialog',{name:'Proiect nou'});
 await expect(dialog.getByText(/slug/i)).toHaveCount(0);await dialog.getByLabel('Nume *',{exact:true}).fill('Proiect generat');await dialog.getByLabel('Etapă',{exact:true}).click();await page.getByRole('option',{name:label,exact:true}).click();await expect(dialog.getByLabel('Client',{exact:true})).toContainText('Fără client încă');
 await dialog.getByRole('button',{name:'Creează',exact:true}).click();await expect(dialog).not.toBeVisible();expect(submitted).toMatchObject({name:'Proiect generat',stage,client_id:null});expect(submitted).not.toHaveProperty('slug');
 await expect(page.getByLabel('Pipeline proiecte').locator(`details[aria-label="${label}"]`).getByRole('link',{name:/Proiect generat/})).toBeVisible();
 if(stage==='proposed')await page.screenshot({path:testInfo.outputPath('projects-four-stages.png'),fullPage:true});
});
test('client nou în mini-dash reutilizează CRM și se selectează în proiect',async({page})=>{
 await setup(page);let identity:Record<string,unknown>|undefined;let projectBody:Record<string,unknown>|undefined;
 await page.route('**/api/admin/operations/clients',route=>{identity=route.request().postDataJSON();return route.fulfill({json:{ok:true,id:'new-client',accountId:null}});});
 await page.route('**/api/projects',route=>{if(route.request().method()==='POST'){projectBody=route.request().postDataJSON();return route.fulfill({status:201,json:{id:'p-new',slug:'auto-generated'}});}return route.fulfill({json:{data:[]}});});
 await page.goto('/profil?tab=projects');await page.getByRole('button',{name:'Creează proiect',exact:true}).click();const dialog=page.getByRole('dialog',{name:'Proiect nou'});await dialog.getByLabel('Nume *',{exact:true}).fill('Proiect client nou');await dialog.getByLabel('Client',{exact:true}).click();await page.getByRole('option',{name:'+ Client nou',exact:true}).click();const mini=page.getByRole('dialog',{name:'Client nou',exact:true});await mini.getByLabel('Nume / denumire *').fill('Beneficiar nou');await mini.getByLabel('E-mail *').fill('new@example.test');await mini.getByLabel('Tip client').selectOption('PF');await mini.getByRole('button',{name:'Salvează și selectează clientul'}).click();await expect(mini).not.toBeVisible();await expect(dialog.getByLabel('Client',{exact:true})).toContainText('Beneficiar nou');expect(identity).toMatchObject({identity:{companyName:'Beneficiar nou',email:'new@example.test',entityType:'PF'},account:{mode:'none'}});await dialog.getByRole('button',{name:'Creează',exact:true}).click();await expect.poll(()=>projectBody).toMatchObject({client_id:'new-client',stage:'proposed'});
});
test('activitățile viitoare pot fi aprobate și respinse cu confirmare, apoi sincronizate',async({page},testInfo)=>{
 await setup(page);let state='pending',status='queued',revision=17;const calls:string[]=[];
 await page.route('**/api/ai-projects/avyron-web/social-manager*',route=>route.fulfill({json:{project:{id:'ai-web',slug:'avyron-web',name:'AVYRON WEB',automation_mode:'approval'},permission:{canReview:true,canCreate:true,canPlan:true},counts:{},content:[],activityContent:[],total:0,nextOffset:null,activities:[{id:'future-plan',kind:'daily_post',topic:'Temă viitoare verificabilă',primary_channel:'facebook',status,due_at:stamp+86400000,updated_at:revision,plan_review_state:state,content_id:null,blog_post_id:null}],scheduled:[],generatedAt:stamp}}));
 await page.route('**/api/ai-projects/ai-web/social-jobs/future-plan/review',route=>{const body=route.request().postDataJSON();expect(body).toMatchObject({expectedUpdatedAt:revision,confirmed:true});state=body.decision;status=state==='rejected'?'skipped':'queued';revision++;calls.push(state);return route.fulfill({json:{ok:true}});});
 await page.route('**/api/ai-projects/ai-web/social-manager/sync',route=>{calls.push('sync');return route.fulfill({json:{ok:true,updated:0}});});
 await page.route('**/api/ai-projects/ai-web/social-studio/plan',route=>{calls.push('plan');return route.fulfill({json:{ok:true,created:0}});});
 await page.goto('/profil?tab=social-manager');await page.getByRole('button',{name:/Activități viitoare/}).click();await page.getByRole('button',{name:'Aprobă planul',exact:true}).click();let dialog=page.getByRole('dialog');await expect(dialog.getByRole('button',{name:'Confirmă comanda'})).toBeDisabled();await dialog.getByRole('checkbox').check();await dialog.getByRole('button',{name:'Confirmă comanda'}).click();await expect(page.getByRole('dialog',{name:'Activități viitoare și în lucru'}).getByText('Plan aprobat · materialul necesită decizie separată.')).toBeVisible();await page.screenshot({path:testInfo.outputPath('social-plan-actions.png')});
 await page.getByRole('button',{name:'Respinge planul',exact:true}).click();dialog=page.getByRole('dialog');await dialog.getByRole('checkbox').check();await dialog.getByRole('button',{name:'Confirmă comanda'}).click();await expect(page.getByRole('button',{name:'Aprobă planul',exact:true})).toHaveCount(0);
 for(const name of ['Sincronizează stările','Actualizează planul']){await page.getByRole('button',{name,exact:true}).click();dialog=page.getByRole('dialog');await dialog.getByRole('checkbox').check();await dialog.getByRole('button',{name:'Confirmă comanda'}).click();await expect(page.getByRole('dialog',{name:'Activități viitoare și în lucru'})).toBeVisible();}
 expect(calls).toEqual(['approved','rejected','sync','plan']);
});
test('materialul unei activități se aprobă chiar când filtrul principal este gol',async({page})=>{
 await setup(page);let submitted:unknown;
 const material={id:'linked',title:'Material legat de activitate',caption:'Conținutul complet de verificat.',format:'post',objective:'visibility',status:'pending_approval',channels_json:'["instagram"]',hashtags_json:'[]',created_at:stamp,updated_at:51};
 await page.route('**/api/ai-projects/avyron-web/social-manager*',route=>route.fulfill({json:{project:{id:'ai-web',slug:'avyron-web',name:'AVYRON WEB'},permission:{canReview:true,canCreate:true},counts:{},content:[],activityContent:[material],total:0,nextOffset:null,activities:[{id:'linked-job',topic:'Activitate cu material',primary_channel:'instagram',status:'awaiting_approval',content_id:'linked',due_at:stamp+86400000}],scheduled:[]}}));
 await page.route('**/api/ai-projects/ai-web/content/linked',route=>{submitted=route.request().postDataJSON();return route.fulfill({json:{ok:true}});});
 await page.goto('/profil?tab=social-manager');await page.getByRole('button',{name:/Activități viitoare/}).click();await page.getByRole('button',{name:'Aprobă materialul',exact:true}).click();const dialog=page.getByRole('dialog',{name:material.title});await expect(dialog.getByText(material.caption)).toBeVisible();await dialog.getByRole('checkbox').check();await dialog.getByRole('button',{name:'Confirmă aprobarea'}).click();await expect.poll(()=>submitted).toEqual({status:'approved',expectedUpdatedAt:51});
});
test('AVY Core rămâne separat de activitățile recurente în navigare',async({page},testInfo)=>{
 await setup(page);await page.goto('/profil?tab=client-maintenance');await expect(page.getByRole('heading',{name:'Mentenanță Clienți',exact:true})).toBeVisible();const menu=page.getByRole('button',{name:'Deschide toate secțiunile',exact:true});if(await menu.isVisible())await menu.click();const nav=page.getByRole('navigation',{name:/^(Navigare|Toate secțiunile) AVYRON OS$/});await expect(nav.getByText('Activități Recurente',{exact:true})).toBeVisible();for(const name of ['Mentenanță Clienți','Abonamente Clienți','Abonamente AVYRON'])await expect(nav.getByRole('button',{name,exact:true})).toBeVisible();await nav.getByRole('button',{name:'AVY Core',exact:true}).click();await expect(page.getByRole('heading',{name:'AVY Core',exact:true})).toBeVisible();await expect(page.getByRole('heading',{name:'Diagnostice sistem',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Mentenanță nouă'})).toHaveCount(0);await page.screenshot({path:testInfo.outputPath('core-system-separated.png'),fullPage:true});
});
for(const width of [320,390])test(`proiectul și mini-dashul de client sunt accesibile la ${width}px`,async({page},testInfo)=>{
 await setup(page);await page.setViewportSize({width,height:844});await page.goto('/profil?tab=projects');await page.getByRole('button',{name:'Creează proiect',exact:true}).click();const projectDialog=page.getByRole('dialog',{name:'Proiect nou'});await projectDialog.getByLabel('Client',{exact:true}).click();await page.getByRole('option',{name:'+ Client nou',exact:true}).click();const mini=page.getByRole('dialog',{name:'Client nou',exact:true});await expect(mini.getByLabel('Nume / denumire *')).toBeVisible();await expect(mini.getByRole('button',{name:'Salvează și selectează clientul'})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1)).toBe(true);await page.screenshot({path:testInfo.outputPath(`project-new-client-${width}.png`),animations:'disabled'});
});
test('crearea cu un client existent păstrează ciorna după eroare și reutilizează cheia la retry',async({page})=>{
 await setup(page);let attempts=0;const keys:string[]=[];
 await page.route('**/api/clients',route=>route.fulfill({json:{data:[{id:'existing',company_name:'Beneficiar existent',email:'existing@example.test',contact_name:null,status:'active'}]}}));
 await page.route('**/api/projects',route=>{if(route.request().method()==='POST'){attempts++;const body=route.request().postDataJSON();expect(body.client_id).toBe('existing');expect(body.owner_user_id).toBeUndefined();keys.push(route.request().headers()['idempotency-key']);return attempts===1?route.fulfill({status:503,json:{error:{code:'temporarily_unavailable',message:'Serviciul nu este disponibil temporar.'}}}):route.fulfill({status:201,json:{id:'created',slug:'auto-generated'}});}return route.fulfill({json:{data:[]}});});
 await page.goto('/profil?tab=projects');await page.getByRole('button',{name:'Creează proiect',exact:true}).click();const dialog=page.getByRole('dialog',{name:'Proiect nou'});await dialog.getByLabel('Nume *',{exact:true}).fill('Ciornă recuperabilă');await dialog.getByLabel('Client',{exact:true}).click();await page.getByRole('option',{name:/Beneficiar existent/}).click();await dialog.getByRole('button',{name:'Creează',exact:true}).click();await expect(page.getByText('Serviciul nu este disponibil temporar.',{exact:false})).toBeVisible();await expect(dialog.getByLabel('Nume *',{exact:true})).toHaveValue('Ciornă recuperabilă');await dialog.getByRole('button',{name:'Creează',exact:true}).click();await expect(dialog).not.toBeVisible();expect(attempts).toBe(2);expect(keys[0]).toBe(keys[1]);
});

for (const width of [320, 1440])
  test(`mentenanța permite client nou, căutare și plan anual la ${width}px`, async ({
    page,
  }, info) => {
    await setup(page);
    await page.setViewportSize({ width, height: 900 });
    let client: unknown, maintenance: Record<string, unknown> | undefined;
    await page.route("**/api/workspace/maintenance/config", (route) =>
      route.fulfill({
        json: {
          ...configuration,
          services: [
            {
              key: "premium-website",
              name: "Site Prezentare Profesional",
              category: "Website",
            },
          ],
          plans: [
            ...configuration.plans,
            {
              sku: "pro",
              name: "AVY Studio Pro",
              category: "AVY Studio",
              priceMinor: 90000,
              billingCycle: "yearly",
              specifications: { Acces: "Plan anual" },
            },
          ],
        },
      }),
    );
    await page.route("**/api/admin/operations/clients", (route) => {
      client = route.request().postDataJSON();
      return route.fulfill({ status: 201, json: { id: "new-client" } });
    });
    await page.route("**/api/workspace/maintenance", (route) => {
      if (route.request().method() === "POST") {
        maintenance = route.request().postDataJSON();
        return route.fulfill({
          json: { id: "created-maintenance", projectId: "pa", revision: 1 },
        });
      }
      return route.fulfill({ json: { data: [], canManage: true } });
    });
    await page.goto("/profil?tab=client-maintenance");
    await page
      .getByRole("button", { name: "Mentenanță nouă", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Client nou și proiect de mentenanță" })
      .click();
    const clientDialog = page.getByRole("dialog", {
      name: "Client nou pentru mentenanță",
    });
    await clientDialog
      .getByRole("textbox", { name: "Nume client nou" })
      .fill("Client nou sintetic");
    await clientDialog
      .getByRole("textbox", { name: "E-mail client nou" })
      .fill("nou@example.test");
    await clientDialog
      .getByRole("button", { name: "Creează și selectează clientul" })
      .click();
    await expect(clientDialog).toHaveCount(0);
    expect(client).toMatchObject({ account: { mode: "none" } });
    const dialog = page.getByRole("dialog", { name: "Mentenanță nouă" });
    await dialog.evaluate(el=>{(el as HTMLElement).style.scrollbarGutter='stable';});
    await dialog
      .getByLabel("Denumire proiect / produs pentru mentenanță")
      .fill("Proiect viitor");
    await dialog.getByRole("combobox", { name: "Serviciu mentenanță" }).click();
    await page
      .getByRole("combobox", { name: "Caută · Serviciu mentenanță" })
      .fill("Site Prezentare");
    await page
      .getByRole("option", { name: "Site Prezentare Profesional" })
      .click();
    await dialog
      .getByRole("combobox", { name: "Plan din catalog", exact: true })
      .click();
    await page.getByRole("option", { name: /AVY Studio Pro/ }).click();
    await expect(dialog.getByLabel("Tarif anual RON")).toHaveValue("900");
    await expect(
      dialog.getByRole("combobox", { name: "Periodicitate mentenanță" }),
    ).toBeDisabled();
    await page.screenshot({
      path: info.outputPath(`maintenance-new-${width}.png`),
    });
    expect(
      await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
    ).toBe(true);
    await dialog.getByRole("button", { name: "Verifică abonamentul" }).click();
    await dialog.getByRole("checkbox").check();
    await dialog
      .getByRole("button", { name: "Confirmă și salvează abonamentul" })
      .click();
    await expect.poll(() => maintenance?.billingCycle).toBe("yearly");
    expect(maintenance).toMatchObject({
      serviceKey: "premium-website",
      planSku: "pro",
      externalProject: { clientId: "new-client", name: "Proiect viitor" },
    });
  });
