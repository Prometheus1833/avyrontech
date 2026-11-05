import { useState } from "react";
import type { ClientFile } from "@/shared/clientWorkspace";
import { date, money, statusName } from "./clientPresentation";
import { Field } from "./ClientFields";
export default function ClientPayments({ file }: { file: ClientFile }) {
  const [filter, setFilter] = useState("all");
  if (!file.permissions.finance)
    return (
      <p className="cw-empty">
        Nu ai permisiunea de a consulta situația financiară.
      </p>
    );
  const pending = file.invoices.filter(
    (i) =>
      !["paid", "cancelled", "void", "draft", "refunded", "archived"].includes(
        i.status,
      ),
  );
  const rows = file.invoices.filter(
    (i) =>
      filter === "all" ||
      (filter === "pending" && pending.includes(i)) ||
      (filter === "paid" && i.status === "paid") ||
      (filter === "draft" && i.status === "draft"),
  );
  return (
    <div className="cw-stack">
      <div className="cw-section-title">
        <h2>Situația plăților</h2>
        <Field label="Filtrează facturile">
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">Toate stările</option>
            <option value="pending">Plăți în așteptare</option>
            <option value="paid">Achitate</option>
            <option value="draft">Ciorne de facturare</option>
          </select>
        </Field>
      </div>
      <div className="cw-metrics">
        <div className="cw-metric">
          <span>Plăți în așteptare</span>
          <strong>{pending.length}</strong>
        </div>
        <div className="cw-metric">
          <span>Facturi achitate</span>
          <strong>
            {file.invoices.filter((i) => i.status === "paid").length}
          </strong>
        </div>
        <div className="cw-metric">
          <span>Încasări înregistrate</span>
          <strong>{file.receipts.length}</strong>
        </div>
      </div>
      <p className="cw-hint">
        Stările provin din registrele financiare. Sunt afișate cele mai recente
        100 de înregistrări din fiecare registru. Ciornele nu reprezintă facturi
        emise sau plăți efectuate.
      </p>
      <div className="cw-table-wrap">
        <table className="cw-table">
          <caption className="sr-only">Facturile clientului</caption>
          <thead>
            <tr>
              <th scope="col">Factură / serviciu</th>
              <th scope="col">Stare</th>
              <th scope="col">Total</th>
              <th scope="col">Încasat</th>
              <th scope="col">Scadență</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((i) => (
              <tr key={`${i.source}:${i.id}`}>
                <td>
                  <strong>{i.invoice_number || "Fără număr emis"}</strong>
                  <div>{i.service_name}</div>
                  <div className="cw-hint">
                    {i.project_name} ·{" "}
                    {i.source === "financial"
                      ? "Registru financiar"
                      : "Registru inițial"}
                  </div>
                </td>
                <td>{statusName(i.status)}</td>
                <td>{money(i.gross_amount_minor, i.currency)}</td>
                <td>{money(i.received_minor, i.currency)}</td>
                <td>{date(i.due_date)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && (
          <p className="cw-empty">Nu există facturi pentru filtrul selectat.</p>
        )}
      </div>
      <section className="cw-card">
        <h3>Încasări recente</h3>
        {file.receipts.slice(0, 12).map((r) => (
          <div key={`${r.source}:${r.id}`} className="cw-account">
            <span>
              {date(r.paid_at)} · {r.reference || "Fără referință suplimentară"}
            </span>
            <strong>{money(r.amount_minor, r.currency)}</strong>
          </div>
        ))}
        {!file.receipts.length && (
          <p className="cw-hint">
            Nu există încasări înregistrate pentru acest beneficiar.
          </p>
        )}
      </section>
      {!!file.orders.length && (
        <section className="cw-card">
          <h3>Comenzi ale conturilor asociate exclusiv acestui client</h3>
          {file.orders.slice(0, 12).map((o) => (
            <p className="cw-account cw-muted" key={String(o.id)}>
              {String(o.id).slice(0, 8)} · {statusName(String(o.status))} ·{" "}
              {money(Number(o.total_cents), String(o.currency))}
            </p>
          ))}
        </section>
      )}
    </div>
  );
}
