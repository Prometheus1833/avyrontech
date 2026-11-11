import { paragraph, type DocumentNode } from "./model";

export const SIGNATURE_TABLE_TITLE = "avyron-signatures";

export function bilateralSignatureTable(): DocumentNode {
  const column = (label: string, party: string, signatory: string): DocumentNode => ({
    type: "tableCell",
    content: [
      { type: "paragraph", content: [{ type: "text", text: label, marks: [{ type: "bold" }] }] },
      paragraph(party),
      paragraph(`Semnatar: ${signatory}`),
      { type: "paragraph", content: Array.from({ length: 3 }, () => ({ type: "hardBreak" })) },
      paragraph("Semnătură: __________________"),
      paragraph("Data: __________________"),
    ],
  });
  return {
    type: "table",
    attrs: { title: SIGNATURE_TABLE_TITLE },
    content: [{
      type: "tableRow",
      content: [
        column("Pentru AVYRON", "{{provider.legal_name}}", "{{provider.representative}}"),
        column("Pentru beneficiar", "{{beneficiary.legal_name}}", "{{beneficiary.signatory}}"),
      ],
    }],
  };
}

export const isSignatureTable = (node: DocumentNode) =>
  node.type === "table" && node.attrs?.title === SIGNATURE_TABLE_TITLE;

/** Keep the full body and the commercial estimate ahead of the signing area. */
export function documentBodyParts(root: DocumentNode) {
  const content = root.content || [];
  return {
    body: { ...root, content: content.filter(node => !isSignatureTable(node)) },
    signatures: content.filter(isSignatureTable),
  };
}
