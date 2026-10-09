import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, CircleOff, CreditCard, FileText, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { billingApi, type BillingAdminStatus } from "@/lib/billingApi";

const PROVIDER_LABELS: Record<string, string> = { revolut: "Revolut Pay", stripe: "Stripe", oblio: "Oblio", netopia: "Netopia" };

export function BillingOperationsPanel() {
  const [data, setData] = useState<BillingAdminStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setData(await billingApi.adminStatus()); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Starea plăților nu a putut fi citită."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const totals = useMemo(() => ({
    paid: data?.sessions.filter((row) => row.status === "paid").reduce((sum, row) => sum + Number(row.total), 0) ?? 0,
    active: data?.subscriptions.filter((row) => row.status === "active").reduce((sum, row) => sum + Number(row.total), 0) ?? 0,
    issued: data?.invoices.filter((row) => row.status === "issued").reduce((sum, row) => sum + Number(row.total), 0) ?? 0,
  }), [data]);

  return (
    <section className="rounded-2xl border border-border/70 bg-card/70 p-5 lg:col-span-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="flex items-center gap-2 font-semibold"><CreditCard className="size-4 text-violet-500" /> Plăți și facturare</h2><p className="mt-1 text-xs text-muted-foreground">Stare operațională pentru checkout, abonamente, carduri tokenizate și facturi.</p></div>
        <Button size="sm" variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className={`mr-1 size-3.5 ${loading ? "animate-spin" : ""}`} /> Actualizează</Button>
      </div>
      {error && <div role="alert" className="mt-4 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs"><AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" /><span>{error}</span></div>}
      {data && <>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(data.providers).map(([provider, status]) => <div key={provider} className="flex items-center justify-between gap-3 rounded-xl border border-border/65 p-3"><div><p className="text-sm font-medium">{PROVIDER_LABELS[provider] || provider}</p><p className="text-[10px] text-muted-foreground">{status.status === "planned" ? "Integrare pregătită pentru viitor" : status.enabled ? "Configurat prin secretele Worker" : "Necesită configurare"}</p></div>{status.enabled ? <CheckCircle2 className="size-4 text-emerald-500" /> : <CircleOff className="size-4 text-muted-foreground" />}</div>)}
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <div className="rounded-xl bg-muted/40 p-3"><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Checkout plătit</p><p className="mt-1 text-xl font-semibold">{totals.paid}</p></div>
          <div className="rounded-xl bg-muted/40 p-3"><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Abonamente active</p><p className="mt-1 text-xl font-semibold">{totals.active}</p></div>
          <div className="rounded-xl bg-muted/40 p-3"><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Facturi emise</p><p className="mt-1 text-xl font-semibold">{totals.issued}</p></div>
        </div>
        {data.recentFailures.length > 0 && <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3"><p className="flex items-center gap-2 text-xs font-medium"><AlertTriangle className="size-4 text-amber-500" /> Evenimente care necesită verificare</p><div className="mt-2 space-y-1">{data.recentFailures.slice(0, 5).map((failure, index) => <p key={`${failure.provider}:${failure.received_at}:${index}`} className="text-[11px] text-muted-foreground">{PROVIDER_LABELS[failure.provider] || failure.provider} · {failure.event_type} · {failure.error_code || "eroare nespecificată"}</p>)}</div></div>}
        {data.recentFailures.length === 0 && <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"><FileText className="size-3.5" /> Niciun webhook eșuat înregistrat.</p>}
      </>}
    </section>
  );
}
