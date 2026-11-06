import { safeInvoiceDownload } from "@/lib/clientCommerce";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Receipt, Search } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { cfAuth } from "@/lib/cfAuth";
import { billingApi, type BillingInvoice } from "@/lib/billingApi";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
type Invoice = {
  id: string;
  invoice_number: string;
  amount_cents: number | null;
  currency: string;
  status: string;
  issued_at: string | null;
  due_at: string | null;
  order_id?: string | null;
  download_url?: string | null;
  pdf_url?: string | null;
};
type Row = {
  key: string;
  number: string;
  amount: number | null;
  currency: string;
  status: string;
  issued: number | null;
  due: number | null;
  download: string | null;
};
const labels: Record<string, string> = {
  paid: "Achitată",
  pending: "În așteptare",
  overdue: "Scadentă",
  cancelled: "Anulată",
  issued: "Emisă",
  failed: "Emiterea a eșuat",
};
export function InvoicesTab({ embedded = false }: { embedded?: boolean }) {
  const { user } = useAuth(),
    userId = user?.id;
  const [items, setItems] = useState<Invoice[]>([]),
    [online, setOnline] = useState<BillingInvoice[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [offset, setOffset] = useState<number | null>(0),
    [revision, setRevision] = useState(0),
    [query, setQuery] = useState(""),
    [status, setStatus] = useState("all"),
    [busy, setBusy] = useState("");
  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError("");
    const results = await Promise.allSettled([
      cfAuth.request<{ data: Invoice[]; nextOffset?: number | null }>(
        "/api/workspace/invoices?limit=50&offset=0",
      ),
      billingApi.account(),
    ]);
    if (results[0].status === "fulfilled") {
      setItems(results[0].value.data);
      setOffset(results[0].value.nextOffset ?? null);
    } else {
      setItems([]);
      setOffset(null);
    }
    if (results[1].status === "fulfilled")
      setOnline(results[1].value.invoices || []);
    else setOnline([]);
    if (results.some((r) => r.status === "rejected"))
      setError(
        "O parte din istoricul facturilor nu poate fi încărcată. Reîncearcă.",
      );
    setLoading(false);
  }, [userId]);
  useEffect(() => {
    void load();
  }, [load, revision]);
  const rows = useMemo(() => {
    const byOrder = new Map(
      online
        .filter((invoice) => invoice.order_id)
        .map((invoice) => [invoice.order_id, invoice]),
    );
    const manual = items.filter(
      (invoice) =>
        !invoice.order_id ||
        !byOrder.has(invoice.order_id) ||
        (!byOrder.get(invoice.order_id)?.document_url && invoice.download_url),
    );
    const manualOrders = new Set(
      manual
        .filter((invoice) => invoice.order_id)
        .map((invoice) => invoice.order_id),
    );
    return [
      ...manual.map(
        (invoice): Row => ({
          key: "workspace:" + invoice.id,
          number: invoice.invoice_number,
          amount: invoice.amount_cents,
          currency: invoice.currency,
          status: invoice.status,
          issued: invoice.issued_at ? Date.parse(invoice.issued_at) : null,
          due: invoice.due_at ? Date.parse(invoice.due_at) : null,
          download: safeInvoiceDownload(
            invoice.download_url || invoice.pdf_url,
          ),
        }),
      ),
      ...online
        .filter((invoice) => !manualOrders.has(invoice.order_id))
        .map(
          (invoice): Row => ({
            key: "billing:" + invoice.id,
            number: invoice.number
              ? `${invoice.series || ""}${invoice.number}`
              : "În curs de emitere",
            amount: invoice.total_minor,
            currency: invoice.currency,
            status: invoice.status,
            issued: invoice.issued_at,
            due: null,
            download:
              invoice.status === "issued"
                ? safeInvoiceDownload(invoice.document_url)
                : null,
          }),
        ),
    ].sort((a, b) => (b.issued || 0) - (a.issued || 0));
  }, [items, online]);
  const filtered = rows.filter(
    (row) =>
      (status === "all" || row.status === status) &&
      row.number
        .toLocaleLowerCase("ro")
        .includes(query.trim().toLocaleLowerCase("ro")),
  );
  const download = async (row: Row) => {
    if (!row.download || busy) return;
    setBusy(row.key);
    try {
      const response = await cfAuth.raw(row.download);
      if (!response.ok) throw new Error("unavailable");
      const blob = await response.blob(),
        url = URL.createObjectURL(blob),
        anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `Factura-${row.number.replace(/[^\p{L}\p{N}._-]/gu, "_").slice(0, 80)}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      toast.error(
        "Factura nu este disponibilă sau accesul a fost retras. Reîncearcă.",
      );
    } finally {
      setBusy("");
    }
  };
  return (
    <section className="min-w-0 space-y-3" aria-label="Istoric facturi">
      {!embedded && (
        <header>
          <h2 className="text-2xl font-semibold">Facturile mele</h2>
          <p className="mt-1 text-sm text-slate-400">
            Facturile disponibile și documentele lor originale.
          </p>
        </header>
      )}
      <div className="flex flex-wrap gap-2">
        <label className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border px-3">
          <Search className="size-4 shrink-0" />
          <input
            aria-label="Caută factura"
            className="h-10 min-w-0 w-full bg-transparent text-sm outline-none"
            placeholder="Numărul facturii"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            maxLength={100}
          />
        </label>
        <select
          aria-label="Starea facturii"
          className="h-10 max-w-full rounded-lg border bg-background px-2 text-sm"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="all">Toate stările</option>
          {Object.entries(labels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <Button
          size="sm"
          variant="outline"
          disabled={loading}
          onClick={() => setRevision((v) => v + 1)}
        >
          Actualizează
        </Button>
      </div>
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-amber-400/30 p-3 text-xs text-amber-200"
        >
          {error}
        </p>
      )}
      {loading ? (
        <p role="status" className="p-3 text-sm">
          Se încarcă facturile…
        </p>
      ) : !filtered.length ? (
        <p className="rounded-xl border border-dashed p-4 text-sm text-slate-400">
          {rows.length
            ? "Nu există facturi care corespund filtrului."
            : error
              ? "Istoricul disponibil este incomplet."
              : "Nu ai încă facturi disponibile în cont."}
        </p>
      ) : (
        <ul className="divide-y rounded-xl border border-white/10">
          {filtered.map((row) => (
            <li
              key={row.key}
              className="flex min-w-0 flex-wrap items-center gap-3 p-3"
            >
              <Receipt className="hidden size-4 shrink-0 text-violet-300 sm:block" />
              <div className="min-w-0 flex-1 basis-32">
                <h3 className="break-words text-sm font-semibold">
                  {row.number}
                </h3>
                <p className="mt-1 text-xs text-slate-400">
                  {row.issued
                    ? new Date(row.issued).toLocaleDateString("ro-RO")
                    : "Data emiterii în curs"}{" "}
                  · {labels[row.status] || row.status}
                  {row.due
                    ? ` · Scadență ${new Date(row.due).toLocaleDateString("ro-RO")}`
                    : ""}
                </p>
              </div>
              <p className="text-sm font-semibold tabular-nums">
                {row.amount === null
                  ? "—"
                  : new Intl.NumberFormat("ro-RO", {
                      style: "currency",
                      currency: row.currency,
                    }).format(row.amount / 100)}
              </p>
              {row.download ? (
                row.download.startsWith("/api/") ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!!busy}
                    onClick={() => void download(row)}
                    aria-label={`Descarcă factura ${row.number}`}
                  >
                    <Download className="mr-1 size-4" /> PDF
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" asChild>
                    <a
                      href={row.download}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Descarcă factura ${row.number}`}
                    >
                      <Download className="mr-1 size-4" /> PDF
                    </a>
                  </Button>
                )
              ) : (
                <span className="text-xs text-slate-400">PDF indisponibil</span>
              )}
            </li>
          ))}
        </ul>
      )}
      {offset !== null && (
        <Button
          size="sm"
          variant="outline"
          disabled={loading}
          onClick={async () => {
            setLoading(true);
            try {
              const result = await cfAuth.request<{
                data: Invoice[];
                nextOffset?: number | null;
              }>(`/api/workspace/invoices?limit=50&offset=${offset}`);
              setItems((previous) => [...previous, ...result.data]);
              setOffset(result.nextOffset ?? null);
            } catch {
              setError("Pagina următoare nu poate fi încărcată. Reîncearcă.");
            } finally {
              setLoading(false);
            }
          }}
        >
          Mai multe facturi
        </Button>
      )}
    </section>
  );
}
