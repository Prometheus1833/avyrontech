import { cartDisplayItem, type Catalog } from "@/lib/clientCommerce";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShoppingCart, Plus, Trash2, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAccountCart } from "@/hooks/useAccountCart";
import { useCurrency } from "@/hooks/useCurrency";
import { cfAuth } from "@/lib/cfAuth";
import {
  COMMERCE_CATALOG,
  subscriptionServiceKeys,
} from "@/data/commerceCatalog";
import { ANNUAL_PROMOTION_CODE } from "@/lib/subscriptionCheckout";
import { type AccountCartItem, type AccountCartType } from "@/lib/accountCart";
import CurrencySwitch from "@/components/site/CurrencySwitch";
type Quote = {
  items?: {
    lineTotalCents: number | null;
    referenceUnitPriceCents: number | null;
    referenceCurrency: string;
    billingMonths: number;
  }[];
  subtotalCents: number;
  totalCents: number;
  discountCents: number;
  requiresManualQuote: boolean;
  promotion: null | { code: string; discountPercent: number };
};
const apiItems = (items: AccountCartItem[]) =>
  items.map((item) => ({
    sku: item.sku,
    quantity: 1,
    period: item.period,
    notes: item.notes,
    description: item.sku === "custom-request" ? item.name : undefined,
    serviceKey: item.serviceKey,
    productSlug: item.productSlug,
  }));
const intent = async (items: AccountCartItem[], promotionCode?: string) =>
  Array.from(
    new Uint8Array(
      await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(
          JSON.stringify({
            items: items.map((item) => ({
              id: item.id,
              ...apiItems([item])[0],
            })),
            promotionCode: promotionCode || "",
          }),
        ),
      ),
    ),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
export function CartTab() {
  const cart = useAccountCart(),
    navigate = useNavigate(),
    { formatRonCents, formatEur, rate, currency } = useCurrency("ro-RO");
  const [catalog, setCatalog] = useState<Catalog>({
      services: [],
      products: [],
    }),
    [catalogReady, setCatalogReady] = useState(false),
    [catalogError, setCatalogError] = useState(false),
    [catalogRevision, setCatalogRevision] = useState(0),
    [quoteRevision, setQuoteRevision] = useState(0);
  const [adding, setAdding] = useState(false),
    [type, setType] = useState<AccountCartType>("service"),
    [choice, setChoice] = useState(""),
    [period, setPeriod] = useState<"monthly" | "annual">("monthly"),
    [service, setService] = useState(""),
    [name, setName] = useState(""),
    [notes, setNotes] = useState("");
  const [code, setCode] = useState(""),
    [appliedCode, setAppliedCode] = useState(""),
    [quote, setQuote] = useState<Quote | null>(null),
    [quoting, setQuoting] = useState(false),
    [quoteError, setQuoteError] = useState(""),
    [submitting, setSubmitting] = useState(false);
  const submitLock = useRef(false),
    quoteEpoch = useRef(0);
  useEffect(() => {
    let active = true;
    setCatalogReady(false);
    setCatalogError(false);
    void cfAuth
      .request<Catalog>("/api/commerce/catalog")
      .then((data) => {
        if (active) {
          setCatalog({
            services: data.services || [],
            products: data.products || [],
            subscriptions: data.subscriptions,
          });
          setCatalogReady(true);
        }
      })
      .catch(() => {
        if (active) setCatalogError(true);
      });
    return () => {
      active = false;
    };
  }, [catalogRevision]);
  const display = useMemo(
    () => cart.items.map((item) => cartDisplayItem(item, catalog)),
    [cart.items, catalog],
  );
  const orderItems = useMemo(
    () => display.filter((item) => item.type !== "partnership"),
    [display],
  );
  const hasPlans = display.some((item) => item.type === "partnership");
  const [planPrices, setPlanPrices] = useState<Record<string, number>>({});
  useEffect(() => {
    if (!hasPlans) return;
    let active = true;
    void cfAuth
      .request<{ data: { id: string; price_ron_cents: number }[] }>(
        "/api/produse/public/plans",
      )
      .then((result) => {
        if (active)
          setPlanPrices(
            Object.fromEntries(
              (result.data || [])
                .filter(
                  (plan) =>
                    Number.isSafeInteger(plan.price_ron_cents) &&
                    plan.price_ron_cents >= 0,
                )
                .map((plan) => [
                  `partnership-${plan.id}`,
                  plan.price_ron_cents,
                ]),
            ),
          );
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [hasPlans]);
  const signature = JSON.stringify(apiItems(orderItems));
  const subscriptionCount = orderItems.filter(item => item.type === "subscription").length;
  useEffect(() => {
    const annual = cart.items.some(
      (item) => item.type === "subscription" && item.period === "annual",
    );
    if (annual) {
      setAppliedCode((current) => current || ANNUAL_PROMOTION_CODE);
      setCode((current) => current || ANNUAL_PROMOTION_CODE);
    } else {
      setAppliedCode((current) =>
        current === ANNUAL_PROMOTION_CODE ? "" : current,
      );
      setCode((current) => (current === ANNUAL_PROMOTION_CODE ? "" : current));
    }
  }, [cart.items]);
  useEffect(() => {
    const counter = quoteEpoch;
    const epoch = ++counter.current;
    setQuote(null);
    setQuoteError("");
    setQuoting(false);
    if (!orderItems.length || !catalogReady) return;
    if (subscriptionCount > 1) {
      setQuoteError("Păstrează un singur abonament în coș pentru această comandă.");
      return;
    }
    setQuoting(true);
    const timer = setTimeout(() => {
      void cfAuth
        .request<{ quote: Quote }>("/api/commerce/quote", {
          method: "POST",
          body: JSON.stringify({
            items: JSON.parse(signature),
            promotionCode: appliedCode || undefined,
          }),
        })
        .then((result) => {
          if (epoch === quoteEpoch.current) setQuote(result.quote);
        })
        .catch(() => {
          if (epoch === quoteEpoch.current)
            setQuoteError(
              "Prețul final nu poate fi verificat acum. Reîncearcă înainte de comandă.",
            );
        })
        .finally(() => {
          if (epoch === quoteEpoch.current) setQuoting(false);
        });
    }, 300);
    return () => {
      clearTimeout(timer);
      counter.current++;
    };
  }, [signature, appliedCode, catalogReady, quoteRevision, orderItems.length, subscriptionCount]);
  const options =
    type === "service"
      ? catalog.services.map((e) => ({
          id: e.key,
          name: e.name,
          price: e.priceMinor,
          currency: e.currency,
        }))
      : type === "product"
        ? catalog.products.map((e) => ({
            id: e.key,
            name: e.name,
            price: e.priceMinor,
            currency: e.currency,
          }))
        : COMMERCE_CATALOG.filter(
            (e) => e.type === type && e.unitPriceCents !== null,
          ).map((e) => ({
            id: e.sku,
            name: e.name,
            price: e.unitPriceCents,
            currency: e.currency,
          }));
  const money = (amount: number, unit = "RON", annual = false) => {
    if (unit === "EUR") return formatEur((amount / 100) * (annual ? 12 : 1));
    if (unit === "RON") return formatRonCents(amount * (annual ? 12 : 1));
    try {
      return new Intl.NumberFormat("ro-RO", {
        style: "currency",
        currency: unit,
      }).format((amount / 100) * (annual ? 12 : 1));
    } catch {
      return "Preț la ofertă";
    }
  };
  const estimate = orderItems.reduce((sum, item, index) => {
    const line = quote?.items?.[index];
    const amount = line ? line.referenceUnitPriceCents : item.price_estimate;
    const unit = line?.referenceCurrency || item.price_currency;
    if (unit && unit !== "RON" && unit !== "EUR") return sum;
    return (
      sum +
      (amount ?? 0) *
        (unit === "EUR" ? rate : 1) *
        (line?.billingMonths || (item.period === "annual" ? 12 : 1))
    );
  }, 0);
  const linePrice = (item: AccountCartItem) => {
    if (item.type === "partnership")
      return planPrices[item.sku] !== undefined
        ? `${formatRonCents(planPrices[item.sku])} / an`
        : "Preț disponibil în Produse";
    if (!catalogReady) return "Se actualizează prețul…";
    const line =
      quote?.items?.[orderItems.findIndex((entry) => entry.id === item.id)];
    if (line) {
      if (typeof line.lineTotalCents === "number")
        return formatRonCents(line.lineTotalCents);
      return line.referenceUnitPriceCents === null
        ? "Preț la ofertă"
        : money(
            line.referenceUnitPriceCents,
            line.referenceCurrency,
            line.billingMonths === 12,
          );
    }
    return item.price_estimate === undefined
      ? "Preț la ofertă"
      : money(
          item.price_estimate,
          item.price_currency,
          item.period === "annual",
        );
  };
  const add = () => {
    const entry = options.find((e) => e.id === choice);
    if (type !== "custom" && !entry) return;
    if (cart.items.length >= 20)
      return toast.error("Poți adăuga cel mult 20 de elemente.");
    if (
      type === "subscription" &&
      cart.items.some((item) => item.type === "subscription")
    )
      return toast.error("Păstrează un singur abonament în această comandă.");
    const commercial = (
      type === "service"
        ? catalog.services
        : type === "product"
          ? catalog.products
          : []
    ).find((e) => e.key === choice);
    const item: AccountCartItem = {
      id: crypto.randomUUID(),
      source: "dashboard",
      type,
      name: type === "custom" ? name.trim() : entry!.name,
      sku:
        commercial?.sku ||
        (type === "service" || type === "product" || type === "custom"
          ? "custom-request"
          : choice),
      period: type === "subscription" ? period : undefined,
      serviceKey:
        type === "service"
          ? choice
          : type === "subscription"
            ? service || undefined
            : undefined,
      productSlug: type === "product" ? choice : undefined,
      notes: notes.trim() || undefined,
    };
    if (!item.name) return;
    if (
      cart.items.some(
        (old) =>
          old.sku === item.sku &&
          old.name === item.name &&
          old.period === item.period &&
          old.serviceKey === item.serviceKey &&
          old.productSlug === item.productSlug,
      )
    )
      return toast.info("Elementul este deja în coș.");
    cart.replace([...cart.items, item]);
    setChoice("");
    setName("");
    setService("");
    setNotes("");
    setAdding(false);
    toast.success("Adăugat în coș");
  };
  const submit = async () => {
    if (submitLock.current || !quote || quoting || !display.length) return;
    submitLock.current = true;
    setSubmitting(true);
    const snapshot = orderItems;
    try {
      const recurring = snapshot.filter((item) => item.type === "subscription"),
        oneTime = snapshot.filter((item) => item.type !== "subscription");
      let remaining = cart.items;
      for (const group of [recurring, oneTime].filter(
        (group) => group.length,
      )) {
        const promotionCode = recurring.length
          ? group === recurring
            ? appliedCode || undefined
            : undefined
          : appliedCode || undefined;
        const result = await cfAuth.request<{ order: { id: string } }>(
          "/api/commerce/orders",
          {
            method: "POST",
            body: JSON.stringify({
              items: apiItems(group),
              promotionCode,
              clientRequestId: await intent(group, promotionCode),
            }),
          },
        );
        remaining = remaining.filter(
          (item) => !group.some((done) => done.id === item.id),
        );
        cart.replace(remaining);
        toast.success(
          `Comanda ${result.order.id.slice(0, 8).toUpperCase()} a fost înregistrată.`,
        );
      }
      await cart.flush().catch(() => {});
      navigate("/profil?tab=orders");
    } catch (cause) {
      toast.error(
        cause instanceof Error
          ? cause.message
          : "Comanda nu a putut fi înregistrată.",
      );
    } finally {
      setSubmitting(false);
      submitLock.current = false;
    }
  };
  const selectClass =
    "h-10 min-w-0 w-full rounded-lg border bg-background px-2 text-sm";
  return (
    <section aria-label="Coșul meu" className="mx-auto max-w-4xl space-y-3">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold">
            <ShoppingCart className="size-5" /> Coșul meu
          </h1>
          <p role="status" className="mt-1 text-xs text-slate-400">
            {cart.loading
              ? "Se încarcă din cont…"
              : cart.syncing
                ? "Se sincronizează…"
                : cart.synced
                  ? "Sincronizat în cont"
                  : "Modificări păstrate local"}
          </p>
        </div>
        <CurrencySwitch compact showDetails={false} />
      </header>
      {cart.error && (
        <div
          role="alert"
          className="rounded-lg border border-amber-400/30 p-3 text-xs"
        >
          {cart.error}
          <button onClick={() => void cart.retry()} className="ml-2 underline">
            Reîncearcă sincronizarea
          </button>
        </div>
      )}
      {catalogError && (
        <p role="alert" className="text-sm text-amber-200">
          Catalogul nu poate fi actualizat.{" "}
          <button
            className="underline"
            onClick={() => setCatalogRevision((v) => v + 1)}
          >
            Reîncearcă
          </button>
        </p>
      )}
      <div className="rounded-xl border border-white/10 bg-white/[.025] p-3 sm:p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold">
            Conținutul coșului ({cart.items.length})
          </h2>
          <Button
            size="sm"
            variant="outline"
            className="shrink-0 px-2 sm:px-3"
            aria-label="Adaugă un element"
            disabled={submitting}
            onClick={() => setAdding((value) => !value)}
            aria-expanded={adding}
          >
            <Plus className="size-4 sm:mr-1" />
            <span className="hidden sm:inline">Adaugă un element</span>
          </Button>
        </div>
        {!cart.items.length ? (
          <div className="py-5 text-center">
            <p className="text-sm text-slate-400">
              {cart.loading
                ? "Se verifică elementele salvate în cont…"
                : "Coșul este gol."}
            </p>
            <Button
              size="sm"
              className="mt-3"
              onClick={() => navigate("/profil?tab=catalog")}
            >
              Alege un serviciu
            </Button>
          </div>
        ) : (
          <ul className="divide-y divide-white/10">
            {display.map((item) => (
              <li key={item.id} className="flex min-w-0 items-start gap-2 py-3">
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm font-medium">{item.name}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {item.period === "annual"
                      ? "12 luni"
                      : item.period === "monthly"
                        ? "Lunar"
                        : item.type === "product"
                          ? "Produs digital"
                          : "Serviciu / pachet"}
                  </p>
                  {item.notes && (
                    <p className="mt-1 break-words text-xs text-slate-400">
                      {item.notes}
                    </p>
                  )}
                  <p className="mt-1 text-sm font-semibold text-violet-200">
                    {linePrice(item)}
                  </p>
                  {item.type === "partnership" && (
                    <button
                      className="mt-2 text-xs text-violet-200 underline"
                      onClick={() => navigate("/produse#parteneriate")}
                    >
                      Deschide planul în Produse
                    </button>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="!bg-transparent !text-slate-400 hover:!bg-red-400/10 hover:!text-red-300"
                  disabled={submitting}
                  aria-label={`Șterge ${item.name}`}
                  onClick={() =>
                    cart.replace(cart.items.filter((old) => old.id !== item.id))
                  }
                >
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {adding && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            add();
          }}
          className="grid gap-3 rounded-xl border border-white/10 p-3 sm:grid-cols-2"
          aria-label="Adaugă în coș"
        >
          <label className="space-y-1 text-xs">
            Tip
            <select
              className={selectClass}
              value={type}
              onChange={(e) => {
                setType(e.target.value as AccountCartType);
                setChoice("");
                setService("");
              }}
            >
              {[
                ["service", "Serviciu"],
                ["product", "Produs digital"],
                ["subscription", "Abonament"],
                ["package", "Pachet"],
                ["custom", "Personalizat"],
              ].map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          {type === "custom" ? (
            <label className="space-y-1 text-xs">
              Denumire
              <Input
                required
                maxLength={120}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
          ) : (
            <label className="space-y-1 text-xs">
              {type === "subscription"
                ? "Abonament"
                : type === "product"
                  ? "Produs"
                  : "Serviciu / pachet"}
              <select
                required
                className={selectClass}
                value={choice}
                onChange={(e) => {
                  setChoice(e.target.value);
                  setService("");
                }}
              >
                <option value="">Selectează din catalog</option>
                {options.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.name}
                    {entry.price !== null
                      ? ` · ${money(entry.price, entry.currency)}`
                      : " · ofertă"}
                  </option>
                ))}
              </select>
            </label>
          )}
          {type === "subscription" && (
            <>
              <label className="space-y-1 text-xs">
                Perioadă
                <select
                  className={selectClass}
                  value={period}
                  onChange={(e) => setPeriod(e.target.value as typeof period)}
                >
                  <option value="monthly">1 lună</option>
                  <option value="annual">12 luni</option>
                </select>
              </label>
              <label className="space-y-1 text-xs">
                Serviciu asociat (opțional)
                <select
                  className={selectClass}
                  value={service}
                  onChange={(e) => setService(e.target.value)}
                >
                  <option value="">Îl stabilesc ulterior</option>
                  {catalog.services
                    .filter((entry) => {
                      const compatible = subscriptionServiceKeys(choice);
                      return !compatible || compatible.includes(entry.key);
                    })
                    .map((entry) => (
                      <option key={entry.key} value={entry.key}>
                        {entry.name}
                      </option>
                    ))}
                </select>
              </label>
            </>
          )}
          <label className="space-y-1 text-xs sm:col-span-2">
            Cerințe (opțional)
            <textarea
              className="block w-full rounded-lg border bg-background p-2 text-sm"
              rows={2}
              maxLength={1000}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
          <Button
            type="submit"
            size="sm"
            disabled={submitting || (!catalogReady && type !== "custom")}
          >
            Adaugă în coș
          </Button>
        </form>
      )}
      {!!orderItems.length && (
        <div className="space-y-3 rounded-xl border border-violet-400/20 bg-violet-500/[.04] p-3 sm:p-4">
          <form
            className="grid grid-cols-[minmax(0,1fr)_auto] gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setAppliedCode(code.trim().toUpperCase());
              setQuoteRevision((v) => v + 1);
            }}
          >
            <Input
              aria-label="Cod promoțional"
              placeholder="Cod promoțional (opțional)"
              maxLength={32}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="min-w-0 text-sm"
            />
            <Button
              type="submit"
              size="sm"
              variant="outline"
              disabled={quoting || submitting}
            >
              Aplică
            </Button>
          </form>
          {quoteError && (
            <p role="alert" className="text-xs text-amber-200">
              {quoteError}{" "}
              <button
                className="underline"
                onClick={() => setQuoteRevision((v) => v + 1)}
              >
                Reîncearcă prețul
              </button>
            </p>
          )}
          <dl className="space-y-2 text-sm">
            {quote?.requiresManualQuote && estimate > 0 && (
              <div className="flex justify-between gap-2">
                <dt>Referință din catalog</dt>
                <dd>{formatRonCents(Math.round(estimate))}</dd>
              </div>
            )}
            {!!quote?.discountCents && (
              <div className="flex justify-between gap-2 text-emerald-300">
                <dt>Reducere · {quote.promotion?.discountPercent}%</dt>
                <dd>−{formatRonCents(quote.discountCents)}</dd>
              </div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-2 text-base font-semibold">
              <dt>
                {quote?.requiresManualQuote
                  ? "Total de confirmat prin ofertă"
                  : "Total"}
              </dt>
              <dd aria-live="polite">
                {quoting
                  ? "Se verifică…"
                  : quote
                    ? quote.requiresManualQuote && quote.totalCents === 0
                      ? "La ofertă"
                      : formatRonCents(quote.totalCents)
                    : catalogReady && estimate > 0
                      ? `${formatRonCents(Math.round(estimate))} estimativ`
                      : "De verificat"}
              </dd>
            </div>
          </dl>
          {currency === "EUR" && (
            <p className="text-xs text-slate-400">
              Comanda se înregistrează în RON; conversia EUR este orientativă.
            </p>
          )}
          <Button
            className="w-full gap-2 !bg-violet-600 !text-white hover:!bg-violet-500"
            onClick={() => void submit()}
            disabled={submitting || quoting || !quote || !catalogReady}
          >
            <Send className="size-4" />
            {submitting ? "Se înregistrează…" : "Continuă cu comanda"}
          </Button>
          <p className="text-[11px] text-slate-400">
            Totalul este verificat din nou la înregistrare. Abonamentele au
            plăți separate de produsele cu plată unică.
            {hasPlans &&
              " Planurile AVY Partener se finalizează separat din Produse."}
          </p>
        </div>
      )}
    </section>
  );
}
