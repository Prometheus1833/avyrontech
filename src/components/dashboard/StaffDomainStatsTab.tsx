import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Globe, Check, X, AlertTriangle, TrendingUp, Download } from "lucide-react";
import { toast } from "sonner";

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

const todayISO = () => new Date().toISOString().slice(0, 10);
const daysAgoISO = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

const csvEscape = (v: unknown) => {
  const s = v == null ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const StaffDomainStatsTab = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState<string>(daysAgoISO(30));
  const [to, setTo] = useState<string>(todayISO());
  const [exporting, setExporting] = useState(false);

  const load = async () => {
    setLoading(true);
    const fromTs = new Date(from + "T00:00:00").toISOString();
    const toTs = new Date(to + "T23:59:59.999").toISOString();
    const { data, error } = await supabase
      .from("domain_checks")
      .select("id, domain, tld, name, status, source, created_at")
      .gte("created_at", fromTs)
      .lte("created_at", toTs)
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) toast.error("Eroare la încărcare");
    setRows((data ?? []) as Row[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = useMemo(() => {
    const total = rows.length;
    const byStatus = rows.reduce<Record<string, number>>((a, r) => ({ ...a, [r.status]: (a[r.status] ?? 0) + 1 }), {});
    const tldCount = rows.reduce<Record<string, number>>((a, r) => ({ ...a, [r.tld]: (a[r.tld] ?? 0) + 1 }), {});
    const topTlds = Object.entries(tldCount).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const topNames = Object.entries(
      rows.reduce<Record<string, number>>((a, r) => ({ ...a, [r.domain]: (a[r.domain] ?? 0) + 1 }), {})
    ).sort((a, b) => b[1] - a[1]).slice(0, 10);
    return { total, byStatus, topTlds, topNames, tldCount };
  }, [rows]);

  const downloadCSV = (filename: string, content: string) => {
    const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportDetailsCSV = async () => {
    setExporting(true);
    try {
      const fromTs = new Date(from + "T00:00:00").toISOString();
      const toTs = new Date(to + "T23:59:59.999").toISOString();
      const pageSize = 1000;
      let all: Row[] = [];
      let pageStart = 0;
      while (true) {
        const { data, error } = await supabase
          .from("domain_checks")
          .select("id, domain, tld, name, status, source, created_at")
          .gte("created_at", fromTs)
          .lte("created_at", toTs)
          .order("created_at", { ascending: false })
          .range(pageStart, pageStart + pageSize - 1);
        if (error) throw error;
        const page = (data ?? []) as Row[];
        all = all.concat(page);
        if (page.length < pageSize) break;
        pageStart += pageSize;
        if (all.length >= 50000) break;
      }
      const header = ["id", "domain", "name", "tld", "status", "source", "created_at"];
      const lines = [header.join(",")];
      for (const r of all) {
        lines.push([r.id, r.domain, r.name, r.tld, r.status, r.source ?? "", r.created_at].map(csvEscape).join(","));
      }
      downloadCSV(`domain-checks_${from}_${to}.csv`, lines.join("\n"));
      toast.success(`Export: ${all.length} verificări`);
    } catch (e) {
      toast.error("Export eșuat");
    } finally {
      setExporting(false);
    }
  };

  const exportStatsCSV = () => {
    const lines: string[] = [];
    lines.push("Interval," + csvEscape(`${from} → ${to}`));
    lines.push("");
    lines.push("Metric,Valoare");
    lines.push(`Total verificări,${stats.total}`);
    lines.push(`Disponibile,${stats.byStatus.available ?? 0}`);
    lines.push(`Înregistrate,${stats.byStatus.registered ?? 0}`);
    lines.push(`Necunoscute,${stats.byStatus.unknown ?? 0}`);
    lines.push("");
    lines.push("TLD,Verificări");
    Object.entries(stats.tldCount)
      .sort((a, b) => b[1] - a[1])
      .forEach(([k, v]) => lines.push(`${csvEscape("." + k)},${v}`));
    lines.push("");
    lines.push("Domeniu,Verificări");
    stats.topNames.forEach(([k, v]) => lines.push(`${csvEscape(k)},${v}`));
    downloadCSV(`domain-stats_${from}_${to}.csv`, lines.join("\n"));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6 flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label htmlFor="from" className="text-xs">De la</Label>
            <Input id="from" type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className="w-[160px]" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="to" className="text-xs">Până la</Label>
            <Input id="to" type="date" value={to} min={from} max={todayISO()} onChange={(e) => setTo(e.target.value)} className="w-[160px]" />
          </div>
          <Button variant="secondary" onClick={load} disabled={loading}>Aplică</Button>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button variant="outline" onClick={exportStatsCSV} disabled={loading || rows.length === 0}>
              <Download className="size-4 mr-2" />Statistici CSV
            </Button>
            <Button onClick={exportDetailsCSV} disabled={exporting}>
              <Download className="size-4 mr-2" />{exporting ? "Se exportă…" : "Detalii CSV"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground font-normal flex items-center gap-1"><TrendingUp className="size-3" />Total verificări</CardTitle></CardHeader><CardContent className="pt-0"><div className="text-2xl font-bold">{stats.total}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground font-normal">Disponibile</CardTitle></CardHeader><CardContent className="pt-0"><div className="text-2xl font-bold text-emerald-600">{stats.byStatus.available ?? 0}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground font-normal">Înregistrate</CardTitle></CardHeader><CardContent className="pt-0"><div className="text-2xl font-bold">{stats.byStatus.registered ?? 0}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground font-normal">Necunoscute</CardTitle></CardHeader><CardContent className="pt-0"><div className="text-2xl font-bold text-amber-600">{stats.byStatus.unknown ?? 0}</div></CardContent></Card>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Top TLD-uri verificate</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {stats.topTlds.length === 0 && <p className="text-sm text-muted-foreground">Niciun TLD.</p>}
            {stats.topTlds.map(([k, v]) => (
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
            {stats.topNames.length === 0 && <p className="text-sm text-muted-foreground">Niciun domeniu.</p>}
            {stats.topNames.map(([k, v]) => (
              <div key={k} className="flex items-center justify-between text-sm">
                <span className="font-mono truncate">{k}</span>
                <span className="text-muted-foreground shrink-0 ml-2">{v}×</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Globe className="size-4" />Verificări în interval
            <span className="ml-auto text-xs font-normal text-muted-foreground">Retenție: 90 de zile</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Se încarcă…</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nicio verificare în acest interval.</p>
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
              {rows.length > 100 && (
                <p className="text-xs text-muted-foreground mt-2 px-2">Se afișează primele 100 din {rows.length}. Folosește „Detalii CSV" pentru toate.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
