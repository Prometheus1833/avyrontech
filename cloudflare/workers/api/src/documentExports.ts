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
  ImageRun,
} from "docx";
import { documentBrandPng } from "./documentBrand";
import {
  plainText,
  documentTableGrid,
  type DocumentNode,
  type DocumentPayload,
} from "../../../../src/shared/documents/model";
pdfMake.addVirtualFileSystem(fonts);
const pdfNode = (node: DocumentNode): Content => {
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
                  stack: (cell.content || []).map(pdfNode),
                  colSpan: cell.attrs?.colspan || 1,
                  rowSpan: cell.attrs?.rowspan || 1,
                  fillColor:
                    cell.type === "tableHeader" ? "#edf0f8" : undefined,
                }
              : { text: "" },
          ),
        ),
      },
      layout: "lightHorizontalLines",
      margin: [0, 8, 0, 12],
    };
  if (["bulletList", "orderedList"].includes(node.type))
    return node.type === "bulletList"
      ? { ul: (node.content || []).map(pdfNode), margin: [0, 3, 0, 9] }
      : {
          ol: (node.content || []).map(pdfNode),
          start: node.attrs?.start || 1,
          margin: [0, 3, 0, 9],
        };
  if (
    ["doc", "listItem", "blockquote", "tableCell", "tableHeader"].includes(
      node.type,
    )
  )
    return { stack: (node.content || []).map(pdfNode) };
  return {
    text: (node.content || []).map(pdfNode),
    fontSize:
      node.type === "heading" ? (node.attrs?.level === 1 ? 19 : 13) : 10.5,
    bold: node.type === "heading",
    color: node.type === "heading" ? "#26314d" : "#222b3e",
    margin: node.type === "heading" ? [0, 14, 0, 7] : [0, 0, 0, 7],
    ...(node.type === "heading"
      ? { headlineLevel: node.attrs?.level || 2 }
      : {}),
    lineHeight: 1.2,
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
  const table: Content[] = payload.lines.length
    ? [
        {
          text: "Deviz · valori în unități monetare",
          bold: true,
          margin: [0, 16, 0, 7],
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
              ],
              ...payload.lines.map((line) => [
                `${line.label}\n${line.sku} · ${line.billingCycle}${line.discountReason ? "\n" + line.discountReason : ""}`,
                line.quantity,
                line.catalogPriceMinor === null
                  ? "La ofertare"
                  : money(line.catalogPriceMinor, line.currency),
                money(line.offeredPriceMinor, line.currency),
                `${line.vatBasisPoints / 100}%`,
              ]),
            ],
          },
          layout: "lightHorizontalLines",
        },
        {
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
          margin: [0, 10, 0, 0],
        },
      ]
    : [];
  return {
    pageSize: "A4",
    pageMargins: [48, 86, 48, 66],
    defaultStyle: { font: "Roboto", fontSize: 10.5 },
    info: {
      title: payload.title,
      author: "AVYRON",
      subject: `${number} · v${version}`,
    },
    header: {
      margin: [48, 24, 48, 12],
      columns: [
        { image: documentBrandPng, width: 28 },
        {
          stack: [
            { text: "AVYRON", bold: true, fontSize: 12, color: "#3d377b" },
            { text: payload.header, fontSize: 8, color: "#566077" },
          ],
          margin: [10, 0, 0, 0],
        },
      ],
    },
    footer: (page, pages) => ({
      margin: [48, 15, 48, 15],
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
        color: "#222b50",
        margin: [0, 0, 0, 8],
      },
      {
        text: `${number} · versiunea ${version}${draft ? " · Ciornă neaprobată" : ""}`,
        fontSize: 9,
        color: "#596477",
        margin: [0, 0, 0, 16],
      },
      ...(payload.body.content || []).map(pdfNode),
      ...table,
    ],
  };
}
const textRuns = (node: DocumentNode): TextRun[] =>
  node.type === "text"
    ? [
        new TextRun({
          text: node.text || "",
          bold: node.marks?.some((m) => m.type === "bold"),
          italics: node.marks?.some((m) => m.type === "italic"),
          underline: node.marks?.some((m) => m.type === "underline")
            ? {}
            : undefined,
          strike: node.marks?.some((m) => m.type === "strike"),
        }),
      ]
    : (node.content || []).flatMap(textRuns);
function wordNodes(node: DocumentNode, depth = 0): Array<Paragraph | Table> {
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
        rows: (node.content || []).map(
          (row) =>
            new TableRow({
              cantSplit: true,
              tableHeader: row.content?.every((c) => c.type === "tableHeader"),
              children: (row.content || []).map(
                (cell) =>
                  new TableCell({
                    columnSpan: cell.attrs?.colspan || 1,
                    rowSpan: cell.attrs?.rowspan || 1,
                    shading:
                      cell.type === "tableHeader"
                        ? { fill: "EDF0F8" }
                        : undefined,
                    children: (cell.content || []).flatMap((child) =>
                      wordNodes(child),
                    ),
                  }),
              ),
            }),
        ),
      }),
    ];
  if (node.type === "bulletList")
    return (node.content || []).flatMap((child) => {
      const result = wordNodes(child, depth + 1);
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
        children: textRuns(node),
        bullet: { level: Math.min(depth - 1, 3) },
        spacing: { after: 100 },
      }),
    ];
  if (["doc", "blockquote"].includes(node.type))
    return (node.content || []).flatMap((n) => wordNodes(n, depth));
  return [
    new Paragraph({
      children:
        node.type === "hardBreak"
          ? [new TextRun({ break: 1 })]
          : textRuns(node),
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
  const logo = Uint8Array.from(atob(documentBrandPng.split(",")[1]), (c) =>
    c.charCodeAt(0),
  );
  const lines = payload.lines.length
    ? [
        new Paragraph({ text: "Deviz", heading: HeadingLevel.HEADING_2 }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            [
              "Serviciu / produs",
              "Cantitate",
              "Catalog / unitate",
              "Ofertat / unitate",
              "TVA",
            ],
            ...payload.lines.map((l) => [
              `${l.label} · ${l.sku}\n${l.billingCycle}\n${l.discountReason}`,
              String(l.quantity),
              l.catalogPriceMinor === null
                ? "La ofertare"
                : money(l.catalogPriceMinor, l.currency),
              money(l.offeredPriceMinor, l.currency),
              `${l.vatBasisPoints / 100}%`,
            ]),
          ].map(
            (row, i) =>
              new TableRow({
                tableHeader: i === 0,
                cantSplit: true,
                children: row.map(
                  (text) =>
                    new TableCell({ children: [new Paragraph({ text })] }),
                ),
              }),
          ),
        }),
        new Paragraph({
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
      ]
    : [];
  const doc = new Document({
    creator: "AVYRON",
    title: payload.title,
    styles: { default: { document: { run: { font: "Arial", size: 21 } } } },
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
                children: [
                  new ImageRun({
                    type: "png",
                    data: logo,
                    transformation: { width: 28, height: 28 },
                  }),
                  new TextRun({
                    text: `  AVYRON · ${payload.header}`,
                    size: 17,
                    color: "3D377B",
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
                    text: `${payload.footer} · ${number} · v${version} · `,
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
          ...wordNodes(payload.body),
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
