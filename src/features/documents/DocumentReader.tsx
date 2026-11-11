import { readableField, isModernDocument, isAgencyDocument, commercialTotalReady, commercialTotals, billingLabel, documentMoney as money } from "@/shared/documents/design";
import { Fragment, type ReactNode } from "react";
import {
  replaceVariables,
  type DocumentNode,
  type DocumentPayload,
} from "@/shared/documents/model";
import { documentBodyParts, isSignatureTable } from "@/shared/documents/signatures";
function nodeView(node: DocumentNode, labels: Record<string,string>, modern: boolean): ReactNode {
  const children = node.content?.map((child, index) => (
    <Fragment key={index}>{nodeView(child, labels, modern)}</Fragment>
  ));
  if (node.type === "text") {
    let value: ReactNode = modern ? (node.text || "").split(/(\{\{[a-zA-Z0-9_.-]+\}\})/g).map((part, index) => part.startsWith("{{") ? <span key={index} className="dc-field-placeholder">De completat: {readableField(part, labels)}</span> : part) : node.text || "";
    for (const mark of node.marks || [])
      value =
        mark.type === "bold" ? (
          <strong>{value}</strong>
        ) : mark.type === "italic" ? (
          <em>{value}</em>
        ) : mark.type === "underline" ? (
          <u>{value}</u>
        ) : mark.type === "strike" ? (
          <s>{value}</s>
        ) : mark.type === "code" ? (
          <code>{value}</code>
        ) : (
          value
        );
    return value;
  }
  switch (node.type) {
    case "doc":
      return <>{children}</>;
    case "paragraph":
      return (
        <p className="my-3 whitespace-pre-wrap leading-relaxed">
          {children || <br />}
        </p>
      );
    case "heading":
      return node.attrs?.level === 1 ? (
        <h3 className="my-4 text-xl font-semibold">{children}</h3>
      ) : (
        <h4 className="my-3 text-base font-semibold">{children}</h4>
      );
    case "bulletList":
      return <ul className="my-3 list-disc space-y-1 pl-6">{children}</ul>;
    case "orderedList":
      return (
        <ol
          start={node.attrs?.start}
          className="my-3 list-decimal space-y-1 pl-6"
        >
          {children}
        </ol>
      );
    case "listItem":
      return <li>{children}</li>;
    case "blockquote":
      return (
        <blockquote className="my-3 border-l-2 border-slate-300 pl-3 italic">
          {children}
        </blockquote>
      );
    case "hardBreak":
      return <br />;
    case "horizontalRule":
    case "pageBreak":
      return <hr className="my-5 border-slate-300" />;
    case "table":
      return (
        <div className="my-3 max-w-full overflow-auto">
          <table className={`w-full border-collapse text-xs ${isSignatureTable(node) ? "dc-paper-signatures" : ""}`} aria-label={isSignatureTable(node) ? "Semnăturile părților" : undefined}>
            <tbody>{children}</tbody>
          </table>
        </div>
      );
    case "tableRow":
      return <tr>{children}</tr>;
    case "tableHeader":
      return (
        <th
          colSpan={node.attrs?.colspan}
          rowSpan={node.attrs?.rowspan}
          className="border border-slate-300 bg-slate-100 p-2 text-left"
        >
          {children}
        </th>
      );
    case "tableCell":
      return (
        <td
          colSpan={node.attrs?.colspan}
          rowSpan={node.attrs?.rowspan}
          className="border border-slate-300 p-2 align-top"
        >
          {children}
        </td>
      );
    case "image":
      return node.attrs?.src &&
        /^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(
          node.attrs.src,
        ) ? (
        <img
          className="my-3 max-h-80 max-w-full object-contain"
          src={node.attrs.src}
          alt={node.attrs.alt || ""}
        />
      ) : null;
    default:
      return <>{children}</>;
  }
}
export default function DocumentReader({
  payload,
  fieldLabels,
}: {
  payload: DocumentPayload;
  fieldLabels?: Record<string,string>;
}) {
  const document = replaceVariables(payload, payload.fields);
  const totals = commercialTotals(document.lines);
  const { body, signatures } = documentBodyParts(document.body);
  const labels = { ...document.labels, ...fieldLabels };
  const modern = isModernDocument(document);
  return (
    <article
      aria-label="Conținutul documentului"
      className={`dc-document-paper min-w-0 rounded-xl bg-white p-4 text-sm text-slate-900 shadow-sm sm:p-8 ${isModernDocument(document) ? "dc-modern-paper" : ""} ${isAgencyDocument(document) ? "dc-agency-paper" : ""}`}
    >
      {isModernDocument(document) && <div className="dc-paper-brand"><strong>AVYRON</strong><span>DOCUMENT CENTER</span></div>}
      <p className="whitespace-pre-wrap border-b border-slate-200 pb-3 text-xs text-slate-600">
        {document.header}
      </p>
      <p className="dc-paper-title mt-5 text-lg font-semibold">{document.title}</p>
      <div className="dc-paper-body break-words">{nodeView(body, labels, modern)}</div>
      {document.lines.length > 0 && (
        <section className="mt-6">
          <h3 className="font-semibold">Servicii și produse incluse</h3>
          <div className="mt-3 max-w-full overflow-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr>
                  {[
                    "Serviciu / produs",
                    "Cant.",
                    "Catalog / unit.",
                    "Ofertat / unit.",
                    "TVA",
                  ].map((label) => (
                    <th
                      key={label}
                      className="border border-slate-300 bg-slate-100 p-2 text-left"
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {document.lines.map((line, index) => (
                  <tr key={index}>
                    <td className="border border-slate-300 p-2">
                      {line.label}
                      <span className="block text-[10px]">
                        {line.sku} · {billingLabel(line.billingCycle)}
                      </span>
                      {line.discountReason && (
                        <span className="block">{line.discountReason}</span>
                      )}
                    </td>
                    <td className="border border-slate-300 p-2">
                      {line.quantity}
                    </td>
                    <td className="border border-slate-300 p-2">
                      {line.catalogPriceMinor == null
                        ? "La ofertare"
                        : money(line.catalogPriceMinor, line.currency)}
                    </td>
                    <td className="border border-slate-300 p-2">
                      {line.priceConfirmed === false ? "De confirmat" : money(line.offeredPriceMinor, line.currency)}
                    </td>
                    <td className="border border-slate-300 p-2">
                      {line.taxVerified === false ? "De verificat" : `${line.vatBasisPoints / 100}%`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="dc-paper-totals">{totals.map((total) => (
            <div key={`${total.currency}:${total.cycle}`}>
              <h4>{billingLabel(total.cycle)} · {total.currency}</h4>
              {commercialTotalReady(document.lines, total) ? <><small>Valoare fără taxe: {money(total.net, total.currency)} · Taxe înscrise: {money(total.tax, total.currency)}</small>
              <p className="mt-2 font-semibold">Total cu taxele înscrise: {money(total.gross, total.currency)}</p></> : <p className="mt-2 text-xs">Totalul se calculează după confirmarea prețurilor și a regimului fiscal.</p>}
            </div>
          ))}</div>
        </section>
      )}
      {signatures.length > 0 && (
        <div className="dc-paper-body mt-6 break-words">
          {signatures.map((node, index) => <Fragment key={index}>{nodeView(node, labels, modern)}</Fragment>)}
        </div>
      )}
      <p className="mt-6 whitespace-pre-wrap border-t border-slate-200 pt-3 text-xs text-slate-600">
        {document.footer}
      </p>
    </article>
  );
}
