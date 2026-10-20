import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Plus, Trash2, Send, Package, Globe, Repeat, Wrench, BadgePercent, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { cfAuth } from "@/lib/cfAuth";
import { COMMERCE_CATALOG, commerceItemByName, commerceItemBySku, subscriptionServiceKeys, type CommerceCurrency } from "@/data/commerceCatalog";
import CurrencySwitch from "@/components/site/CurrencySwitch";
import { useCurrency } from "@/hooks/useCurrency";
import { ANNUAL_PROMOTION_CODE } from "@/lib/subscriptionCheckout";
import {
  ACCOUNT_CART_KEY,
  ACCOUNT_CART_OWNER_KEY,
  accountCartApi,
  mergeAccountCartItems,
  writeLocalAccountCart,
  type AccountCartItem,
  type AccountCartType,
} from "@/lib/accountCart";

type CatalogEntry = { key: string; name: string; category: string; sku: string | null; priceMinor: number | null; currency: string; payable: boolean };

type Quote = {
  currency: "RON";
  subtotalCents: number;
  promotion: { code: string; label: string; discountPercent: number; discountScope: "order" | "annual_subscription" } | null;
  discountBaseCents: number;
  discountCents: number;
  totalCents: number;
  requiresManualQuote: boolean;
};

const LEGACY_STORAGE_KEY = "avyron_cart_v1";
const PRESET_PACKAGES = COMMERCE_CATALOG.filter((item) => item.type === "package" && item.unitPriceCents !== null);
const SUBSCRIPTION_PLANS = COMMERCE_CATALOG.filter((item) => item.type === "subscription" && item.unitPriceCents !== null);
const PERIODS = [
  { value: "monthly", label: "1 lună" },
  { value: "annual", label: "12 luni" },
] as const;

const toApiItems = (items: AccountCartItem[]) => items.map((item) => ({
  sku: item.sku,
  quantity: 1,
  period: item.period,
  notes: item.notes,
  description: item.sku === "custom-request" ? item.name : undefined,
  serviceKey: item.serviceKey,
  productSlug: item.productSlug,
}));

const orderIntentId = async (items: AccountCartItem[], promotionCode?: string) => {
  const payload = JSON.stringify({ entries: items.map((item) => ({ id: item.id, ...toApiItems([item])[0] })), promotionCode: promotionCode || "" });
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
};

const restoreItems = (raw: string): AccountCartItem[] => {
  const parsed = JSON.parse(raw) as Array<Partial<AccountCartItem>>;
  if (!Array.isArray(parsed)) return [];
  return parsed.slice(0, 20).flatMap((item) => {
    const catalogItem = commerceItemBySku(String(item.sku ?? "")) || commerceItemByName(String(item.name ?? ""));
    const name = String(item.name ?? "").trim().slice(0, 120);
    if (!name) return [];
    return [{
      id: String(item.id || crypto.randomUUID()),
      source: item.source || "dashboard",
      sku: catalogItem?.sku || String(item.sku || "custom-request"),
      type: item.type === "product" || item.type === "service" || item.type === "partnership" ? item.type : catalogItem?.type || item.type || "custom",
      name: catalogItem?.name || name,
      period: catalogItem?.type === "subscription"
        ? ["annual", "12 luni"].includes(String(item.period ?? "")) ? "annual" : "monthly"
        : undefined,
      notes: item.notes ? String(item.notes).slice(0, 1000) : undefined,
      productSlug: item.productSlug ? String(item.productSlug).slice(0, 100) : undefined,
      serviceKey: item.serviceKey ? String(item.serviceKey).slice(0, 120) : undefined,
      price_estimate: catalogItem?.unitPriceCents ?? undefined,
      price_currency: catalogItem?.currency,
    } satisfies AccountCartItem];
  });
};

export function CartTab() {
  const { user } = useAuth();
  const { currency, formatEur, formatRonCents, rate } = useCurrency("ro-RO");
  const [items, setItems] = useState<AccountCartItem[]>([]);
  const [type, setType] = useState<AccountCartType>("package");
  const [name, setName] = useState("");
  const [catalogKey, setCatalogKey] = useState("");
  const [serviceKey, setServiceKey] = useState("");
  const [catalog, setCatalog] = useState<{ services: CatalogEntry[]; products: CatalogEntry[] }>({ services: [], products: [] });
  const [period, setPeriod] = useState<(typeof PERIODS)[number]["value"]>(PERIODS[0].value);
  const [notes, setNotes] = useState("");
  const [promotionCode, setPromotionCode] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [cloudSynced, setCloudSynced] = useState(false);

  useEffect(() => {
    if (!user) return;
    void cfAuth.request<{ services: CatalogEntry[]; products: CatalogEntry[] }>("/api/commerce/catalog")
      .then((data) => setCatalog({ services: data.services ?? [], products: data.products ?? [] }))
      .catch(() => setCatalog({ services: [], products: [] }));
  }, [user]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      let local: AccountCartItem[] = [];
      try {
        const raw = localStorage.getItem(ACCOUNT_CART_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
        const owner = localStorage.getItem(ACCOUNT_CART_OWNER_KEY);
        if (raw && (!owner || owner === user?.id)) local = restoreItems(raw);
        localStorage.removeItem(LEGACY_STORAGE_KEY);
      } catch { /* storage optional */ }
      let cloud: AccountCartItem[] = [];
      if (user) {
        try {
          cloud = restoreItems(JSON.stringify(await accountCartApi.load()));
          if (active) setCloudSynced(true);
        } catch {
          if (active) setCloudSynced(false);
        }
      }
      if (!active) return;
      setItems(mergeAccountCartItems(cloud, local));
      setHydrated(true);
    };
    void load();
    return () => { active = false; };
  }, [user]);

  useEffect(() => {
    if (!hydrated) return;
    writeLocalAccountCart(items);
    if (user) localStorage.setItem(ACCOUNT_CART_OWNER_KEY, user.id);
    setQuote(null);
    if (items.some((item) => item.type === "subscription" && item.period === "annual")) setPromotionCode((current) => current || ANNUAL_PROMOTION_CODE);
    else setPromotionCode((current) => current === ANNUAL_PROMOTION_CODE ? "" : current);
    if (!user || submitting) return;
    const timer = window.setTimeout(() => {
      void accountCartApi.save(items).then(() => setCloudSynced(true)).catch(() => setCloudSynced(false));
    }, 320);
    return () => window.clearTimeout(timer);
  }, [hydrated, items, user, submitting]);

  const addItem = () => {
    if (!name.trim()) return toast.error("Adaugă o denumire pentru element.");
    const preset = type === "package" || type === "subscription" ? commerceItemByName(name) : null;
    const commercial = (type === "service" ? catalog.services : type === "product" ? catalog.products : []).find((entry) => entry.key === catalogKey);
    if ((type === "service" || type === "product") && !commercial) return toast.error("Alege o opțiune din catalog.");
    if (type === "subscription" && !preset) return toast.error("Alege unul dintre abonamentele disponibile.");
    if (type === "subscription" && items.some((item) => item.type === "subscription")) {
      return toast.error("O comandă poate conține un singur abonament selectat.");
    }
    const newItem: AccountCartItem = {
      id: crypto.randomUUID(),
      source: "dashboard",
      sku: preset?.sku || commercial?.sku || "custom-request",
      type,
      name: name.trim().slice(0, 120),
      period: type === "subscription" ? period : undefined,
      notes: notes.trim().slice(0, 1000) || undefined,
      serviceKey: type === "subscription" ? serviceKey || undefined : type === "service" ? commercial?.key : undefined,
      productSlug: type === "product" ? commercial?.key : undefined,
      price_estimate: preset?.unitPriceCents ?? commercial?.priceMinor ?? undefined,
      price_currency: (preset?.currency ?? commercial?.currency) as CommerceCurrency | undefined,
    };
    setItems((previous) => [...previous, newItem]);
    setName("");
    setCatalogKey("");
    setServiceKey("");
    setNotes("");
    toast.success("Adăugat în coș");
  };

  const removeItem = (id: string) => setItems((previous) => previous.filter((item) => item.id !== id));

  const calculateQuote = async () => {
    if (!items.length) return toast.error("Coșul este gol.");
    setQuoting(true);
    try {
      const response = await cfAuth.request<{ quote: Quote }>("/api/commerce/quote", {
        method: "POST",
        body: JSON.stringify({ items: toApiItems(items), promotionCode: promotionCode.trim() || undefined }),
      });
      setQuote(response.quote);
      toast.success(response.quote.promotion ? `Reducere ${response.quote.promotion.discountPercent}% aplicată` : "Preț verificat");
    } catch (error) {
      setQuote(null);
      toast.error(error instanceof Error ? error.message : "Codul promoțional nu poate fi aplicat");
    } finally {
      setQuoting(false);
    }
  };

  const submitOrder = async () => {
    if (!user) return;
    if (!items.length) return toast.error("Coșul este gol.");
    setSubmitting(true);
    try {
      const recurring = items.filter((item) => item.type === "subscription");
      const oneTime = items.filter((item) => item.type !== "subscription");
      const groups = [recurring, oneTime].filter((group) => group.length);
      let remaining = items;
      for (const group of groups) {
        const code = group === recurring && recurring.length ? promotionCode.trim() || undefined : undefined;
        const clientRequestId = await orderIntentId(group, code);
        const response = await cfAuth.request<{ order: Quote & { id: string; status: string } }>("/api/commerce/orders", {
          method: "POST",
          body: JSON.stringify({ items: toApiItems(group), promotionCode: code, clientRequestId }),
        });
        remaining = remaining.filter((item) => !group.some((done) => done.id === item.id));
        writeLocalAccountCart(remaining);
        setItems(remaining);
        await accountCartApi.save(remaining);
        toast.success(`Comanda ${response.order.id.slice(0, 8).toUpperCase()} a fost înregistrată.`);
      }
      setPromotionCode("");
      window.location.assign("/profil?tab=orders");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Comanda nu a putut fi trimisă");
    } finally {
      setSubmitting(false);
    }
  };

  const localSubtotal = useMemo(() => items.reduce((sum, item) => {
    const price = item.price_estimate ?? 0;
    const monthlyRonCents = item.price_currency === "EUR" ? Math.round(price * rate) : price;
    return sum + monthlyRonCents * (item.period === "annual" ? 12 : 1);
  }, 0), [items, rate]);
  const displaySubtotal = quote?.subtotalCents ?? localSubtotal;
  const displayTotal = quote?.totalCents ?? localSubtotal;

  const formatCatalogPrice = (amountCents: number, itemCurrency: CommerceCurrency = "RON", itemPeriod?: string) => {
    const months = itemPeriod === "annual" ? 12 : 1;
    return itemCurrency === "EUR" ? formatEur((amountCents / 100) * months) : formatRonCents(amountCents * months);
  };

  const typeIcon = (itemType: AccountCartType) =>
    itemType === "package" ? <Package className="size-4" aria-hidden="true" /> : itemType === "website" ? <Globe className="size-4" aria-hidden="true" /> : itemType === "subscription" ? <Repeat className="size-4" aria-hidden="true" /> : <Wrench className="size-4" aria-hidden="true" />;

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row">
        <div>
          <h2 className="text-2xl font-display font-bold flex items-center gap-2"><ShoppingCart className="size-6" /> Coșul meu</h2>
          <p className="mt-1 text-xs text-muted-foreground">{cloudSynced ? "Coș sincronizat securizat în contul tău Avyron, disponibil și pe celelalte dispozitive." : "Coșul este păstrat local; sincronizarea în cont se reia automat când API-ul este disponibil."}</p>
          <p className="text-sm text-muted-foreground">Adaugă pachete, abonamente sau cereri personalizate și trimite o singură comandă echipei.</p>
        </div>
        <CurrencySwitch compact className="shrink-0 sm:items-end" />
      </div>
      {currency === "EUR" && (
        <p className="text-[11px] text-muted-foreground">Conversia EUR este informativă; oferta și comanda sunt validate și înregistrate în RON.</p>
      )}

      <Card>
        <CardHeader><CardTitle className="text-lg">Adaugă în coș</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Tip</Label>
            <Select value={type} onValueChange={(value) => { setType(value as AccountCartType); setName(""); setCatalogKey(""); setServiceKey(""); setPeriod("monthly"); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="package">Pachet predefinit</SelectItem>
                <SelectItem value="subscription">Abonament</SelectItem>
                <SelectItem value="service">Serviciu AVYRON</SelectItem>
                <SelectItem value="product">Produs digital</SelectItem>
                <SelectItem value="website">Comandă website</SelectItem>
                <SelectItem value="custom">Personalizat</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Denumire / Pachet</Label>
            {type === "package" ? (
              <Select value={name} onValueChange={(value) => { setName(value); setServiceKey(""); }}>
                <SelectTrigger><SelectValue placeholder="Alege un pachet" /></SelectTrigger>
                <SelectContent>{PRESET_PACKAGES.map((item) => <SelectItem key={item.sku} value={item.name}>{item.name} — {formatCatalogPrice(Number(item.unitPriceCents), item.currency)}</SelectItem>)}</SelectContent>
              </Select>
            ) : type === "subscription" ? (
              <Select value={name} onValueChange={(value) => { setName(value); setServiceKey(""); }}>
                <SelectTrigger><SelectValue placeholder="Alege un abonament" /></SelectTrigger>
                <SelectContent>{SUBSCRIPTION_PLANS.map((item) => <SelectItem key={item.sku} value={item.name}>{item.name} — {formatCatalogPrice(Number(item.unitPriceCents), item.currency)}/lună</SelectItem>)}</SelectContent>
              </Select>
            ) : type === "service" || type === "product" ? (
              <Select value={catalogKey} onValueChange={(key) => { setCatalogKey(key); setName((type === "service" ? catalog.services : catalog.products).find((entry) => entry.key === key)?.name || ""); }}>
                <SelectTrigger><SelectValue placeholder={type === "service" ? "Alege serviciul" : "Alege produsul"} /></SelectTrigger>
                <SelectContent>{(type === "service" ? catalog.services : catalog.products).map((entry) => <SelectItem key={entry.key} value={entry.key}>{entry.name}{entry.priceMinor !== null ? ` · de la ${formatCatalogPrice(entry.priceMinor)}` : " · ofertă"}</SelectItem>)}</SelectContent>
              </Select>
            ) : <Input value={name} onChange={(event) => setName(event.target.value)} maxLength={120} placeholder="Ex: Magazin online beauty" />}
          </div>
          {type === "subscription" && (
            <div className="space-y-1.5"><Label>Perioadă de facturare</Label><Select value={period} onValueChange={(value) => setPeriod(value as (typeof PERIODS)[number]["value"])}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{PERIODS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}{option.value === "annual" ? " · eligibil ANUALAVY20" : ""}</SelectItem>)}</SelectContent></Select></div>
          )}
          {type === "subscription" && <div className="space-y-1.5"><Label>Serviciul asociat (opțional)</Label><Select value={serviceKey || "none"} onValueChange={(value) => setServiceKey(value === "none" ? "" : value)}><SelectTrigger><SelectValue placeholder="Alege serviciul" /></SelectTrigger><SelectContent><SelectItem value="none">Îl stabilesc ulterior</SelectItem>{catalog.services.filter((entry) => { const compatible = subscriptionServiceKeys(commerceItemByName(name)?.sku || ""); return !compatible || compatible.includes(entry.key); }).map((entry) => <SelectItem key={entry.key} value={entry.key}>{entry.name}</SelectItem>)}</SelectContent></Select></div>}
          <div className="space-y-1.5 sm:col-span-2"><Label>Detalii / Cerințe (opțional)</Label><Textarea value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={1000} rows={2} placeholder="Funcționalități dorite, deadline, referințe..." /></div>
          <div className="sm:col-span-2"><Button onClick={addItem} className="gap-2"><Plus className="size-4" /> Adaugă în coș</Button></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="text-lg">Conținutul coșului ({items.length})</CardTitle>
          {displaySubtotal > 0 && <Badge variant="secondary">{quote ? "Subtotal verificat" : "Estimare"}: {formatRonCents(displaySubtotal)}</Badge>}
        </CardHeader>
        <CardContent className="space-y-4">
          {!items.length ? <p className="text-sm text-muted-foreground py-6 text-center">Coșul este gol.</p> : (
            <>
              <ul className="divide-y rounded-md border">
                {items.map((item) => (
                  <li key={item.id} className="flex items-start gap-3 p-3">
                    <div className="size-8 rounded-md bg-primary/10 text-primary grid place-items-center shrink-0">{typeIcon(item.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{item.name}</div>
                      <div className="text-xs text-muted-foreground flex flex-wrap gap-x-2"><span className="uppercase">{item.type}</span>{item.period && <span>· {item.period === "annual" ? "12 luni" : "1 lună"}</span>}{item.price_estimate ? <span>· {formatCatalogPrice(item.price_estimate, item.price_currency, item.period)}</span> : <span>· ofertă personalizată</span>}</div>
                      {item.serviceKey && <p className="mt-1 text-xs text-muted-foreground">Serviciu asociat: {catalog.services.find((entry) => entry.key === item.serviceKey)?.name || item.serviceKey}</p>}
                      {item.notes && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.notes}</p>}
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeItem(item.id)} aria-label="Șterge"><Trash2 className="size-4 text-destructive" /></Button>
                  </li>
                ))}
              </ul>

              <div className="rounded-xl border border-primary/20 bg-primary/[0.035] p-3 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium"><BadgePercent className="size-4 text-primary" /> Cod promoțional</div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input aria-label="Cod promoțional" value={promotionCode} onChange={(event) => { setPromotionCode(event.target.value.toUpperCase()); setQuote(null); }} maxLength={32} autoCapitalize="characters" placeholder="Introdu codul" className="font-mono uppercase" />
                  <Button type="button" variant="outline" onClick={calculateQuote} disabled={quoting}>{quoting ? "Se verifică..." : "Verifică prețul"}</Button>
                </div>
                <p className="text-[11px] text-muted-foreground"><strong className="font-mono text-foreground/80">ANUALAVY20</strong> oferă 20% reducere exclusiv abonamentului ales pentru 12 luni; celelalte produse din coș nu sunt reduse.</p>
                {quote && (
                  <div className="grid gap-1 text-sm border-t pt-3">
                    <div className="flex justify-between"><span className="text-muted-foreground">Subtotal verificat</span><span>{formatRonCents(quote.subtotalCents)}</span></div>
                    {quote.promotion && <div className="flex justify-between text-emerald-600 dark:text-emerald-400"><span>{quote.promotion.code} · {quote.promotion.discountPercent}%</span><span>−{formatRonCents(quote.discountCents)}</span></div>}
                    {quote.promotion?.discountScope === "annual_subscription" && <p className="text-[11px] text-muted-foreground">Bază eligibilă: {formatRonCents(quote.discountBaseCents)} · numai abonamentul anual.</p>}
                    <div className="flex justify-between font-semibold text-base"><span>{quote.requiresManualQuote ? "Sumă calculată până la ofertă" : "Total verificat"}</span><span>{quote.requiresManualQuote && displayTotal === 0 ? "Se confirmă prin ofertă" : formatRonCents(displayTotal)}</span></div>
                    {quote.requiresManualQuote && <p className="text-xs text-muted-foreground">Produsele personalizate vor fi evaluate separat; reducerea se aplică valorii eligibile confirmate.</p>}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="size-4 text-primary" /> Reducerea și totalul sunt validate din nou la trimitere.</div>
              <Button onClick={submitOrder} disabled={submitting} className="w-full gap-2"><Send className="size-4" /> {submitting ? "Se înregistrează..." : "Continuă cu comanda"}</Button>
              {items.some((item) => item.type === "subscription") && items.some((item) => item.type !== "subscription") && <p className="text-xs text-muted-foreground">Abonamentul și elementele cu plată unică vor avea comenzi și plăți separate, pentru a evita reînnoirea celorlalte produse.</p>}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
