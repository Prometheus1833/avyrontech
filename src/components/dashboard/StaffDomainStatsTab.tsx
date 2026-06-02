import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Globe, Check, X, AlertTriangle, TrendingUp } from "lucide-react";

type Row = {
  id: string;
  domain: string;
  tld: string;
  name: string;
  status: "available" | "registered" | "unknown";
  source: string | null;
  created_at: string;
};

const StatusBadge = ({ s }: { s: Row["status"] }) => {
  if (s === "available") return <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/15"><Check className="size-3 mr-1" />Disponibil</Badge>;
  if (s === "registered") return <Badge variant="secondary"><X className="size-3 mr-1" />Înregistrat</Badge>;
  return <Badge className="bg-amber-500/15 text-amber-700 hover:bg-amber-500/15"><AlertTriangle className="size-3 mr-1" />Necunoscut</Badge>;
};

export const StaffDomainStatsTab = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("domain_checks")
        .select("id, domain, tld, name, status, source, created_at")
        .order("created_at", { ascending: false })
        .limit(500);
      setRows((data ?? []) as Row[]);
      setLoading(false);
    })();
  }, []);

  const total = rows.length;
  const byStatus = rows.reduce<Record<string, number>>((a, r) => ({ ...a, [r.status]: (a[r.status] ?? 0) + 1 }), {});
  const tldCount = rows.reduce<Record<string, number>>((a, r) => ({ ...a, [r.tld]: (a[r.tld] ?? 0) + 1 }), {});
  const topTlds = Object.entries(tldCount).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const topNames = Object.entries(
    rows.reduce<Record<string, number>>((a, r) => ({ ...a, [r.domain]: (a[r.domain] ?? 0) + 1 }), {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground font-normal flex items-center gap-1"><TrendingUp className="size-3" />Total verificări</CardTitle></CardHeader><CardContent className="pt-0"><div className="text-2xl font-bold">{total}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground font-normal">Disponibile</CardTitle></CardHeader><CardContent className="pt-0"><div className="text-2xl font-bold text-emerald-600">{byStatus.available ?? 0}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground font-normal">Înregistrate</CardTitle></CardHeader><CardContent className="pt-0"><div className="text-2xl font-bold">{byStatus.registered ?? 0}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground font-normal">Necunoscute</CardTitle></CardHeader><CardContent className="pt-0"><div className="text-2xl font-bold text-amber-600">{byStatus.unknown ?? 0}</div></CardContent></Card>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Top TLD-uri verificate</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {topTlds.length === 0 && <p className="text-sm text-muted-foreground">Niciun TLD.</p>}
            {topTlds.map(([k, v]) => (
              <div key={k} className="flex items-center justify-between text-sm">
                <span className="font-mono">.{k}</span>
                <span className="text-muted-foreground">{v}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Top domenii căutate</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {topNames.length === 0 && <p className="text-sm text-muted-foreground">Niciun domeniu.</p>}
            {topNames.map(([k, v]) => (
              <div key={k} className="flex items-center justify-between text-sm">
                <span className="font-mono truncate">{k}</span>
                <span className="text-muted-foreground shrink-0 ml-2">{v}×</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Globe className="size-4" />Ultimele verificări</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Se încarcă…</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nicio verificare încă.</p>
          ) : (
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr className="text-left">
                    <th className="px-2 py-2">Domeniu</th>
                    <th className="px-2 py-2">Status</th>
                    <th className="px-2 py-2 hidden md:table-cell">Sursă</th>
                    <th className="px-2 py-2 text-right">Când</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 100).map((r) => (
                    <tr key={r.id} className="border-t border-border/50">
                      <td className="px-2 py-2 font-mono">{r.domain}</td>
                      <td className="px-2 py-2"><StatusBadge s={r.status} /></td>
                      <td className="px-2 py-2 hidden md:table-cell text-xs text-muted-foreground truncate max-w-[200px]">{r.source ?? "—"}</td>
                      <td className="px-2 py-2 text-right text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(r.created_at).toLocaleString("ro-RO")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
