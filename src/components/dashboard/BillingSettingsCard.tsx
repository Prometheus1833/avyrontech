import { useCallback, useEffect, useState } from "react";
import { CreditCard, ExternalLink, FileText, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { billingApi, type BillingAccount, type BillingPaymentMethod } from "@/lib/billingApi";

const methodName = (method: BillingPaymentMethod) => method.type === "revolut_pay" ? "Revolut Pay" : method.type === "sepa_direct_debit" ? "Debit direct SEPA" : method.brand ? `${method.brand.charAt(0).toUpperCase()}${method.brand.slice(1)}` : "Card";

export default function BillingSettingsCard() {
  const [account, setAccount] = useState<BillingAccount | null>(null);
  const [methods, setMethods] = useState<BillingPaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncWarning, setSyncWarning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ entityType: "individual", legalName: "", taxId: "", invoiceEmail: "", address: "", city: "", county: "", automaticCharging: false, defaultProvider: "stripe" });

  const load = useCallback(async () => {
    const data = await billingApi.account();
    setAccount(data);
    setMethods(data.methods || []);
    if (data.profile) setForm({
      entityType: data.profile.entity_type || "individual", legalName: data.profile.legal_name || "", taxId: data.profile.tax_id || "",
      invoiceEmail: data.profile.invoice_email || "", address: data.profile.address || "", city: data.profile.city || "", county: data.profile.county || "",
      automaticCharging: Boolean(data.profile.automatic_charging), defaultProvider: data.profile.default_provider || "stripe",
    });
  }, []);

  const refreshMethods = useCallback(async () => {
    setRefreshing(true);
    try {
      const result = await billingApi.paymentMethods();
      setMethods(result.methods);
      setSyncWarning(Boolean(account?.providers.stripe.enabled && !result.refreshed.stripe) || Boolean(account?.providers.revolut.enabled && !result.refreshed.revolut));
    }
    catch (error) { toast.error(error instanceof Error ? error.message : "Metodele nu pot fi actualizate."); }
    finally { setRefreshing(false); }
  }, [account?.providers.revolut.enabled, account?.providers.stripe.enabled]);

  useEffect(() => {
    let active = true;
    void load().then(() => { if (active) void refreshMethods(); }).catch((error) => toast.error(error instanceof Error ? error.message : "Facturarea nu poate fi încărcată.")).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [load, refreshMethods]);

  const redirect = async (action: "setup" | "portal") => {
    try {
      const result = action === "setup" ? await billingApi.setupMethod("stripe") : await billingApi.portal();
      if (result.url) window.location.assign(result.url);
      else toast.error("Procesatorul nu a returnat o adresă sigură.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Procesatorul nu este disponibil."); }
  };

  const save = async () => {
    setSaving(true);
    try { await billingApi.saveProfile({ ...form, countryCode: "RO" }); toast.success("Datele de facturare au fost salvate."); await load(); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Datele nu au putut fi salvate."); }
    finally { setSaving(false); }
  };

  if (loading) return <Card><CardContent className="flex items-center gap-2 p-5 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Se încarcă metodele de plată…</CardContent></Card>;

  return <div className="mx-auto max-w-5xl space-y-4">
    <header className="rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-500/10 via-[#11172b] to-cyan-500/5 p-5">
      <p className="text-xs font-semibold uppercase tracking-[.2em] text-violet-300">Contul meu</p>
      <h1 className="mt-2 font-display text-2xl font-bold">Metode de plată și facturare</h1>
      <p className="mt-1 text-sm text-slate-400">Alegi procesatorul la fiecare plată. Datele cardului sunt introduse la Stripe sau Revolut; aici apar numai detalii mascate.</p>
    </header>
    <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><CreditCard className="size-4" /> Metode salvate</CardTitle><CardDescription>O metodă apare aici după confirmarea procesatorului. Cardurile pentru abonamente se salvează în fluxul de activare recurentă.</CardDescription></CardHeader><CardContent className="space-y-4">
      <div className="flex flex-wrap gap-2"><Badge variant={account?.providers.stripe.enabled ? "default" : "secondary"}>Stripe · {account?.providers.stripe.enabled ? "disponibil" : "în configurare"}</Badge><Badge variant={account?.providers.revolut.enabled ? "default" : "secondary"}>Revolut Pay · {account?.providers.revolut.enabled ? "disponibil" : "în configurare"}</Badge></div>
      {syncWarning && <p role="status" className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-xs text-amber-200">Unele metode nu au putut fi confirmate acum la procesator. Încearcă Actualizează înainte de a le folosi.</p>}
      {methods.length ? <ul className="grid gap-2">{methods.map((method) => <li key={method.id} className="flex flex-wrap items-center gap-3 rounded-xl border p-3"><ShieldCheck className="size-4 text-emerald-500" /><div className="min-w-0 flex-1"><p className="text-sm font-medium">{methodName(method)}{method.last4 ? ` •••• ${method.last4}` : ""}</p><p className="text-xs text-muted-foreground">{method.provider === "stripe" ? "Stripe" : "Revolut"} · {method.usage_scope === "recurring" ? "folosită pentru plăți recurente" : "salvată pentru plăți viitoare"}</p></div>{method.expiry_month && method.expiry_year && <span className="text-xs text-muted-foreground">{String(method.expiry_month).padStart(2, "0")}/{method.expiry_year}</span>}{method.is_default === 1 && <Badge variant="outline">Implicită</Badge>}</li>)}</ul> : <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">Nu există încă metode salvate în cont.</p>}
      <div className="flex flex-wrap gap-2"><Button size="sm" disabled={!account?.providers.stripe.enabled} onClick={() => void redirect("setup")}><CreditCard className="mr-1.5 size-4" /> Salvează un card</Button><Button size="sm" variant="outline" disabled={!account?.providers.stripe.enabled} onClick={() => void redirect("portal")}><ExternalLink className="mr-1.5 size-4" /> Gestionează în Stripe</Button><Button size="sm" variant="ghost" disabled={refreshing} onClick={() => void refreshMethods()}><RefreshCw className={`mr-1.5 size-4 ${refreshing ? "animate-spin" : ""}`} /> Actualizează</Button></div>
      <p className="text-xs text-muted-foreground">Revolut salvează metoda pentru reînnoiri la prima plată a abonamentului. Cardurile noi pot fi salvate separat prin pagina securizată Stripe când acesta este configurat.</p>
    </CardContent></Card>
    <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><FileText className="size-4" /> Date de facturare</CardTitle><CardDescription>Folosite pentru factură după confirmarea plății. Alegerea procesatorului preferat nu inițiază o debitare.</CardDescription></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1"><Label>Tip beneficiar</Label><Select value={form.entityType} onValueChange={(entityType) => setForm({ ...form, entityType })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="individual">Persoană fizică</SelectItem><SelectItem value="company">Companie / PFA</SelectItem></SelectContent></Select></div>
      <div className="space-y-1"><Label>Nume pentru factură</Label><Input value={form.legalName} onChange={(event) => setForm({ ...form, legalName: event.target.value })} /></div>
      {form.entityType === "company" && <div className="space-y-1"><Label>CUI / identificator fiscal</Label><Input value={form.taxId} onChange={(event) => setForm({ ...form, taxId: event.target.value.toUpperCase() })} /></div>}
      <div className="space-y-1"><Label>Email factură</Label><Input type="email" value={form.invoiceEmail} onChange={(event) => setForm({ ...form, invoiceEmail: event.target.value })} /></div>
      <div className="space-y-1 sm:col-span-2"><Label>Adresă</Label><Input value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} /></div>
      <div className="space-y-1"><Label>Localitate</Label><Input value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} /></div><div className="space-y-1"><Label>Județ</Label><Input value={form.county} onChange={(event) => setForm({ ...form, county: event.target.value })} /></div>
      <div className="space-y-1"><Label>Procesator preferat</Label><Select value={form.defaultProvider} onValueChange={(defaultProvider) => setForm({ ...form, defaultProvider })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="stripe">Stripe</SelectItem><SelectItem value="revolut">Revolut Pay</SelectItem></SelectContent></Select></div>
      <p className="self-center text-xs text-muted-foreground">Abonamentele se reînnoiesc automat prin procesatorul ales la prima plată. Le poți opri din secțiunea Abonamente.</p>
      <Button className="sm:col-span-2" disabled={saving} onClick={() => void save()}>{saving ? "Se salvează…" : "Salvează datele de facturare"}</Button>
    </CardContent></Card>
  </div>;
}
