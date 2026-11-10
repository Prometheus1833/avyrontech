import type {Env} from "./types";
import {readTextUpTo} from "./metadata";
const PROFILE="avyron-client-billing-v1";
/** Dedicated, minimal customer portal. Never modifies an operator's existing configuration. */
export async function clientPortalConfiguration(env:Env,returnUrl:string){
 const headers={authorization:`Bearer ${env.STRIPE_SECRET_KEY!.trim()}`,...(env.STRIPE_API_VERSION?{"Stripe-Version":env.STRIPE_API_VERSION}:{})};
 let cursor:string|null=null;
 for(let page=0;page<3;page++){
  const response=await fetch(`https://api.stripe.com/v1/billing_portal/configurations?limit=100${cursor?`&starting_after=${encodeURIComponent(cursor)}`:""}`,{headers,signal:AbortSignal.timeout(10000),redirect: "manual"});
  if(!response.ok)throw Error("portal_configuration_unavailable");
  const data=JSON.parse(await readTextUpTo(response,262144)) as {data?:Array<{id:string;active:boolean;metadata?:{avyron_profile?:string}}>;has_more?:boolean};
  const match=data.data?.find(c=>c.metadata?.avyron_profile===PROFILE);
  if(match){if(!match.active)throw Error("portal_configuration_disabled");return match.id}
  if(!data.has_more){
   const fields=new URLSearchParams({name:"AVYRON · Carduri și reînnoire",default_return_url:returnUrl,"metadata[avyron_profile]":PROFILE,
    "features[payment_method_update][enabled]":"true","features[subscription_cancel][enabled]":"true","features[subscription_cancel][mode]":"at_period_end",
    "features[subscription_cancel][proration_behavior]":"none","features[subscription_update][enabled]":"false","features[customer_update][enabled]":"false","features[invoice_history][enabled]":"false"});
   const created=await fetch("https://api.stripe.com/v1/billing_portal/configurations",{method:"POST",headers:{...headers,"content-type":"application/x-www-form-urlencoded","Idempotency-Key":PROFILE},body:fields,signal:AbortSignal.timeout(10000),redirect: "manual"});
   if(!created.ok)throw Error("portal_configuration_unavailable");
   const configuration=JSON.parse(await readTextUpTo(created,65536)) as {id?:string;active?:boolean};
   if(!configuration.id?.startsWith("bpc_")||configuration.active!==true)throw Error("portal_configuration_unavailable");
   return configuration.id;
  }
  cursor=data.data?.at(-1)?.id||null;if(!cursor)break;
 }
 throw Error("portal_configuration_requires_review");
}
