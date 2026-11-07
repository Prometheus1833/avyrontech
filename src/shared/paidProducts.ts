/** Purchase snapshots are historical; current entitlements remain a separate check. */
export type PaidProductLine = {
  name: string;
  sku: string | null;
  slug: string | null;
  quantity: number | null;
  deliveryMode?:string|null;
  licenseName?:string|null; licenseTerms?:string|null;
};
export type PaidProductPurchase = {
  id: string;
  createdAt: number;
  paidAt: number | null;
  items: PaidProductLine[];
};
export type PaidProductHistory = {
  data: PaidProductPurchase[];
  nextCursor: string | null;
};

export function paidProductLines(snapshot: string): PaidProductLine[] {
  let items: unknown;
  try { items = JSON.parse(snapshot); } catch { return []; }
  if (!Array.isArray(items)) return [];
  return items.flatMap((item: unknown) => {
    if (!item || typeof item !== "object") return [];
    const line = item as Record<string, unknown>;
    if (line.type !== "product" && line.kind !== "item") return [];
    const text = (value: unknown) => typeof value === "string" && value.trim() ? value.trim() : null;
    const slug = text(line.productSlug) || (line.kind === "item" ? text(line.id) : null);
    return [{
      name: text(line.name) || slug || text(line.sku) || "Produs AVYRON",
      sku: text(line.sku), slug, ...(text(line.licenseTerms)?{licenseName:text(line.licenseName),licenseTerms:text(line.licenseTerms),deliveryMode:text(line.deliveryMode)}:{}),
      quantity: Number.isSafeInteger(line.quantity) && Number(line.quantity) > 0 ? Number(line.quantity) : null,
    }];
  });
}
