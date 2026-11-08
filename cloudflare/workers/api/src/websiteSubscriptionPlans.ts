import {
  defaultWebsitePlans,
  websitePlanReady,
  type WebsitePlan,
} from "../../../../src/shared/websiteSubscriptions";

export async function websitePlans(db: D1Database): Promise<WebsitePlan[]> {
  const { results } = await db
    .prepare(
      `SELECT p.id,p.current_revision,v.config_json,c.base_price_minor,c.currency,c.vat_basis_points,c.tax_status,c.payment_status,c.invoice_provider FROM website_subscription_plans p JOIN website_subscription_plan_versions v ON v.plan_id=p.id AND v.revision=p.current_revision JOIN commercial_catalog_codes c ON c.id=p.catalog_id WHERE c.active=1`,
    )
    .all<{
      id: string;
      current_revision: number;
      config_json: string;
      base_price_minor: number | null;
      currency: string;
      vat_basis_points: number;
      tax_status: string;
      payment_status: string;
      invoice_provider: string;
    }>();
  return defaultWebsitePlans().flatMap((base) => {
    const row = results.find((r) => r.id === base.id);
    if (!row) return [];
    const config = JSON.parse(row.config_json) as Partial<WebsitePlan>;
    const p = {
      ...base,
      ...config,
      id: base.id,
      name: base.name,
      sku: base.sku,
      revision: row.current_revision,
      priceMinor: row.base_price_minor,
      currency: row.currency,
      vatBasisPoints: row.vat_basis_points,
      taxVerified: row.tax_status === "verified",
      invoiceProvider:
        row.invoice_provider === "oblio"
          ? ("oblio" as const)
          : ("manual" as const),
      available: false,
    };
    if (
      row.current_revision > 1 &&
      (config.priceMinor !== row.base_price_minor ||
        config.currency !== row.currency ||
        config.vatBasisPoints !== row.vat_basis_points)
    )
      p.reviewed = false;
    p.available = websitePlanReady(p) && row.payment_status === "active";
    return [p];
  });
}
