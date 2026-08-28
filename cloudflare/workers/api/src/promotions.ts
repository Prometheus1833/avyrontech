import { Hono, type Context, type Next } from "hono";
import { COMMERCE_CATALOG, commerceItemBySku } from "../../../../src/data/commerceCatalog";
import type { AppBindings } from "./types";
import { now } from "./security";

export const PROMOTION_OWNER_EMAIL = "prometheus@avyron.ro";
const MAX_ORDER_ITEMS = 20;

type PromotionRow = {
  id: string;
  code: string;
  label: string;
  discount_percent: number;
  active: number;
  registration_required: number;
  per_user_limit: number | null;
  max_redemptions: number | null;
  starts_at: number | null;
  expires_at: number | null;
  created_at: number;
  updated_at: number;
  total_redemptions?: number;
  user_redemptions?: number;
};

type OrderItemInput = {
  sku?: unknown;
  quantity?: unknown;
  period?: unknown;
  notes?: unknown;
  description?: unknown;
};

type PricedOrderItem = {
  sku: string;
  type: string;
  name: string;
  description: string | null;
  quantity: number;
  period: string | null;
  notes: string | null;
  unitPriceCents: number | null;
  lineTotalCents: number | null;
};

export const normalizePromotionCode = (value: unknown) =>
  String(value ?? "").trim().toUpperCase().replace(/\s+/g, "");

export const isValidPromotionCode = (value: string) => /^[A-Z0-9_-]{4,32}$/.test(value);

export function priceOrderItems(value: unknown): { items: PricedOrderItem[]; subtotalCents: number; requiresManualQuote: boolean } | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > MAX_ORDER_ITEMS) return null;
  const items: PricedOrderItem[] = [];
  let subtotalCents = 0;
  let requiresManualQuote = false;

  for (const raw of value as OrderItemInput[]) {
    const sku = String(raw?.sku ?? "").trim();
    const catalogItem = commerceItemBySku(sku);
    const quantity = Number(raw?.quantity ?? 1);
    if (!catalogItem || !Number.isInteger(quantity) || quantity < 1 || quantity > 10) return null;
    const description = String(raw?.description ?? "").trim().slice(0, 120) || null;
    const period = String(raw?.period ?? "").trim().slice(0, 40) || null;
    const notes = String(raw?.notes ?? "").trim().slice(0, 1000) || null;
    if (sku === "custom-request" && !description) return null;
    const lineTotalCents = catalogItem.unitPriceCents === null ? null : catalogItem.unitPriceCents * quantity;
    if (lineTotalCents === null) requiresManualQuote = true;
    else subtotalCents += lineTotalCents;
    items.push({
      sku,
      type: catalogItem.type,
      name: catalogItem.name,
      description,
      quantity,
      period,
      notes,
      unitPriceCents: catalogItem.unitPriceCents,
      lineTotalCents,
    });
  }
  return { items, subtotalCents, requiresManualQuote };
}

export const discountFor = (subtotalCents: number, discountPercent: number) =>
  Math.min(subtotalCents, Math.round((subtotalCents * discountPercent) / 100));

async function requirePromotionOwner(c: Context<AppBindings>, next: Next) {
  const row = await c.env.DB.prepare("SELECT email FROM users WHERE id = ? AND disabled_at IS NULL")
    .bind(c.get("userId")).first<{ email: string }>();
  if (row?.email?.trim().toLowerCase() !== PROMOTION_OWNER_EMAIL) {
    return c.json({ error: { code: "promotion_owner_required", message: "Acces rezervat administratorului de promoții" } }, 403);
  }
  await next();
}

async function promotionForQuote(c: Context<AppBindings>, code: string): Promise<PromotionRow | null> {
  return c.env.DB.prepare(
    `SELECT p.id,p.code,p.label,p.discount_percent,p.active,p.registration_required,p.per_user_limit,
            p.max_redemptions,p.starts_at,p.expires_at,p.created_at,p.updated_at,
            (SELECT COUNT(*) FROM promotion_redemptions pr WHERE pr.promotion_id = p.id) AS total_redemptions,
            (SELECT COUNT(*) FROM promotion_redemptions pr WHERE pr.promotion_id = p.id AND pr.user_id = ?) AS user_redemptions
       FROM promotions p
      WHERE p.code = ? COLLATE NOCASE
      LIMIT 1`,
  ).bind(c.get("userId"), code).first<PromotionRow>();
}

const promotionUnavailable = (promotion: PromotionRow | null, timestamp: number) => {
  if (!promotion || !promotion.active) return "invalid_promotion";
  if (promotion.starts_at && promotion.starts_at > timestamp) return "promotion_not_started";
  if (promotion.expires_at && promotion.expires_at <= timestamp) return "promotion_expired";
  if (promotion.max_redemptions !== null && Number(promotion.total_redemptions || 0) >= promotion.max_redemptions) return "promotion_exhausted";
  if (promotion.per_user_limit !== null && Number(promotion.user_redemptions || 0) >= promotion.per_user_limit) return "promotion_already_used";
  return null;
};

const quoteResponse = (priced: NonNullable<ReturnType<typeof priceOrderItems>>, promotion: PromotionRow | null) => {
  const discountPercent = promotion?.discount_percent ?? 0;
  const discountCents = discountFor(priced.subtotalCents, discountPercent);
  return {
    currency: "RON" as const,
    items: priced.items,
    subtotalCents: priced.subtotalCents,
    promotion: promotion ? { code: promotion.code, label: promotion.label, discountPercent } : null,
    discountCents,
    totalCents: priced.subtotalCents - discountCents,
    requiresManualQuote: priced.requiresManualQuote,
  };
};

export const promotionsRouter = new Hono<AppBindings>();

promotionsRouter.post("/api/commerce/quote", async (c) => {
  const body = await c.req.json().catch(() => ({})) as { items?: unknown; promotionCode?: unknown };
  const priced = priceOrderItems(body.items);
  if (!priced) return c.json({ error: { code: "invalid_order_items", message: "Elementele comenzii nu sunt valide" } }, 400);
  const code = normalizePromotionCode(body.promotionCode);
  let promotion: PromotionRow | null = null;
  if (code) {
    if (!isValidPromotionCode(code)) return c.json({ error: { code: "invalid_promotion" } }, 400);
    promotion = await promotionForQuote(c, code);
    const unavailable = promotionUnavailable(promotion, now());
    if (unavailable) return c.json({ error: { code: unavailable, message: "Codul promoțional nu este disponibil pentru acest cont" } }, 409);
  }
  return c.json({ quote: quoteResponse(priced, promotion) });
});

promotionsRouter.post("/api/commerce/orders", async (c) => {
  const body = await c.req.json().catch(() => ({})) as { items?: unknown; promotionCode?: unknown };
  const priced = priceOrderItems(body.items);
  if (!priced) return c.json({ error: { code: "invalid_order_items", message: "Elementele comenzii nu sunt valide" } }, 400);
  const userId = c.get("userId");
  const code = normalizePromotionCode(body.promotionCode);
  const timestamp = now();
  let promotion: PromotionRow | null = null;
  if (code) {
    promotion = await promotionForQuote(c, code);
    const unavailable = promotionUnavailable(promotion, timestamp);
    if (unavailable) return c.json({ error: { code: unavailable, message: "Codul promoțional nu mai este disponibil" } }, 409);
  }

  const quote = quoteResponse(priced, promotion);
  const orderId = crypto.randomUUID();
  const orderInsert = promotion
    ? c.env.DB.prepare(
      `INSERT INTO commerce_orders
         (id,user_id,items_json,subtotal_cents,promotion_id,promotion_code,discount_percent,discount_cents,total_cents,currency,requires_manual_quote,status,created_at,updated_at)
       SELECT ?,?,?,?,p.id,p.code,p.discount_percent,?,?,'RON',?,'requested',?,?
         FROM promotions p
        WHERE p.id = ?
          AND p.active = 1
          AND p.discount_percent = ?
          AND (p.starts_at IS NULL OR p.starts_at <= ?)
          AND (p.expires_at IS NULL OR p.expires_at > ?)
          AND (p.max_redemptions IS NULL OR
               (SELECT COUNT(*) FROM promotion_redemptions pr WHERE pr.promotion_id = p.id) < p.max_redemptions)
          AND (p.per_user_limit IS NULL OR
               (SELECT COUNT(*) FROM promotion_redemptions pr WHERE pr.promotion_id = p.id AND pr.user_id = ?) < p.per_user_limit)`,
    ).bind(
      orderId, userId, JSON.stringify(priced.items), quote.subtotalCents, quote.discountCents,
      quote.totalCents, quote.requiresManualQuote ? 1 : 0, timestamp, timestamp,
      promotion.id, promotion.discount_percent, timestamp, timestamp, userId,
    )
    : c.env.DB.prepare(
      `INSERT INTO commerce_orders
         (id,user_id,items_json,subtotal_cents,promotion_id,promotion_code,discount_percent,discount_cents,total_cents,currency,requires_manual_quote,status,created_at,updated_at)
       VALUES (?,?,?,?,NULL,NULL,0,?,?,'RON',?,'requested',?,?)`,
    ).bind(
      orderId, userId, JSON.stringify(priced.items), quote.subtotalCents, quote.discountCents,
      quote.totalCents, quote.requiresManualQuote ? 1 : 0, timestamp, timestamp,
    );
  const statements = [orderInsert];
  if (promotion) {
    statements.push(c.env.DB.prepare(
      `INSERT INTO promotion_redemptions (id,promotion_id,user_id,order_id,discount_cents,created_at)
       SELECT ?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM commerce_orders WHERE id = ?)`,
    ).bind(crypto.randomUUID(), promotion.id, userId, orderId, quote.discountCents, timestamp, orderId));
  }
  statements.push(c.env.DB.prepare(
    `INSERT INTO audit_log (user_id,action,meta_json,created_at)
     SELECT ?,?,?,? WHERE EXISTS (SELECT 1 FROM commerce_orders WHERE id = ?)`,
  ).bind(userId, "commerce_order_created", JSON.stringify({ orderId, promotionCode: promotion?.code ?? null, totalCents: quote.totalCents }), timestamp, orderId));
  const results = await c.env.DB.batch(statements);
  if (!Number(results[0]?.meta.changes || 0)) {
    return c.json({ error: { code: "promotion_unavailable", message: "Codul promoțional a atins limita sau nu mai este activ" } }, 409);
  }
  return c.json({ order: { id: orderId, status: "requested", ...quote } }, 201);
});

promotionsRouter.get("/api/commerce/orders", async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT id,subtotal_cents,promotion_code,discount_percent,discount_cents,total_cents,currency,requires_manual_quote,status,created_at
       FROM commerce_orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 100`,
  ).bind(c.get("userId")).all();
  return c.json({ data: results });
});

promotionsRouter.use("/api/promotions/admin", requirePromotionOwner);
promotionsRouter.use("/api/promotions/admin/*", requirePromotionOwner);

promotionsRouter.get("/api/promotions/admin", async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT p.id,p.code,p.label,p.discount_percent,p.active,p.registration_required,p.per_user_limit,p.max_redemptions,
            p.starts_at,p.expires_at,p.created_at,p.updated_at,COUNT(pr.id) AS redemptions,
            COALESCE(SUM(pr.discount_cents),0) AS discount_total_cents
       FROM promotions p LEFT JOIN promotion_redemptions pr ON pr.promotion_id = p.id
      GROUP BY p.id ORDER BY p.created_at DESC, p.code COLLATE NOCASE`,
  ).all();
  return c.json({ data: results, catalog: COMMERCE_CATALOG });
});

promotionsRouter.post("/api/promotions/admin", async (c) => {
  const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
  const code = normalizePromotionCode(body.code);
  const label = String(body.label ?? "").trim().slice(0, 120);
  const discountPercent = Number(body.discountPercent);
  const perUserLimit = body.perUserLimit === null || body.perUserLimit === "" ? null : Number(body.perUserLimit ?? 1);
  const maxRedemptions = body.maxRedemptions === null || body.maxRedemptions === "" ? null : Number(body.maxRedemptions);
  const startsAt = body.startsAt ? Number(body.startsAt) : null;
  const expiresAt = body.expiresAt ? Number(body.expiresAt) : null;
  if (!isValidPromotionCode(code) || label.length < 3 || !Number.isInteger(discountPercent) || discountPercent < 1 || discountPercent > 100)
    return c.json({ error: { code: "invalid_promotion_input" } }, 400);
  if (perUserLimit !== null && (!Number.isInteger(perUserLimit) || perUserLimit < 1 || perUserLimit > 100))
    return c.json({ error: { code: "invalid_per_user_limit" } }, 400);
  if (maxRedemptions !== null && (!Number.isInteger(maxRedemptions) || maxRedemptions < 1 || maxRedemptions > 1_000_000))
    return c.json({ error: { code: "invalid_max_redemptions" } }, 400);
  if (startsAt && expiresAt && expiresAt <= startsAt) return c.json({ error: { code: "invalid_period" } }, 400);
  const id = crypto.randomUUID();
  const timestamp = now();
  try {
    await c.env.DB.batch([
      c.env.DB.prepare(
        `INSERT INTO promotions
           (id,code,label,discount_percent,active,registration_required,per_user_limit,max_redemptions,starts_at,expires_at,created_by,created_at,updated_at)
         VALUES (?,?,?,?,1,?,?,?,?,?,?,?,?)`,
      ).bind(id, code, label, discountPercent, body.registrationRequired === false ? 0 : 1, perUserLimit, maxRedemptions, startsAt, expiresAt, c.get("userId"), timestamp, timestamp),
      c.env.DB.prepare("INSERT INTO audit_log (user_id,action,meta_json,created_at) VALUES (?,?,?,?)")
        .bind(c.get("userId"), "promotion_created", JSON.stringify({ id, code, discountPercent }), timestamp),
    ]);
  } catch (error) {
    if (String(error).toLowerCase().includes("unique")) return c.json({ error: { code: "promotion_code_exists" } }, 409);
    throw error;
  }
  return c.json({ id, code }, 201);
});

promotionsRouter.patch("/api/promotions/admin/:id", async (c) => {
  const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
  const active = body.active === true ? 1 : body.active === false ? 0 : null;
  if (active === null) return c.json({ error: { code: "invalid_patch" } }, 400);
  const timestamp = now();
  const result = await c.env.DB.prepare("UPDATE promotions SET active = ?, updated_at = ? WHERE id = ?")
    .bind(active, timestamp, c.req.param("id")).run();
  if (!result.meta.changes) return c.json({ error: { code: "promotion_not_found" } }, 404);
  await c.env.DB.prepare("INSERT INTO audit_log (user_id,action,meta_json,created_at) VALUES (?,?,?,?)")
    .bind(c.get("userId"), "promotion_status_changed", JSON.stringify({ id: c.req.param("id"), active: Boolean(active) }), timestamp).run();
  return c.json({ ok: true });
});
