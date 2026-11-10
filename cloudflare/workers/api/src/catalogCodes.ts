import { nextCommercialIdentity, type Identity } from "../../../../src/shared/commercialIdentity";
import { Hono } from "hono";
import { z } from "zod";
import { COMMERCIAL_REFERENCE_SOURCES } from "../../../../src/data/serviceCommercialSources";
import type { AppBindings } from "./types";
import { platformRoleForUser } from "./authorization";

export const catalogCodesRouter = new Hono<AppBindings>();

async function serviceSources(db: D1Database) {
  const plans = await db.prepare("SELECT id,name,price_ron_cents FROM partnership_plans ORDER BY id").all<{ id: string; name: string; price_ron_cents: number }>();
  return [...COMMERCIAL_REFERENCE_SOURCES, ...plans.results.map(plan => ({ entity_key: `studio-plan-${plan.id}`, display_name: plan.name, category: "studio-plan", base_price_minor: plan.price_ron_cents, sku: `AVY-PLAN-${plan.id.toUpperCase()}`, price_model: "fixed" as const, billing_cycle: "annual" as const }))];
}
type ProductSource = { entity_key: string; display_name: string; category: string; base_price_minor: number | null; status: string };

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
    const [configured, products, references, services] = await Promise.all([
      c.env.DB.prepare("SELECT * FROM commercial_catalog_codes ORDER BY entity_type, display_name").all(),
      productSources(c.env.DB),
      c.env.DB.prepare("SELECT r.*,c.entity_type,c.entity_key FROM commercial_catalog_provider_refs r JOIN commercial_catalog_codes c ON c.id=r.catalog_id ORDER BY c.entity_type,c.entity_key,r.provider,r.environment,r.reference_type").all(),
      serviceSources(c.env.DB),
    ]);
    return c.json({ data: configured.results, services, products, references: references.results });
  } catch (error) {
    if (/no such table: commercial_catalog_codes/i.test(String(error))) {
      return c.json({ error: { code: "catalog_codes_unavailable" } }, 503);
    }
    if (/no such table: commercial_catalog_provider_refs/i.test(String(error))) {
      return c.json({ error: { code: "catalog_readiness_unavailable" } }, 503);
    }
    if (/no such table: product_items/i.test(String(error))) {
      const configured = await c.env.DB.prepare("SELECT * FROM commercial_catalog_codes ORDER BY entity_type, display_name").all();
      return c.json({ data: configured.results, services: COMMERCIAL_REFERENCE_SOURCES, products: [], references: [] });
    }
    throw error;
  }
});

/** Bounded journal: internal reference history, never provider credentials or customer data. */
catalogCodesRouter.get("/api/finance/commercial-codes/journal", async (c) => {
  if (!(await platformRoleForUser(c.env.DB, c.get("userId")))) return c.json({ error: { code: "forbidden" } }, 403);
  const offset = Number(c.req.query("offset") || 0);
  if (!Number.isSafeInteger(offset) || offset < 0 || offset > 1_000_000) return c.json({ error: { code: "invalid_offset" } }, 400);
  const rows = await c.env.DB.prepare(`SELECT a.id,a.created_at,c.entity_type,c.entity_key,c.display_name,
    json_extract(a.before_json,'$.sku') before_sku,
    COALESCE(json_extract(a.before_json,'$.accounting_code'),json_extract(a.before_json,'$.accountingCode')) before_article,
    COALESCE(json_extract(a.after_json,'$.sku'),json_extract(a.before_json,'$.sku')) sku,
    COALESCE(json_extract(a.after_json,'$.accounting_code'),json_extract(a.after_json,'$.accountingCode'),json_extract(a.before_json,'$.accounting_code')) article,
    CASE WHEN json_extract(a.after_json,'$.source') IS NOT NULL THEN json_extract(a.after_json,'$.source')
      WHEN a.before_json IS NULL THEN 'created' ELSE 'configuration_updated' END action
    FROM commercial_catalog_audit a JOIN commercial_catalog_codes c ON c.id=a.catalog_id
    ORDER BY a.created_at DESC,a.id DESC LIMIT 41 OFFSET ?`).bind(offset).all();
  return c.json({ data: rows.results.slice(0,40), nextOffset: rows.results.length > 40 ? offset + 40 : null });
});

/** Explicit, idempotent reconciliation: create missing identities, never overwrite reviewed prices or codes. */
catalogCodesRouter.post("/api/finance/commercial-codes/sync", async (c) => {
  if (!(await platformRoleForUser(c.env.DB, c.get("userId")))) return c.json({ error: { code: "forbidden" } }, 403);
  const [current, products, services] = await Promise.all([
    c.env.DB.prepare("SELECT id,entity_type,entity_key,sku,accounting_code,category,display_name,base_price_minor,currency,active,price_model,billing_cycle,unit_label FROM commercial_catalog_codes").all<{ id:string; entity_type: string; entity_key: string; sku: string | null; accounting_code:string|null;category:string;display_name:string;base_price_minor:number|null;currency:string;active:number;price_model:string;billing_cycle:string;unit_label:string }>(),
    productSources(c.env.DB),
    serviceSources(c.env.DB),
  ]);
  const identities:Identity[]=[...current.results];
  const sources: { entity_type: "service" | "product"; entity_key: string; display_name: string; category: string; base_price_minor: number | null; active: number; price_model: string; unit_label: string; sku?: string | null; accounting_code?: string | null; currency?: string; billing_cycle?: string }[] = [
    ...services.map((source) => ({ ...source, entity_type: "service" as const, active: 1, price_model: "price_model" in source ? source.price_model : source.base_price_minor === null ? "quote" as const : "starting_at" as const, unit_label: "serviciu" })),
    ...products.map((source) => ({ ...source, entity_type: "product" as const, active: source.status === "live" ? 1 : 0, price_model: source.base_price_minor === null ? "unreviewed" as const : "fixed" as const, unit_label: "unitate" })),
  ];
  const sourceKeys = new Set(sources.map(row => `${row.entity_type}:${row.entity_key}`));
  for (const row of current.results) if (!sourceKeys.has(`${row.entity_type}:${row.entity_key}`)) sources.push({ ...row, entity_type: row.entity_type as "service" | "product" });
  const statements: D1PreparedStatement[] = [];
  let created = 0;
  const requiresSku = 0;
  let completed = 0;
  const timestamp = Date.now();
  for (const source of sources) {
    const existing=current.results.find(row=>row.entity_type===source.entity_type&&row.entity_key===source.entity_key);
    if(existing?.sku?.trim()&&existing.accounting_code?.trim())continue;
    const chosen=nextCommercialIdentity(source.entity_type,source.entity_key,source.category,identities,existing);
    const sku=(existing?.sku?.trim()?existing.sku:null)||(source.sku && !identities.some(row=>row.sku===source.sku)?source.sku:chosen.sku);
    const accountingCode=(existing?.accounting_code?.trim()?existing.accounting_code:null)||(source.accounting_code&&!identities.some(row=>row.accounting_code===source.accounting_code)?source.accounting_code:chosen.accounting_code);
    identities.push({sku,accounting_code:accountingCode});
    if(existing){
      statements.push(c.env.DB.prepare("UPDATE commercial_catalog_codes SET sku=CASE WHEN NULLIF(trim(sku),'') IS NULL THEN ? ELSE sku END,accounting_code=CASE WHEN NULLIF(trim(accounting_code),'') IS NULL THEN ? ELSE accounting_code END,updated_by=?,updated_at=? WHERE id=?").bind(sku,accountingCode,c.get("userId"),timestamp,existing.id));
      statements.push(c.env.DB.prepare("INSERT INTO commercial_catalog_audit(id,catalog_id,actor_user_id,before_json,after_json,created_at) VALUES(?,?,?,?,?,?)").bind(crypto.randomUUID(),existing.id,c.get("userId"),JSON.stringify(existing),JSON.stringify({source:'identity_completion',sku,accountingCode}),timestamp));
      completed++;continue;
    }
    const id = `catalog_${crypto.randomUUID().replace(/-/g, "")}`;
    statements.push(c.env.DB.prepare(
      `INSERT INTO commercial_catalog_codes
      (id,entity_type,entity_key,display_name,accounting_code,sku,category,base_price_minor,currency,vat_basis_points,payment_route,payment_status,promotion_code,active,notes,created_by,updated_by,created_at,updated_at,unit_label,price_model,billing_cycle,tax_status)
      VALUES (?,?,?,?,?,?,?,?,?,0,'unconfigured','needs_configuration',NULL,?,'',?,?,?,?,?,?,?,'unverified')`,
    ).bind(id, source.entity_type, source.entity_key, source.display_name, accountingCode, sku, source.category, source.base_price_minor, source.currency || "RON", source.active, c.get("userId"), c.get("userId"), timestamp, timestamp, source.unit_label, source.price_model, source.billing_cycle || "unreviewed"));
    statements.push(c.env.DB.prepare("INSERT INTO commercial_catalog_audit (id,catalog_id,actor_user_id,before_json,after_json,created_at) VALUES (?,?,?,NULL,?,?)")
      .bind(`catalog_audit_${crypto.randomUUID().replace(/-/g, "")}`, id, c.get("userId"), JSON.stringify({ source: "catalog_sync", entityType: source.entity_type, entityKey: source.entity_key, sku, taxStatus: "unverified" }), timestamp));
    created++;
  }
  if (statements.length) {try{await c.env.DB.batch(statements)}catch(e){if(/UNIQUE constraint/.test(String(e)))return c.json({error:{code:"catalog_sync_conflict",message:"Registrul a fost actualizat simultan. Reîncearcă sincronizarea."}},409);throw e}}
  return c.json({ ok: true, created, completed, existing: sources.length - created - completed, requiresSku, total: sources.length });
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
  if(before && (before.sku!==value.sku || before.accounting_code!==value.accountingCode) && await c.env.DB.prepare("SELECT 1 FROM commerce_orders orders,json_each(orders.items_json) line WHERE json_extract(line.value,'$.sku')=? LIMIT 1").bind(before.sku??'').first())return c.json({error:{code:'commercial_identity_in_use',message:'Codurile utilizate în comenzi sunt stabile și nu pot fi rescrise.'}},409);
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
  if(entityType==='product'&&before&&['sku','accounting_code','base_price_minor','currency','vat_basis_points','price_model','billing_cycle','tax_status','preferred_payment_provider','invoice_provider','unit_label','active'].some(key=>String(before[key]??'')!==String(({sku:value.sku,accounting_code:value.accountingCode,base_price_minor:value.basePriceMinor,currency:value.currency,vat_basis_points:value.vatBasisPoints,price_model:after.priceModel,billing_cycle:after.billingCycle,tax_status:after.taxStatus,preferred_payment_provider:value.preferredPaymentProvider,invoice_provider:value.invoiceProvider,unit_label:after.unitLabel,active:value.active?1:0} as Record<string,unknown>)[key]??'')))after.paymentStatus='needs_configuration';
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
        value.paymentRoute, value.preferredPaymentProvider, value.invoiceProvider, after.paymentStatus, value.promotionCode, value.active ? 1 : 0,
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
