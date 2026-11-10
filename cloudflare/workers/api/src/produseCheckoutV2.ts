// Compatibility checkout for Produse AVYRON. Pricing is always read from D1;
// payment execution is delegated to the provider-neutral billing control plane.
import { Hono } from "hono";
import { z } from "zod";
import type { AppBindings } from "./types";
import { createCheckoutForOrder } from "./billing";
export { stripeSignatureValid } from "./billingSignatures";

export const produseCheckoutRouter = new Hono<AppBindings>();
type Kind = "plan" | "item";
const checkoutSchema=z.object({kind:z.enum(["plan","item"]),id:z.string().min(1).max(80),taxId:z.string().trim().max(20).optional(),provider:z.enum(["stripe","revolut"]).optional().default("revolut"),savePaymentMethod:z.boolean().optional().default(false)}).strict();

async function priceFor(db:D1Database,kind:Kind,id:string):Promise<{name:string;amountMinor:number;sku?:string;accountingCode?:string;licenseName?:string;licenseTerms?:string;invoiceProvider?:string;vatBasisPoints?:number;unitLabel?:string;deliveryMode?:string}|null>{
  if(kind==="plan"){const row=await db.prepare("SELECT p.name,p.price_ron_cents,c.sku,c.accounting_code FROM partnership_plans p LEFT JOIN commercial_catalog_codes c ON c.entity_type='service' AND c.entity_key='studio-plan-'||p.id WHERE p.id=?").bind(id).first<{name:string;price_ron_cents:number;sku:string|null;accounting_code:string|null}>();return row&&row.price_ron_cents>0?{name:`${row.name} — 12 luni`,amountMinor:row.price_ron_cents,sku:row.sku||undefined,accountingCode:row.accounting_code||undefined}:null;}
  const row=await db.prepare("SELECT p.name_ro,p.price_ron_cents,c.sku,c.accounting_code,c.invoice_provider,c.vat_basis_points,c.unit_label,s.license_name,s.license_terms,s.delivery_mode FROM product_items p JOIN commercial_catalog_codes c ON c.entity_type='product' AND c.entity_key=p.slug JOIN product_sales_profiles s ON s.slug=p.slug WHERE p.slug=? AND p.status='live' AND c.active=1 AND c.payment_status='active' AND c.tax_status='verified' AND c.price_model='fixed' AND c.billing_cycle='one_time' AND c.base_price_minor=p.price_ron_cents AND c.currency='RON' AND s.license_approved=1").bind(id).first<{name_ro:string;price_ron_cents:number|null;sku:string;accounting_code:string;license_name:string;license_terms:string;invoice_provider:string;vat_basis_points:number;unit_label:string;delivery_mode:string}>();
  return row?.price_ron_cents?{name:row.name_ro,amountMinor:row.price_ron_cents,sku:row.sku,accountingCode:row.accounting_code,licenseName:row.license_name,licenseTerms:row.license_terms,invoiceProvider:row.invoice_provider,vatBasisPoints:row.vat_basis_points,unitLabel:row.unit_label,deliveryMode:row.delivery_mode}:null;
}

produseCheckoutRouter.post("/api/produse/account/checkout",async(c)=>{
  const parsed=checkoutSchema.safeParse(await c.req.json().catch(()=>null));if(!parsed.success)return c.json({error:{code:"invalid_request"}},400);
  const {kind,id,taxId,provider,savePaymentMethod}=parsed.data,userId=c.get("userId");let priced:Awaited<ReturnType<typeof priceFor>>;
  try{priced=await priceFor(c.env.DB,kind,id);}catch(error){if(/no such table: (product_items|partnership_plans)/.test(String(error)))return c.json({error:{code:"catalog_unavailable"}},503);throw error;}
  if(!priced)return c.json({error:{code:"not_purchasable"}},404);
  const orderId=crypto.randomUUID(),timestamp=Date.now(),items=[{kind,id,sku:priced.sku,accountingCode:priced.accountingCode,licenseName:priced.licenseName,licenseTerms:priced.licenseTerms,invoiceProvider:priced.invoiceProvider,vatBasisPoints:priced.vatBasisPoints,unitLabel:priced.unitLabel,deliveryMode:priced.deliveryMode,name:priced.name,quantity:1,unitPriceCents:priced.amountMinor,source:"produse-avyron",taxId:taxId||null}];
  await c.env.DB.prepare("INSERT INTO commerce_orders(id,user_id,items_json,subtotal_cents,promotion_id,promotion_code,discount_percent,discount_cents,discount_base_cents,total_cents,currency,requires_manual_quote,status,created_at,updated_at) VALUES (?,?,?,?,NULL,NULL,0,0,0,?,'RON',0,'requested',?,?)").bind(orderId,userId,JSON.stringify(items),priced.amountMinor,priced.amountMinor,timestamp,timestamp).run();
  const result=await createCheckoutForOrder(c,{orderId,provider,savePaymentMethod});return c.json({...result.body,orderId,amountMinor:priced.amountMinor},result.status);
});
