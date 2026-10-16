import { useCallback, useEffect, useState } from "react";
import { ArrowRight, CreditCard, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cfAuth } from "@/lib/cfAuth";
import { billingApi, type BillingAccount } from "@/lib/billingApi";

type OrderLine = { sku: string; name: string; description?: string | null; period?: string | null; serviceKey?: string | null; quantity: number; lineTotalCents: number | null };
type Order = { id: string; items_json: string; total_cents: number; currency: string; status: string; requires_manual_quote: number; created_at: number; promotion_code: string | null };
const money = (minor: number, currency: string) => new Intl.NumberFormat("ro-RO", { style: "currency", currency }).format(minor / 100);
const statusLabel: Record<string, string> = { requested: "Înregistrată", quoted: "Ofertată", accepted: "Plată inițiată", paid: "Plătită", cancelled: "Anulată" };

export function OrdersTab() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [billing, setBilling] = useState<BillingAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [history, account] = await Promise.all([
        cfAuth.request<{ data: Order[] }>("/api/commerce/orders"),
        billingApi.account().then((value) => value.providers ? value : null).catch(() => null),
      ]);
      setOrders(history.data ?? []);
      setBilling(account);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Istoricul nu poate fi încărcat.");
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const pay = async (orderId: string, provider: "stripe" | "revolut") => {
    setBusy(`${orderId}:${provider}`);
    try {
      const checkout = await billingApi.checkout({ orderId, provider, savePaymentMethod: false });
      if (!checkout.url) throw new Error("Procesatorul nu a oferit o pagină de plată.");
      window.location.assign(checkout.url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Plata nu a putut fi inițiată.");
      setBusy("");
    }
  };

  return <div className="space-y-5">
    <header className="flex flex-wrap items-end justify-between gap-3 rounded-2xl border border-white/10 bg-gradient-to-br from-violet-500/10 via-[#10162a] to-cyan-500/5 p-5">
      <div><p className="text-xs font-semibold uppercase tracking-[.2em] text-violet-300">Contul meu</p><h1 className="mt-2 font-display text-2xl font-bold">Istoric și plăți</h1><p className="mt-1 text-sm text-slate-400">Comenzile sunt separate de abonamentele active. Starea plății se actualizează după confirmarea procesatorului.</p></div>
      <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}><RefreshCw className="mr-2 size-4" /> Actualizează</Button>
    </header>
    {loading ? <div className="rounded-2xl border border-white/10 p-8 text-sm text-slate-400">Se încarcă istoricul…</div> : orders.length === 0 ? <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center"><p className="font-medium">Nu ai comenzi încă.</p><a href="/profil?tab=cart" className="mt-3 inline-flex items-center gap-1 text-sm text-violet-300">Explorează coșul <ArrowRight className="size-4" /></a></div> : (
      <div className="space-y-3">{orders.map((order) => {
        let lines: OrderLine[] = [];
        try { const parsed = JSON.parse(order.items_json) as OrderLine[]; if (Array.isArray(parsed)) lines = parsed; } catch { /* date istorice */ }
        const recurring = lines.length === 1 && lines[0]?.period;
        const revolutAvailable = !recurring || Boolean(billing?.revolutPlans?.some((plan) => plan.sku === lines[0]?.sku && plan.period === lines[0]?.period));
        const stripeReady = Boolean(billing?.providers.stripe.enabled);
        const revolutReady = Boolean(billing?.providers.revolut.enabled && revolutAvailable);
        const canPay = order.status !== "paid" && order.status !== "cancelled" && !order.requires_manual_quote && order.total_cents > 0;
        return <article key={order.id} className="rounded-2xl border border-white/10 bg-[#10162a]/90 p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs text-slate-500">#{order.id.slice(0, 8).toUpperCase()} · {new Date(order.created_at).toLocaleDateString("ro-RO")}</p><h2 className="mt-1 text-base font-semibold">{lines.map((line) => line.name).join(" · ") || "Comandă AVYRON"}</h2></div><span className="rounded-full border border-violet-300/20 bg-violet-400/10 px-3 py-1 text-xs text-violet-200">{statusLabel[order.status] || order.status}</span></div>
          <ul className="mt-4 divide-y divide-white/5 rounded-xl border border-white/5 bg-black/10 px-3">{lines.map((line, index) => <li key={`${line.sku}-${index}`} className="flex flex-wrap justify-between gap-2 py-2.5 text-sm"><div><span>{line.name}</span><span className="ml-2 text-xs text-slate-500">{line.sku}{line.period ? ` · ${line.period === "annual" ? "anual" : "lunar"}` : ""}{line.serviceKey ? ` · ${line.serviceKey}` : ""}</span>{line.description && <p className="text-xs text-slate-400">{line.description}</p>}</div><span className="text-slate-300">{line.lineTotalCents === null ? "Ofertă" : money(line.lineTotalCents, order.currency)}</span></li>)}</ul>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs text-slate-500">{order.requires_manual_quote ? "Prețul final se stabilește prin ofertă" : "Total verificat la înregistrare"}</p><p className="font-semibold">{order.requires_manual_quote ? "În curs de ofertare" : money(order.total_cents, order.currency)}</p></div><div className="flex flex-wrap gap-2">{canPay && stripeReady && <Button size="sm" disabled={Boolean(busy)} onClick={() => void pay(order.id, "stripe")}><CreditCard className="mr-2 size-4" /> Plătește cu Stripe</Button>}{canPay && revolutReady && <Button size="sm" variant="outline" disabled={Boolean(busy)} onClick={() => void pay(order.id, "revolut")}><CreditCard className="mr-2 size-4" /> Plătește cu Revolut</Button>}</div></div>
          {canPay && !billing && <p className="mt-3 text-xs text-amber-200">Disponibilitatea plății nu poate fi verificată acum. Reîncarcă istoricul peste câteva momente.</p>}
          {canPay && billing && !stripeReady && !revolutReady && <p className="mt-3 text-xs text-amber-200">Plata online va apărea după configurarea unui procesator pentru această comandă. Comanda este deja salvată în cont.</p>}
          {order.requires_manual_quote === 1 && <p className="mt-3 text-xs text-slate-400">Această comandă conține un serviciu sau produs cu preț de confirmat. Echipa va pregăti oferta înainte de plată.</p>}
          {recurring && <p className="mt-2 text-xs text-slate-500">Abonamentul se activează numai după confirmarea plății.</p>}
        </article>;
      })}</div>
    )}
  </div>;
}
