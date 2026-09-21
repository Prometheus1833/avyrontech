import {test,expect,type Page} from '@playwright/test';
import {seedTemplates} from '../src/shared/surveys/templates';
const token='a'.repeat(64),template=seedTemplates[0].template;
async function setup(page:Page){
 await page.route('**/api/auth/refresh',r=>r.fulfill({status:401,json:{error:{code:'unauthorized'}}}));
 await page.route('https://challenges.cloudflare.com/**',r=>r.fulfill({contentType:'text/javascript',body:'window.turnstile={render:(el,options)=>{options.callback("test-captcha");return "widget"},remove:()=>{},reset:()=>{}};'}));
 await page.addInitScript(()=>localStorage.setItem('avyron-cookie-consent-v2',JSON.stringify({necessary:true,analytics:false,marketing:false,savedAt:new Date().toISOString(),policyVersion:'2026-09-12'})));
 await page.route('**/api/surveys/templates*',r=>r.fulfill({json:{data:seedTemplates.map(({id,template})=>({id,title:template.title,service:template.service,description:template.description}))}}));
}
for(const width of [390,1440]){
 test(`survey landing contacts and mobile layout ${width}`,async({page},info)=>{await setup(page);await page.setViewportSize({width,height:900});await page.goto('/surveys');await expect(page.getByRole('heading',{name:'Ideile tale. Un început clar.'})).toBeVisible();await expect(page.getByRole('button',{name:'Începe brief-ul'})).toBeEnabled();await expect(page.locator('a[href="tel:+40734605055"]').first()).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await page.screenshot({path:info.outputPath(`landing-${width}.png`),fullPage:true});});
 test(`survey autosave resume branching and submit ${width}`,async({page},info)=>{
  await setup(page);await page.setViewportSize({width,height:900});let answers:Record<string,unknown>={},revision=1,submitted=false;
  await page.route('**/api/surveys/events',r=>r.fulfill({json:{ok:true}}));
  await page.route('**/api/surveys/session',r=>{if(r.request().method()==='PATCH'){const body=r.request().postDataJSON();expect(body.revision).toBe(revision);answers={...answers,...body.patch};revision++;return r.fulfill({json:{answers,revision}});}return r.fulfill({json:{survey:{id:'fixture',title:'Website Discovery',status:submitted?'completed':'in_progress',completion:submitted?75:0,followup:[]},template,answers,context:{},revision,files:[]}});});
  await page.route('**/api/surveys/submit',r=>{submitted=true;return r.fulfill({json:{ok:true,completion:75}});});
  await page.goto(`/s/${token}`);await page.getByRole('button',{name:'Continuă',exact:true}).click();await expect(page.getByText('Completează acest răspuns.',{exact:true})).toBeVisible();
  await page.getByLabel(template.questions[0].label,{exact:true}).fill('Atelier Exemplu');await expect.poll(()=>answers.business).toBe('Atelier Exemplu');await page.reload();await expect(page.getByLabel(template.questions[0].label,{exact:true})).toHaveValue('Atelier Exemplu');
  await page.getByRole('button',{name:'Vezi toate răspunsurile'}).click();
  for(const [id,value]of Object.entries({activity:'Servicii profesionale',page_topics:'Acasă și Servicii',name:'Client Exemplu',email:'client@example.test'})){const q=template.questions.find(q=>q.id===id)!;const d=page.locator('details').filter({has:page.locator('summary span',{hasText:q.label})});await d.locator('summary').click();await page.getByLabel(q.label,{exact:true}).fill(value);}
  const objectives=template.questions.find(q=>q.id==='objectives')!;await page.locator('details').filter({has:page.locator('summary span',{hasText:objectives.label})}).locator('summary').click();await page.getByRole('checkbox',{name:'Prezentare profesională',exact:true}).click();
  const privacy=template.questions.find(q=>q.id==='privacy')!;await page.locator('details').filter({has:page.locator('summary span',{hasText:privacy.label})}).locator('summary').click();await page.getByRole('checkbox',{name:privacy.label,exact:false}).check();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await page.screenshot({path:info.outputPath(`review-${width}.png`),fullPage:true});await page.getByRole('button',{name:'Trimite brief-ul'}).click();await expect(page.getByRole('heading',{name:'Brief primit.'})).toBeVisible();expect(submitted).toBe(true);await expect(page.locator('meta[name=robots]')).toHaveAttribute('content','noindex, nofollow');
 });
}
