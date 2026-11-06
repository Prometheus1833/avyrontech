import { privilegedMfaSatisfied } from "./mfaPolicy";
import { Hono } from "hono";
import type { AppBindings } from "./types";
import { platformRoleForUser,hasCapability } from "./authorization";
import { staffRequestAllowed } from "./staffAccessPolicy";
import { readJsonBodyUpTo } from "./requestBody";
import { checkRateLimit } from "./antispam";
import { sha256 } from "./security";
import { cleanLogoProductConfig,LOGO_PRODUCT_SLUG,LOGO_VARIANT_COUNT } from "../../../../src/shared/logoPipeline";
import { AI_LOGO_EXPORT_PRICE,STUDIO_PRICES } from "../../../../src/data/logoStudio";
export const logoOperationsRouter=new Hono<AppBindings>();
logoOperationsRouter.use("/api/logo-studio/admin/*",async(c,next)=>{if(!(await privilegedMfaSatisfied(c)))return c.json({error:{code:"mfa_required"}},403);await next();});

logoOperationsRouter.get("/api/logo-studio/admin/overview",async c=>{
  const user=c.get("userId"),db=c.env.DB,principal=await platformRoleForUser(db,user);
  if(!principal&&(!c.get("roles").some(r=>r==="staff"||r==="admin")||!(await staffRequestAllowed(db,user,"/api/leads","GET"))))return c.json({error:{code:"forbidden"}},403);
  c.header("Cache-Control","private, no-store");
  const canFinance=!!principal||await hasCapability(db,user,"finance.read");
  const globalLeads=!!principal||await hasCapability(db,user,"leads.read");
  const offset=Number(c.req.query("offset")||0);
  if(!Number.isSafeInteger(offset)||offset<0||offset>100000)return c.json({error:{code:"invalid_offset"}},400);
  const kind=c.req.query("kind")==="dynamic"?"dynamic":"static";
  const [product,version,simulations,summary]=await Promise.all([
    db.prepare("SELECT slug,name_ro,access,price_ron_cents,status,pro_at,free_at FROM product_items WHERE slug=?").bind(LOGO_PRODUCT_SLUG).first(),
    db.prepare("SELECT version,bytes,created_at FROM product_versions WHERE slug=? ORDER BY created_at DESC LIMIT 1").bind(LOGO_PRODUCT_SLUG).first(),
    db.prepare(`SELECT id,user_id,kind,source,brief_json,concept_count,lead_id,created_at FROM logo_studio_simulations WHERE expires_at>? AND kind=? ${globalLeads?"":"AND user_id=?"} ORDER BY created_at DESC,id LIMIT 50 OFFSET ?`).bind(Date.now(),kind,...(globalLeads?[]:[user]),offset).all(),
    db.prepare(`SELECT source,count(*) total FROM logo_studio_simulations WHERE expires_at>? AND kind=? ${globalLeads?"":"AND user_id=?"} GROUP BY source`).bind(Date.now(),kind,...(globalLeads?[]:[user])).all(),
  ]);
  let finances:unknown=null;
  if(canFinance&&c.req.query("mode")!=="2d"){
    const rows=await db.prepare(`SELECT o.id,o.status,o.currency,o.total_cents,o.subtotal_cents,o.created_at,json_extract(j.value,'$.quantity') quantity,json_extract(j.value,'$.unitPriceCents') unit_price_cents FROM commerce_orders o JOIN json_each(CASE WHEN json_valid(o.items_json) THEN o.items_json ELSE '[]' END) j WHERE json_extract(j.value,'$.kind')='item' AND json_extract(j.value,'$.id')=? ORDER BY o.created_at DESC,o.id LIMIT 100`).bind(LOGO_PRODUCT_SLUG).all();
    const totals=await db.prepare(`SELECT o.currency,count(DISTINCT o.id) paid_orders,sum(CASE WHEN o.subtotal_cents>0 THEN round(json_extract(j.value,'$.unitPriceCents')*COALESCE(json_extract(j.value,'$.quantity'),1)*1.0*o.total_cents/o.subtotal_cents) ELSE 0 END) paid_minor FROM commerce_orders o JOIN json_each(CASE WHEN json_valid(o.items_json) THEN o.items_json ELSE '[]' END) j WHERE o.status='paid' AND json_extract(j.value,'$.kind')='item' AND json_extract(j.value,'$.id')=? GROUP BY o.currency`).bind(LOGO_PRODUCT_SLUG).all();
    finances={orders:rows.results,totals:totals.results,limit:100,source:"commerce_orders"};
  }
  return c.json({product,version,simulations:simulations.results,summary:summary.results,nextOffset:simulations.results.length===50?offset+50:null,finances,canFinance,canManageCatalog:!!principal,scope:globalLeads?"authorized_all":"own",variants:LOGO_VARIANT_COUNT,prices:{standard:STUDIO_PRICES.static,assistedAi:AI_LOGO_EXPORT_PRICE},infrastructure:{database:"D1",storage:"R2 privat",packageScan:"Verificare obligatorie la download",payment:"Checkout nativ; disponibilitatea furnizorului se verifică la plată"}});
});

logoOperationsRouter.post("/api/logo-studio/product-interest",async c=>{
  const db=c.env.DB,user=c.get("userId");
  if(!user)return c.json({error:{code:"unauthorized"}},401);
  const parsed=await readJsonBodyUpTo(c.req.raw,4096);
  if(!parsed.ok)return c.json({error:{code:parsed.error}},400);
  const config=cleanLogoProductConfig((parsed.value as {config?:unknown}|null)?.config);
  if(!config)return c.json({error:{code:"invalid_configuration"}},400);
  const key=c.req.header("Idempotency-Key")||"";
  if(!/^[a-zA-Z0-9_-]{16,128}$/.test(key))return c.json({error:{code:"idempotency_key_required"}},400);
  const scope=`logo-product:${user}`,hash=await sha256(JSON.stringify(config));
  const previous=()=>db.prepare("SELECT request_hash,response_json FROM idempotency_keys WHERE scope=? AND idempotency_key=?").bind(scope,key).first<{request_hash:string;response_json:string}>();
  const cached=await previous();
  if(cached)return cached.request_hash===hash?c.json(JSON.parse(cached.response_json),201):c.json({error:{code:"idempotency_key_reused"}},409);
  const rate=await checkRateLimit(db,[{key:`logo-product-interest:${user}`,limit:30,windowSec:86400}]);
  if(!rate.ok)return c.json({error:{code:"rate_limited"}},429);
  const product=await db.prepare("SELECT price_ron_cents FROM product_items WHERE slug=? AND status='live'").bind(LOGO_PRODUCT_SLUG).first<{price_ron_cents:number|null}>();
  const account=await db.prepare("SELECT email FROM users WHERE id=?").bind(user).first<{email:string}>();
  if(!account||!product?.price_ron_cents||product.price_ron_cents<1)return c.json({error:{code:"product_unavailable"}},503);
  const id=crypto.randomUUID(),t=Date.now(),result={id};
  try{
    await db.batch([
      db.prepare("INSERT INTO idempotency_keys(scope,idempotency_key,request_hash,response_status,response_json,created_at,expires_at) VALUES(?,?,?,201,?,?,?)").bind(scope,key,hash,JSON.stringify(result),t,t+86400000),
      db.prepare("INSERT INTO leads(id,source,name,business,email,message,product,config_json,estimate_ron,status,lifecycle_stage,delivery_status,created_at,updated_at) VALUES(?,'logo-product:3d',?,?,?,?,?,?,?,'new','new_lead','pending',?,?)").bind(id,config.text,config.text,account.email,"Interes pentru produsul digital Logo Studio 3D. Adăugarea în coș nu confirmă plata sau livrarea.",LOGO_PRODUCT_SLUG,JSON.stringify({productSlug:LOGO_PRODUCT_SLUG,configuration:config,accountUserId:user,priceRonCents:product.price_ron_cents,usesAi:false,requestType:"cart_intent"}),product.price_ron_cents/100,t,t),
    ]);
    return c.json(result,201);
  }catch{
    const raced=await previous();
    if(raced)return raced.request_hash===hash?c.json(JSON.parse(raced.response_json),201):c.json({error:{code:"idempotency_key_reused"}},409);
    return c.json({error:{code:"configuration_not_saved"}},409);
  }
});
