import { useEffect,useState } from "react";
import { CreditCard,ExternalLink,FileText,Loader2,ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card,CardContent,CardDescription,CardHeader,CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select,SelectContent,SelectItem,SelectTrigger,SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { billingApi,type BillingAccount } from "@/lib/billingApi";

export default function BillingSettingsCard(){
  const [account,setAccount]=useState<BillingAccount|null>(null),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false);
  const [form,setForm]=useState({entityType:"individual",legalName:"",taxId:"",invoiceEmail:"",address:"",city:"",county:"",automaticCharging:false,defaultProvider:"stripe"});
  const load=()=>billingApi.account().then((data)=>{setAccount(data);if(data.profile)setForm({entityType:data.profile.entity_type||"individual",legalName:data.profile.legal_name||"",taxId:data.profile.tax_id||"",invoiceEmail:data.profile.invoice_email||"",address:data.profile.address||"",city:data.profile.city||"",county:data.profile.county||"",automaticCharging:Boolean(data.profile.automatic_charging),defaultProvider:data.profile.default_provider||"stripe"});}).catch((error)=>toast.error(error instanceof Error?error.message:"Facturarea nu poate fi încărcată.")).finally(()=>setLoading(false));
  useEffect(()=>{void load();},[]);
  const redirect=async(action:"setup"|"portal")=>{try{const result=action==="setup"?await billingApi.setupMethod("stripe"):await billingApi.portal();if(result.url)window.location.assign(result.url);else toast.error("Procesatorul nu a returnat o adresă sigură.");}catch(error){toast.error(error instanceof Error?error.message:"Procesatorul nu este disponibil.");}};
  const save=async()=>{setSaving(true);try{await billingApi.saveProfile({...form,countryCode:"RO",entityType:form.entityType,defaultProvider:form.defaultProvider});toast.success("Datele de facturare au fost salvate.");await load();}catch(error){toast.error(error instanceof Error?error.message:"Datele nu au putut fi salvate.");}finally{setSaving(false);}};
  if(loading)return <Card><CardContent className="flex items-center gap-2 p-5 text-xs text-muted-foreground"><Loader2 className="size-4 animate-spin"/>Se încarcă plățile securizate…</CardContent></Card>;
  return <div className="space-y-3">
    <Card><CardHeader className="py-3"><CardTitle className="flex items-center gap-2 text-sm"><CreditCard className="size-4"/>Metode de plată securizate</CardTitle><CardDescription className="text-xs">Cardurile sunt introduse și păstrate exclusiv de procesator. AVYRON nu primește numărul complet sau codul CVV.</CardDescription></CardHeader><CardContent className="space-y-3 pt-0 pb-3">
      <div className="flex flex-wrap gap-2"><Badge variant={account?.providers.revolut.enabled?"default":"secondary"}>Revolut Pay · {account?.providers.revolut.enabled?"configurat":"de configurat"}</Badge><Badge variant={account?.providers.stripe.enabled?"default":"secondary"}>Stripe · {account?.providers.stripe.enabled?"configurat":"de configurat"}</Badge><Badge variant="outline">Netopia · planificat</Badge></div>
      {account?.methods.length?<ul className="grid gap-2">{account.methods.map((method)=><li key={method.id} className="flex items-center gap-3 rounded-xl border p-3"><ShieldCheck className="size-4 text-emerald-500"/><span className="text-sm font-medium">{method.brand||method.provider} •••• {method.last4||"tokenizat"}</span>{method.expiry_month&&<span className="ml-auto text-xs text-muted-foreground">{String(method.expiry_month).padStart(2,"0")}/{method.expiry_year}</span>}</li>)}</ul>:<p className="text-xs text-muted-foreground">Nu există încă o metodă tokenizată în cont.</p>}
      <div className="flex flex-wrap gap-2"><Button size="sm" disabled={!account?.providers.stripe.enabled} onClick={()=>void redirect("setup")}><CreditCard className="mr-1 size-3.5"/>Salvează un card prin Stripe</Button><Button size="sm" variant="outline" disabled={!account?.providers.stripe.enabled} onClick={()=>void redirect("portal")}><ExternalLink className="mr-1 size-3.5"/>Administrează la procesator</Button></div>
    </CardContent></Card>
    <Card><CardHeader className="py-3"><CardTitle className="flex items-center gap-2 text-sm"><FileText className="size-4"/>Facturare Oblio</CardTitle><CardDescription className="text-xs">Date folosite pentru factură după confirmarea plății. Factura nu este emisă înainte de încasare.</CardDescription></CardHeader><CardContent className="grid gap-3 pt-0 pb-3 sm:grid-cols-2">
      <div className="space-y-1"><Label className="text-xs">Tip beneficiar</Label><Select value={form.entityType} onValueChange={(entityType)=>setForm({...form,entityType})}><SelectTrigger className="h-9"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="individual">Persoană fizică</SelectItem><SelectItem value="company">Companie / PFA</SelectItem></SelectContent></Select></div>
      <div className="space-y-1"><Label className="text-xs">Nume legal</Label><Input value={form.legalName} onChange={(e)=>setForm({...form,legalName:e.target.value})}/></div>
      <div className="space-y-1"><Label className="text-xs">CUI / identificator fiscal</Label><Input value={form.taxId} onChange={(e)=>setForm({...form,taxId:e.target.value.toUpperCase()})}/></div>
      <div className="space-y-1"><Label className="text-xs">Email factură</Label><Input type="email" value={form.invoiceEmail} onChange={(e)=>setForm({...form,invoiceEmail:e.target.value})}/></div>
      <div className="space-y-1 sm:col-span-2"><Label className="text-xs">Adresă</Label><Input value={form.address} onChange={(e)=>setForm({...form,address:e.target.value})}/></div>
      <div className="space-y-1"><Label className="text-xs">Localitate</Label><Input value={form.city} onChange={(e)=>setForm({...form,city:e.target.value})}/></div><div className="space-y-1"><Label className="text-xs">Județ</Label><Input value={form.county} onChange={(e)=>setForm({...form,county:e.target.value})}/></div>
      <div className="space-y-1"><Label className="text-xs">Procesator preferat</Label><Select value={form.defaultProvider} onValueChange={(defaultProvider)=>setForm({...form,defaultProvider})}><SelectTrigger className="h-9"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="revolut">Revolut Pay</SelectItem><SelectItem value="stripe">Stripe</SelectItem></SelectContent></Select></div>
      <label className="flex items-center justify-between gap-3 rounded-xl border px-3 text-xs"><span>Plată recurentă pentru abonamente</span><Switch checked={form.automaticCharging} onCheckedChange={(automaticCharging)=>setForm({...form,automaticCharging})}/></label>
      <Button className="sm:col-span-2" disabled={saving} onClick={()=>void save()}>{saving?"Se salvează…":"Salvează datele de facturare"}</Button>
    </CardContent></Card>
  </div>;
}
