import { useEffect, useState } from "react";
import { workspaceApi } from "@/lib/workspaceApi";
import { useAuth } from "@/hooks/useAuth";
import { useLang } from "@/i18n/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Package, Receipt, Repeat } from "lucide-react";
import { cfAuth } from "@/lib/cfAuth";
import { commerceItemBySku } from "@/data/commerceCatalog";

type Subscription = {
  id: string;
  product_name: string;
  description: string | null;
  status: "active" | "suspended" | "cancelled" | "pending";
  price_cents: number;
  currency: string;
  billing_cycle: "monthly" | "quarterly" | "yearly" | "one_time";
  started_at: string | null;
  next_renewal_at: string | null;
};

type OrderItem = { sku?: string; name?: string; quantity?: number; period?: string | null };

type CommerceOrder = {
  id: string;
  items_json?: string;
  total_cents: number;
  currency: string;
  status: "requested" | "quoted" | "accepted" | "paid" | "cancelled";
  promotion_code: string | null;
  created_at: number;
};

const statusVariant: Record<Subscription["status"], "default" | "secondary" | "destructive" | "outline"> = {
  active: "default",
  pending: "secondary",
  suspended: "outline",
  cancelled: "destructive",
};

const ORDER_STATUS: Record<CommerceOrder["status"], { ro: string; en: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  requested: { ro: "Trimisă", en: "Sent", variant: "secondary" },
  quoted: { ro: "Ofertată", en: "Quoted", variant: "outline" },
  accepted: { ro: "Acceptată", en: "Accepted", variant: "outline" },
  paid: { ro: "Plătită", en: "Paid", variant: "default" },
  cancelled: { ro: "Anulată", en: "Cancelled", variant: "destructive" },
};

const parseItems = (raw?: string): OrderItem[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as OrderItem[];
    return Array.isArray(parsed) ? parsed.slice(0, 20) : [];
  } catch {
    return [];
  }
};

export function SubscriptionsTab() {
  const { user } = useAuth();
  const { t, lang } = useLang();
  const ro = lang === "ro";
  const [items, setItems] = useState<Subscription[]>([]);
  const [orders, setOrders] = useState<CommerceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    let active = true;
    setLoading(true); setError("");
    workspaceApi.list<Subscription>("subscriptions")
      .then(({ data }) => { if (active) setItems(data); })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Datele nu pot fi încărcate."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user]);

  // Cererile trimise din pagina de abonamente apar imediat, înainte ca echipa
  // să confirme plata și să activeze abonamentul propriu-zis.
  useEffect(() => {
    if (!user) return;
    let active = true;
    cfAuth.request<{ data: CommerceOrder[] }>("/api/commerce/orders")
      .then((response) => { if (active) setOrders(response.data ?? []); })
      .catch(() => { if (active) setOrders([]); });
    return () => { active = false; };
  }, [user]);

  const fmt = (cents: number, currency: string) =>
    new Intl.NumberFormat(ro ? "ro-RO" : "en-US", { style: "currency", currency }).format(cents / 100);

  const fmtDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString(ro ? "ro-RO" : "en-US", { day: "2-digit", month: "short", year: "numeric" }) : "—";

  const fmtStamp = (seconds: number) =>
    new Date(seconds * 1000).toLocaleDateString(ro ? "ro-RO" : "en-US", { day: "2-digit", month: "short", year: "numeric" });

  const pending = orders.filter((order) => order.status !== "cancelled");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold">{t.auth.dash.subs.title}</h2>
        <p className="text-sm text-muted-foreground">{t.auth.dash.subs.subtitle}</p>
      </div>

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

      <section className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {ro ? "Active" : "Active"}
        </h3>
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => <Skeleton key={i} className="h-32 w-full" />)}
          </div>
        ) : error ? null : items.length === 0 ? (
          <Card><CardContent className="py-10 text-center text-muted-foreground">{t.auth.dash.common.empty}</CardContent></Card>
        ) : (
          <div className="grid gap-4">
            {items.map((s) => (
              <Card key={s.id} className="overflow-hidden">
                <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
                  <div className="flex items-start gap-3">
                    <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Package className="size-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{s.product_name}</CardTitle>
                      {s.description && <p className="text-sm text-muted-foreground mt-1">{s.description}</p>}
                    </div>
                  </div>
                  <Badge variant={statusVariant[s.status]}>{t.auth.dash.subs.statuses[s.status]}</Badge>
                </CardHeader>
                <CardContent className="grid sm:grid-cols-3 gap-4 text-sm border-t pt-4">
                  <div>
                    <div className="text-muted-foreground text-xs">{t.auth.dash.subs.price}</div>
                    <div className="font-semibold mt-0.5">
                      {fmt(s.price_cents, s.currency)} <span className="text-muted-foreground font-normal">/ {t.auth.dash.subs.cycles[s.billing_cycle]}</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs">{t.auth.dash.subs.started}</div>
                    <div className="font-medium mt-0.5">{fmtDate(s.started_at)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs flex items-center gap-1"><Calendar className="size-3" /> {t.auth.dash.subs.nextRenewal}</div>
                    <div className="font-medium mt-0.5">{fmtDate(s.next_renewal_at)}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {pending.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {ro ? "În procesare" : "Being processed"}
          </h3>
          <div className="grid gap-3">
            {pending.map((order) => {
              const parsed = parseItems(order.items_json);
              const label = ORDER_STATUS[order.status] ?? ORDER_STATUS.requested;
              return (
                <Card key={order.id}>
                  <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
                    <div className="flex items-start gap-3">
                      <div className="size-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <Repeat className="size-5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="text-base">
                          {parsed.length
                            ? parsed.map((item) => item.name || commerceItemBySku(String(item.sku ?? ""))?.name || item.sku).filter(Boolean).join(" · ")
                            : `${ro ? "Comandă" : "Order"} ${order.id.slice(0, 8).toUpperCase()}`}
                        </CardTitle>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {ro ? "Trimisă pe" : "Sent on"} {fmtStamp(order.created_at)}
                          {parsed[0]?.period ? ` · ${parsed[0].period === "annual" ? (ro ? "anual" : "annual") : (ro ? "lunar" : "monthly")}` : ""}
                          {order.promotion_code ? ` · ${order.promotion_code}` : ""}
                        </p>
                      </div>
                    </div>
                    <Badge variant={label.variant}>{ro ? label.ro : label.en}</Badge>
                  </CardHeader>
                  <CardContent className="flex flex-wrap items-center justify-between gap-3 border-t pt-4 text-sm">
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                      <Receipt className="size-3.5" />
                      {ro ? "Total de plată" : "Amount due"}
                    </span>
                    <span className="font-semibold">{fmt(order.total_cents, order.currency)}</span>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            {ro
              ? "Cererile trimise devin abonamente active imediat ce confirmăm plata."
              : "Requests become active subscriptions as soon as we confirm the payment."}
          </p>
        </section>
      )}
    </div>
  );
}
