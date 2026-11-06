import { z } from "zod";

export const DOCUMENT_PERMISSIONS = [
  "documents.read",
  "documents.create",
  "documents.edit",
  "documents.delete",
  "documents.export",
  "documents.share",
  "documents.publish",
  "documents.approve",
  "documents.templates.manage",
  "documents.company.owner",
  "documents.backups.manage",
] as const;
export type DocumentPermission = (typeof DOCUMENT_PERMISSIONS)[number];
export const scopes = ["client", "internal", "staff", "company"] as const;
export type DocumentScope = (typeof scopes)[number];
export const ENTITY_TYPES = [
  "PF",
  "PJ",
  "PFA",
  "II",
  "IF",
  "ONG",
  "Asociație",
  "Fundație",
  "Instituție",
  "Partener",
  "Altă formă",
] as const;
export type DocumentNode = {
  type: string;
  text?: string;
  attrs?: {
    level?: number;
    colspan?: number;
    rowspan?: number;
    colwidth?: number[] | null;
    start?: number;
    src?: string;
    alt?: string;
    title?: string;
  };
  marks?: { type: string }[];
  content?: DocumentNode[];
};
/** Validates and expands merged cells without trusting pasted table geometry. */
export function documentTableGrid(
  table: DocumentNode,
): (DocumentNode | null)[][] {
  const rows = table.content || [];
  const grid: (DocumentNode | null)[][] = rows.map(() => []);
  rows.forEach((row, r) => {
    let column = 0;
    for (const cell of row.content || []) {
      while (grid[r][column] !== undefined) column++;
      const width = cell.attrs?.colspan || 1,
        height = cell.attrs?.rowspan || 1;
      if (column + width > 12 || r + height > rows.length)
        throw new Error("invalid_table_geometry");
      for (let y = 0; y < height; y++)
        for (let x = 0; x < width; x++) {
          if (grid[r + y][column + x] !== undefined)
            throw new Error("overlapping_table_cells");
          grid[r + y][column + x] = x === 0 && y === 0 ? cell : null;
        }
      column += width;
    }
  });
  const width = grid[0]?.length || 0;
  if (
    !width ||
    grid.some(
      (row) =>
        row.length !== width ||
        Array.from({ length: width }, (_, i) => row[i]).some(
          (cell) => cell === undefined,
        ),
    )
  )
    throw new Error("ragged_table");
  return grid;
}
// No arbitrary HTML, styles, scripts, URLs, embeds or event handlers survive this boundary.
const nodes = [
  "doc",
  "paragraph",
  "heading",
  "text",
  "bulletList",
  "orderedList",
  "listItem",
  "table",
  "tableRow",
  "tableCell",
  "tableHeader",
  "hardBreak",
  "pageBreak",
  "horizontalRule",
  "blockquote",
  "image",
] as const;
export const nodeSchema: z.ZodType<DocumentNode> = z.lazy(() =>
  z
    .object({
      type: z.enum(nodes),
      text: z.string().max(50000).optional(),
      attrs: z
        .object({
          level: z.number().int().min(1).max(3).optional(),
          colspan: z.number().int().min(1).max(12).optional(),
          rowspan: z.number().int().min(1).max(20).optional(),
          colwidth: z
            .array(z.number().int().min(1).max(1000))
            .max(12)
            .nullable()
            .optional(),
          start: z.number().int().min(1).max(999).optional(),
          src: z
            .string()
            .max(300000)
            .regex(/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/)
            .optional(),
          alt: z.string().max(240).optional(),
          title: z.string().max(240).optional(),
        })
        .strict()
        .optional(),
      marks: z
        .array(
          z
            .object({
              type: z.enum(["bold", "italic", "underline", "strike", "code"]),
            })
            .strict(),
        )
        .max(5)
        .optional(),
      content: z.array(nodeSchema).max(300).optional(),
    })
    .strict(),
);
export const commercialLineSchema = z
  .object({
    catalogId: z.string().max(150),
    label: z.string().min(1).max(240),
    sku: z.string().max(100),
    quantity: z.number().int().min(1).max(10000),
    catalogPriceMinor: z.number().int().min(0).max(1000000000).nullable(),
    priceConfirmed: z.boolean().default(false),
    offeredPriceMinor: z.number().int().min(0).max(1000000000),
    discountReason: z.string().max(600),
    currency: z.string().regex(/^[A-Z]{3}$/),
    vatBasisPoints: z.number().int().min(0).max(10000),
    taxVerified: z.boolean(),
    billingCycle: z.string().max(32),
    priceModel: z.string().max(32),
    package: z.string().max(80),
  })
  .strict();
export const payloadSchema = z
  .object({
    title: z.string().trim().min(1).max(240),
    header: z.string().max(1000),
    footer: z.string().max(1000),
    body: nodeSchema,
    fields: z.record(z.string().max(100), z.string().max(6000)),
    labels: z.record(z.string().max(100), z.string().max(300)).default({}),
    lines: z.array(commercialLineSchema).max(50),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.body.type !== "doc")
      ctx.addIssue({ code: "custom", message: "Document root required" });
    let count = 0;
    const visit = (node: DocumentNode, depth: number) => {
      if (++count > 5000 || depth > 12) throw new Error("document_too_complex");
      const children: Record<string, string[]> = {
        doc: [
          "paragraph",
          "heading",
          "bulletList",
          "orderedList",
          "table",
          "blockquote",
          "pageBreak",
          "horizontalRule",
          "image",
        ],
        paragraph: ["text", "hardBreak"],
        heading: ["text", "hardBreak"],
        bulletList: ["listItem"],
        orderedList: ["listItem"],
        listItem: ["paragraph", "bulletList", "orderedList"],
        table: ["tableRow"],
        tableRow: ["tableCell", "tableHeader"],
        tableCell: ["paragraph", "bulletList", "orderedList"],
        tableHeader: ["paragraph", "bulletList", "orderedList"],
        blockquote: ["paragraph", "heading", "bulletList", "orderedList"],
      };
      if (
        node.type === "text" &&
        (typeof node.text !== "string" || node.content?.length)
      )
        throw new Error("invalid_text_node");
      if (
        node.content?.some(
          (child) => !children[node.type]?.includes(child.type),
        )
      )
        throw new Error("invalid_document_structure");
      if (
        ["table", "tableRow", "tableCell", "tableHeader"].includes(node.type) &&
        !node.content?.length
      )
        throw new Error("empty_table");
      if (node.type === "table") documentTableGrid(node);
      for (const child of node.content || []) visit(child, depth + 1);
    };
    try {
      visit(value.body, 0);
    } catch {
      ctx.addIssue({ code: "custom", message: "Document prea complex" });
    }
    if (JSON.stringify(value).length > 500000)
      ctx.addIssue({ code: "custom", message: "Document prea mare" });
  });
export type DocumentPayload = z.infer<typeof payloadSchema>;
export type CommercialLine = z.infer<typeof commercialLineSchema>;
export const paragraph = (text: string): DocumentNode => ({
  type: "paragraph",
  content: text ? [{ type: "text", text }] : [],
});
export const heading = (text: string, level = 2): DocumentNode => ({
  type: "heading",
  attrs: { level },
  content: [{ type: "text", text }],
});
export const plainText = (node: DocumentNode): string =>
  node.text ??
  (node.content || [])
    .map(plainText)
    .join(
      [
        "paragraph",
        "heading",
        "doc",
        "table",
        "tableRow",
        "listItem",
        "bulletList",
        "orderedList",
      ].includes(node.type)
        ? "\n"
        : "",
    );
export const blankPayload = (title = "Document nou"): DocumentPayload => ({
  title,
  header: "AVYRON · DIGITAL ECOTECH SOLUTIONS S.R.L.",
  footer: "Document privat · acces autorizat",
  body: { type: "doc", content: [paragraph("")] },
  fields: {},
  labels: { __avyron_design: "2026" },
  lines: [],
});
export function replaceVariables(
  payload: DocumentPayload,
  fields: Record<string, string>,
): DocumentPayload {
  const replace = (text: string) =>
    text.replace(
      /\{\{([a-zA-Z0-9_.-]+)\}\}([.,;:])?/g,
      (_, key: string, punctuation: string | undefined) => {
        const value = fields[key]?.trim();
        if (!value) return `{{${key}}}${punctuation || ""}`;
        return (
          value +
          (punctuation && !value.endsWith(punctuation) ? punctuation : "")
        );
      },
    );
  const visit = (n: DocumentNode): DocumentNode => ({
    ...n,
    ...(n.text !== undefined ? { text: replace(n.text) } : {}),
    ...(n.content ? { content: n.content.map(visit) } : {}),
  });
  return {
    ...payload,
    title: replace(payload.title),
    header: replace(payload.header),
    footer: replace(payload.footer),
    fields: { ...payload.fields, ...fields },
    body: visit(payload.body),
  };
}
export function documentIssues(
  payload: DocumentPayload,
  required: string[] = [],
) {
  const issues = required
    .filter((key) => !payload.fields[key]?.trim())
    .map((key) => `Completează: ${payload.labels?.[key] || key}`);
  const unresolved = [
    ...new Set(
      `${payload.title}\n${payload.header}\n${payload.footer}\n${plainText(payload.body)}`.match(
        /\{\{[^}]+\}\}/g,
      ) || [],
    ),
  ];
  issues.push(
    ...unresolved.map(
      (key) =>
        `Variabilă necompletată: ${payload.labels?.[key.slice(2, -2)] || key}`,
    ),
  );
  if (plainText(payload.body).trim().length < 80)
    issues.push("Conținut insuficient pentru finalizare.");
  if (new Set(payload.lines.map((line) => line.currency)).size > 1)
    issues.push("O ofertă consolidată trebuie să folosească o singură monedă.");
  for (const line of payload.lines) {
    if (!line.priceConfirmed)
      issues.push(`Confirmă prețul ofertat: ${line.label}`);
    if (!line.taxVerified)
      issues.push(`Regim fiscal neverificat: ${line.label}`);
    if (
      line.catalogPriceMinor !== line.offeredPriceMinor &&
      !line.discountReason.trim()
    )
      issues.push(`Justifică prețul personalizat: ${line.label}`);
    if (["unreviewed", "unverified"].includes(line.billingCycle))
      issues.push(`Confirmă recurența: ${line.label}`);
  }
  const total = payload.lines.reduce(
    (sum, line) =>
      sum +
      Math.round(
        line.offeredPriceMinor *
          line.quantity *
          (1 + line.vatBasisPoints / 10000),
      ),
    0,
  );
  if (!Number.isSafeInteger(total) || total > 100000000000)
    issues.push("Total comercial în afara limitei permise.");
  return [...new Set(issues)];
}
export type Assignment = {
  kind:
    | "project"
    | "service"
    | "subscription"
    | "billing_subscription"
    | "product"
    | "order"
    | "entitlement"
    | "partner"
    | "catalog";
  id: string;
};
export const assignmentSchema = z
  .object({
    kind: z.enum([
      "project",
      "service",
      "subscription",
      "billing_subscription",
      "product",
      "order",
      "entitlement",
      "partner",
      "catalog",
    ]),
    id: z.string().min(1).max(180),
  })
  .strict();
export const assignmentColumns = {
  project: "project_id",
  service: "service_id",
  subscription: "subscription_id",
  billing_subscription: "billing_subscription_id",
  product: "product_slug",
  order: "order_id",
  entitlement: "entitlement_id",
  partner: "partner_client_id",
  catalog: "catalog_id",
} as const;
