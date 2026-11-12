import {test,expect,type Page} from '@playwright/test';
import {staffFixture} from './staff-fixtures';
const stamp=Date.now();
const priorities=[
 {id:'leaduri-necontactate',kind:'lead',severity:'critic',title:'Leaduri care necesită răspuns',detail:'Două solicitări autorizate.',destination:'leads'},
 {id:'termene-proiecte',kind:'proiect',severity:'critic',title:'Termene apropiate',detail:'Activități în următoarele 48h.',destination:'projects'},
 {id:'alerte-financiare',kind:'financiar',severity:'atenție',title:'Alerte financiare active',detail:'Bugete în verificare.',destination:'finance'},
 {id:'tichete-deschise',kind:'suport',severity:'atenție',title:'Solicitări de suport',detail:'Răspunsuri în așteptare.',destination:'staff-tickets'},
 {id:'securitate',kind:'securitate',severity:'atenție',title:'Evenimente de securitate',detail:'Verificări recente.',destination:'security'},
];
async function setup(page:Page){
 await staffFixture(page);let pending=true,alertStatus='open';
 const writes:{path:string;body:Record<string,unknown>;method:string}[]=[];
 const request={id:'material-1',source:'content',title:'Material de analizat',summary:'Proiect sintetic',requestedAt:stamp,revision:23,href:'/intern/ai-projects/demo-ai',canDecide:true,canReject:true,canWithdraw:true,publication:{platforms:['instagram','facebook'],scheduledAt:Date.UTC(2026,10,10,12,30),format:'carousel'}};
 await page.route('**/api/os/overview',r=>r.fulfill({json:{generatedAt:stamp,role:'super_admin',briefing:'Proiecte, aprobări și resurse conectate.',metrics:{projects:2,activeProjects:1,leads:3,openLeads:2,clients:1,visits:0,approvals:1,expensesMinor:0,revenuesMinor:0,criticalAlerts:0},attention:priorities,approvals:[],agents:[{slug:'ai-prod-content',name:'AVY Social · Producție editorială',mission:'Pregătește materialele editoriale pentru aprobare.',last_run_status:'succeeded',last_run_at:stamp}],agentRuns:[{id:'run',agent_slug:'ai-prod-content',agent_name:'AVY Social · Producție editorială',status:'succeeded',steps:2,created_at:stamp}],health:[{id:'files',label:'Documente R2',status:'funcțional',detail:'Citire R2 verificată. Scrierea nu a fost testată.',checkedAt:stamp},{id:'media',label:'Media R2',status:'eroare',detail:'Citirea a fost refuzată. Verifică autorizarea.',code:'access_denied'},{id:'ai',label:'Workers AI',status:'configurat',detail:'Model Free pregătit; execuție neverificată.'}],integrations:[],leadPipeline:[],activeProjects:[]}}));
 await page.route('**/api/ai-projects',r=>r.fulfill({json:{platformRole:'platform_owner',data:[{id:'ai-a',slug:'demo-ai-a',name:'Proiect AI Alpha',summary:'Materiale pentru Alpha.',status:'active',agents_ready:1,agents_total:2,content_pending:1},{id:'ai-b',slug:'demo-ai-b',name:'Proiect AI Beta',summary:'Materiale pentru Beta.',status:'active',agents_ready:2,agents_total:2,content_pending:0}]}}));
 await page.route('**/api/os/approval-center*',r=>r.fulfill({json:{generatedAt:stamp,data:pending?[request]:[],total:pending?1:0,counts:{agent:0,content:pending?1:0,operation:0,template:0,learning:0,carousel:0},nextCursor:null}}));
 await page.route('**/api/os/approval-center/content/material-1',r=>{if(r.request().method()==='DELETE'){writes.push({path:r.request().url(),body:r.request().postDataJSON(),method:'DELETE'});pending=false;return r.fulfill({json:{ok:true}});}return r.fulfill({json:{...request,contextId:'ai-a',detail:'Textul exact al versiunii 23, cu sursa și CTA verificate.'}});});
 await page.route('**/api/ai-projects/ai-a/content/material-1',r=>{writes.push({path:r.request().url(),body:r.request().postDataJSON(),method:r.request().method()});pending=false;return r.fulfill({json:{ok:true}});});
 await page.route('**/api/os/attention/**',r=>{const key=decodeURIComponent(new URL(r.request().url()).pathname.split('/').at(-1)!);return r.fulfill({json:{data:[{id:key==='alerte-financiare'?'alert-1':'event-1',title:key==='alerte-financiare'?'Verifică bugetul':'Eveniment autorizat',detail:'Detaliul real al elementului selectat.',status:key==='alerte-financiare'?alertStatus:'open',created_at:stamp,href:'/profil?tab=leads&lead=event-1',action:key==='alerte-financiare'?(alertStatus==='open'?'acknowledge':'resolve'):null}],total:1,nextOffset:null}});});
 await page.route('**/api/finance/alerts/alert-1',r=>{const body=r.request().postDataJSON();writes.push({path:r.request().url(),body,method:r.request().method()});alertStatus=body.status;return r.fulfill({json:{ok:true}});});
 await page.route('**/api/os/health/ai',r=>{writes.push({path:r.request().url(),body:r.request().postDataJSON(),method:r.request().method()});return r.fulfill({json:{id:'ai',label:'Workers AI',status:'funcțional',detail:'Execuție Free confirmată, 64 tokenuri maximum.',checkedAt:stamp}});});
 return{writes};
}
test('shows only three priorities then opens all and real event details',async({page})=>{
 await setup(page);await page.goto('/profil?tab=overview');const panel=page.getByRole('region',{name:'Necesită atenție · Azi'});
 await expect(panel.getByRole('button',{name:/Leaduri care/})).toBeVisible();await expect(panel.getByRole('button',{name:/Evenimente de securitate/})).toHaveCount(0);
 await panel.getByRole('button',{name:'Deschide lista · 5 priorități'}).click();const list=page.getByRole('dialog',{name:'Toate prioritățile operaționale'});await expect(list.getByRole('button',{name:/Evenimente de securitate/})).toBeVisible();await list.getByRole('button',{name:/Solicitări de suport/}).click();
 const detail=page.getByRole('dialog',{name:'Solicitări de suport'});await expect(detail.getByText('Detaliul real al elementului selectat.')).toBeVisible();await expect(detail.getByRole('button',{name:'Deschide fișa'})).toBeVisible();await expect(detail.getByRole('button',{name:'Copiază referința'})).toBeVisible();
});
test('selects a specific AI project and displays the registered agent name',async({page})=>{
 await setup(page);await page.goto('/profil?tab=overview');await expect(page.getByRole('heading',{name:'Proiecte AI',exact:true})).toHaveCount(1);await expect(page.getByText('AVY Social · Producție editorială')).toBeVisible();await expect(page.getByText('Pregătește materialele editoriale pentru aprobare.')).toBeVisible();await page.getByLabel('Selectează proiectul AI').selectOption('ai-b');await expect(page.getByText('Materiale pentru Beta.')).toBeVisible();await expect(page.getByRole('link',{name:'Deschide proiectul AI',exact:true})).toHaveAttribute('href','/intern/ai-projects/demo-ai-b');
});
test('approves directly from the row after reviewing the current revision',async({page})=>{
 const {writes}=await setup(page);await page.goto('/profil?tab=overview');await page.getByRole('button',{name:'Aprobă',exact:true}).click();const dialog=page.getByRole('dialog',{name:'Material de analizat'});await expect(dialog.getByText(/Textul exact al versiunii 23/)).toBeVisible();await dialog.getByRole('checkbox').check();await dialog.getByRole('button',{name:'Confirmă aprobarea'}).click();await expect(page.getByText('Nu există solicitări active de aprobat sau revizuit.')).toBeVisible();expect(writes[0].body).toEqual({status:'approved',expectedUpdatedAt:23});
});
test('withdraws a request only after confirmation and sends its exact revision',async({page})=>{
 const {writes}=await setup(page);await page.goto('/profil?tab=overview');await page.getByRole('button',{name:'Șterge',exact:true}).click();const dialog=page.getByRole('dialog',{name:'Material de analizat'});await expect(dialog.getByRole('button',{name:'Șterge solicitarea'})).toBeDisabled();await dialog.getByRole('checkbox').check();await dialog.getByRole('button',{name:'Șterge solicitarea'}).click();await expect(page.getByText('Nu există solicitări active de aprobat sau revizuit.')).toBeVisible();expect(writes[0]).toMatchObject({method:'DELETE',body:{confirmed:true,revision:23}});
});
test('exposes read evidence and runs AI diagnostics only after the explicit Free action',async({page})=>{
 const {writes}=await setup(page);await page.goto('/profil?tab=overview');expect(writes).toHaveLength(0);await page.locator('details').filter({hasText:'Documente R2'}).locator('summary').click();await expect(page.getByText('Citire R2 verificată. Scrierea nu a fost testată.')).toBeVisible();await page.getByRole('button',{name:'Testează AI · Free'}).click();await expect(page.getByText('Execuția AI Free a fost confirmată.')).toBeVisible();expect(writes[0].body).toEqual({confirmed:true});
});
test('financial events require a separate confirmation before updating their alert state',async({page})=>{
 const {writes}=await setup(page);await page.goto('/profil?tab=overview');await page.getByRole('button',{name:/Alerte financiare active Bugete/}).click();const dialog=page.getByRole('dialog',{name:'Alerte financiare active'});await dialog.getByRole('button',{name:'Preia în verificare'}).click();expect(writes).toHaveLength(0);await dialog.getByRole('button',{name:'Confirmă',exact:true}).click();await expect(dialog.getByRole('button',{name:'Rezolvă alerta'})).toBeVisible();expect(writes[0].body).toEqual({status:'acknowledged'});
});
for(const width of [320,390,1440])test(`overview actions fit at ${width}px`,async({page},testInfo)=>{
 await setup(page);await page.setViewportSize({width,height:900});await page.goto('/profil?tab=overview');await expect(page.getByText('AVY Social · Producție editorială')).toBeVisible();await expect(page.getByText('Instagram · Facebook')).toBeVisible();await expect(page.getByText(/Programat:.*14:30/)).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await page.screenshot({path:testInfo.outputPath(`overview-${width}.png`),fullPage:true});await page.getByRole('button',{name:'Șterge',exact:true}).click();const dialog=page.getByRole('dialog',{name:'Material de analizat'});await expect(dialog).toBeVisible();expect(await dialog.evaluate(node=>node.scrollWidth<=node.clientWidth+1)).toBe(true);
});
for(const width of [390,1440,1700])test(`compact approvals expose real scheduling and responsive counts at ${width}px`,async({page})=>{
 await setup(page);await page.setViewportSize({width,height:1000});
 const data=Array.from({length:8},(_,i)=>({id:`content-${i}`,source:'content',title:`Material ${i+1}`,summary:'Proiect AVYRON demonstrativ',requestedAt:stamp,revision:23,href:'/intern/ai-projects/demo-ai',canDecide:true,canReject:true,publication:{platforms:['instagram'],scheduledAt:Date.UTC(2026,10,10,12,30),format:'carousel'}}));
 await page.route('**/api/os/approval-center*',r=>r.fulfill({json:{generatedAt:stamp,data,total:8,counts:{content:8},nextCursor:null}}));
 await page.goto('/profil?tab=overview');const panel=page.locator('section[aria-labelledby="approval-center-title"]');
 await expect(panel.locator('article:visible')).toHaveCount(width<768?4:width<1536?6:8);
 await expect(panel.locator('article').first().getByText(/Programat:.*14:30/)).toBeVisible();
 const size=await panel.locator('article').first().boundingBox();expect(size!.height).toBeLessThan(190);
 const action=await panel.locator('article').first().getByRole('button',{name:'Șterge'}).boundingBox();
 expect(size!.x+size!.width-action!.x-action!.width).toBeLessThan(18);
 if(width>=1440){
   const columns=await panel.locator('article').first().evaluate(row=>{
     const text=row.firstElementChild!.getBoundingClientRect(), actions=row.lastElementChild!.getBoundingClientRect();
     return {textRight:text.right,actionLeft:actions.left,textTop:text.top,textBottom:text.bottom,actionTop:actions.top};
   });
   expect(columns.actionLeft,JSON.stringify(columns)).toBeGreaterThanOrEqual(columns.textRight-1);
   expect(columns.actionTop,JSON.stringify(columns)).toBeLessThan(columns.textBottom);
 }
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});
