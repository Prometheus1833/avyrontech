import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLang } from "@/i18n/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Package } from "lucide-react";

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

const statusVariant: Record<Subscription["status"], "default" | "secondary" | "destructive" | "outline"> = {
  active: "default",
  pending: "secondary",
  suspended: "outline",
  cancelled: "destructive",
};

export function SubscriptionsTab() {
  const { user } = useAuth();
  const { t, lang } = useLang();
  const [items, setItems] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setItems((data as Subscription[]) ?? []);
        setLoading(false);
      });
  }, [user]);

  const fmt = (cents: number, currency: string) =>
    new Intl.NumberFormat(lang === "ro" ? "ro-RO" : "en-US", { style: "currency", currency }).format(cents / 100);

  const fmtDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString(lang === "ro" ? "ro-RO" : "en-US", { day: "2-digit", month: "short", year: "numeric" }) : "—";

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-display font-bold">{t.auth.dash.subs.title}</h2>
        <p className="text-sm text-muted-foreground">{t.auth.dash.subs.subtitle}</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      ) : items.length === 0 ? (
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
    </div>
  );
}
