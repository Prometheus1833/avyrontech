import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLang } from "@/i18n/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, Eye, Users, Zap } from "lucide-react";

type Stat = {
  id: string;
  subscription_id: string;
  period_start: string;
  period_end: string;
  visits: number;
  unique_visitors: number;
  uptime_percent: number;
  avg_response_ms: number;
};

type SubLite = { id: string; product_name: string };

export function StatsTab() {
  const { user } = useAuth();
  const { t, lang } = useLang();
  const [stats, setStats] = useState<Stat[]>([]);
  const [subs, setSubs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from("product_stats").select("id,subscription_id,period_start,period_end,visits,unique_visitors,uptime_percent,avg_response_ms").eq("user_id", user.id).order("period_end", { ascending: false }),
      supabase.from("subscriptions").select("id, product_name").eq("user_id", user.id),
    ]).then(([s, sb]) => {
      setStats((s.data as Stat[]) ?? []);
      const map: Record<string, string> = {};
      ((sb.data as SubLite[]) ?? []).forEach((x) => (map[x.id] = x.product_name));
      setSubs(map);
      setLoading(false);
    });
  }, [user]);

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString(lang === "ro" ? "ro-RO" : "en-US", { day: "2-digit", month: "short" });

  // Aggregate latest period for hero cards
  const latest = stats[0];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-display font-bold">{t.auth.dash.stats.title}</h2>
        <p className="text-sm text-muted-foreground">{t.auth.dash.stats.subtitle}</p>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : !latest ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">{t.auth.dash.common.empty}</CardContent></Card>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <MetricCard icon={<Eye className="size-4" />} label={t.auth.dash.stats.visits} value={latest.visits.toLocaleString()} />
            <MetricCard icon={<Users className="size-4" />} label={t.auth.dash.stats.unique} value={latest.unique_visitors.toLocaleString()} />
            <MetricCard icon={<Activity className="size-4" />} label={t.auth.dash.stats.uptime} value={`${Number(latest.uptime_percent).toFixed(2)}%`} />
            <MetricCard icon={<Zap className="size-4" />} label={t.auth.dash.stats.response} value={`${latest.avg_response_ms} ms`} />
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">{t.auth.dash.stats.period}</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-muted-foreground">
                    <tr>
                      <th className="text-left px-4 py-2 font-medium">{t.auth.dash.subs.product}</th>
                      <th className="text-left px-4 py-2 font-medium">{t.auth.dash.stats.period}</th>
                      <th className="text-right px-4 py-2 font-medium">{t.auth.dash.stats.visits}</th>
                      <th className="text-right px-4 py-2 font-medium">{t.auth.dash.stats.unique}</th>
                      <th className="text-right px-4 py-2 font-medium">{t.auth.dash.stats.uptime}</th>
                      <th className="text-right px-4 py-2 font-medium">{t.auth.dash.stats.response}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.map((s) => (
                      <tr key={s.id} className="border-t">
                        <td className="px-4 py-2.5">{subs[s.subscription_id] ?? "—"}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">{fmtDate(s.period_start)} – {fmtDate(s.period_end)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{s.visits.toLocaleString()}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{s.unique_visitors.toLocaleString()}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{Number(s.uptime_percent).toFixed(2)}%</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{s.avg_response_ms} ms</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function MetricCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-center gap-2 text-muted-foreground text-xs">
          {icon}
          <span>{label}</span>
        </div>
        <div className="text-2xl font-bold mt-1">{value}</div>
      </CardContent>
    </Card>
  );
}
