import { useEffect, useRef, useState } from "react";
import { Download, Receipt, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cfAuth } from "@/lib/cfAuth";
import {
  billingApi,
  type BillingAccount,
  type BillingInvoice,
} from "@/lib/billingApi";
import { safeInvoiceDownload } from "@/lib/clientCommerce";
import { useAuth } from "@/hooks/useAuth";
import type { ClientPayment } from "@/shared/clientPayments";
import { toast } from "sonner";

export default function ClientPaymentHistory({
  loadAccount = billingApi.account,
}: {
  loadAccount?: (force?: boolean) => Promise<BillingAccount>;
}) {
  const { user } = useAuth();
  const [rows, setRows] = useState<ClientPayment[]>([]),
    [invoices, setInvoices] = useState<BillingInvoice[]>([]),
    [offset, setOffset] = useState<number | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [revision, setRevision] = useState(0),
    [busy, setBusy] = useState("");
  const sequence = useRef(0),
    loadingMore = useRef(false);
  useEffect(() => {
    const counter = sequence;
    const seq = ++counter.current;
    setBusy("");
    loadingMore.current = false;
    setRows([]);
    setInvoices([]);
    setOffset(null);
    setError("");
    setLoading(true);
    if (!user?.id) return;
    void Promise.allSettled([
      cfAuth.request<{ data: ClientPayment[]; nextOffset: number | null }>(
        "/api/workspace/payments?limit=50&offset=0",
      ),
      loadAccount(revision > 0),
    ]).then(([history, account]) => {
      if (sequence.current !== seq) return;
      if (history.status === "fulfilled") {
        setRows(history.value.data);
        setOffset(history.value.nextOffset ?? null);
      } else setError("Istoricul plăților nu poate fi încărcat. Reîncearcă.");
      if (account.status === "fulfilled")
        setInvoices(account.value.invoices || []);
      setLoading(false);
    });
    return () => {
      ++counter.current;
    };
  }, [user?.id, revision, loadAccount]);
  const more = async () => {
    if (offset === null || loadingMore.current) return;
    const seq = sequence.current;
    loadingMore.current = true;
    setBusy("more");
    try {
      const page = await cfAuth.request<{
        data: ClientPayment[];
        nextOffset: number | null;
      }>(`/api/workspace/payments?limit=50&offset=${offset}`);
      if (seq !== sequence.current) return;
      setRows((old) => [
        ...new Map([...old, ...page.data].map((row) => [row.id, row])).values(),
      ]);
      setOffset(page.nextOffset ?? null);
    } catch {
      if (seq === sequence.current)
        toast.error("Plățile mai vechi nu pot fi încărcate. Reîncearcă.");
    } finally {
      loadingMore.current = false;
      if (seq === sequence.current) setBusy("");
    }
  };
  const fileFor = (row: ClientPayment) =>
    row.invoice_id && row.download_available
      ? `/api/workspace/invoices/${encodeURIComponent(row.invoice_id)}/content`
      : row.order_id
        ? safeInvoiceDownload(
            invoices.find(
              (i) => i.order_id === row.order_id && i.status === "issued",
            )?.document_url,
          )
        : null;
  const download = async (row: ClientPayment) => {
    const path = fileFor(row);
    if (!path || busy) return;
    setBusy(row.id);
    try {
      // Provider-hosted invoices open without forwarding the AVYRON session token.
      if (!path.startsWith("/")) {
        const link = document.createElement("a");
        link.href = path;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.referrerPolicy = "no-referrer";
        link.click();
        return;
      }
      const response = await cfAuth.raw(path);
      if (!response.ok) throw Error("download_unavailable");
      const url = URL.createObjectURL(await response.blob()),
        anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `Factura-${(row.invoice_number || row.id).replace(/[^\p{L}\p{N}._-]/gu, "_").slice(0, 70)}.pdf`;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      toast.error("Factura nu este disponibilă sau accesul a fost retras.");
    } finally {
      setBusy("");
    }
  };
  return (
    <section
      className="min-w-0 space-y-3"
      aria-label="Istoricul plăților efectuate"
    >
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Istoricul plăților</h2>
          <p className="mt-1 text-xs text-slate-400">
            Plățile confirmate, de la cea mai recentă.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={loading}
          onClick={() => setRevision((v) => v + 1)}
          aria-label="Actualizează plățile"
        >
          <RefreshCw className="size-4" />
        </Button>
      </div>
      {loading ? (
        <p role="status" className="p-3 text-sm text-slate-300">
          Se încarcă plățile…
        </p>
      ) : error ? (
        <div
          role="alert"
          className="rounded-xl border border-amber-400/30 p-3 text-sm"
        >
          {error}
          <Button variant="ghost" onClick={() => setRevision((v) => v + 1)}>
            Reîncearcă
          </Button>
        </div>
      ) : !rows.length ? (
        <p className="rounded-xl border border-dashed border-white/15 p-4 text-sm text-slate-300">
          Nu ai încă plăți confirmate în cont.
        </p>
      ) : (
        <ul className="divide-y divide-white/10 rounded-2xl border border-white/10 bg-white/[.02]">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex min-w-0 flex-wrap items-center gap-3 p-3 sm:p-4"
            >
              <Receipt
                className="hidden size-4 text-violet-300 sm:block"
                aria-hidden
              />
              <div className="min-w-0 flex-1 basis-40">
                <h3 className="break-words text-sm font-medium">{row.title}</h3>
                <p className="mt-1 text-xs text-slate-400">
                  {row.paid_at
                    ? `${row.date_kind === "confirmation" ? "Confirmat " : ""}${new Date(row.paid_at).toLocaleDateString("ro-RO")}`
                    : "Dată neprecizată"}
                  {row.invoice_number ? ` · Factura ${row.invoice_number}` : ""}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold">
                  {new Intl.NumberFormat("ro-RO", {
                    style: "currency",
                    currency: row.currency,
                  }).format(row.amount_minor / 100)}
                </p>
                <p className="mt-1 text-[11px] text-emerald-300">
                  Plată confirmată
                </p>
              </div>
              {fileFor(row) && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!!busy}
                  onClick={() => void download(row)}
                  aria-label={`Descarcă factura pentru ${row.title}`}
                >
                  <Download className="mr-1.5 size-4" />
                  Factură PDF
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      {offset !== null && (
        <Button variant="outline" disabled={!!busy} onClick={() => void more()}>
          Vezi plăți mai vechi
        </Button>
      )}
    </section>
  );
}
