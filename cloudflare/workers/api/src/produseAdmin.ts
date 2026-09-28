// Centrul „Produse Avyron” din AVYRON OS.
//
//   GET  /api/produse/admin/overview   catalog, parteneriate, comenzi, folosire
//   POST /api/produse/admin/items      corectează accesul sau calendarul unui produs
//
// Doar pentru super admin (`platform_principals`), cu MFA privilegiat cerut de
// middleware-ul din index.ts. Citirile sunt agregate: nu scoatem niciodată
// liste de utilizatori, doar cifre și ultimele evenimente.

import { Hono } from "hono";
import { z } from "zod";
import type { AppBindings } from "./types";
import { platformRoleForUser } from "./authorization";

export const produseAdminRouter = new Hono<AppBindings>();

const guard = async (db: D1Database, userId: string) => (await platformRoleForUser(db, userId)) !== null;

const missingTable = (error: unknown) => /no such table: product_/.test(String(error));

produseAdminRouter.get("/api/produse/admin/overview", async (c) => {
  if (!(await guard(c.env.DB, c.get("userId")))) return c.json({ error: { code: "forbidden" } }, 403);

  const now = Date.now();
  const soon = now + 30 * 86400000;

  try {
    const [catalog, plans, entitlements, copies, topItems, orders, requests, transitions] = await Promise.all([
      c.env.DB.prepare("SELECT type, access, status, COUNT(*) AS count FROM product_items GROUP BY type, access, status").all<{
        type: string;
        access: string;
        status: string;
        count: number;
      }>(),
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
    const result = await c.env.DB.prepare(`UPDATE product_items SET ${fields.join(", ")}, updated_at = ? WHERE slug = ?`)
      .bind(...values, now, patch.slug)
      .run();
    if (!result.meta.changes) return c.json({ error: { code: "item_not_found" } }, 404);
    // Catalogul din cod rămâne sursa; schimbările de aici sunt excepții și se
    // consemnează, ca să se vadă de ce un produs nu se mai poartă ca fișierul.
    await c.env.DB.prepare("INSERT INTO audit_log (user_id,action,meta_json,created_at) VALUES (?,?,?,?)")
      .bind(c.get("userId"), "produse_item_updated", JSON.stringify(patch), now)
      .run();
    return c.json({ ok: true });
  } catch (error) {
    if (missingTable(error)) return c.json({ error: { code: "catalog_unavailable" } }, 503);
    throw error;
  }
});
