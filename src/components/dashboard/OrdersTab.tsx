import { useCallback, useEffect, useRef, useState } from "react";
import { CreditCard, Package, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cfAuth } from "@/lib/cfAuth";
import { billingApi, type BillingAccount } from "@/lib/billingApi";
import { safePaymentRedirect } from "@/lib/clientCommerce";

type OrderLine = { sku: string; type?: string; name: string; description?: string | null; period?: string | null; quantity: number; unitPriceCents?: number; lineTotalCents?: number | null };
type Order = { id: string; items_json: string; total_cents: number; currency: string; status: string; requires_manual_quote: number; created_at: number };
const money = (minor: number, currency: string) => new Intl.NumberFormat("ro-RO", {style: "currency", currency}).format(minor/100);
const labels: Record<string,string> = {requested:"Înregistrată",quoted:"Ofertată",accepted:"În așteptarea confirmării",paid:"Plătită",cancelled:"Anulată"};
function lineAmount(line:OrderLine){
 if(typeof line.lineTotalCents==='number'&&Number.isSafeInteger(line.lineTotalCents))return line.lineTotalCents;
 const quantity=Number.isSafeInteger(line.quantity)&&line.quantity>0?line.quantity:1;
 return typeof line.unitPriceCents==='number'&&Number.isSafeInteger(line.unitPriceCents)&&Number.isSafeInteger(line.unitPriceCents*quantity)?line.unitPriceCents*quantity:null;
}
function orderLines(raw: string): OrderLine[] { try { const parsed: unknown=JSON.parse(raw);return Array.isArray(parsed)?parsed.filter((v):v is OrderLine=>!!v&&typeof v==='object'&&typeof v.name==='string'):[] } catch { return [] } }

export function OrdersTab({embedded=false,pendingOnly=false,loadAccount=billingApi.account}:{embedded?:boolean;pendingOnly?:boolean;loadAccount?:(force?:boolean)=>Promise<BillingAccount>}) {
 const params=new URLSearchParams(typeof window==='undefined'?'':window.location.search),paymentReturn=params.get('plata'),returnedOrderId=params.get('order');
 const [orders,setOrders]=useState<Order[]>([]),[billing,setBilling]=useState<BillingAccount|null>(null),[loading,setLoading]=useState(true),[busy,setBusy]=useState(''),[error,setError]=useState('');
 const [saveCards,setSaveCards]=useState<Record<string,boolean>>({});
 const sequence=useRef(0),activePayment=useRef(false);
 const load=useCallback(async(force=false)=>{
  const seq=++sequence.current;setLoading(true);setError('');
  try{
   const [history,account]=await Promise.all([cfAuth.request<{data:Order[]}>('/api/commerce/orders'),loadAccount(force).catch(()=>null)]);
   if(seq!==sequence.current)return;
   const scheduled=new Set((account?.subscriptions||[]).filter(s=>['active','trialing','past_due'].includes(s.status)).map(s=>s.order_id));
   setOrders((history.data||[]).filter(o=>!pendingOnly||(!['paid','cancelled'].includes(o.status)&&!scheduled.has(o.id))||o.id===returnedOrderId));setBilling(account?.providers?account:null);
  }catch{if(seq===sequence.current){setOrders([]);setError('Comenzile nu pot fi încărcate. Reîncearcă.')}}finally{if(seq===sequence.current)setLoading(false)}
 },[loadAccount,pendingOnly,returnedOrderId]);
 useEffect(()=>{const counter=sequence;void load();return()=>{++counter.current}},[load]);
 const pay=async(orderId:string,provider:'stripe'|'revolut',recurring:boolean)=>{
  if(activePayment.current)return;activePayment.current=true;setBusy(orderId);
  try{const checkout=await billingApi.checkout({orderId,provider,savePaymentMethod:provider==='stripe'&&!recurring&&!!saveCards[orderId]});window.location.assign(safePaymentRedirect(checkout.url,provider))}
  catch(e){toast.error(e instanceof Error?e.message:'Plata nu poate fi inițiată.');activePayment.current=false;setBusy('')}
 };
 return <section aria-label={embedded?'Comenzi în așteptare':'Istoric și plăți'} className="min-w-0 space-y-3">
  <header className="flex items-center justify-between gap-3"><div>{embedded?<h2 className="text-lg font-semibold">Comenzi în așteptare</h2>:<h1 className="text-2xl font-semibold">Istoric și plăți</h1>}<p className="mt-1 text-xs text-slate-400">Produsele și serviciile comandate. Plata este confirmată de procesator.</p></div><Button size="sm" variant="outline" disabled={loading} onClick={()=>void load(true)}><RefreshCw className="mr-1.5 size-4"/>Actualizează</Button></header>
  {returnedOrderId&&paymentReturn==='verificare'&&<p role="status" className="rounded-xl border border-violet-400/25 bg-violet-500/10 p-3 text-sm">{orders.some(o=>o.id===returnedOrderId&&o.status==='paid')?'Plata a fost confirmată. Factura apare după emitere.':billing?.subscriptions.some(s=>s.order_id===returnedOrderId&&s.status==='trialing')?'Debitarea este autorizată. Prima plată este programată la data afișată în abonament.':'Verificăm confirmarea procesatorului. Poți actualiza lista peste câteva momente.'}</p>}
  {returnedOrderId&&paymentReturn==='anulata'&&<p role="status" className="rounded-xl border border-amber-400/25 p-3 text-sm">Nu am primit o confirmare nouă. Verifică starea comenzii înainte să reîncerci plata.</p>}
  {error?<div role="alert" className="rounded-xl border border-amber-400/30 p-3 text-sm text-amber-200">{error}</div>:loading?<p role="status" className="p-3 text-sm text-slate-300">Se încarcă comenzile…</p>:!orders.length?<p className="rounded-xl border border-dashed border-white/15 p-3 text-sm text-slate-300">{pendingOnly?'Nu ai comenzi în așteptare.':'Nu ai comenzi încă.'}</p>:<ul className="divide-y divide-white/10 overflow-hidden rounded-2xl border border-white/10 bg-white/[.025]">{orders.map(order=>{
   const lines=orderLines(order.items_json),recurring=lines.length===1&&lines[0].type==='subscription'&&!!lines[0].period,mixed=lines.some(l=>l.type==='subscription')&&!recurring;
   const stripe=!!billing?.providers.stripe.enabled,revolut=!!billing?.providers.revolut.enabled&&(!recurring||!!billing.revolutPlans?.some(p=>p.sku===lines[0]?.sku&&p.period===lines[0]?.period));
   const scheduled=billing?.subscriptions.some(s=>s.order_id===order.id&&['active','trialing','past_due'].includes(s.status));
   const canPay=!['paid','cancelled'].includes(order.status)&&!scheduled&&!order.requires_manual_quote&&!mixed&&order.total_cents>0;
   return <li key={order.id} className="min-w-0 p-3 sm:p-4">
    <div className="flex flex-wrap items-center justify-between gap-2 text-xs"><p className="text-slate-400">#{order.id.slice(0,8).toUpperCase()} · {new Date(order.created_at).toLocaleDateString('ro-RO')}</p><span className="text-violet-200">{scheduled?'Debitare configurată':labels[order.status]||'De verificat'}</span></div>
    <ul className="mt-2 space-y-2">{(lines.length?lines:[{sku:'unknown',name:'Comandă AVYRON',quantity:1,lineTotalCents:order.total_cents}]).map((line,i)=><li key={`${line.sku}:${i}`} className="flex min-w-0 items-start gap-2"><Package className="mt-0.5 size-4 shrink-0 text-violet-300" aria-hidden/><div className="min-w-0 flex-1"><h3 className="break-words text-sm font-medium">{line.name}{line.quantity>1?` × ${line.quantity}`:''}</h3><p className="mt-0.5 text-xs text-slate-400">{line.period?(line.period==='annual'?'Abonament anual':'Abonament lunar'):'Plată unică'}</p></div><span className="shrink-0 text-sm text-slate-200">{lineAmount(line)!==null?money(lineAmount(line)!,order.currency):'De confirmat'}</span></li>)}</ul>
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/5 pt-3"><p className="text-sm font-semibold">{order.requires_manual_quote?'Preț de confirmat':`Total ${money(order.total_cents,order.currency)}`}</p><div className="flex flex-wrap gap-2">{canPay&&stripe&&<Button size="sm" disabled={!!busy} onClick={()=>void pay(order.id,'stripe',recurring)}><CreditCard className="mr-1.5 size-4"/>{busy===order.id?'Se deschide…':'Plătește cu cardul · Stripe'}</Button>}{canPay&&revolut&&<Button size="sm" variant="outline" disabled={!!busy} onClick={()=>void pay(order.id,'revolut',recurring)}>Revolut Pay</Button>}</div></div>
    {canPay&&stripe&&!recurring&&<label className="mt-3 flex cursor-pointer items-center gap-2 text-xs text-slate-300"><input type="checkbox" className="size-4 accent-violet-500" checked={!!saveCards[order.id]} onChange={e=>setSaveCards(v=>({...v,[order.id]:e.target.checked}))}/>Salvează cardul folosit prin Stripe pentru plăți viitoare</label>}
    {canPay&&(stripe||revolut)&&<p className="mt-2 text-xs text-slate-400">{recurring?'La prima plată autorizezi reînnoirea automată. Poți gestiona debitarea din abonament.':'Plătești pe pagina securizată a procesatorului. AVYRON nu stochează datele complete ale cardului.'}</p>}
    {canPay&&!stripe&&!revolut&&<p className="mt-2 text-xs text-amber-200">{billing?'Plata online necesită configurarea procesatorului. Comanda este salvată în cont.':'Disponibilitatea plății nu poate fi verificată. Reîncearcă actualizarea.'}</p>}
    {!!order.requires_manual_quote&&<p className="mt-2 text-xs text-slate-400">Echipa confirmă oferta înainte de plată.</p>}{mixed&&<p className="mt-2 text-xs text-amber-200">Abonamentele se achită separat de plățile unice.</p>}
   </li>
  })}</ul>}
 </section>;
}
