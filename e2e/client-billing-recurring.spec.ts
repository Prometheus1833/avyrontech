import { test,expect,type Page } from '@playwright/test';
import { createRequire } from 'node:module';
const due=Date.now()+7*86400000;
const native={id:'maintenance-1',source:'native',name:'Mentenanță website',status:'active',amountMinor:5000,currency:'RON',period:'monthly',startsAt:Date.UTC(2026,10,1),nextBillingAt:due,project:{id:'website-a',slug:'website-a',name:'Website Client',url:'https://example.test/'},billingId:null,paymentStatus:null,cancelAtPeriodEnd:false,canManage:false,checkoutReady:true,unavailableReason:null,revision:2,quoteHash:'a'.repeat(64),beneficiary:'Client Exemplu SRL'};
async function fixture(page:Page){
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.addInitScript(()=>localStorage.setItem('avyron-cookie-consent-v2',JSON.stringify({necessary:true,analytics:false,marketing:false,savedAt:new Date().toISOString(),policyVersion:'2026-09-12'})));
 const actions:Array<{path:string;body:unknown}>=[];let stopped=false;
 await page.route('**/api/**',route=>{
  const req=route.request(),path=new URL(req.url()).pathname;
  if(req.method()==='POST'&&path.startsWith('/api/billing/'))actions.push({path,body:req.postData()?req.postDataJSON():null});
  if(path==='/api/auth/refresh')return route.fulfill({json:{access_token:'synthetic-client',expires_in:900}});
  if(path==='/api/auth/me')return route.fulfill({json:{user:{id:'client',email:'client@example.test',email_verified:1},profile:{display_name:'Client Exemplu',language:'ro'},roles:['user'],capabilities:[],superadmin:false}});
  if(path==='/api/billing/account')return route.fulfill({json:{profile:null,methods:[{id:'card-1',provider:'stripe',type:'card',brand:'visa',last4:'4242',expiry_month:12,expiry_year:2030,is_default:1}],subscriptions:[],invoices:[],revolutPlans:[],providers:{stripe:{enabled:true},revolut:{enabled:false},oblio:{enabled:false},netopia:{enabled:false}}}});
  if(path==='/api/billing/payment-methods')return route.fulfill({json:{methods:[{id:'card-1',provider:'stripe',type:'card',brand:'visa',last4:'4242',expiry_month:12,expiry_year:2030,is_default:1}],refreshed:{stripe:true,revolut:false},hasCustomer:{stripe:true,revolut:false},setupStatus:'completed'}});
  if(path==='/api/billing/recurring')return route.fulfill({json:{data:[native,{...native,id:'partner',source:'provider',name:'AVY Partener',project:null,billingId:'billing-partner',paymentStatus:'active',checkoutReady:false,canManage:true,cancelAtPeriodEnd:stopped},{...native,id:'annual-license',source:'license',name:'AVY Partener — acces anual',amountMinor:27000,period:'annual',project:null,nextBillingAt:null,accessEndsAt:due,billingId:null,checkoutReady:false,canManage:false}]}});
  if(path==='/api/billing/recurring/maintenance-1/checkout')return route.fulfill({json:{url:'https://checkout.stripe.com/c/pay/synthetic-recurring'}});
  if(path==='/api/billing/subscriptions/billing-partner/cancel'){stopped=true;return route.fulfill({json:{ok:true}})}
  if(path==='/api/commerce/orders')return route.fulfill({json:{data:[{id:'pending',items_json:JSON.stringify([{sku:'PROD-COMP',name:'Componentă digitală',quantity:2,unitPriceCents:3500}]),total_cents:7000,currency:'RON',status:'requested',requires_manual_quote:0,created_at:Date.UTC(2026,10,1)}]}});
  if(path==='/api/workspace/payments')return route.fulfill({json:{data:[{id:'paid',title:'Website achitat',amount_minor:150000,currency:'RON',paid_at:Date.UTC(2026,10,1),date_kind:'payment',invoice_id:null,order_id:null,provider:'stripe',download_available:0}],nextOffset:null}});
  return route.fulfill({json:{data:[],total:0}});
 });
 await page.route('https://checkout.stripe.com/c/pay/synthetic-recurring',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><html lang="ro"><h1>Autorizare Stripe sintetică</h1></html>'}));
 return {actions};
}
for(const width of [320,390,1440])test(`payments page stays compact and ordered at ${width}px`,async({page},info)=>{
 await fixture(page);await page.setViewportSize({width,height:950});await page.goto('/profil?tab=payments');
 await expect(page.getByText('Visa •••• 4242',{exact:true})).toBeVisible();await expect(page.getByRole('heading',{name:'Mentenanță website',exact:true})).toBeVisible();await expect(page.getByRole('heading',{name:'Componentă digitală × 2',exact:true})).toBeVisible();await expect(page.getByRole('region',{name:'Comenzi în așteptare',exact:true})).toContainText('70,00');
 const positions=await Promise.all(['Cardul tău pentru plăți','Comenzi în așteptare','Mentenanță / Abonamente','Istoricul plăților'].map(async name=>(await page.getByRole('heading',{name,exact:true}).boundingBox())!.y));expect(positions.every((y,i)=>!i||y>positions[i-1])).toBe(true);
 await expect(page.getByRole('region',{name:'Mentenanță și abonamente pentru plată'})).toContainText('50,00');await expect(page.getByRole('link',{name:'Website Client',exact:true})).toHaveAttribute('href','/intern/projects/website-a');await expect(page.getByText(/Acces până la:/)).toBeVisible();
 const summary=page.locator('summary').filter({hasText:'Datele de facturare'});expect((await summary.boundingBox())!.height).toBe(44);await summary.click();await expect(page.getByRole('button',{name:'Salvează datele de facturare',exact:true})).toBeVisible();await summary.click();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await expect(page.locator('input[autocomplete="cc-number"],input[autocomplete="cc-csc"]')).toHaveCount(0);
 await page.screenshot({path:info.outputPath(`payments-${width}.png`),fullPage:true});
 if(width===390&&info.project.name==='chromium')await page.screenshot({path:'/tmp/avyron-client-billing-mobile.png',fullPage:true});
});
test('a recurring debit requires the displayed quote and an explicit confirmation',async({page})=>{
 const state=await fixture(page);await page.goto('/profil?tab=payments');await page.getByRole('button',{name:'Activează debitarea',exact:true}).click();const dialog=page.getByRole('dialog');await expect(dialog).toContainText('Client Exemplu SRL');const confirm=dialog.getByRole('button',{name:'Continuă securizat la Stripe',exact:true});await expect(confirm).toBeDisabled();expect(state.actions.some(a=>a.path.includes('/checkout'))).toBe(false);await dialog.getByRole('checkbox').check();await confirm.click();await expect(page).toHaveURL('https://checkout.stripe.com/c/pay/synthetic-recurring');expect(state.actions.find(a=>a.path==='/api/billing/recurring/maintenance-1/checkout')?.body).toEqual({revision:2,quoteHash:'a'.repeat(64),confirmed:true});
});
test('stopping renewal requires confirmation and refreshes the actual state',async({page})=>{
 const state=await fixture(page);await page.goto('/profil?tab=payments');await page.getByRole('button',{name:'Oprește reînnoirea',exact:true}).click();expect(state.actions).toHaveLength(0);await page.getByRole('dialog').getByRole('button',{name:'Confirmă oprirea reînnoirii',exact:true}).click();await expect(page.getByRole('region',{name:'Mentenanță și abonamente pentru plată',exact:true}).getByText(/Reînnoire oprită/)).toBeVisible();expect(state.actions.filter(a=>a.path.endsWith('/cancel'))).toHaveLength(1);
});
test('a failed subscription lookup is recoverable and does not hide payment history',async({page})=>{
 await fixture(page);let fail=true;await page.route('**/api/billing/recurring',r=>fail?r.fulfill({status:503,json:{error:{code:'temporary'}}}):r.fulfill({json:{data:[native]}}));await page.goto('/profil?tab=payments');const section=page.getByRole('region',{name:'Mentenanță și abonamente pentru plată',exact:true});await expect(section.getByRole('alert')).toBeVisible();await expect(page.getByRole('heading',{name:'Website achitat',exact:true})).toBeVisible();fail=false;await section.getByRole('button',{name:'Reîncearcă',exact:true}).click();await expect(section.getByRole('heading',{name:'Mentenanță website',exact:true})).toBeVisible();
});
test('billing interactions have accessible labels and keyboard focus',async({page})=>{
 await fixture(page);await page.setViewportSize({width:390,height:950});await page.goto('/profil?tab=payments');await expect(page.getByText('Visa •••• 4242',{exact:true})).toBeVisible();await page.addScriptTag({path:createRequire(import.meta.url).resolve('axe-core/axe.min.js')});const violations=await page.evaluate(async()=>{const axe=(window as unknown as {axe:{run:(selector:string,options:object)=>Promise<{violations:Array<{id:string;impact:string}>}>}}).axe;return(await axe.run('section[aria-label="Plăți/Istoric"]',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations});expect(violations).toEqual([]);const button=page.getByRole('button',{name:'Activează debitarea',exact:true});await button.focus();await page.keyboard.press('Enter');await expect(page.getByRole('dialog')).toBeVisible();await page.keyboard.press('Escape');await expect(button).toBeFocused();
});
