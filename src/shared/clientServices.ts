import type { ProjectSummary } from "./projectSummary";
import { commerceItemBySku } from "../data/commerceCatalog";

export type ClientProjectService = {
  id: string;
  project_id: string;
  service_name: string;
};
export type ClientServicePurchase = {
  order_id: string;
  line_index: number;
  name: string;
};
export type ClientServicesFeed = {
  data: ProjectSummary[];
  services: ClientProjectService[];
  servicePurchases: ClientServicePurchase[];
};

/** Only service lines or verified legacy website packages from a paid order.
 * Mixed orders retain their service lines without relabelling products. */
export function confirmedServiceItems(order: {
  id: string;
  status: string;
  items_json: string;
}): ClientServicePurchase[] {
  if (order.status !== "paid") return [];
  try {
    const items: unknown = JSON.parse(order.items_json);
    if (!Array.isArray(items)) return [];
    return items.slice(0, 20).flatMap((item: unknown, line_index) => {
      if (!item || typeof item !== "object") return [];
      const value = item as Record<string, unknown>;
      const type = value.type ?? value.kind;
      const legacy = typeof value.sku === "string" ? commerceItemBySku(value.sku) : null;
      const service = type === "service" ||
        ((type === "package" || type === "website") && legacy?.type === type);
      if (
        !service ||
        typeof value.name !== "string" ||
        !value.name.trim()
      ) return [];
      return [{ order_id: order.id, line_index, name: value.name.trim() }];
    });
  } catch {
    return [];
  }
}
