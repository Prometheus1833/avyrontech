// Centrul „Produse Avyron” din AVYRON OS.
//
//   GET  /api/produse/admin/overview   catalog, parteneriate, comenzi, folosire
//   POST /api/produse/admin/items      corectează accesul sau calendarul unui produs
//
// Doar pentru super admin (`platform_principals`); middleware-ul din index.ts
// aplică politica MFA configurată pentru mediul de deploy. Citirile sunt agregate: nu scoatem niciodată
// liste de utilizatori, doar cifre și ultimele evenimente.

import { Hono } from "hono";
import { z } from "zod";
import type { AppBindings } from "./types";
import { platformRoleForUser } from "./authorization";

export const produseAdminRouter = new Hono<AppBindings>();

produseAdminRouter.get("/api/produse/public/plans", async (c) => {
  try {
    const { results } = await c.env.DB.prepare("SELECT id,name,price_ron_cents,price_eur_cents,components_per_day,sections_per_day,templates_per_day FROM partnership_plans ORDER BY CASE id WHEN 'free' THEN 0 WHEN 'pro' THEN 1 ELSE 2 END").all();
    c.header("Cache-Control", "no-store");
    return c.json({ data: results });
  } catch (error) {
    if (/no such table: partnership_plans/i.test(String(error))) return c.json({ error: { code: "catalog_unavailable" } }, 503);
    throw error;
  }
});

const guard = async (db: D1Database, userId: string) => (await platformRoleForUser(db, userId)) !== null;

const missingTable = (error: unknown) => /no such table: product_/.test(String(error));

produseAdminRouter.get("/api/produse/admin/overview", async (c) => {
  if (!(await guard(c.env.DB, c.get("userId")))) return c.json({ error: { code: "forbidden" } }, 403);

  const now = Date.now();
  const soon = now + 30 * 86400000;

  try {
    const [catalog, items, plans, entitlements, copies, topItems, orders, requests, transitions] = await Promise.all([
      c.env.DB.prepare("SELECT type, access, status, COUNT(*) AS count FROM product_items GROUP BY type, access, status").all<{
        type: string;
        access: string;
        status: string;
        count: number;
      }>(),
      c.env.DB.prepare("SELECT slug,type,category,access,price_ron_cents,status,name_ro,name_en,pro_at,free_at,updated_at FROM product_items ORDER BY name_ro COLLATE NOCASE LIMIT 500").all(),
      c.env.DB.prepare("SELECT id, name, price_ron_cents, price_eur_cents, components_per_day, sections_per_day, templates_per_day FROM partnership_plans").all(),
      c.env.DB.prepare(
        `SELECT COALESCE(plan,'produs') AS kind, COUNT(*) AS count FROM product_entitlements
          WHERE revoked_at IS NULL AND (expires_at IS NULL OR expires_at > ?) GROUP BY kind`,
      )
        .bind(now)
        .all<{ kind: string; count: number }>(),
      c.env.DB.prepare(
        "SELECT day, COUNT(*) AS count, COUNT(DISTINCT user_id) AS people FROM product_copy_events WHERE created_at > ? GROUP BY day ORDER BY day DESC LIMIT 14",
      )
        .bind(now - 14 * 86400000)
        .all<{ day: string; count: number; people: number }>(),
      c.env.DB.prepare(
        `SELECT event.slug, item.name_ro AS name, COUNT(*) AS count FROM product_copy_events event
           JOIN product_items item ON item.slug = event.slug
          WHERE event.created_at > ? GROUP BY event.slug ORDER BY count DESC LIMIT 10`,
      )
        .bind(now - 30 * 86400000)
        .all<{ slug: string; name: string; count: number }>(),
      c.env.DB.prepare(
        `SELECT id, user_id, total_cents, status, created_at, items_json FROM commerce_orders
          WHERE items_json LIKE '%produse-avyron%' ORDER BY created_at DESC LIMIT 25`,
      ).all<{ id: string; user_id: string; total_cents: number; status: string; created_at: number; items_json: string }>(),
      c.env.DB.prepare(
        `SELECT id, source, email, message, config_json, status, created_at FROM leads
          WHERE product = 'avyron-products' ORDER BY created_at DESC LIMIT 25`,
      ).all<{ id: string; source: string; email: string; message: string | null; config_json: string | null; status: string; created_at: number }>(),
      c.env.DB.prepare(
        `SELECT slug, name_ro AS name, access, pro_at, free_at FROM product_items
          WHERE (pro_at BETWEEN ? AND ?) OR (free_at BETWEEN ? AND ?) ORDER BY COALESCE(pro_at, free_at) LIMIT 20`,
      )
        .bind(now, soon, now, soon)
        .all<{ slug: string; name: string; access: string; pro_at: number | null; free_at: number | null }>(),
    ]);

    return c.json({
      catalog: catalog.results ?? [],
      items: items.results ?? [],
      plans: plans.results ?? [],
      entitlements: entitlements.results ?? [],
      copies: copies.results ?? [],
      topItems: topItems.results ?? [],
      orders: (orders.results ?? []).map((order) => ({ ...order, items: JSON.parse(order.items_json || "[]") as unknown[], items_json: undefined })),
      requests: requests.results ?? [],
      transitions: transitions.results ?? [],
    });
  } catch (error) {
    if (missingTable(error)) return c.json({ error: { code: "catalog_unavailable", message: "Migrarea catalogului nu e aplicată." } }, 503);
    throw error;
  }
});

const itemPatch = z
  .object({
    slug: z.string().min(1).max(80),
    type: z.enum(["component", "section", "template", "effect", "tool", "api", "doc", "logo"]).optional(),
    category: z.string().trim().min(1).max(100).optional(),
    nameRo: z.string().trim().min(2).max(180).optional(),
    nameEn: z.string().trim().min(2).max(180).optional(),
    priceRonCents: z.number().int().min(0).nullable().optional(),
    access: z.enum(["free", "pro", "studio"]).optional(),
    status: z.enum(["draft", "live", "soon", "archived"]).optional(),
    /** Datele de trecere; `null` le scoate, ținând produsul pe loc. */
    proAt: z.number().int().nullable().optional(),
    freeAt: z.number().int().nullable().optional(),
  })
  .strict();

produseAdminRouter.post("/api/produse/admin/items", async (c) => {
  if (!(await guard(c.env.DB, c.get("userId")))) return c.json({ error: { code: "forbidden" } }, 403);
  const parsed = itemPatch.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: { code: "invalid_request" } }, 400);

  const patch = parsed.data;
  const fields: string[] = [];
  const values: Array<string | number | null> = [];
  for (const [column, value] of [
    ["type", patch.type],
    ["category", patch.category],
    ["name_ro", patch.nameRo],
    ["name_en", patch.nameEn],
    ["price_ron_cents", patch.priceRonCents],
    ["access", patch.access],
    ["status", patch.status],
    ["pro_at", patch.proAt],
    ["free_at", patch.freeAt],
  ] as const) {
    if (value === undefined) continue;
    fields.push(`${column} = ?`);
    values.push(value ?? null);
  }
  if (!fields.length) return c.json({ error: { code: "nothing_to_update" } }, 400);

  const now = Date.now();
  try {
    const existing = await c.env.DB.prepare("SELECT 1 FROM product_items WHERE slug=?").bind(patch.slug).first();
    if (!existing) return c.json({ error: { code: "item_not_found" } }, 404);
    if (patch.status === "archived") {
      const [entitlement, download] = await Promise.all([
        c.env.DB.prepare("SELECT 1 FROM product_entitlements WHERE slug=? AND revoked_at IS NULL LIMIT 1").bind(patch.slug).first(),
        c.env.DB.prepare("SELECT 1 FROM product_copy_events WHERE slug=? LIMIT 1").bind(patch.slug).first(),
      ]);
      if (entitlement || download) return c.json({ error: { code: "archival_requires_entitlement_review" } }, 409);
    }
    // Schimbările catalogului comercial D1 se auditează; paginile publice
    // versionate în cod au nevoie de o lansare separată pentru aceeași ofertă.
    const hasCommercialCodes = patch.priceRonCents === undefined ? false : Boolean(await c.env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='commercial_catalog_codes'").first());
    await c.env.DB.batch([
      c.env.DB.prepare(`UPDATE product_items SET ${fields.join(", ")}, updated_at = ? WHERE slug = ?`).bind(...values, now, patch.slug),
      ...(hasCommercialCodes ? [c.env.DB.prepare("UPDATE commercial_catalog_codes SET base_price_minor=?,updated_by=?,updated_at=? WHERE entity_type='product' AND entity_key=?")
        .bind(patch.priceRonCents ?? null, c.get("userId"), now, patch.slug)] : []),
      c.env.DB.prepare("INSERT INTO audit_log (user_id,action,meta_json,created_at) VALUES (?,?,?,?)").bind(c.get("userId"), "produse_item_updated", JSON.stringify(patch), now),
    ]);
    return c.json({ ok: true });
  } catch (error) {
    if (missingTable(error)) return c.json({ error: { code: "catalog_unavailable" } }, 503);
    throw error;
  }
});

const newItem = z.object({
  slug: z.string().regex(/^[a-z0-9][a-z0-9-]{1,79}$/),
  type: z.enum(["component", "section", "template", "effect", "tool", "api", "doc", "logo"]),
  category: z.string().trim().min(1).max(100),
  nameRo: z.string().trim().min(2).max(180),
  nameEn: z.string().trim().min(2).max(180),
  access: z.enum(["free", "pro", "studio"]),
  priceRonCents: z.number().int().min(0).nullable(),
}).strict();

produseAdminRouter.post("/api/produse/admin/items/new", async (c) => {
  if (!(await guard(c.env.DB, c.get("userId")))) return c.json({ error: { code: "forbidden" } }, 403);
  const parsed = newItem.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: { code: "invalid_request" } }, 400);
  const item = parsed.data, now = Date.now();
  try {
    await c.env.DB.batch([
      c.env.DB.prepare("INSERT INTO product_items (slug,type,category,access,price_ron_cents,status,released_at,name_ro,name_en,created_at,updated_at) VALUES (?,?,?,?,?,'draft',?,?,?,?,?)")
        .bind(item.slug, item.type, item.category, item.access, item.priceRonCents, now, item.nameRo, item.nameEn, now, now),
      c.env.DB.prepare("INSERT INTO audit_log (user_id,action,meta_json,created_at) VALUES (?,?,?,?)")
        .bind(c.get("userId"), "produse_item_created", JSON.stringify(item), now),
    ]);
    return c.json({ ok: true, slug: item.slug, status: "draft" }, 201);
  } catch (error) {
    if (/UNIQUE constraint failed/i.test(String(error))) return c.json({ error: { code: "duplicate_slug" } }, 409);
    if (missingTable(error)) return c.json({ error: { code: "catalog_unavailable" } }, 503);
    throw error;
  }
});

const planPatch = z.object({
  name: z.string().trim().min(2).max(120),
  priceRonCents: z.number().int().min(0),
  priceEurCents: z.number().int().min(0),
  componentsPerDay: z.number().int().min(0).max(10000),
  sectionsPerDay: z.number().int().min(0).max(10000),
  templatesPerDay: z.number().int().min(0).max(10000),
}).strict();

produseAdminRouter.patch("/api/produse/admin/plans/:id", async (c) => {
  if (!(await guard(c.env.DB, c.get("userId")))) return c.json({ error: { code: "forbidden" } }, 403);
  const id = c.req.param("id");
  if (!["free", "pro", "studio"].includes(id)) return c.json({ error: { code: "plan_not_found" } }, 404);
  const parsed = planPatch.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: { code: "invalid_request" } }, 400);
  const plan = parsed.data, now = Date.now();
  await c.env.DB.batch([
    c.env.DB.prepare("UPDATE partnership_plans SET name=?,price_ron_cents=?,price_eur_cents=?,components_per_day=?,sections_per_day=?,templates_per_day=?,updated_at=? WHERE id=?")
      .bind(plan.name, plan.priceRonCents, plan.priceEurCents, plan.componentsPerDay, plan.sectionsPerDay, plan.templatesPerDay, now, id),
    c.env.DB.prepare("INSERT INTO audit_log (user_id,action,meta_json,created_at) VALUES (?,?,?,?)")
      .bind(c.get("userId"), "produse_plan_updated", JSON.stringify({ id, ...plan }), now),
  ]);
  return c.json({ ok: true });
});
