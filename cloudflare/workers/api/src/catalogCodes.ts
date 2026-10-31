import { Hono } from "hono";
import { z } from "zod";
import { SERVICE_COMMERCIAL_SOURCES } from "../../../../src/data/serviceCommercialSources";
import type { AppBindings } from "./types";
import { platformRoleForUser } from "./authorization";

export const catalogCodesRouter = new Hono<AppBindings>();

const serviceSources = SERVICE_COMMERCIAL_SOURCES;
type ProductSource = { entity_key: string; display_name: string; category: string; base_price_minor: number | null; status: string };
const suggestedSku = (type: "service" | "product", key: string) => {
  const sku = `${type === "service" ? "svc" : "product"}-${key}`;
  return sku.length <= 64 ? sku : null;
};

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
  unitLabel: z.string().trim().min(1).max(32).optional(),
  priceModel: z.enum(["unreviewed", "fixed", "starting_at", "quote"]).optional(),
  billingCycle: z.enum(["unreviewed", "one_time", "monthly", "annual", "custom"]).optional(),
  taxStatus: z.enum(["unverified", "verified"]).optional(),
}).strict();

async function productSources(db: D1Database): Promise<ProductSource[]> {
  const result = await db.prepare("SELECT slug AS entity_key,name_ro AS display_name,type AS category,price_ron_cents AS base_price_minor,status FROM product_items ORDER BY name_ro").all<ProductSource>();
  return result.results;
}

catalogCodesRouter.get("/api/finance/commercial-codes", async (c) => {
  if (!(await platformRoleForUser(c.env.DB, c.get("userId")))) return c.json({ error: { code: "forbidden" } }, 403);
  try {
    const [configured, products, references] = await Promise.all([
      c.env.DB.prepare("SELECT * FROM commercial_catalog_codes ORDER BY entity_type, display_name").all(),
      productSources(c.env.DB),
      c.env.DB.prepare("SELECT r.*,c.entity_type,c.entity_key FROM commercial_catalog_provider_refs r JOIN commercial_catalog_codes c ON c.id=r.catalog_id ORDER BY c.entity_type,c.entity_key,r.provider,r.environment,r.reference_type").all(),
    ]);
    return c.json({ data: configured.results, services: serviceSources, products, references: references.results });
  } catch (error) {
    if (/no such table: commercial_catalog_codes/i.test(String(error))) {
      return c.json({ error: { code: "catalog_codes_unavailable" } }, 503);
    }
    if (/no such table: commercial_catalog_provider_refs/i.test(String(error))) {
      return c.json({ error: { code: "catalog_readiness_unavailable" } }, 503);
    }
    if (/no such table: product_items/i.test(String(error))) {
      const configured = await c.env.DB.prepare("SELECT * FROM commercial_catalog_codes ORDER BY entity_type, display_name").all();
      return c.json({ data: configured.results, services: serviceSources, products: [], references: [] });
    }
    throw error;
  }
});

/** Explicit, idempotent reconciliation: create missing identities, never overwrite reviewed prices or codes. */
catalogCodesRouter.post("/api/finance/commercial-codes/sync", async (c) => {
  if (!(await platformRoleForUser(c.env.DB, c.get("userId")))) return c.json({ error: { code: "forbidden" } }, 403);
  const [current, products] = await Promise.all([
    c.env.DB.prepare("SELECT entity_type,entity_key,sku FROM commercial_catalog_codes").all<{ entity_type: string; entity_key: string; sku: string | null }>(),
    productSources(c.env.DB),
  ]);
  const known = new Set(current.results.map((row) => `${row.entity_type}:${row.entity_key}`));
  const usedSkus = new Set(current.results.map((row) => row.sku).filter(Boolean));
  const sources = [
    ...serviceSources.map((source) => ({ ...source, entity_type: "service" as const, active: 1, price_model: "price_model" in source ? source.price_model : source.base_price_minor === null ? "quote" as const : "starting_at" as const, unit_label: "serviciu" })),
    ...products.map((source) => ({ ...source, entity_type: "product" as const, active: source.status === "live" ? 1 : 0, price_model: source.base_price_minor === null ? "unreviewed" as const : "fixed" as const, unit_label: "unitate" })),
  ];
  const statements: D1PreparedStatement[] = [];
  let created = 0;
  let requiresSku = 0;
  const timestamp = Date.now();
  for (const source of sources) {
    if (known.has(`${source.entity_type}:${source.entity_key}`)) continue;
    const id = `catalog_${crypto.randomUUID().replace(/-/g, "")}`;
    const candidate = "sku" in source ? source.sku : suggestedSku(source.entity_type, source.entity_key);
    const sku = candidate && !usedSkus.has(candidate) ? candidate : null;
    if (sku) usedSkus.add(sku);
    else requiresSku++;
    statements.push(c.env.DB.prepare(
      `INSERT INTO commercial_catalog_codes
      (id,entity_type,entity_key,display_name,accounting_code,sku,category,base_price_minor,currency,vat_basis_points,payment_route,payment_status,promotion_code,active,notes,created_by,updated_by,created_at,updated_at,unit_label,price_model,billing_cycle,tax_status)
      VALUES (?,?,?,?,?,?,?,?,?,0,'unconfigured','needs_configuration',NULL,?,'',?,?,?,?,?,?,?,'unverified')`,
    ).bind(id, source.entity_type, source.entity_key, source.display_name, "accounting_code" in source ? source.accounting_code : null, sku, source.category, source.base_price_minor, "RON", source.active, c.get("userId"), c.get("userId"), timestamp, timestamp, source.unit_label, source.price_model, "billing_cycle" in source ? source.billing_cycle : "unreviewed"));
    statements.push(c.env.DB.prepare("INSERT INTO commercial_catalog_audit (id,catalog_id,actor_user_id,before_json,after_json,created_at) VALUES (?,?,?,NULL,?,?)")
      .bind(`catalog_audit_${crypto.randomUUID().replace(/-/g, "")}`, id, c.get("userId"), JSON.stringify({ source: "catalog_sync", entityType: source.entity_type, entityKey: source.entity_key, sku, taxStatus: "unverified" }), timestamp));
    created++;
  }
  if (statements.length) await c.env.DB.batch(statements);
  return c.json({ ok: true, created, existing: sources.length - created, requiresSku, total: sources.length });
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
  if (entityType === "product" && value.currency !== "RON") return c.json({ error: { code: "product_currency_must_be_ron" } }, 400);
  if (entityType === "product" && !(await c.env.DB.prepare("SELECT 1 FROM product_items WHERE slug=?").bind(entityKey).first())) return c.json({ error: { code: "product_not_found" } }, 404);
  const before = await c.env.DB.prepare("SELECT * FROM commercial_catalog_codes WHERE entity_type=? AND entity_key=?")
    .bind(entityType, entityKey).first<Record<string, unknown>>();
  if (value.paymentStatus === "active" && before?.payment_status !== "active") return c.json({ error: { code: "connector_verification_required" } }, 409);
  const priceModel = value.priceModel ?? String(before?.price_model ?? (value.basePriceMinor === null ? "quote" : "unreviewed"));
  if (value.basePriceMinor === null && ["fixed", "starting_at"].includes(priceModel)) return c.json({ error: { code: "price_required" } }, 400);
  const id = String(before?.id || `catalog_${crypto.randomUUID().replace(/-/g, "")}`);
  const timestamp = Date.now();
  const after = {
    entityType, entityKey, displayName: value.displayName, accountingCode: value.accountingCode,
    sku: value.sku, category: value.category, basePriceMinor: value.basePriceMinor,
    currency: value.currency, vatBasisPoints: value.vatBasisPoints,
    paymentRoute: value.paymentRoute, preferredPaymentProvider: value.preferredPaymentProvider, invoiceProvider: value.invoiceProvider, paymentStatus: value.paymentStatus,
    promotionCode: value.promotionCode, active: value.active, notes: value.notes,
    unitLabel: value.unitLabel ?? String(before?.unit_label ?? "unitate"), priceModel,
    billingCycle: value.billingCycle ?? String(before?.billing_cycle ?? "unreviewed"),
    taxStatus: value.taxStatus ?? String(before?.tax_status ?? "unverified"),
  };
  const taxVerifiedAt = after.taxStatus === "verified" ? (before?.tax_status === "verified" ? Number(before?.tax_verified_at || timestamp) : timestamp) : null;
  const taxVerifiedBy = after.taxStatus === "verified" ? (before?.tax_status === "verified" ? String(before?.tax_verified_by || c.get("userId")) : c.get("userId")) : null;
  try {
    await c.env.DB.batch([
      c.env.DB.prepare(
        `INSERT INTO commercial_catalog_codes
          (id,entity_type,entity_key,display_name,accounting_code,sku,category,base_price_minor,currency,vat_basis_points,payment_route,preferred_payment_provider,invoice_provider,payment_status,promotion_code,active,notes,created_by,updated_by,created_at,updated_at,unit_label,price_model,billing_cycle,tax_status,tax_verified_at,tax_verified_by)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
         ON CONFLICT(entity_type,entity_key) DO UPDATE SET
          display_name=excluded.display_name,accounting_code=excluded.accounting_code,sku=excluded.sku,
          category=excluded.category,base_price_minor=excluded.base_price_minor,currency=excluded.currency,
          vat_basis_points=excluded.vat_basis_points,payment_route=excluded.payment_route,preferred_payment_provider=excluded.preferred_payment_provider,invoice_provider=excluded.invoice_provider,
          payment_status=excluded.payment_status,promotion_code=excluded.promotion_code,active=excluded.active,
          notes=excluded.notes,unit_label=excluded.unit_label,price_model=excluded.price_model,billing_cycle=excluded.billing_cycle,
          tax_status=excluded.tax_status,tax_verified_at=excluded.tax_verified_at,tax_verified_by=excluded.tax_verified_by,
          updated_by=excluded.updated_by,updated_at=excluded.updated_at`,
      ).bind(
        id, entityType, entityKey, value.displayName, value.accountingCode, value.sku,
        value.category, value.basePriceMinor, value.currency, value.vatBasisPoints,
        value.paymentRoute, value.preferredPaymentProvider, value.invoiceProvider, value.paymentStatus, value.promotionCode, value.active ? 1 : 0,
        value.notes, c.get("userId"), c.get("userId"), Number(before?.created_at || timestamp), timestamp,
        after.unitLabel, after.priceModel, after.billingCycle, after.taxStatus, taxVerifiedAt, taxVerifiedBy,
      ),
      ...(entityType === "product" ? [c.env.DB.prepare("UPDATE product_items SET price_ron_cents=?,updated_at=? WHERE slug=?")
        .bind(value.basePriceMinor, timestamp, entityKey)] : []),
      c.env.DB.prepare("INSERT INTO commercial_catalog_audit (id,catalog_id,actor_user_id,before_json,after_json,created_at) VALUES (?,?,?,?,?,?)")
        .bind(`catalog_audit_${crypto.randomUUID().replace(/-/g, "")}`, id, c.get("userId"), before ? JSON.stringify(before) : null, JSON.stringify(after), timestamp),
    ]);
    return c.json({ ok: true, id });
  } catch (error) {
    if (/UNIQUE constraint failed/i.test(String(error))) return c.json({ error: { code: "duplicate_code_or_sku" } }, 409);
    throw error;
  }
});

const referenceBody = z.object({ externalId: z.string().trim().min(2).max(160)
  .refine(value => !/^(?:sk_(?:live|test)_|rk_(?:live|test)_|whsec_|bearer\s|revolut_(?:secret|api)_)/i.test(value), "secret_not_allowed") }).strict();
const validReference = (provider: string, environment: string, referenceType: string) =>
  ["test", "live"].includes(environment) && (
    (provider === "stripe" && ["product", "price"].includes(referenceType))
    || (provider === "revolut" && referenceType === "product")
    || (provider === "oblio" && referenceType === "article")
  );

catalogCodesRouter.put("/api/finance/commercial-codes/:entityType/:entityKey/provider-refs/:provider/:environment/:referenceType", async (c) => {
  if (!(await platformRoleForUser(c.env.DB, c.get("userId")))) return c.json({ error: { code: "forbidden" } }, 403);
  const { entityType, entityKey, provider, environment, referenceType } = c.req.param();
  if (!["service", "product"].includes(entityType) || !validReference(provider, environment, referenceType)) return c.json({ error: { code: "invalid_reference" } }, 400);
  const parsed = referenceBody.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: { code: "invalid_reference" } }, 400);
  const catalog = await c.env.DB.prepare("SELECT id FROM commercial_catalog_codes WHERE entity_type=? AND entity_key=?").bind(entityType, entityKey).first<{ id: string }>();
  if (!catalog) return c.json({ error: { code: "catalog_item_not_found" } }, 404);
  const before = await c.env.DB.prepare("SELECT * FROM commercial_catalog_provider_refs WHERE catalog_id=? AND provider=? AND environment=? AND reference_type=?")
    .bind(catalog.id, provider, environment, referenceType).first<Record<string, unknown>>();
  const timestamp = Date.now();
  const after = { provider, environment, referenceType, externalId: parsed.data.externalId };
  try {
    await c.env.DB.batch([
      c.env.DB.prepare(`INSERT INTO commercial_catalog_provider_refs
        (id,catalog_id,provider,environment,reference_type,external_id,created_by,updated_by,created_at,updated_at)
        VALUES (?,?,?,?,?,?,?,?,?,?) ON CONFLICT(catalog_id,provider,environment,reference_type)
        DO UPDATE SET external_id=excluded.external_id,updated_by=excluded.updated_by,updated_at=excluded.updated_at`)
        .bind(String(before?.id || `catalog_ref_${crypto.randomUUID().replace(/-/g, "")}`), catalog.id, provider, environment, referenceType,
          parsed.data.externalId, c.get("userId"), c.get("userId"), Number(before?.created_at || timestamp), timestamp),
      c.env.DB.prepare("INSERT INTO commercial_catalog_provider_ref_audit (id,catalog_id,actor_user_id,action,before_json,after_json,created_at) VALUES (?,?,?,'upsert',?,?,?)")
        .bind(`catalog_ref_audit_${crypto.randomUUID().replace(/-/g, "")}`, catalog.id, c.get("userId"), before ? JSON.stringify(before) : null, JSON.stringify(after), timestamp),
    ]);
    return c.json({ ok: true });
  } catch (error) {
    if (/UNIQUE constraint failed/i.test(String(error))) return c.json({ error: { code: "reference_already_assigned" } }, 409);
    throw error;
  }
});

catalogCodesRouter.delete("/api/finance/commercial-codes/:entityType/:entityKey/provider-refs/:provider/:environment/:referenceType", async (c) => {
  if (!(await platformRoleForUser(c.env.DB, c.get("userId")))) return c.json({ error: { code: "forbidden" } }, 403);
  const { entityType, entityKey, provider, environment, referenceType } = c.req.param();
  if (!["service", "product"].includes(entityType) || !validReference(provider, environment, referenceType)) return c.json({ error: { code: "invalid_reference" } }, 400);
  const before = await c.env.DB.prepare(`SELECT r.* FROM commercial_catalog_provider_refs r
    JOIN commercial_catalog_codes c ON c.id=r.catalog_id
    WHERE c.entity_type=? AND c.entity_key=? AND r.provider=? AND r.environment=? AND r.reference_type=?`)
    .bind(entityType, entityKey, provider, environment, referenceType).first<Record<string, unknown>>();
  if (!before) return c.json({ error: { code: "reference_not_found" } }, 404);
  await c.env.DB.batch([
    c.env.DB.prepare("DELETE FROM commercial_catalog_provider_refs WHERE id=?").bind(before.id),
    c.env.DB.prepare("INSERT INTO commercial_catalog_provider_ref_audit (id,catalog_id,actor_user_id,action,before_json,after_json,created_at) VALUES (?,?,?,'remove',?,NULL,?)")
      .bind(`catalog_ref_audit_${crypto.randomUUID().replace(/-/g, "")}`, before.catalog_id, c.get("userId"), JSON.stringify(before), Date.now()),
  ]);
  return c.json({ ok: true });
});
