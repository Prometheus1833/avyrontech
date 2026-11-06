import { Fragment, type ReactNode } from "react";
import {
  replaceVariables,
  type DocumentNode,
  type DocumentPayload,
} from "@/shared/documents/model";
function nodeView(node: DocumentNode): ReactNode {
  const children = node.content?.map((child, index) => (
    <Fragment key={index}>{nodeView(child)}</Fragment>
  ));
  if (node.type === "text") {
    let value: ReactNode = node.text || "";
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
          <table className="w-full border-collapse text-xs">
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
const money = (value: number, currency: string) =>
  new Intl.NumberFormat("ro-RO", { style: "currency", currency }).format(
    value / 100,
  );
export default function DocumentReader({
  payload,
}: {
  payload: DocumentPayload;
}) {
  const document = replaceVariables(payload, payload.fields),
    totals = new Map<string, number>();
  for (const line of document.lines)
    totals.set(
      line.currency,
      (totals.get(line.currency) || 0) +
        Math.round(
          line.quantity *
            line.offeredPriceMinor *
            (1 + line.vatBasisPoints / 10000),
        ),
    );
  return (
    <article
      aria-label="Conținutul documentului"
      className="min-w-0 rounded-xl bg-white p-4 text-sm text-slate-900 shadow-sm sm:p-8"
    >
      <p className="whitespace-pre-wrap border-b border-slate-200 pb-3 text-xs text-slate-600">
        {document.header}
      </p>
      <p className="mt-5 text-lg font-semibold">{document.title}</p>
      <div className="break-words">{nodeView(document.body)}</div>
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
                        {line.sku} · {line.billingCycle}
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
                      {money(line.offeredPriceMinor, line.currency)}
                    </td>
                    <td className="border border-slate-300 p-2">
                      {line.vatBasisPoints / 100}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {[...totals].map(([currency, value]) => (
            <p key={currency} className="mt-3 font-semibold">
              Total cu taxele înscrise: {money(value, currency)}
            </p>
          ))}
        </section>
      )}
      <p className="mt-6 whitespace-pre-wrap border-t border-slate-200 pt-3 text-xs text-slate-600">
        {document.footer}
      </p>
    </article>
  );
}
