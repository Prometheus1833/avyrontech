import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BadgePercent, CheckCircle2, CreditCard, Loader2, LogIn, Repeat, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useLang } from "@/i18n/LanguageContext";
import { cfAuth } from "@/lib/cfAuth";
import { trackEvent } from "@/lib/analytics";
import { useDualPrice } from "@/hooks/useDualPrice";
import type { SubscriptionCategory, SubscriptionPlan } from "@/data/subscriptionPlans";
import {
  BILLING_PERIODS, PAYMENT_GATEWAY_ENABLED, authStateFor, buildOrderItems, type BillingPeriod,
} from "@/lib/subscriptionCheckout";

type Quote = {
  currency: "RON";
  subtotalCents: number;
  promotion: { code: string; label: string; discountPercent: number; discountScope: "order" | "annual_subscription" } | null;
  discountBaseCents: number;
  discountCents: number;
  totalCents: number;
  requiresManualQuote: boolean;
};

type Props = {
  selection: { plan: SubscriptionPlan; category: SubscriptionCategory } | null;
  pagePath: string;
  onClose: () => void;
};

const PlanCheckout = ({ selection, pagePath, onClose }: Props) => {
  const { lang } = useLang();
  const ro = lang === "ro";
  const { user } = useAuth();
  const { primary, secondary, converted } = useDualPrice(ro ? "ro-RO" : "en-IE");

  const [period, setPeriod] = useState<BillingPeriod>(BILLING_PERIODS[0]);
  const [promotionCode, setPromotionCode] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);

  const plan = selection?.plan ?? null;
  const category = selection?.category ?? null;

  useEffect(() => {
    setQuote(null);
    setOrderId(null);
    setPromotionCode("");
    setPeriod(BILLING_PERIODS[0]);
  }, [plan?.sku]);

  const refreshQuote = useCallback(async (code?: string) => {
    if (!plan || !user) return;
    setLoading(true);
    try {
      const response = await cfAuth.request<{ quote: Quote }>("/api/commerce/quote", {
        method: "POST",
        body: JSON.stringify({
          items: buildOrderItems(plan.sku, period),
          promotionCode: code?.trim() || undefined,
        }),
      });
      setQuote(response.quote);
      if (code && response.quote.promotion) {
        toast.success(ro
          ? `Reducere ${response.quote.promotion.discountPercent}% aplicată`
          : `${response.quote.promotion.discountPercent}% discount applied`);
      }
    } catch (error) {
      if (code) {
        toast.error(error instanceof Error && error.message
          ? error.message
          : ro ? "Codul promoțional nu poate fi aplicat" : "The promo code cannot be applied");
      }
      setQuote(null);
    } finally {
      setLoading(false);
    }
  }, [plan, period, ro, user]);

  useEffect(() => {
    if (!plan || !user) return;
    void refreshQuote();
  }, [plan, user, period, refreshQuote]);

  const submitOrder = async () => {
    if (!plan || !category || !user) return;
    setSubmitting(true);
    try {
      const response = await cfAuth.request<{ order: { id: string } }>("/api/commerce/orders", {
        method: "POST",
        body: JSON.stringify({
          items: buildOrderItems(plan.sku, period),
          promotionCode: promotionCode.trim() || undefined,
        }),
      });
      setOrderId(response.order.id);
      trackEvent("subscription_order_created", {
        sku: plan.sku,
        category: category.key,
        tier: plan.tier,
        months: period.months,
      });
    } catch (error) {
      toast.error(error instanceof Error && error.message
        ? error.message
        : ro ? "Cererea nu a putut fi trimisă" : "The request could not be sent");
    } finally {
      setSubmitting(false);
    }
  };

  if (!plan || !category) return null;

  const theme = category.theme;
  const localTotal = plan.priceCents * period.months;
  const subtotal = quote?.subtotalCents ?? localTotal;
  const total = quote?.totalCents ?? localTotal;

  return (
    <Dialog open={Boolean(selection)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {orderId
              ? (ro ? "Abonament înregistrat" : "Subscription registered")
              : `${category.copy[lang].title} · ${plan.name}`}
          </DialogTitle>
          <DialogDescription>
            {orderId
              ? (ro
                ? "Îl găsești în contul tău, la Produse & Servicii, și îl legăm de proiectul tău din platformă imediat ce plata este confirmată."
                : "You'll find it in your account, under Products & Services, and we attach it to your project in the platform as soon as the payment is confirmed.")
              : plan.copy[lang].bestFor}
          </DialogDescription>
        </DialogHeader>

        {orderId ? (
          <div className="space-y-4">
            <div className={`flex items-start gap-3 rounded-2xl border ${theme.border} bg-foreground/[0.03] p-4`}>
              <CheckCircle2 className={`mt-0.5 size-5 shrink-0 ${theme.text}`} aria-hidden />
              <div className="text-sm">
                <p className="font-semibold">
                  {ro ? "Comanda" : "Order"} {orderId.slice(0, 8).toUpperCase()}
                </p>
                <p className="mt-1 text-foreground/70">
                  {ro
                    ? "Ai primit confirmarea pe email. Un coleg îți trimite factura și detaliile de plată în cel mult o zi lucrătoare."
                    : "You have the confirmation by email. A colleague sends the invoice and payment details within one working day."}
                </p>
              </div>
            </div>
            <Link
              to="/profil?tab=subscriptions"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background transition-colors hover:bg-foreground/90"
            >
              {ro ? "Vezi în cont" : "See it in my account"}
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        ) : !user ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-foreground/12 bg-foreground/[0.03] p-4 text-sm text-foreground/75">
              {ro
                ? "Abonamentele se activează dintr-un cont Avyron, ca să poți vedea oricând facturile, rapoartele și starea colaborării."
                : "Subscriptions are activated from an Avyron account, so you can always see invoices, reports and the state of the collaboration."}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Link
                to="/auth"
                state={authStateFor(pagePath, plan.sku)}
                className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r ${theme.from} ${theme.to} px-4 py-2.5 text-sm font-bold text-white transition-transform hover:-translate-y-0.5`}
              >
                <LogIn className="size-4" aria-hidden />
                {ro ? "Autentifică-te" : "Sign in"}
              </Link>
              <a
                href={`https://wa.me/40734605055?text=${encodeURIComponent(
                  ro
                    ? `Bună! Aș dori abonamentul ${category.copy.ro.title} — ${plan.name}.`
                    : `Hi! I'd like the ${category.copy.en.title} — ${plan.name} plan.`,
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-foreground/15 px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-foreground/[0.06]"
              >
                {ro ? "Întreabă pe WhatsApp" : "Ask on WhatsApp"}
              </a>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-foreground/65">
                {ro ? "Ritm de facturare" : "Billing rhythm"}
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {BILLING_PERIODS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setPeriod(option)}
                    aria-pressed={period.value === option.value}
                    className={`rounded-xl border px-3 py-2.5 text-left transition-colors ${
                      period.value === option.value
                        ? `${theme.border} bg-foreground/[0.08] ${theme.text}`
                        : "border-foreground/12 text-foreground/65 hover:bg-foreground/[0.05]"
                    }`}
                  >
                    <span className="block text-xs font-semibold">{ro ? option.ro : option.en}</span>
                    <span className="mt-0.5 block text-[10px] text-foreground/65">{ro ? option.hintRo : option.hintEn}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-foreground/12 bg-foreground/[0.03] p-4">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="inline-flex items-center gap-2 text-foreground/70">
                  <Repeat className="size-4" aria-hidden />
                  {plan.name} · {period.months} {ro ? (period.months === 1 ? "lună" : "luni") : period.months === 1 ? "month" : "months"}
                </span>
                <span className="font-semibold">{primary(subtotal)}</span>
              </div>
              {quote?.promotion && (
                <div className="mt-2 flex items-center justify-between gap-3 text-sm">
                  <span className={`inline-flex items-center gap-2 ${theme.text}`}>
                    <BadgePercent className="size-4" aria-hidden />
                    {quote.promotion.label} (−{quote.promotion.discountPercent}%)
                  </span>
                  <span className="font-semibold">−{primary(quote.discountCents)}</span>
                </div>
              )}
              <div className="mt-3 flex items-end justify-between gap-3 border-t border-foreground/10 pt-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-foreground/65">{ro ? "Total" : "Total"}</p>
                  <p className="text-[11px] text-foreground/65">{converted ? `${ro ? "facturat" : "billed"} ` : "≈ "}{secondary(total)}</p>
                </div>
                <div className="text-right">
                  <span className="font-display text-2xl font-extrabold">{primary(total)}</span>
                  {loading && <Loader2 className="ml-2 inline size-3.5 animate-spin text-foreground/65" aria-hidden />}
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Input
                value={promotionCode}
                onChange={(event) => setPromotionCode(event.target.value.toUpperCase())}
                maxLength={32}
                placeholder={ro ? "Cod promoțional" : "Promo code"}
                className="h-10"
              />
              <button
                type="button"
                onClick={() => refreshQuote(promotionCode)}
                disabled={loading || !promotionCode.trim()}
                className="shrink-0 rounded-xl border border-foreground/15 px-4 text-sm font-semibold transition-colors hover:bg-foreground/[0.06] disabled:opacity-40"
              >
                {ro ? "Aplică" : "Apply"}
              </button>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                disabled={!PAYMENT_GATEWAY_ENABLED}
                title={PAYMENT_GATEWAY_ENABLED ? undefined : ro ? "Plata cu cardul se activează în curând" : "Card payment is coming soon"}
                className={`inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r ${theme.from} ${theme.to} px-4 py-3 text-sm font-bold text-white transition-transform disabled:cursor-not-allowed disabled:opacity-45`}
              >
                <CreditCard className="size-4" aria-hidden />
                {ro ? "Plătește cu cardul" : "Pay by card"}
                {!PAYMENT_GATEWAY_ENABLED && (
                  <span className="rounded-full bg-white/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em]">
                    {ro ? "În curând" : "Soon"}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={submitOrder}
                disabled={submitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-3 text-sm font-bold text-background transition-colors hover:bg-foreground/90 disabled:opacity-50"
              >
                {submitting ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <CheckCircle2 className="size-4" aria-hidden />}
                {ro ? "Activează abonamentul" : "Activate the subscription"}
              </button>
              <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-foreground/70">
                <ShieldCheck className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                {ro
                  ? "Prețul este recalculat de serverul Avyron în RON; conversia în euro este informativă. Primești factura pe email, iar abonamentul apare în cont la Produse & Servicii."
                  : "The price is recalculated by the Avyron server in RON; the euro conversion is informative. You get the invoice by email and the subscription shows up in your account under Products & Services."}
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PlanCheckout;
