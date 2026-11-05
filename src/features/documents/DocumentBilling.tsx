import { useRef, useState } from "react";
import { statusNames } from "@/components/dashboard/subscriptions/subscriptionPresentation";
import { Link } from "react-router-dom";
import { documentsApi, type DocumentDetail } from "@/lib/documentsApi";

/** Creates a reviewable draft in the existing ledger; never issues an invoice. */
export default function DocumentBilling({
  detail,
  onSaved,
}: {
  detail: DocumentDetail;
  onSaved: () => Promise<void>;
}) {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const [invoiceDate, setInvoiceDate] = useState(today),
    [dueDate, setDueDate] = useState(today),
    [confirmed, setConfirmed] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const request = useRef({ body: "", key: crypto.randomUUID() });
  const totals = detail.version.payload.lines.reduce(
    (sum, line) =>
      sum +
      Math.round(
        line.quantity *
          line.offeredPriceMinor *
          (1 + line.vatBasisPoints / 10000),
      ),
    0,
  );
  const currency = detail.version.payload.lines[0]?.currency;
  const prepare = async () => {
    if (busy || !confirmed) return;
    setBusy(true);
    setError("");
    const body = {
      versionId: detail.version.id,
      invoiceDate: Date.parse(`${invoiceDate}T12:00:00Z`),
      dueDate: Date.parse(`${dueDate}T12:00:00Z`),
      confirmed: true,
    };
    const json = JSON.stringify(body);
    if (request.current.body !== json)
      request.current = { body: json, key: crypto.randomUUID() };
    try {
      await documentsApi.write(
        `/${detail.document.id}/prepare-billing`,
        body,
        "POST",
        request.current.key,
      );
      await onSaved();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="dc-grid">
      <p className="text-sm">
        {detail.document.number} · v{detail.version.version} ·{" "}
        {detail.document.company_name}
      </p>
      <p className="text-lg font-semibold">
        {(totals / 100).toLocaleString("ro-RO", { minimumFractionDigits: 2 })}{" "}
        {currency}
      </p>
      {detail.billingPreparation ? (
        <>
          <p className="dc-notice">
            Această versiune are deja o înregistrare în Financiar. Stare:{" "}
            {statusNames[detail.billingPreparation.status] ||
              detail.billingPreparation.status}
            {detail.billingPreparation.invoice_number
              ? ` · ${detail.billingPreparation.invoice_number}`
              : " · fără număr fiscal"}
            .
          </p>
          <Link className="dc-button" to="/profil?tab=finance">
            Deschide Financiar
          </Link>
        </>
      ) : (
        <>
          <p className="dc-notice">
            Se pregătește o ciornă în Financiar, pentru beneficiarul
            documentului. Verifică acolo datele fiscale, sumele și condițiile
            înainte de emitere. Operațiunea nu emite factura și nu inițiază o
            plată.
          </p>
          <div className="dc-filter-grid">
            <label className="dc-label">
              Data facturii
              <input
                required
                type="date"
                className="dc-input"
                value={invoiceDate}
                onChange={(e) => {
                  setInvoiceDate(e.target.value);
                  setConfirmed(false);
                }}
              />
            </label>
            <label className="dc-label">
              Data scadenței
              <input
                required
                type="date"
                min={invoiceDate}
                className="dc-input"
                value={dueDate}
                onChange={(e) => {
                  setDueDate(e.target.value);
                  setConfirmed(false);
                }}
              />
            </label>
          </div>
          <label className="dc-check">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            Am verificat beneficiarul, devizul aprobat și datele pentru ciornă.
          </label>
          {error && (
            <p role="alert" className="dc-notice">
              {error}
            </p>
          )}
          <button
            className="dc-button dc-primary"
            disabled={
              busy ||
              !confirmed ||
              !invoiceDate ||
              !dueDate ||
              dueDate < invoiceDate
            }
            onClick={() => void prepare()}
          >
            {busy ? "Se pregătește…" : "Creează ciorna în Financiar"}
          </button>
        </>
      )}
    </div>
  );
}
