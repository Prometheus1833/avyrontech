import pdfMake from "pdfmake/build/pdfmake";
import fonts from "pdfmake/build/vfs_fonts";
import type { Content, TDocumentDefinitions } from "pdfmake/interfaces";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  Header,
  Footer,
  AlignmentType,
  PageNumber,
  PageBreak,
  WidthType,
  TableLayoutType,
  BorderStyle,
  ImageRun,
} from "docx";
import { DOCUMENT_DESIGN, commercialTotalReady, commercialTotals, billingLabel, isModernDocument, readableDocumentDraft } from "../../../../src/shared/documents/design";
import { documentBrandPng } from "./documentBrand";
import {
  plainText,
  documentTableGrid,
  type DocumentNode,
  type DocumentPayload,
} from "../../../../src/shared/documents/model";
pdfMake.addVirtualFileSystem(fonts);
const modernTableLayout = {
  hLineWidth: () => 0.5,
  vLineWidth: () => 0,
  hLineColor: () => `#${DOCUMENT_DESIGN.rule}`,
  paddingLeft: () => 7,
  paddingRight: () => 7,
  paddingTop: () => 6,
  paddingBottom: () => 6,
};
const pdfNode = (node: DocumentNode, modern = false): Content => {
  if (node.type === "text")
    return {
      text: node.text || "",
      bold: node.marks?.some((m) => m.type === "bold"),
      italics: node.marks?.some((m) => m.type === "italic"),
      decoration: node.marks?.some((m) => m.type === "underline")
        ? "underline"
        : node.marks?.some((m) => m.type === "strike")
          ? "lineThrough"
          : undefined,
    };
  if (node.type === "image" && node.attrs?.src)
    return { image: node.attrs.src, fit: [420, 180], margin: [0, 8, 0, 8] };
  if (node.type === "pageBreak") return { text: "", pageBreak: "after" };
  if (node.type === "hardBreak") return { text: "\n" };
  if (node.type === "horizontalRule")
    return {
      canvas: [
        {
          type: "line",
          x1: 0,
          y1: 0,
          x2: 480,
          y2: 0,
          lineWidth: 0.5,
          lineColor: "#aab0bc",
        },
      ],
      margin: [0, 8, 0, 8],
    };
  if (node.type === "table")
    return {
      table: {
        headerRows: node.content?.[0]?.content?.every(
          (c) => c.type === "tableHeader",
        )
          ? 1
          : 0,
        keepWithHeaderRows: 1,
        dontBreakRows: true,
        widths: documentTableGrid(node)[0].map(() => "*"),
        body: documentTableGrid(node).map((row) =>
          row.map((cell) =>
            cell
              ? {
                  stack: (cell.content || []).map((child) => pdfNode(child, modern)),
                  colSpan: cell.attrs?.colspan || 1,
                  rowSpan: cell.attrs?.rowspan || 1,
                  fillColor:
                    cell.type === "tableHeader" ? (modern ? `#${DOCUMENT_DESIGN.tint}` : "#edf0f8") : undefined,
                }
              : { text: "" },
          ),
        ),
      },
      layout: modern ? modernTableLayout : "lightHorizontalLines",
      margin: [0, 8, 0, 12],
    };
  if (["bulletList", "orderedList"].includes(node.type))
    return node.type === "bulletList"
      ? { ul: (node.content || []).map((child) => pdfNode(child, modern)), margin: [0, 3, 0, 9] }
      : {
          ol: (node.content || []).map((child) => pdfNode(child, modern)),
          start: node.attrs?.start || 1,
          margin: [0, 3, 0, 9],
        };
  if (
    ["doc", "listItem", "blockquote", "tableCell", "tableHeader"].includes(
      node.type,
    )
  )
    return { stack: (node.content || []).map((child) => pdfNode(child, modern)) };
  return {
    text: (node.content || []).map((child) => pdfNode(child, modern)),
    fontSize:
      node.type === "heading" ? (node.attrs?.level === 1 ? 19 : modern ? 12 : 13) : 10.5,
    bold: node.type === "heading",
    color: modern ? `#${node.type === "heading" ? DOCUMENT_DESIGN.accent : DOCUMENT_DESIGN.ink}` : node.type === "heading" ? "#26314d" : "#222b3e",
    margin: node.type === "heading" ? [0, 14, 0, 7] : [0, 0, 0, 7],
    ...(node.type === "heading"
      ? { headlineLevel: node.attrs?.level || 2 }
      : {}),
    lineHeight: modern ? 1.16 : 1.2,
  };
};
const money = (value: number, currency: string) =>
  new Intl.NumberFormat("ro-RO", { style: "currency", currency }).format(
    value / 100,
  );
export function pdfDefinition(
  payload: DocumentPayload,
  number: string,
  version: number,
  draft: boolean,
): TDocumentDefinitions {
  const modern = isModernDocument(payload);
  if (modern && draft) payload = readableDocumentDraft(payload);
  const keepCommercialTogether = modern && payload.lines.length <= 6 && commercialTotals(payload.lines).length <= 3 && payload.lines.reduce((n,l) => n+l.label.length+l.sku.length+l.discountReason.length,0) <= 900;
  const table: Content[] = payload.lines.length
    ? [
        {
          text: "Deviz · valori în unități monetare",
          ...(modern ? { id: "commercial-estimate" } : {}),
          bold: true,
          margin: [0, 16, 0, 7] as [number, number, number, number],
        },
        {
          table: {
            headerRows: 1,
            dontBreakRows: true,
            widths: ["*", 28, 66, 66, 48],
            body: [
              [
                "Serviciu / produs",
                "Cant.",
                "Catalog / unit.",
                "Ofertat / unit.",
                "TVA",
              ].map((text) => modern ? { text, bold: true, fillColor: `#${DOCUMENT_DESIGN.tint}`, color: `#${DOCUMENT_DESIGN.accent}` } : text),
              ...payload.lines.map((line) => [
                `${line.label}\n${line.sku} · ${modern ? billingLabel(line.billingCycle) : line.billingCycle}${line.discountReason ? "\n" + line.discountReason : ""}`,
                line.quantity,
                line.catalogPriceMinor === null
                  ? "La ofertare"
                  : money(line.catalogPriceMinor, line.currency),
                modern && line.priceConfirmed === false ? "De confirmat" : money(line.offeredPriceMinor, line.currency),
                modern && line.taxVerified === false ? "De verificat" : `${line.vatBasisPoints / 100}%`,
              ]),
            ],
          },
          layout: modern ? modernTableLayout : "lightHorizontalLines",
        },
        ...(modern ? commercialTotals(payload.lines).map((total, index, totals): Content => ({
          stack: !commercialTotalReady(payload.lines, total) ? [
            { text: billingLabel(total.cycle), bold: true },
            { text: "Totalul se calculează după confirmarea prețurilor și a regimului fiscal.", ...(index === totals.length - 1 ? { id: "commercial-total-final" } : {}) },
          ] : [
            { text: `${billingLabel(total.cycle)} · ${total.currency}`, color: `#${DOCUMENT_DESIGN.accent}`, bold: true, fontSize: 10 },
            { text: `Valoare fără taxe: ${money(total.net, total.currency)} · Taxe înscrise: ${money(total.tax, total.currency)}`, fontSize: 9, margin: [0, 4, 0, 3] },
            { text: `Total cu taxele înscrise: ${money(total.gross, total.currency)}`, bold: true, fontSize: 12, ...(index === totals.length - 1 ? { id: "commercial-total-final" } : {}) },
          ], margin: [0, 12, 0, 0],
        })) : [        {
          text: `Total cu taxele înscrise: ${money(
            payload.lines.reduce(
              (sum, line) =>
                sum +
                Math.round(
                  line.quantity *
                    line.offeredPriceMinor *
                    (1 + line.vatBasisPoints / 10000),
                ),
              0,
            ),
            payload.lines[0].currency,
          )}`,
          bold: true,
          margin: [0, 10, 0, 0] as [number, number, number, number],
        },]),
      ]
    : [];
  return {
    pageSize: "A4",
    pageMargins: modern ? [44, 82, 44, 66] : [48, 86, 48, 66],
    ...(modern ? { pageBreakBefore: (node, queries) => {
      if (node.id === "commercial-estimate" && keepCommercialTogether && queries.getPreviousNodesOnPage().length > 0)
        return !queries.getFollowingNodesOnPage().some((following) => following.id === "commercial-total-final");
      return !!node.headlineLevel && queries.getFollowingNodesOnPage().length === 0;
    } } satisfies Partial<TDocumentDefinitions> : {}),
    defaultStyle: { font: "Roboto", fontSize: 10.5 },
    info: {
      title: payload.title,
      author: "AVYRON",
      subject: `${number} · v${version}`,
    },
    header: () => ({
      margin: modern ? [44, 22, 44, 12] : [48, 24, 48, 12],
      stack: [{ columns: [
        { image: documentBrandPng, width: 28 },
        {
          stack: [
            { text: "AVYRON", bold: true, fontSize: 12, color: "#3d377b" },
            { text: payload.header, fontSize: 8, color: "#566077" },
          ],
          margin: [10, 0, 0, 0],
        },
      ] }, ...(modern ? [{ canvas: [{ type: "line" as const, x1: 0, y1: 0, x2: 507, y2: 0, lineWidth: 1.5, lineColor: `#${DOCUMENT_DESIGN.accent}` }], margin: [0, 9, 0, 0] as [number,number,number,number] }] : [])],
    }),
    footer: (page, pages) => ({
      margin: modern ? [44, 15, 44, 15] : [48, 15, 48, 15],
      columns: [
        {
          text: `${payload.footer}\n${number} · v${version}`,
          fontSize: 8,
          color: "#566077",
        },
        { text: `${page} / ${pages}`, alignment: "right", fontSize: 8 },
      ],
    }),
    ...(draft
      ? {
          watermark: {
            text: "CIORNĂ · NEAPROBAT",
            color: "#aab0bc",
            opacity: 0.13,
            bold: true,
            angle: -40,
          },
        }
      : {}),
    content: [
      {
        text: payload.title,
        fontSize: 22,
        bold: true,
        color: modern ? "#111827" : "#222b50",
        margin: [0, 0, 0, 8],
      },
      {
        text: `${number} · versiunea ${version}${draft ? " · Ciornă neaprobată" : ""}`,
        fontSize: 9,
        color: "#596477",
        margin: [0, 0, 0, 16],
      },
      ...(payload.body.content || []).map((child) => pdfNode(child, modern)),
      ...table,
    ],
  };
}
const textRuns = (node: DocumentNode, forceBold = false): TextRun[] =>
  node.type === "text"
    ? [
        new TextRun({
          text: node.text || "",
          bold: forceBold || node.marks?.some((m) => m.type === "bold"),
          italics: node.marks?.some((m) => m.type === "italic"),
          underline: node.marks?.some((m) => m.type === "underline")
            ? {}
            : undefined,
          strike: node.marks?.some((m) => m.type === "strike"),
        }),
      ]
    : (node.content || []).flatMap((child) => textRuns(child, forceBold));
function wordNodes(node: DocumentNode, depth = 0, modern = false, forceBold = false): Array<Paragraph | Table> {
  if (node.type === "pageBreak")
    return [new Paragraph({ children: [new PageBreak()] })];
  if (node.type === "image" && node.attrs?.src)
    return [
      new Paragraph({
        children: [
          new ImageRun({
            type: node.attrs.src.startsWith("data:image/png") ? "png" : "jpg",
            data: Uint8Array.from(atob(node.attrs.src.split(",")[1]), (c) =>
              c.charCodeAt(0),
            ),
            transformation: { width: 420, height: 180 },
          }),
        ],
      }),
    ];
  if (node.type === "table")
    return [
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        ...(modern ? {
          layout: TableLayoutType.FIXED,
          columnWidths: documentTableGrid(node)[0].map(() => Math.floor(10006 / documentTableGrid(node)[0].length)),
          borders: Object.fromEntries(["top", "bottom", "left", "right", "insideHorizontal", "insideVertical"].map(edge => [edge, { style: BorderStyle.SINGLE, size: 4, color: DOCUMENT_DESIGN.rule }])),
        } : {}),
        rows: (node.content || []).map(
          (row) =>
            new TableRow({
              cantSplit: true,
              tableHeader: row.content?.every((c) => c.type === "tableHeader"),
              children: (row.content || []).map(
                (cell) =>
                  new TableCell({
                    ...(modern ? { margins: { top: 100, bottom: 100, left: 120, right: 120 } } : {}),
                    columnSpan: cell.attrs?.colspan || 1,
                    rowSpan: cell.attrs?.rowspan || 1,
                    shading:
                      cell.type === "tableHeader"
                        ? { fill: modern ? DOCUMENT_DESIGN.tint : "EDF0F8" }
                        : undefined,
                    children: (cell.content || []).flatMap((child) =>
                      wordNodes(child, depth, modern, modern && cell.type === "tableHeader"),
                    ),
                  }),
              ),
            }),
        ),
      }),
    ];
  if (node.type === "bulletList")
    return (node.content || []).flatMap((child) => {
      const result = wordNodes(child, depth + 1, modern);
      return result;
    });
  if (node.type === "orderedList")
    return (node.content || []).flatMap((child, i) => [
      new Paragraph({
        children: [
          new TextRun(`${(node.attrs?.start || 1) + i}. `),
          ...textRuns(child),
        ],
        spacing: { after: 100 },
      }),
    ]);
  if (node.type === "listItem")
    return [
      new Paragraph({
        children: textRuns(node, forceBold),
        bullet: { level: Math.min(depth - 1, 3) },
        spacing: { after: 100 },
      }),
    ];
  if (["doc", "blockquote"].includes(node.type))
    return (node.content || []).flatMap((n) => wordNodes(n, depth, modern));
  return [
    new Paragraph({
      children:
        node.type === "hardBreak"
          ? [new TextRun({ break: 1 })]
          : textRuns(node, forceBold),
      heading:
        node.type === "heading"
          ? node.attrs?.level === 1
            ? HeadingLevel.HEADING_1
            : HeadingLevel.HEADING_2
          : undefined,
      keepNext: node.type === "heading",
      spacing: { after: 140, line: 280 },
    }),
  ];
}
export async function exportDocument(
  payload: DocumentPayload,
  number: string,
  version: number,
  format: "pdf" | "docx",
  draft: boolean,
): Promise<Uint8Array> {
  if (format === "pdf")
    return new Uint8Array(
      await pdfMake
        .createPdf(pdfDefinition(payload, number, version, draft))
        .getBuffer(),
    );
  const modern = isModernDocument(payload);
  if (modern && draft) payload = readableDocumentDraft(payload);
  const logo = Uint8Array.from(atob(documentBrandPng.split(",")[1]), (c) =>
    c.charCodeAt(0),
  );
  const lines = payload.lines.length
    ? [
        new Paragraph({ text: "Deviz", heading: HeadingLevel.HEADING_2 }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          layout: TableLayoutType.FIXED,
          columnWidths: [4400, 800, 1800, 1800, 1206],
          borders: Object.fromEntries(
            [
              "top",
              "bottom",
              "left",
              "right",
              "insideHorizontal",
              "insideVertical",
            ].map((edge) => [
              edge,
              { style: BorderStyle.SINGLE, size: 4, color: "DDE3EF" },
            ]),
          ),
          rows: [
            [
              "Serviciu / produs",
              "Cant.",
              "Catalog / unitate",
              "Ofertat / unitate",
              "TVA",
            ],
            ...payload.lines.map((l) => [
              `${l.label} · ${l.sku}\n${modern ? billingLabel(l.billingCycle) : l.billingCycle}\n${l.discountReason}`,
              String(l.quantity),
              l.catalogPriceMinor === null
                ? "La ofertare"
                : money(l.catalogPriceMinor, l.currency),
              modern && l.priceConfirmed === false ? "De confirmat" : money(l.offeredPriceMinor, l.currency),
              modern && l.taxVerified === false ? "De verificat" : `${l.vatBasisPoints / 100}%`,
            ]),
          ].map(
            (row, i) =>
              new TableRow({
                tableHeader: i === 0,
                cantSplit: true,
                children: row.map(
                  (text, column) =>
                    new TableCell({
                      width: {
                        size: [4400, 800, 1800, 1800, 1206][column],
                        type: WidthType.DXA,
                      },
                      shading: i === 0 ? { fill: modern ? DOCUMENT_DESIGN.tint : "EDF0F8" } : undefined,
                      margins: { top: 100, bottom: 100, left: 100, right: 100 },
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({ text, bold: i === 0, size: 18 }),
                          ],
                          spacing: { after: 0 },
                        }),
                      ],
                    }),
                ),
              }),
          ),
        }),
        ...(modern ? commercialTotals(payload.lines).flatMap((total) => !commercialTotalReady(payload.lines, total) ? [
          new Paragraph({ text: billingLabel(total.cycle), heading: HeadingLevel.HEADING_2 }),
          new Paragraph("Totalul se calculează după confirmarea prețurilor și a regimului fiscal."),
        ] : [
          new Paragraph({ text: `${billingLabel(total.cycle)} · ${total.currency}`, heading: HeadingLevel.HEADING_2 }),
          new Paragraph({ text: `Valoare fără taxe: ${money(total.net, total.currency)} · Taxe înscrise: ${money(total.tax, total.currency)}`, spacing: { after: 80 } }),
          new Paragraph({ children: [new TextRun({ text: `Total cu taxele înscrise: ${money(total.gross, total.currency)}`, bold: true, size: 24 })], spacing: { after: 160 } }),
        ]) : [        new Paragraph({
          spacing: { before: 160 },
          children: [
            new TextRun({
              bold: true,
              text: `Total cu taxele înscrise: ${money(
                payload.lines.reduce(
                  (sum, l) =>
                    sum +
                    Math.round(
                      l.quantity *
                        l.offeredPriceMinor *
                        (1 + l.vatBasisPoints / 10000),
                    ),
                  0,
                ),
                payload.lines[0].currency,
              )}`,
            }),
          ],
        }),]),
      ]
    : [];
  const doc = new Document({
    creator: "AVYRON",
    title: payload.title,
    styles: {
      default: {
        document: { run: { font: "Arial", size: 21, color: modern ? DOCUMENT_DESIGN.ink : "263046" }, ...(modern ? { paragraph: { spacing: { line: 290, after: 140 } } } : {}) },
        ...(modern ? { title: { run: { font: "Arial", size: 44, bold: true, color: "111827" }, paragraph: { keepNext: true, spacing: { before: 0, after: 160 } } } } : {}),
        heading1: {
          run: { font: "Arial", size: 34, bold: true, color: "222B50" },
          paragraph: { spacing: { before: 280, after: 180 }, keepNext: true },
        },
        heading2: {
          run: { font: "Arial", size: 26, bold: true, color: modern ? DOCUMENT_DESIGN.accent : "3D377B" },
          paragraph: { spacing: { before: 240, after: 140 }, keepNext: true },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: {
              top: 1500,
              right: 950,
              bottom: 1100,
              left: 950,
              header: 550,
              footer: 550,
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                ...(modern ? { border: { bottom: { style: BorderStyle.SINGLE, color: DOCUMENT_DESIGN.accent, size: 12, space: 8 } }, spacing: { after: 120 } } : {}),
                children: [
                  new ImageRun({
                    type: "png",
                    data: logo,
                    transformation: { width: 28, height: 28 },
                  }),
                  new TextRun({
                    text: `  ${payload.header}`,
                    size: 17,
                    color: modern ? DOCUMENT_DESIGN.accent : "3D377B",
                  }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: `${payload.footer} · ${number} · v${version}${modern && draft ? " · CIORNĂ NEAPROBATĂ" : ""} · `,
                    size: 16,
                  }),
                  new TextRun({
                    children: [
                      PageNumber.CURRENT,
                      " / ",
                      PageNumber.TOTAL_PAGES,
                    ],
                  }),
                ],
              }),
            ],
          }),
        },
        children: [
          new Paragraph({
            text: payload.title,
            heading: HeadingLevel.TITLE,
            spacing: { before: 160, after: 240 },
          }),
          new Paragraph({
            text: `${number} · v${version}${draft ? " · CIORNĂ NEAPROBATĂ" : ""}`,
            spacing: { after: 240 },
          }),
          ...wordNodes(payload.body, 0, modern),
          ...lines,
        ],
      },
    ],
  });
  return new Uint8Array(await Packer.toBuffer(doc));
}
export const exportFilename = (
  number: string,
  version: number,
  format: "pdf" | "docx",
) => `${number.replace(/[^A-Za-z0-9-]/g, "")}-v${version}.${format}`;
