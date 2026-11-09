import { readFile } from "node:fs/promises";
import { resolve, extname } from "node:path";
import { test, expect, type BrowserContext } from "@playwright/test";
const simulator = "https://avyron.ro/servicii/creare-logo-3d-dinamic-cinematic/creeaza";

async function fixture(context: BrowserContext, signedIn = true) {
  if (signedIn) await context.addCookies([{ name:"sid",value:"synthetic-client",domain:"api.avyron.ro",path:"/",httpOnly:true,secure:true,sameSite:"Lax" }]);
  const calls: string[] = [], reviews: unknown[] = [], writes: string[] = [];
  let historyFails = false;
  let cart: Record<string,unknown>[] = [];
  await context.addInitScript(() => localStorage.setItem("avyron-cookie-consent-v2",JSON.stringify({necessary:true,analytics:false,marketing:false,savedAt:new Date().toISOString(),policyVersion:"2026-09-12"})));
  await context.route("**/*",async route => {
    const request=route.request(), url=new URL(request.url()), path=url.pathname;
    if(path.startsWith("/api/")) {
      calls.push(url.origin+path);
      const headers:Record<string,string>={"access-control-allow-origin":request.headers().origin||"https://app.avyron.ro","access-control-allow-credentials":"true","access-control-allow-headers":"content-type,authorization,idempotency-key","access-control-allow-methods":"GET,POST,PUT,OPTIONS","cache-control":"private, no-store"};
      const json=(body:unknown,status=200)=>route.fulfill({status,json:body,headers});
      if(request.method()==="OPTIONS")return route.fulfill({status:204,headers});
      if(path==="/api/auth/login") {
        expect(url.hostname).toBe("api.avyron.ro");
        return route.fulfill({json:{access_token:"synthetic-token",expires_in:900,user:{id:"client",roles:["user"]}},headers:{...headers,"set-cookie":"sid=synthetic-client; Path=/; HttpOnly; Secure; SameSite=Lax"}});
      }
      if(path==="/api/auth/refresh")return (signedIn || request.headers().cookie?.includes("sid=synthetic-client"))?json({access_token:"synthetic-token",expires_in:900}):route.fulfill({status:204,headers});
      if(path==="/api/auth/me")return request.headers().authorization?json({user:{id:"client",email:"client@example.test",display_name:"Client test",email_verified:1,must_change_password:0},profile:{display_name:"Client test",language:"ro"},roles:["user"],capabilities:[],superadmin:false}):json({error:{code:"unauthorized"}},401);
      if(path==="/api/logo-studio/product-price")return json({priceMinor:7500,currency:"RON",updatedAt:1});
      if(path==="/api/auth/providers")return json({data:[]});
      if(path==="/api/projects")return json({data:[],purchases:[],sales:[]});
      if(path==="/api/produse/account/purchases") {
        if(historyFails)return json({error:{code:"temporarily_unavailable"}},503);
        return json({data:[{id:"paid-order-123",createdAt:1793952000000,paidAt:1793952100000,items:[{name:"Logo Studio 3D achitat",sku:"product-logo-studio-3d",slug:"logo-studio-3d",quantity:1}]}],nextCursor:null});
      }
      if(path==="/api/produse/account/state")return json({day:"2026-11-06",plan:"free",planExpiresAt:null,limits:{components:{used:0,limit:3},sections:{used:0,limit:3},templates:{used:0,limit:1}},purchases:[],collection:[],recent:[]});
      if(path==="/api/public/reviews"&&request.method()==="POST"){reviews.push(request.postDataJSON());return json({ok:true},201);}
      if(path==="/api/commerce/cart"||path==="/api/commerce/cart/sync") {
        if(request.method()!=="GET")cart=request.postDataJSON().items || [];
        return json({data:cart,updatedAt:1});
      }
      if(path==="/api/commerce/catalog")return json({services:[],subscriptions:[],products:[{key:"logo-studio-3d",sku:"product-logo-studio-3d",name:"Logo Studio 3D",category:"Logo",priceMinor:7500,currency:"RON",payable:true}]});
      if(path==="/api/commerce/quote")return json({quote:{items:[{lineTotalCents:7500,referenceUnitPriceCents:7500,referenceCurrency:"RON",billingMonths:1}],subtotalCents:7500,totalCents:7500,discountCents:0,promotion:null,requiresManualQuote:false}});
      if(!["GET","OPTIONS"].includes(request.method()))writes.push(path);
      return json({data:[],count:0,total:0});
    }
    if(["app.avyron.ro","avyron.ro"].includes(url.hostname)) {
      const mime:Record<string,string>={".js":"application/javascript",".css":"text/css",".html":"text/html",".svg":"image/svg+xml",".webp":"image/webp",".jpg":"image/jpeg",".png":"image/png",".json":"application/json",".woff2":"font/woff2"};
      let file=resolve("dist",`.${path}`);
      if(!extname(path))file=resolve(file,"index.html");
      if(!file.startsWith(resolve("dist")+"/"))return route.abort();
      let body:Buffer;
      try { body=await readFile(file); } catch { body=await readFile("dist/index.html"); file="index.html"; }
      return route.fulfill({body,contentType:mime[extname(file)]||"application/octet-stream"});
    }
    if(url.hostname==="challenges.cloudflare.com")return route.fulfill({contentType:"application/javascript",body:"window.turnstile={render:function(el,o){o.callback('synthetic-turnstile');return 'test-widget'},remove:function(){},reset:function(){}}"});
    return route.abort();
  });
  return {calls,reviews,writes,cart:()=>cart,failHistory:(value:boolean)=>{historyFails=value;}};
}

test("login stays signed in across account, logo, public service and reload without staff controls",async({page,context})=>{
  const data=await fixture(context,false);
  await page.goto("https://app.avyron.ro/auth");
  await page.locator("#li-identifier").fill("client@example.test");
  await page.getByLabel("Parolă",{exact:true}).fill("synthetic-password-for-test");
  await page.getByRole("button",{name:"Conectează-te",exact:true}).click();
  await expect(page.getByRole("heading",{name:"Bună, Client test."})).toBeVisible();
  await page.getByRole("link",{name:/Creează Logo/}).click();
  await expect(page).toHaveURL(simulator);
  await expect(page.getByRole("button",{name:"Profil",exact:true})).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button",{name:"Profil",exact:true})).toBeVisible();
  await page.setViewportSize({width:320,height:700});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:"/tmp/avyron-client-logo-page-320.png",fullPage:true});
  await page.setViewportSize({width:1280,height:900});
  await page.goto("https://avyron.ro/servicii/website-prezentare-profesional");
  // This service has a compact custom header; the review identity proves the
  // session survives navigation without adding controls to the public design.
  await page.getByRole("button",{name:"Lasă o recenzie",exact:true}).click();
  await expect(page.getByLabel("Numele tău")).toHaveValue("Client test");
  await expect(page.getByLabel("Email de contact")).toHaveValue("client@example.test");
  await page.getByRole("button",{name:"5/5",exact:true}).click();
  await page.getByLabel("Recenzia ta",{exact:true}).fill("Am colaborat la un proiect și experiența a fost clară și bine organizată.");
  await page.getByRole("checkbox",{name:/Sunt de acord/}).check();
  await page.getByRole("button",{name:"Trimite recenzia",exact:true}).click();
  await expect(page.getByRole("heading",{name:"Mulțumim pentru recenzie!"})).toBeVisible();
  expect(data.reviews).toHaveLength(1);
  expect(data.calls.filter(path=>path.endsWith("/api/auth/refresh")).every(path=>path.startsWith("https://api.avyron.ro/"))).toBe(true);
  await page.goto("https://app.avyron.ro/profil?tab=finance");
  await expect(page.getByRole("heading",{name:"Bună, Client test."})).toBeVisible();
  await expect(page.locator('[data-os-section="finance"], [data-os-section="maintenance"], [data-os-section="team-staff"]')).toHaveCount(0);
  expect(data.writes.filter(path=>path.startsWith("/api/admin/"))).toEqual([]);
});

for(const width of [320,1440])test(`paid products remain in history and recover from unavailable API at ${width}px`,async({page,context})=>{
  const data=await fixture(context);
  await page.setViewportSize({width,height:width===320?700:960});
  await page.goto("https://app.avyron.ro/profil?tab=overview");
  await expect(page.getByRole("button",{name:/Produsele mele/}).last()).toBeVisible();
  await page.screenshot({path:`/tmp/avyron-client-home-${width}.png`,fullPage:true});
  await page.getByRole("button",{name:/Produsele mele/}).last().click();
  await expect(page.getByRole("heading",{name:"Produse Development Achitate",exact:true})).toBeVisible();
  await expect(page.getByRole("heading",{name:"Logo Studio 3D achitat"})).toBeVisible();
  await expect(page.getByRole("link",{name:"Deschide produsul",exact:true})).toHaveAttribute("href","https://avyron.ro/produse/logo/logo-studio-3d");
  await expect(page.getByRole("link",{name:"Vezi comanda",exact:true})).toHaveAttribute("href",/tab=orders&order=paid-order-123/);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  data.failHistory(true);
  await page.getByRole("button",{name:"Actualizează achizițiile"}).click();
  await expect(page.getByRole("alert").filter({hasText:"Achizițiile nu pot fi încărcate"})).toBeVisible();
  await expect(page.getByRole("heading",{name:"Logo Studio 3D achitat"})).toBeVisible();
  data.failHistory(false);
  await page.getByRole("button",{name:"Reîncearcă",exact:true}).click();
  await expect(page.getByRole("alert").filter({hasText:"Achizițiile nu pot fi încărcate"})).toHaveCount(0);
  await page.screenshot({path:`/tmp/avyron-paid-products-${width}.png`,fullPage:true});
});

test("a signed-in user can add a public product to the same account cart",async({page,context})=>{
  const data=await fixture(context);
  await context.addInitScript(()=>localStorage.setItem("avyron-produse-v1",JSON.stringify({cart:[{kind:"item",slug:"logo-studio-3d"}],favorites:[],recent:[],copied:[]})));
  // Establish the signed-in first-party session before navigating to the public site.
  await page.goto("https://app.avyron.ro/profil?tab=overview");
  await expect(page.getByRole("heading",{name:"Bună, Client test."})).toBeVisible();
  await page.goto("https://avyron.ro/produse/logo/logo-studio-3d");
  await expect(page.getByRole("button",{name:"Adaugă în coș",exact:true})).toBeVisible();
  await page.getByRole("button",{name:"Adaugă în coș",exact:true}).click();
  await expect.poll(()=>data.cart().length===1 && data.cart()[0].sku==="product-logo-studio-3d").toBe(true);
  await page.goto("https://app.avyron.ro/profil?tab=cart");
  await expect(page.getByText("Logo Studio 3D",{exact:true}).first()).toBeVisible();
  await expect(page.locator('[data-os-section="cart"]').first()).toHaveAttribute("aria-label",/1 produs în coș/);
});
