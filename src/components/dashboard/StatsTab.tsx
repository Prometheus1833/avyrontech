import { useEffect, useState } from "react";
import { workspaceApi } from "@/lib/workspaceApi";
import { useAuth } from "@/hooks/useAuth";
import { useLang } from "@/i18n/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, Eye, Users, Zap } from "lucide-react";

type Stat = {
  id: string;
  subscription_id: string;
  product_name: string;
  source: string;
  period_start: string;
  period_end: string;
  visits: number | null;
  unique_visitors: number | null;
  uptime_percent: number | null;
  avg_response_ms: number | null;
};



export function StatsTab() {
  const { user } = useAuth();
  const { t, lang } = useLang();
  const [stats, setStats] = useState<Stat[]>([]);
  const [subs, setSubs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    let active=true;
    workspaceApi.list<Stat>('statistics').then(({data})=>{if(!active)return;setStats(data);setSubs(Object.fromEntries(data.map(row=>[row.subscription_id,row.product_name])));}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
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

      {error&&<p role="alert" className="text-destructive">{error}</p>}
      <p className="text-xs text-muted-foreground">Rapoarte introduse din surse documentate. Lipsa unei măsurători este afișată cu —; colectarea automată necesită conectarea sursei proiectului.</p>
      {loading ? (
        <div className="grid sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : error ? null : !latest ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">{t.auth.dash.common.empty}</CardContent></Card>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <MetricCard icon={<Eye className="size-4" />} label={t.auth.dash.stats.visits} value={latest.visits?.toLocaleString() ?? "—"} />
            <MetricCard icon={<Users className="size-4" />} label={t.auth.dash.stats.unique} value={latest.unique_visitors?.toLocaleString() ?? "—"} />
            <MetricCard icon={<Activity className="size-4" />} label={t.auth.dash.stats.uptime} value={latest.uptime_percent === null ? "—" : `${latest.uptime_percent.toFixed(2)}%`} />
            <MetricCard icon={<Zap className="size-4" />} label={t.auth.dash.stats.response} value={latest.avg_response_ms === null ? "—" : `${latest.avg_response_ms} ms`} />
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
                        <td className="px-4 py-2.5">{subs[s.subscription_id] ?? "—"}<p className="text-xs text-muted-foreground">{s.source}</p></td>
                        <td className="px-4 py-2.5 text-muted-foreground">{fmtDate(s.period_start)} – {fmtDate(s.period_end)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{s.visits?.toLocaleString() ?? "—"}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{s.unique_visitors?.toLocaleString() ?? "—"}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{s.uptime_percent === null ? "—" : `${s.uptime_percent.toFixed(2)}%`}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{s.avg_response_ms === null ? "—" : `${s.avg_response_ms} ms`}</td>
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
