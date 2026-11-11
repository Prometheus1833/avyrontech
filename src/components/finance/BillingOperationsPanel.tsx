import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CreditCard, FileText, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { billingApi, type BillingAdminStatus } from "@/lib/billingApi";
import { financeDate, money } from "@/lib/financeFormat";
import { toast } from "sonner";

const PROVIDER_LABELS: Record<string, string> = { revolut: "Revolut Merchant", stripe: "Stripe", oblio: "Oblio", netopia: "Netopia" };
const STATUS_LABELS: Record<string, string> = { created: "Creată", pending: "În așteptare", paid: "Plătită", failed: "Eșuată", expired: "Expirată", cancelled: "Anulată", active: "Activ", past_due: "Restant", paused: "În pauză", incomplete: "Incomplet", trialing: "Perioadă de probă", issued: "Emisă", not_connected: "Neconectat", verifying: "În verificare", connected: "Conectat", error: "Eroare" };
const PHASE_LABELS: Record<string, string> = { not_connected: "Neconectat", configuration_only: "Configurat, neverificat", awaiting_approval: "Așteaptă aprobare", verification_required: "Necesită verificare API", connected_unsynced: "API verificat, fără sincronizare", synced: "Referințe native verificate", stale: "Sincronizare veche", error: "Eroare de verificare/sincronizare" };
const statusLabel = (status: string) => STATUS_LABELS[status] || status.replace(/_/g, " ");
const providerFailureMessage = (code: string) => /unreachable|sync_read_failed|provider_read_failed/.test(code)
  ? "Furnizorul nu a putut fi contactat. Reîncearcă verificarea API; operațiunea nu este confirmată."
  : "Verificarea sau sincronizarea nu a reușit. Verifică detaliile și configurarea înainte de a continua.";

export function BillingOperationsPanel() {
  const [setup,setSetup]=useState<string|null>(null);
  const [data, setData] = useState<BillingAdminStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retrying, setRetrying] = useState<string | null>(null);
  const [syncing,setSyncing]=useState<string|null>(null);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [operationErrors, setOperationErrors] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setData(await billingApi.adminStatus()); }
    catch (cause) { setData(null); setError(cause instanceof Error ? cause.message : "Starea plăților nu a putut fi citită."); }
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
    setOperationErrors(previous => ({ ...previous, [provider]: "" }));
    try {
      const result = await billingApi.verifyConnection(provider);
      toast.success(`${provider}: API verificat${result.detail ? ` · ${result.detail}` : ""}. Datele nu sunt încă sincronizate.`);
      await load();
    } catch (cause) {
      const code = cause instanceof Error ? cause.message : "verification_failed";
      setOperationErrors(previous => ({ ...previous, [provider]: code }));
      toast.error(providerFailureMessage(code));
      await load();
    }
    finally { setVerifying(null); }
  };

  const syncConnection = async (provider: BillingAdminStatus["providerPlaybooks"][number]["provider"]) => {
    setSyncing(provider);
    setOperationErrors(previous => ({ ...previous, [provider]: "" }));
    try {
      const {state}=await billingApi.syncConnection(provider);
      const message=state.status==='running'?`Lot verificat · ${state.checked} referințe; continuă următorul lot.`:state.status==='differences'?`${state.issueCount} diferențe de verificat. Nu au fost efectuate operațiuni financiare.`:`${state.checked} referințe AVYRON verificate la furnizor. ${state.checked===0?'Nu există încă tranzacții native de comparat.':''}`;
      toast[state.status==='differences'?'warning':'success'](message); await load();
    } catch(cause) {
      const code = cause instanceof Error ? cause.message : "sync_failed";
      setOperationErrors(previous => ({ ...previous, [provider]: code }));
      toast.error(providerFailureMessage(code));
      await load();
    }
    finally{setSyncing(null);}
  };

  const totals = useMemo(() => ({
    paid: data?.sessions.filter((row) => row.status === "paid").reduce((sum, row) => sum + Number(row.total), 0) ?? 0,
    active: data?.subscriptions.filter((row) => row.status === "active").reduce((sum, row) => sum + Number(row.total), 0) ?? 0,
    issued: data?.invoices.filter((row) => row.status === "issued").reduce((sum, row) => sum + Number(row.total), 0) ?? 0,
  }), [data]);
  const connectionByProvider = useMemo(() => new Map(data?.connectionRecords?.map((row) => [row.provider, row]) || []), [data]);

  const policySatisfied = data?.security?.mfaSatisfied ?? data?.security?.mfaVerified ?? false;

  return (
    <section className="rounded-2xl border border-border/70 bg-card/70 p-5 lg:col-span-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="flex items-center gap-2 font-semibold"><CreditCard className="size-4 text-violet-500" /> Plăți și facturare</h2><p className="mt-1 text-xs text-muted-foreground">Stare operațională pentru checkout, abonamente, carduri tokenizate și facturi.</p></div>
        <Button size="sm" variant="outline" onClick={() => { setOperationErrors({}); void load(); }} disabled={loading}><RefreshCw className={`mr-1 size-3.5 ${loading ? "animate-spin" : ""}`} /> Actualizează</Button>
      </div>
      {error && <div role="alert" className="mt-4 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs"><AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" /><span>{error}</span></div>}
      {data && <>
        {!policySatisfied && <div role="alert" className="mt-4 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs"><AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" /><span>Politica de acces financiar nu este satisfăcută. Citirea autorizată rămâne disponibilă; verifică starea sesiunii și configurația securității.</span></div>}
        <div className="mt-4 grid items-start gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label="Procesatori și facturare">
          {data.providerPlaybooks?.map(playbook=>{const record=connectionByProvider.get(playbook.provider);const failure=operationErrors[playbook.provider]||record?.last_error_code;return <article key={playbook.provider} className="min-w-0 rounded-xl border border-border/65 p-3"><h3 className="font-medium">{playbook.title}</h3><Badge className="mt-2 max-w-full whitespace-normal" variant="outline">{(playbook.phase === "synced" && record?.sync?.checked === 0 ? "API verificat · fără referințe" : PHASE_LABELS[playbook.phase])}</Badge><p className="mt-2 text-xs text-muted-foreground">{playbook.purpose}</p><p className="mt-2 text-[11px] text-muted-foreground">{record?`Ultima sincronizare: ${financeDate(record.last_sync_at)}`:'Nicio sincronizare înregistrată.'}</p><div className="mt-3 flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={()=>setSetup(playbook.provider)}>Configurează</Button>{data.security?.canVerify&&<Button size="sm" disabled={!policySatisfied||playbook.phase==='not_connected'||!!verifying||!!syncing} onClick={()=>void verifyConnection(playbook.provider)}>{verifying===playbook.provider?'Se verifică…':'Verifică API'}</Button>}{data.security?.canVerify&&record?.status==='connected'&&<Button size="sm" variant="outline" disabled={!policySatisfied||!!syncing||!!verifying} onClick={()=>void syncConnection(playbook.provider)}>{syncing===playbook.provider?'Se compară…':record.sync?.status==='running'?'Continuă lotul':'Sincronizează'}</Button>}</div>{failure&&<div role="alert" className="mt-3 rounded-lg border border-destructive/30 bg-destructive/5 p-2 text-xs"><p>{providerFailureMessage(failure)}</p><details className="mt-1"><summary>Detalii verificare</summary><code className="break-all">{failure}</code></details></div>}{record?.sync&&<p className="mt-2 text-xs" role="status">{record.sync.checked} referințe comparate · {record.sync.matched} concordante · {record.sync.issueCount} diferențe{record.sync.status==='running'?' · loturi rămase':''}</p>}{!!record?.sync?.issues.length&&<details className="mt-2 text-xs"><summary>Diferențe de verificat</summary><ul className="mt-2 space-y-1">{record.sync.issues.map(issue=><li className="break-all" key={issue.id}>{issue.id} · {issue.code}</li>)}</ul></details>}{data.security?.mfaEnabled&&!policySatisfied&&<Link className="mt-2 inline-flex min-h-9 items-center text-xs text-violet-300 underline" to="/profil?tab=settings">Confirmă MFA în Setări</Link>}</article>})}
        </div>
        <Dialog open={!!setup} onOpenChange={open=>!open&&setSetup(null)}><DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>Configurează {data.providerPlaybooks?.find(p=>p.provider===setup)?.title}</DialogTitle><DialogDescription>Configurația folosește Workerul și furnizorii existenți. Secretele nu sunt afișate și nu sunt salvate în formulare sau în baza de conținut.</DialogDescription></DialogHeader>{data.providerPlaybooks?.filter(p=>p.provider===setup).map(playbook=><div key={playbook.provider} className="space-y-4"><ol className="space-y-3 text-sm"><li><strong>1. Acces securizat</strong>{playbook.loginUrl&&<a className="ml-2 inline-flex min-h-10 items-center text-violet-300 underline" href={playbook.loginUrl} target="_blank" rel="noreferrer">Autentificare {playbook.title}</a>}<p className="mt-1 text-xs text-muted-foreground">{data.security?.mfaEnabled ? playbook.authentication : "Folosește sesiunea autorizată Owner / Super Admin. MFA nu este impus în acest mediu; permisiunile și verificările furnizorului rămân obligatorii."}</p>{data.security?.mfaEnabled && <Link className="inline-flex min-h-10 items-center text-violet-300 underline" to="/profil?tab=settings" onClick={()=>setSetup(null)}>Deschide setările MFA</Link>}</li><li><strong>2. Completează configurația Worker</strong><div className="mt-2 space-y-1">{data.configuration?.[playbook.provider]?.fields.map(f=><p key={f.name} className="flex flex-wrap justify-between gap-1 rounded-lg bg-muted/40 px-2 py-1.5 text-xs"><code className="break-all">{f.name}</code><span>{f.configured?'Prezent':'Lipsește'}</span></p>)}</div><p className="mt-2 text-xs text-muted-foreground">Cheile se introduc numai în secretele Workerului avyrontech din contul Avyron. Prezența lor nu dovedește conectarea.</p><a className="inline-flex min-h-10 items-center text-violet-300 underline" href="https://dash.cloudflare.com/" target="_blank" rel="noreferrer">Deschide Cloudflare · Workers → avyrontech → Settings</a></li><li><strong>3. Verifică identitatea și accesul API</strong><p className="mt-1 text-xs text-muted-foreground">{playbook.gate}</p><Button className="mt-2" size="sm" disabled={!data.security?.canVerify||!policySatisfied||playbook.phase==='not_connected'||!!verifying||!!syncing} onClick={()=>void verifyConnection(playbook.provider)}>{verifying===playbook.provider?'Se verifică…':'Verifică și înregistrează conexiunea'}</Button></li><li><strong>4. Finalizare și monitorizare</strong><p className="mt-1 text-xs text-muted-foreground">{playbook.intake} {playbook.reconciliation}</p>{playbook.provider==='oblio'&&<p className="mt-2 text-xs text-amber-300">{data.configuration?.oblio?.automaticIssue ? 'Emiterea automată este activată în configurație pentru comenzile eligibile cu plată confirmată.' : 'Emiterea automată este oprită. Activarea se face în configurația Workerului, după confirmarea seriei și regimului fiscal.'} Verificarea API nu emite facturi și nu confirmă transmiterea în e-Factura/SPV.</p>}<p className="mt-2 text-xs text-muted-foreground">{playbook.cadence}</p></li></ol><details className="rounded-lg border p-3 text-xs"><summary>Documentație furnizor</summary><div className="mt-2 grid gap-2">{playbook.sources.map((source,i)=><a key={source} href={source} target="_blank" rel="noreferrer" className="break-all text-violet-300 underline">Documentație oficială {i+1}</a>)}</div></details><Button variant="outline" onClick={()=>setSetup(null)}>Închide configurarea</Button></div>)}</DialogContent></Dialog>
        <p className="mt-2 text-[11px] text-muted-foreground">Sincronizarea compară în loturi referințele native AVYRON cu API-ul furnizorului, fără debitări sau emitere de facturi. Nu importă alte firme, conturi bancare ori tranzacții fără comandă AVYRON. Stările nu sunt recalculate la fiecare afișare. „Sincronizare înregistrată” nu dovedește singură că plata, factura și decontarea sunt reconciliate.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <div className="rounded-xl bg-muted/40 p-3"><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Checkout plătit</p><p className="mt-1 text-xl font-semibold">{totals.paid}</p></div>
          <div className="rounded-xl bg-muted/40 p-3"><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Abonamente active</p><p className="mt-1 text-xl font-semibold">{totals.active}</p></div>
          <div className="rounded-xl bg-muted/40 p-3"><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Facturi emise</p><p className="mt-1 text-xl font-semibold">{totals.issued}</p></div>
        </div>
        <details className="mt-3 rounded-xl border border-border/65 p-3"><summary className="cursor-pointer text-xs font-medium">Activitate financiară recentă din AVYRON OS</summary><div className="mt-3 grid gap-3 xl:grid-cols-3"><div><h3 className="mb-2 text-xs font-semibold">Checkout și plăți</h3><div className="space-y-1.5">{data.recentPayments?.map((row) => <div key={`${row.provider}:${row.order_id}:${row.updated_at}`} className="rounded-lg bg-muted/35 p-2 text-[11px]"><div className="flex justify-between gap-2"><strong>{PROVIDER_LABELS[row.provider] || row.provider} · {row.mode === "subscription" && row.status === "paid" && row.amount_minor === 0 ? "Debitare autorizată" : statusLabel(row.status)}</strong><span>{money(row.amount_minor, row.currency)}</span></div><p className="mt-1 break-all text-muted-foreground">Comandă {row.order_id} · {financeDate(row.updated_at)}</p></div>)}{!data.recentPayments?.length && <p className="text-[11px] text-muted-foreground">Nicio plată înregistrată.</p>}</div></div><div><h3 className="mb-2 text-xs font-semibold">Abonamente</h3><div className="space-y-1.5">{data.recentSubscriptions?.map((row) => <div key={`${row.provider}:${row.sku}:${row.updated_at}`} className="rounded-lg bg-muted/35 p-2 text-[11px]"><div className="flex justify-between gap-2"><strong>{row.sku} · {statusLabel(row.status)}</strong><span>{money(row.amount_minor, row.currency)}</span></div><p className="mt-1 text-muted-foreground">{PROVIDER_LABELS[row.provider] || row.provider} · {row.period === "annual" ? "anual" : "lunar"} · scadență {financeDate(row.current_period_end)}</p></div>)}{!data.recentSubscriptions?.length && <p className="text-[11px] text-muted-foreground">Niciun abonament sincronizat.</p>}</div></div><div><h3 className="mb-2 text-xs font-semibold">Facturi</h3><div className="space-y-1.5">{data.recentInvoices?.map((row) => <div key={`${row.provider}:${row.order_id}:${row.updated_at}`} className="rounded-lg bg-muted/35 p-2 text-[11px]"><div className="flex justify-between gap-2"><strong>{row.series && row.number ? `${row.series} ${row.number}` : `Comandă ${row.order_id.slice(0, 8)}…`} · {statusLabel(row.status)}</strong><span>{money(row.total_minor, row.currency)}</span></div><p className="mt-1 text-muted-foreground">{PROVIDER_LABELS[row.provider] || row.provider} · {financeDate(row.updated_at)}{row.error_code ? ` · ${row.error_code}` : ""}</p></div>)}{!data.recentInvoices?.length && <p className="text-[11px] text-muted-foreground">Nicio factură înregistrată.</p>}</div></div></div></details>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <div className="rounded-xl border border-border/65 p-3"><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Plăți confirmate de procesator</p><p className="mt-1 text-sm font-semibold">{data.paymentsByCurrency.length ? data.paymentsByCurrency.map((row) => `${(Number(row.amount_minor) / 100).toLocaleString("ro-RO", { minimumFractionDigits: 2 })} ${row.currency}`).join(" · ") : "Fără plăți confirmate"}</p></div>
          <div className="rounded-xl border border-border/65 p-3"><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Facturi emise în Oblio</p><p className="mt-1 text-sm font-semibold">{data.invoicesByCurrency.length ? data.invoicesByCurrency.map((row) => `${(Number(row.amount_minor) / 100).toLocaleString("ro-RO", { minimumFractionDigits: 2 })} ${row.currency}`).join(" · ") : "Fără facturi emise"}</p></div>
        </div>
        {(data.pendingInvoices?.length ?? 0) > 0 && <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3"><p className="text-xs font-medium">Facturi în așteptare · separate de plățile confirmate</p><div className="mt-2 space-y-2">{data.pendingInvoices.map((invoice) => <div key={invoice.order_id} className="flex flex-wrap items-center justify-between gap-2 text-[11px]"><span className="min-w-0 break-all text-muted-foreground">{invoice.order_id} · {(invoice.total_minor / 100).toLocaleString("ro-RO", { minimumFractionDigits: 2 })} {invoice.currency} · {invoice.error_code === "manual_invoice_exists" ? "factură manuală existentă" : invoice.error_code === "manual_invoice_required" ? "facturare manuală aleasă pentru această comandă" : invoice.error_code || "în așteptare"}</span><Button size="sm" variant="outline" disabled={!data.providers.oblio.enabled || !policySatisfied || ["manual_invoice_exists","manual_invoice_required"].includes(invoice.error_code||"") || retrying === invoice.order_id} onClick={() => void retryInvoice(invoice.order_id)}>{retrying === invoice.order_id ? "Se verifică…" : "Reîncearcă emiterea"}</Button></div>)}</div>{!data.providers.oblio.enabled && <p className="mt-2 text-[11px] text-muted-foreground">Emiterea rămâne blocată până la aprobarea explicită și verificarea seriei Oblio.</p>}</div>}
        {data.recentFailures.length > 0 && <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3"><p className="flex items-center gap-2 text-xs font-medium"><AlertTriangle className="size-4 text-amber-500" /> Evenimente care necesită verificare</p><div className="mt-2 space-y-1">{data.recentFailures.slice(0, 5).map((failure, index) => <p key={`${failure.provider}:${failure.received_at}:${index}`} className="text-[11px] text-muted-foreground">{PROVIDER_LABELS[failure.provider] || failure.provider} · {failure.event_type} · {failure.error_code || "eroare nespecificată"}</p>)}</div></div>}
        {data.recentFailures.length === 0 && <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"><FileText className="size-3.5" /> Niciun webhook eșuat înregistrat.</p>}
      </>}
    </section>
  );
}
