import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CreditCard, FileText, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { billingApi, type BillingAdminStatus } from "@/lib/billingApi";
import { financeDate, money } from "@/lib/financeFormat";
import { toast } from "sonner";

const PROVIDER_LABELS: Record<string, string> = { revolut: "Revolut Merchant", stripe: "Stripe", oblio: "Oblio", netopia: "Netopia" };
const STATUS_LABELS: Record<string, string> = { created: "Creată", pending: "În așteptare", paid: "Plătită", failed: "Eșuată", expired: "Expirată", cancelled: "Anulată", active: "Activ", past_due: "Restant", paused: "În pauză", incomplete: "Incomplet", trialing: "Perioadă de probă", issued: "Emisă", not_connected: "Neconectat", verifying: "În verificare", connected: "Conectat", error: "Eroare" };
const PHASE_LABELS: Record<string, string> = { not_connected: "Neconectat", configuration_only: "Configurat, neverificat", awaiting_approval: "Așteaptă aprobare", verification_required: "Necesită verificare API", connected_unsynced: "API verificat, fără sincronizare", synced: "Sincronizare înregistrată", stale: "Sincronizare veche", error: "Eroare de verificare/sincronizare" };
const statusLabel = (status: string) => STATUS_LABELS[status] || status.replace(/_/g, " ");

export function BillingOperationsPanel() {
  const [data, setData] = useState<BillingAdminStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retrying, setRetrying] = useState<string | null>(null);
  const [verifying, setVerifying] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setData(await billingApi.adminStatus()); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Starea plăților nu a putut fi citită."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const retryInvoice = async (orderId: string) => {
    setRetrying(orderId);
    try { const result = await billingApi.retryInvoice(orderId); toast[result.invoiced ? "success" : "warning"](result.invoiced ? "Factura a fost emisă." : "Factura rămâne în așteptare. Verifică setările Oblio."); await load(); }
    catch (cause) { toast.error(cause instanceof Error ? cause.message : "Reîncercarea nu a reușit."); }
    finally { setRetrying(null); }
  };

  const verifyConnection = async (provider: BillingAdminStatus["providerPlaybooks"][number]["provider"]) => {
    setVerifying(provider);
    try {
      const result = await billingApi.verifyConnection(provider);
      toast.success(`${provider}: API verificat${result.detail ? ` · ${result.detail}` : ""}. Datele nu sunt încă sincronizate.`);
      await load();
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : "Verificarea API nu a reușit."); }
    finally { setVerifying(null); }
  };

  const totals = useMemo(() => ({
    paid: data?.sessions.filter((row) => row.status === "paid").reduce((sum, row) => sum + Number(row.total), 0) ?? 0,
    active: data?.subscriptions.filter((row) => row.status === "active").reduce((sum, row) => sum + Number(row.total), 0) ?? 0,
    issued: data?.invoices.filter((row) => row.status === "issued").reduce((sum, row) => sum + Number(row.total), 0) ?? 0,
  }), [data]);
  const connectionByProvider = useMemo(() => new Map(data?.connectionRecords?.map((row) => [row.provider, row]) || []), [data]);

  return (
    <section className="rounded-2xl border border-border/70 bg-card/70 p-5 lg:col-span-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="flex items-center gap-2 font-semibold"><CreditCard className="size-4 text-violet-500" /> Plăți și facturare</h2><p className="mt-1 text-xs text-muted-foreground">Stare operațională pentru checkout, abonamente, carduri tokenizate și facturi.</p></div>
        <Button size="sm" variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className={`mr-1 size-3.5 ${loading ? "animate-spin" : ""}`} /> Actualizează</Button>
      </div>
      {error && <div role="alert" className="mt-4 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs"><AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" /><span>{error}</span></div>}
      {data && <>
        {!data.security?.mfaEnabled && <div role="alert" className="mt-4 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs"><AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" /><span>MFA nu este confirmat ca activ în Worker. Citirea datelor rămâne disponibilă, dar modificările financiare din această versiune cer MFA verificat și vor fi blocate până la activare.</span></div>}
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {data.providerPlaybooks?.map((playbook) => { const record = connectionByProvider.get(playbook.provider); return <details key={playbook.provider} className="rounded-xl border border-border/65 p-3 open:bg-muted/20"><summary className="cursor-pointer list-none"><span className="flex flex-wrap items-center justify-between gap-2"><span className="text-sm font-medium">{playbook.title}</span><Badge variant="outline">{PHASE_LABELS[playbook.phase]}</Badge></span><span className="mt-2 block text-[11px] leading-relaxed text-muted-foreground">{playbook.purpose}</span></summary><div className="mt-3 space-y-2 border-t border-border/60 pt-3 text-[11px] leading-relaxed"><p><strong>Acces:</strong> {playbook.authentication}</p><p><strong>Intrare:</strong> {playbook.intake}</p><p><strong>Reconciliere:</strong> {playbook.reconciliation}</p><p><strong>Regulă de activare:</strong> {playbook.gate}</p><p><strong>Ritm:</strong> {playbook.cadence}</p><p className="text-muted-foreground">{record ? `Registru: ${statusLabel(record.status)} · ultima sincronizare ${financeDate(record.last_sync_at)}${record.last_error_code ? ` · ${record.last_error_code}` : ""}` : "Nu există o sincronizare verificată în registrul intern."}</p>{data.security?.canVerify && <><Button size="sm" variant="outline" disabled={!data.security.mfaVerified || playbook.phase === "not_connected" || verifying === playbook.provider} onClick={() => void verifyConnection(playbook.provider)}>{verifying === playbook.provider ? "Se verifică…" : "Verifică accesul API"}</Button>{playbook.phase === "not_connected" && <p className="text-muted-foreground">Configurează mai întâi accesul furnizorului în secretele Worker.</p>}</>}<div className="flex flex-wrap gap-x-3 gap-y-1">{playbook.sources.map((source, index) => <a key={source} href={source} target="_blank" rel="noopener noreferrer" className="text-violet-600 underline underline-offset-2 dark:text-violet-300">Documentație oficială {index + 1}</a>)}</div></div></details>; })}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">Stările provin din configurația Worker și registrul intern, nu dintr-un test live făcut la fiecare afișare. „Sincronizare înregistrată” nu dovedește singură că plata, factura și decontarea sunt reconciliate.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <div className="rounded-xl bg-muted/40 p-3"><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Checkout plătit</p><p className="mt-1 text-xl font-semibold">{totals.paid}</p></div>
          <div className="rounded-xl bg-muted/40 p-3"><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Abonamente active</p><p className="mt-1 text-xl font-semibold">{totals.active}</p></div>
          <div className="rounded-xl bg-muted/40 p-3"><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Facturi emise</p><p className="mt-1 text-xl font-semibold">{totals.issued}</p></div>
        </div>
        <details className="mt-3 rounded-xl border border-border/65 p-3"><summary className="cursor-pointer text-xs font-medium">Activitate financiară recentă din AVYRON OS</summary><div className="mt-3 grid gap-3 xl:grid-cols-3"><div><h3 className="mb-2 text-xs font-semibold">Checkout și plăți</h3><div className="space-y-1.5">{data.recentPayments?.map((row) => <div key={`${row.provider}:${row.order_id}:${row.updated_at}`} className="rounded-lg bg-muted/35 p-2 text-[11px]"><div className="flex justify-between gap-2"><strong>{PROVIDER_LABELS[row.provider] || row.provider} · {statusLabel(row.status)}</strong><span>{money(row.amount_minor, row.currency)}</span></div><p className="mt-1 break-all text-muted-foreground">Comandă {row.order_id} · {financeDate(row.updated_at)}</p></div>)}{!data.recentPayments?.length && <p className="text-[11px] text-muted-foreground">Nicio plată înregistrată.</p>}</div></div><div><h3 className="mb-2 text-xs font-semibold">Abonamente</h3><div className="space-y-1.5">{data.recentSubscriptions?.map((row) => <div key={`${row.provider}:${row.sku}:${row.updated_at}`} className="rounded-lg bg-muted/35 p-2 text-[11px]"><div className="flex justify-between gap-2"><strong>{row.sku} · {statusLabel(row.status)}</strong><span>{money(row.amount_minor, row.currency)}</span></div><p className="mt-1 text-muted-foreground">{PROVIDER_LABELS[row.provider] || row.provider} · {row.period === "annual" ? "anual" : "lunar"} · scadență {financeDate(row.current_period_end)}</p></div>)}{!data.recentSubscriptions?.length && <p className="text-[11px] text-muted-foreground">Niciun abonament sincronizat.</p>}</div></div><div><h3 className="mb-2 text-xs font-semibold">Facturi</h3><div className="space-y-1.5">{data.recentInvoices?.map((row) => <div key={`${row.provider}:${row.order_id}:${row.updated_at}`} className="rounded-lg bg-muted/35 p-2 text-[11px]"><div className="flex justify-between gap-2"><strong>{row.series && row.number ? `${row.series} ${row.number}` : `Comandă ${row.order_id.slice(0, 8)}…`} · {statusLabel(row.status)}</strong><span>{money(row.total_minor, row.currency)}</span></div><p className="mt-1 text-muted-foreground">{PROVIDER_LABELS[row.provider] || row.provider} · {financeDate(row.updated_at)}{row.error_code ? ` · ${row.error_code}` : ""}</p></div>)}{!data.recentInvoices?.length && <p className="text-[11px] text-muted-foreground">Nicio factură înregistrată.</p>}</div></div></div></details>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <div className="rounded-xl border border-border/65 p-3"><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Plăți confirmate de procesator</p><p className="mt-1 text-sm font-semibold">{data.paymentsByCurrency.length ? data.paymentsByCurrency.map((row) => `${(Number(row.amount_minor) / 100).toLocaleString("ro-RO", { minimumFractionDigits: 2 })} ${row.currency}`).join(" · ") : "Fără plăți confirmate"}</p></div>
          <div className="rounded-xl border border-border/65 p-3"><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Facturi emise în Oblio</p><p className="mt-1 text-sm font-semibold">{data.invoicesByCurrency.length ? data.invoicesByCurrency.map((row) => `${(Number(row.amount_minor) / 100).toLocaleString("ro-RO", { minimumFractionDigits: 2 })} ${row.currency}`).join(" · ") : "Fără facturi emise"}</p></div>
        </div>
        {(data.pendingInvoices?.length ?? 0) > 0 && <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3"><p className="text-xs font-medium">Facturi în așteptare · separate de plățile confirmate</p><div className="mt-2 space-y-2">{data.pendingInvoices.map((invoice) => <div key={invoice.order_id} className="flex flex-wrap items-center justify-between gap-2 text-[11px]"><span className="min-w-0 break-all text-muted-foreground">{invoice.order_id} · {(invoice.total_minor / 100).toLocaleString("ro-RO", { minimumFractionDigits: 2 })} {invoice.currency} · {invoice.error_code === "manual_invoice_exists" ? "factură manuală existentă" : invoice.error_code || "în așteptare"}</span><Button size="sm" variant="outline" disabled={!data.providers.oblio.enabled || !data.security?.mfaVerified || invoice.error_code === "manual_invoice_exists" || retrying === invoice.order_id} onClick={() => void retryInvoice(invoice.order_id)}>{retrying === invoice.order_id ? "Se verifică…" : "Reîncearcă emiterea"}</Button></div>)}</div>{!data.providers.oblio.enabled && <p className="mt-2 text-[11px] text-muted-foreground">Emiterea rămâne blocată până la aprobarea explicită și verificarea seriei Oblio.</p>}</div>}
        {data.recentFailures.length > 0 && <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3"><p className="flex items-center gap-2 text-xs font-medium"><AlertTriangle className="size-4 text-amber-500" /> Evenimente care necesită verificare</p><div className="mt-2 space-y-1">{data.recentFailures.slice(0, 5).map((failure, index) => <p key={`${failure.provider}:${failure.received_at}:${index}`} className="text-[11px] text-muted-foreground">{PROVIDER_LABELS[failure.provider] || failure.provider} · {failure.event_type} · {failure.error_code || "eroare nespecificată"}</p>)}</div></div>}
        {data.recentFailures.length === 0 && <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"><FileText className="size-3.5" /> Niciun webhook eșuat înregistrat.</p>}
      </>}
    </section>
  );
}
