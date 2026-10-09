import { Hono } from "hono";
import { z } from "zod";
import type { AppBindings } from "./types";
import { platformRoleForUser } from "./authorization";

export const catalogCodesRouter = new Hono<AppBindings>();

const bodySchema = z.object({
  displayName: z.string().trim().min(1).max(180),
  accountingCode: z.string().trim().min(2).max(48).nullable(),
  sku: z.string().trim().min(2).max(64).nullable(),
  category: z.string().trim().min(1).max(80),
  basePriceMinor: z.number().int().min(0).nullable(),
  currency: z.string().trim().regex(/^[A-Z]{3,8}$/),
  vatBasisPoints: z.number().int().min(0).max(10_000),
  paymentRoute: z.enum(["unconfigured", "invoice", "payment_link", "stripe", "bank_transfer", "manual"]),
  preferredPaymentProvider: z.enum(["stripe", "revolut", "netopia"]).nullable(),
  invoiceProvider: z.enum(["oblio", "manual"]).nullable(),
  paymentStatus: z.enum(["needs_configuration", "test", "active", "paused"]),
  promotionCode: z.string().trim().min(2).max(80).nullable(),
  active: z.boolean(),
  notes: z.string().max(2000),
}).strict();

catalogCodesRouter.get("/api/finance/commercial-codes", async (c) => {
  if (!(await platformRoleForUser(c.env.DB, c.get("userId")))) return c.json({ error: { code: "forbidden" } }, 403);
  try {
    const [configured, products] = await Promise.all([
      c.env.DB.prepare("SELECT * FROM commercial_catalog_codes ORDER BY entity_type, display_name").all(),
      c.env.DB.prepare("SELECT slug AS entity_key,name_ro AS display_name,type AS category,price_ron_cents AS base_price_minor,status FROM product_items ORDER BY name_ro").all(),
    ]);
    return c.json({ data: configured.results, products: products.results });
  } catch (error) {
    if (/no such table: commercial_catalog_codes/i.test(String(error))) {
      return c.json({ error: { code: "catalog_codes_unavailable" } }, 503);
    }
    if (/no such table: product_items/i.test(String(error))) {
      const configured = await c.env.DB.prepare("SELECT * FROM commercial_catalog_codes ORDER BY entity_type, display_name").all();
      return c.json({ data: configured.results, products: [] });
    }
    throw error;
  }
});

catalogCodesRouter.put("/api/finance/commercial-codes/:entityType/:entityKey", async (c) => {
  if (!(await platformRoleForUser(c.env.DB, c.get("userId")))) return c.json({ error: { code: "forbidden" } }, 403);
  const entityType = c.req.param("entityType");
  const entityKey = c.req.param("entityKey").trim().slice(0, 120);
  if (!(["service", "product"] as const).includes(entityType as "service" | "product") || !/^[a-z0-9][a-z0-9._-]{0,119}$/i.test(entityKey)) {
    return c.json({ error: { code: "invalid_entity" } }, 400);
  }
  const parsed = bodySchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: { code: "invalid_catalog_code" } }, 400);
  const value = parsed.data;
  const before = await c.env.DB.prepare("SELECT * FROM commercial_catalog_codes WHERE entity_type=? AND entity_key=?")
    .bind(entityType, entityKey).first<Record<string, unknown>>();
  const id = String(before?.id || `catalog_${crypto.randomUUID().replace(/-/g, "")}`);
  const timestamp = Date.now();
  const after = {
    entityType, entityKey, displayName: value.displayName, accountingCode: value.accountingCode,
    sku: value.sku, category: value.category, basePriceMinor: value.basePriceMinor,
    currency: value.currency, vatBasisPoints: value.vatBasisPoints,
    paymentRoute: value.paymentRoute, preferredPaymentProvider: value.preferredPaymentProvider, invoiceProvider: value.invoiceProvider, paymentStatus: value.paymentStatus,
    promotionCode: value.promotionCode, active: value.active, notes: value.notes,
  };
  try {
    await c.env.DB.batch([
      c.env.DB.prepare(
        `INSERT INTO commercial_catalog_codes
          (id,entity_type,entity_key,display_name,accounting_code,sku,category,base_price_minor,currency,vat_basis_points,payment_route,preferred_payment_provider,invoice_provider,payment_status,promotion_code,active,notes,created_by,updated_by,created_at,updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
         ON CONFLICT(entity_type,entity_key) DO UPDATE SET
          display_name=excluded.display_name,accounting_code=excluded.accounting_code,sku=excluded.sku,
          category=excluded.category,base_price_minor=excluded.base_price_minor,currency=excluded.currency,
          vat_basis_points=excluded.vat_basis_points,payment_route=excluded.payment_route,preferred_payment_provider=excluded.preferred_payment_provider,invoice_provider=excluded.invoice_provider,
          payment_status=excluded.payment_status,promotion_code=excluded.promotion_code,active=excluded.active,
          notes=excluded.notes,updated_by=excluded.updated_by,updated_at=excluded.updated_at`,
      ).bind(
        id, entityType, entityKey, value.displayName, value.accountingCode, value.sku,
        value.category, value.basePriceMinor, value.currency, value.vatBasisPoints,
        value.paymentRoute, value.preferredPaymentProvider, value.invoiceProvider, value.paymentStatus, value.promotionCode, value.active ? 1 : 0,
        value.notes, c.get("userId"), c.get("userId"), Number(before?.created_at || timestamp), timestamp,
      ),
      c.env.DB.prepare("INSERT INTO commercial_catalog_audit (id,catalog_id,actor_user_id,before_json,after_json,created_at) VALUES (?,?,?,?,?,?)")
        .bind(`catalog_audit_${crypto.randomUUID().replace(/-/g, "")}`, id, c.get("userId"), before ? JSON.stringify(before) : null, JSON.stringify(after), timestamp),
    ]);
    return c.json({ ok: true, id });
  } catch (error) {
    if (/UNIQUE constraint failed/i.test(String(error))) return c.json({ error: { code: "duplicate_code_or_sku" } }, 409);
    throw error;
  }
});
