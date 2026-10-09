// Compatibility checkout for Produse AVYRON. Pricing is always read from D1;
// payment execution is delegated to the provider-neutral billing control plane.
import { Hono } from "hono";
import { z } from "zod";
import type { AppBindings } from "./types";
import { createCheckoutForOrder } from "./billing";
export { stripeSignatureValid } from "./billingSignatures";

export const produseCheckoutRouter = new Hono<AppBindings>();
type Kind = "plan" | "item";
const checkoutSchema=z.object({kind:z.enum(["plan","item"]),id:z.string().min(1).max(80),taxId:z.string().trim().max(20).optional(),provider:z.enum(["stripe","revolut"]).optional().default("revolut"),savePaymentMethod:z.boolean().optional().default(true)}).strict();

async function priceFor(db:D1Database,kind:Kind,id:string):Promise<{name:string;amountMinor:number}|null>{
  if(kind==="plan"){const row=await db.prepare("SELECT name,price_ron_cents FROM partnership_plans WHERE id=?").bind(id).first<{name:string;price_ron_cents:number}>();return row&&row.price_ron_cents>0?{name:`${row.name} — 12 luni`,amountMinor:row.price_ron_cents}:null;}
  const row=await db.prepare("SELECT name_ro,price_ron_cents,status FROM product_items WHERE slug=?").bind(id).first<{name_ro:string;price_ron_cents:number|null;status:string}>();return row?.price_ron_cents&&row.status!=="archived"?{name:row.name_ro,amountMinor:row.price_ron_cents}:null;
}

produseCheckoutRouter.post("/api/produse/account/checkout",async(c)=>{
  const parsed=checkoutSchema.safeParse(await c.req.json().catch(()=>null));if(!parsed.success)return c.json({error:{code:"invalid_request"}},400);
  const {kind,id,taxId,provider,savePaymentMethod}=parsed.data,userId=c.get("userId");let priced:{name:string;amountMinor:number}|null;
  try{priced=await priceFor(c.env.DB,kind,id);}catch(error){if(/no such table: (product_items|partnership_plans)/.test(String(error)))return c.json({error:{code:"catalog_unavailable"}},503);throw error;}
  if(!priced)return c.json({error:{code:"not_purchasable"}},404);
  const orderId=crypto.randomUUID(),timestamp=Date.now(),items=[{kind,id,name:priced.name,quantity:1,unitPriceCents:priced.amountMinor,source:"produse-avyron",taxId:taxId||null}];
  await c.env.DB.prepare("INSERT INTO commerce_orders(id,user_id,items_json,subtotal_cents,promotion_id,promotion_code,discount_percent,discount_cents,discount_base_cents,total_cents,currency,requires_manual_quote,status,created_at,updated_at) VALUES (?,?,?,?,NULL,NULL,0,0,0,?,'RON',0,'requested',?,?)").bind(orderId,userId,JSON.stringify(items),priced.amountMinor,priced.amountMinor,timestamp,timestamp).run();
  const result=await createCheckoutForOrder(c,{orderId,provider,savePaymentMethod});return c.json({...result.body,orderId,amountMinor:priced.amountMinor},result.status);
});
