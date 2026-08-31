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
import { COMMERCE_CATALOG, commerceItemByName, commerceItemBySku, type CommerceCurrency, type CommerceItemType } from "@/data/commerceCatalog";
import CurrencySwitch from "@/components/site/CurrencySwitch";
import { useCurrency } from "@/hooks/useCurrency";

type CartItem = {
  id: string;
  sku: string;
  type: CommerceItemType;
  name: string;
  period?: string;
  notes?: string;
  price_estimate?: number;
  price_currency?: CommerceCurrency;
};

type Quote = {
  currency: "RON";
  subtotalCents: number;
  promotion: { code: string; label: string; discountPercent: number; discountScope: "order" | "annual_subscription" } | null;
  discountBaseCents: number;
  discountCents: number;
  totalCents: number;
  requiresManualQuote: boolean;
};

const STORAGE_KEY = "avyron_cart_v2";
const LEGACY_STORAGE_KEY = "avyron_cart_v1";
const PRESET_PACKAGES = COMMERCE_CATALOG.filter((item) => item.type === "package" && item.unitPriceCents !== null);
const SUBSCRIPTION_PLANS = COMMERCE_CATALOG.filter((item) => item.type === "subscription" && item.unitPriceCents !== null);
const PERIODS = [
  { value: "monthly", label: "1 lună" },
  { value: "annual", label: "12 luni" },
] as const;

const toApiItems = (items: CartItem[]) => items.map((item) => ({
  sku: item.sku,
  quantity: 1,
  period: item.period,
  notes: item.notes,
  description: item.sku === "custom-request" ? item.name : undefined,
}));

const restoreItems = (raw: string): CartItem[] => {
  const parsed = JSON.parse(raw) as Array<Partial<CartItem>>;
  if (!Array.isArray(parsed)) return [];
  return parsed.slice(0, 20).flatMap((item) => {
    const catalogItem = commerceItemBySku(String(item.sku ?? "")) || commerceItemByName(String(item.name ?? ""));
    const name = String(item.name ?? "").trim().slice(0, 120);
    if (!name) return [];
    return [{
      id: String(item.id || crypto.randomUUID()),
      sku: catalogItem?.sku || "custom-request",
      type: catalogItem?.type || item.type || "custom",
      name: catalogItem?.name || name,
      period: catalogItem?.type === "subscription"
        ? ["annual", "12 luni"].includes(String(item.period ?? "")) ? "annual" : "monthly"
        : undefined,
      notes: item.notes ? String(item.notes).slice(0, 1000) : undefined,
      price_estimate: catalogItem?.unitPriceCents ?? undefined,
      price_currency: catalogItem?.currency,
    } satisfies CartItem];
  });
};

export function CartTab() {
  const { user } = useAuth();
  const { currency, formatEur, formatRonCents, rate } = useCurrency("ro-RO");
  const [items, setItems] = useState<CartItem[]>([]);
  const [type, setType] = useState<CommerceItemType>("package");
  const [name, setName] = useState("");
  const [period, setPeriod] = useState<(typeof PERIODS)[number]["value"]>(PERIODS[0].value);
  const [notes, setNotes] = useState("");
  const [promotionCode, setPromotionCode] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
      if (raw) setItems(restoreItems(raw));
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch {
      // Start with an empty local cart when storage is unavailable or invalid.
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    setQuote(null);
  }, [items]);

  const addItem = () => {
    if (!name.trim()) return toast.error("Adaugă o denumire pentru element.");
    const preset = type === "package" || type === "subscription" ? commerceItemByName(name) : null;
    if (type === "subscription" && !preset) return toast.error("Alege unul dintre abonamentele disponibile.");
    if (type === "subscription" && items.some((item) => item.type === "subscription")) {
      return toast.error("O comandă poate conține un singur abonament selectat.");
    }
    const newItem: CartItem = {
      id: crypto.randomUUID(),
      sku: preset?.sku || "custom-request",
      type,
      name: name.trim().slice(0, 120),
      period: type === "subscription" ? period : undefined,
      notes: notes.trim().slice(0, 1000) || undefined,
      price_estimate: preset?.unitPriceCents ?? undefined,
      price_currency: preset?.currency,
    };
    setItems((previous) => [...previous, newItem]);
    setName("");
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
      const response = await cfAuth.request<{ order: Quote & { id: string; status: string } }>("/api/commerce/orders", {
        method: "POST",
        body: JSON.stringify({ items: toApiItems(items), promotionCode: promotionCode.trim() || undefined }),
      });
      setItems([]);
      setPromotionCode("");
      toast.success(`Comanda ${response.order.id.slice(0, 8).toUpperCase()} a fost înregistrată în siguranță.`);
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

  const typeIcon = (itemType: CommerceItemType) =>
    itemType === "package" ? <Package className="size-4" aria-hidden="true" /> : itemType === "website" ? <Globe className="size-4" aria-hidden="true" /> : itemType === "subscription" ? <Repeat className="size-4" aria-hidden="true" /> : <Wrench className="size-4" aria-hidden="true" />;

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row">
        <div>
          <h2 className="text-2xl font-display font-bold flex items-center gap-2"><ShoppingCart className="size-6" /> Coșul meu</h2>
          <p className="mt-1 text-xs text-muted-foreground">Coșul rămâne local până la trimitere; prețul și orice reducere sunt recalculate securizat de Avyron API.</p>
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
            <Select value={type} onValueChange={(value) => { setType(value as CommerceItemType); setName(""); setPeriod("monthly"); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="package">Pachet predefinit</SelectItem>
                <SelectItem value="subscription">Abonament</SelectItem>
                <SelectItem value="website">Comandă website</SelectItem>
                <SelectItem value="custom">Personalizat</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Denumire / Pachet</Label>
            {type === "package" ? (
              <Select value={name} onValueChange={setName}>
                <SelectTrigger><SelectValue placeholder="Alege un pachet" /></SelectTrigger>
                <SelectContent>{PRESET_PACKAGES.map((item) => <SelectItem key={item.sku} value={item.name}>{item.name} — {formatCatalogPrice(Number(item.unitPriceCents), item.currency)}</SelectItem>)}</SelectContent>
              </Select>
            ) : type === "subscription" ? (
              <Select value={name} onValueChange={setName}>
                <SelectTrigger><SelectValue placeholder="Alege un abonament" /></SelectTrigger>
                <SelectContent>{SUBSCRIPTION_PLANS.map((item) => <SelectItem key={item.sku} value={item.name}>{item.name} — {formatCatalogPrice(Number(item.unitPriceCents), item.currency)}/lună</SelectItem>)}</SelectContent>
              </Select>
            ) : <Input value={name} onChange={(event) => setName(event.target.value)} maxLength={120} placeholder="Ex: Magazin online beauty" />}
          </div>
          {type === "subscription" && (
            <div className="space-y-1.5"><Label>Perioadă de facturare</Label><Select value={period} onValueChange={(value) => setPeriod(value as (typeof PERIODS)[number]["value"])}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{PERIODS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}{option.value === "annual" ? " · eligibil ANUALAVY20" : ""}</SelectItem>)}</SelectContent></Select></div>
          )}
          <div className="space-y-1.5 sm:col-span-2"><Label>Detalii / Cerințe (opțional)</Label><Textarea value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={1000} rows={2} placeholder="Funcționalități dorite, deadline, referințe..." /></div>
          <div className="sm:col-span-2"><Button onClick={addItem} className="gap-2"><Plus className="size-4" /> Adaugă în coș</Button></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="text-lg">Conținutul coșului ({items.length})</CardTitle>
          {displaySubtotal > 0 && <Badge variant="secondary">Subtotal: {formatRonCents(displaySubtotal)}</Badge>}
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
                    <div className="flex justify-between font-semibold text-base"><span>Total estimat</span><span>{formatRonCents(displayTotal)}</span></div>
                    {quote.requiresManualQuote && <p className="text-xs text-muted-foreground">Produsele personalizate vor fi evaluate separat; reducerea se aplică valorii eligibile confirmate.</p>}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="size-4 text-primary" /> Reducerea și totalul sunt validate din nou la trimitere.</div>
              <Button onClick={submitOrder} disabled={submitting} className="w-full gap-2"><Send className="size-4" /> {submitting ? "Se înregistrează..." : "Trimite comanda către echipă"}</Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
