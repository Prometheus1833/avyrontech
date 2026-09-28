// Magazinul Produse Avyron — partea care cere cont.
//
//   GET    /api/produse/account/state            starea parteneriatului și limitele de azi
//   POST   /api/produse/account/copy             obținerea unui produs (consumă din limită)
//   GET    /api/produse/account/download/:slug    codul premium din R2, după verificarea dreptului
//   GET    /api/produse/account/collection        colecția salvată în cont
//   POST   /api/produse/account/collection        adaugă / scoate / sincronizează favorite
//
// Trei reguli care nu se negociază:
//  1. Accesul și prețul se citesc din `product_items` (D1), niciodată din ce
//     trimite browserul. Catalogul din cod ajunge acolo prin migrarea generată
//     de `scripts/produse-catalog-sql.mjs`.
//  2. Limita zilnică se numără pe server, pe zile calendaristice românești, și
//     o a doua obținere a aceluiași produs în aceeași zi nu mai consumă —
//     constrângerea UNIQUE (user, slug, zi) o garantează chiar și la curse.
//  3. Codul produselor plătite nu ajunge niciodată în bundle-ul public: stă în
//     R2 privat și se servește doar prin ruta de descărcare de mai jos.

import { Hono } from "hono";
import { z } from "zod";
import type { AppBindings } from "./types";

export const produseShopRouter = new Hono<AppBindings>();

export type PlanId = "free" | "pro" | "studio";
export type ItemBucket = "components" | "sections" | "templates";

const PLAN_RANK: Record<PlanId, number> = { free: 0, pro: 1, studio: 2 };

/**
 * Coșul de limite în care intră un tip de produs. Parteneriatele promit trei
 * cote (componente, secțiuni, template-uri), iar restul tipurilor — efecte,
 * unelte, integrări, documente, logo — consumă din cota de componente.
 */
export function bucketForType(type: string): ItemBucket {
  if (type === "section") return "sections";
  if (type === "template") return "templates";
  return "components";
}

/** Ziua calendaristică românească, în formatul `YYYY-MM-DD`. */
export function dayKey(timestamp = Date.now()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bucharest", year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date(timestamp),
  );
}

export type CatalogRow = { slug: string; type: string; access: PlanId; price_ron_cents: number | null; status: string; pro_at: number | null; free_at: number | null };

/**
 * Ce plan deblochează produsul acum. Produsele coboară singure: Studio → Pro
 * după `pro_at`, Pro → Free după `free_at`. Datele sunt stocate explicit, ca
 * un produs anume să poată fi ținut pe loc fără să schimbăm regula.
 */
export function effectiveAccess(item: Pick<CatalogRow, "access" | "pro_at" | "free_at">, timestamp = Date.now()): PlanId {
  let access = item.access;
  if (item.pro_at !== null && timestamp >= item.pro_at) access = "pro";
  if (item.free_at !== null && timestamp >= item.free_at) access = "free";
  return access;
}

type Limits = Record<ItemBucket, number>;

async function planFor(db: D1Database, userId: string, timestamp: number): Promise<{ plan: PlanId; expiresAt: number | null }> {
  const { results } = await db
    .prepare(
      `SELECT plan, expires_at FROM product_entitlements
        WHERE user_id = ? AND plan IS NOT NULL AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at > ?)`,
    )
    .bind(userId, timestamp)
    .all<{ plan: PlanId; expires_at: number | null }>();

  let plan: PlanId = "free";
  let expiresAt: number | null = null;
  for (const row of results ?? []) {
    if (PLAN_RANK[row.plan] > PLAN_RANK[plan]) {
      plan = row.plan;
      expiresAt = row.expires_at;
    }
  }
  return { plan, expiresAt };
}

async function limitsFor(db: D1Database, plan: PlanId): Promise<Limits> {
  const row = await db
    .prepare("SELECT components_per_day, sections_per_day, templates_per_day FROM partnership_plans WHERE id = ?")
    .bind(plan)
    .first<{ components_per_day: number; sections_per_day: number; templates_per_day: number }>();
  // Dacă rândul lipsește (bază nemigrată), planul cel mai restrictiv e singurul
  // răspuns sigur: mai bine refuzăm o copiere decât să dăm acces nelimitat.
  if (!row) return { components: 0, sections: 0, templates: 0 };
  return { components: row.components_per_day, sections: row.sections_per_day, templates: row.templates_per_day };
}

/** Câte obțineri a consumat contul azi, pe fiecare coș. */
async function usedToday(db: D1Database, userId: string, day: string): Promise<Limits> {
  const { results } = await db
    .prepare(
      `SELECT item.type AS type, COUNT(*) AS count
         FROM product_copy_events event JOIN product_items item ON item.slug = event.slug
        WHERE event.user_id = ? AND event.day = ? AND event.counted = 1
        GROUP BY item.type`,
    )
    .bind(userId, day)
    .all<{ type: string; count: number }>();
  const used: Limits = { components: 0, sections: 0, templates: 0 };
  for (const row of results ?? []) used[bucketForType(row.type)] += row.count;
  return used;
}

async function purchasesFor(db: D1Database, userId: string, timestamp: number): Promise<string[]> {
  const { results } = await db
    .prepare(
      `SELECT slug FROM product_entitlements
        WHERE user_id = ? AND slug IS NOT NULL AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at > ?)`,
    )
    .bind(userId, timestamp)
    .all<{ slug: string }>();
  return (results ?? []).map((row) => row.slug);
}

const COLLECTION_NAME = "Colecția mea";

async function collectionId(db: D1Database, userId: string, create: boolean): Promise<string | null> {
  const existing = await db
    .prepare("SELECT id FROM product_collections WHERE user_id = ? AND name = ?")
    .bind(userId, COLLECTION_NAME)
    .first<{ id: string }>();
  if (existing) return existing.id;
  if (!create) return null;
  const id = crypto.randomUUID();
  const now = Date.now();
  await db
    .prepare("INSERT INTO product_collections (id,user_id,name,created_at,updated_at) VALUES (?,?,?,?,?)")
    .bind(id, userId, COLLECTION_NAME, now, now)
    .run();
  return id;
}

async function collectionSlugs(db: D1Database, userId: string): Promise<string[]> {
  const id = await collectionId(db, userId, false);
  if (!id) return [];
  const { results } = await db
    .prepare("SELECT slug FROM product_collection_items WHERE collection_id = ? ORDER BY added_at DESC LIMIT 400")
    .bind(id)
    .all<{ slug: string }>();
  return (results ?? []).map((row) => row.slug);
}

/** Traducerea erorilor de bază nemigrată într-un răspuns onest, nu un 500. */
const isMissingTable = (error: unknown) => /no such table: product_/.test(String(error));

produseShopRouter.get("/api/produse/account/state", async (c) => {
  const userId = c.get("userId");
  const timestamp = Date.now();
  const day = dayKey(timestamp);

  try {
    const { plan, expiresAt } = await planFor(c.env.DB, userId, timestamp);
    const [limits, used, purchases, collection] = await Promise.all([
      limitsFor(c.env.DB, plan),
      usedToday(c.env.DB, userId, day),
      purchasesFor(c.env.DB, userId, timestamp),
      collectionSlugs(c.env.DB, userId),
    ]);

    const { results: recent } = await c.env.DB.prepare(
      "SELECT slug, day, channel, created_at FROM product_copy_events WHERE user_id = ? ORDER BY created_at DESC LIMIT 30",
    )
      .bind(userId)
      .all<{ slug: string; day: string; channel: string; created_at: number }>();

    return c.json({
      plan,
      planExpiresAt: expiresAt,
      day,
      limits: {
        components: { used: used.components, limit: limits.components },
        sections: { used: used.sections, limit: limits.sections },
        templates: { used: used.templates, limit: limits.templates },
      },
      purchases,
      collection,
      recent: recent ?? [],
    });
  } catch (error) {
    if (isMissingTable(error)) return c.json({ error: { code: "catalog_unavailable", message: "Catalogul de produse nu e încă migrat." } }, 503);
    throw error;
  }
});

const copySchema = z.object({ slug: z.string().min(1).max(80), channel: z.enum(["cli", "code", "zip", "mcp", "prompt"]) }).strict();

produseShopRouter.post("/api/produse/account/copy", async (c) => {
  const parsed = copySchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: { code: "invalid_request" } }, 400);

  const userId = c.get("userId");
  const timestamp = Date.now();
  const day = dayKey(timestamp);

  try {
    const item = await c.env.DB.prepare("SELECT slug, type, access, price_ron_cents, status, pro_at, free_at FROM product_items WHERE slug = ?")
      .bind(parsed.data.slug)
      .first<CatalogRow>();
    if (!item || item.status === "archived") return c.json({ error: { code: "item_not_found" } }, 404);
    if (item.status === "soon") return c.json({ error: { code: "item_not_released" } }, 409);

    const [{ plan }, purchases] = await Promise.all([planFor(c.env.DB, userId, timestamp), purchasesFor(c.env.DB, userId, timestamp)]);
    const required = effectiveAccess(item, timestamp);
    const owned = purchases.includes(item.slug);
    if (!owned && PLAN_RANK[plan] < PLAN_RANK[required]) {
      return c.json({ error: { code: "upgrade_required", requiredPlan: required, plan, priceRonCents: item.price_ron_cents } }, 402);
    }

    const bucket = bucketForType(item.type);
    const already = await c.env.DB.prepare("SELECT id FROM product_copy_events WHERE user_id = ? AND slug = ? AND day = ?")
      .bind(userId, item.slug, day)
      .first<{ id: string }>();

    const limits = await limitsFor(c.env.DB, plan);
    const used = await usedToday(c.env.DB, userId, day);

    // Produsele cumpărate separat nu consumă din limită, iar re-copierea
    // aceluiași produs în aceeași zi e gratuită — ambele scrise în FAQ.
    const counts = !already && !owned;
    if (counts && used[bucket] >= limits[bucket]) {
      return c.json(
        { error: { code: "daily_limit_reached", bucket, limit: limits[bucket], plan, resetsAt: `${day} 24:00 Europe/Bucharest` } },
        429,
      );
    }

    if (!already) {
      try {
        await c.env.DB.prepare(
          "INSERT INTO product_copy_events (id,user_id,slug,day,channel,counted,created_at) VALUES (?,?,?,?,?,?,?)",
        )
          .bind(crypto.randomUUID(), userId, item.slug, day, parsed.data.channel, counts ? 1 : 0, timestamp)
          .run();
        if (counts) used[bucket] += 1;
      } catch (error) {
        // Două cereri în aceeași clipă: prima a scris, a doua e o re-copiere.
        if (!/UNIQUE constraint failed: product_copy_events/.test(String(error))) throw error;
      }
    }

    const requiresDownload = required !== "free" || owned;
    return c.json({
      ok: true,
      counted: counts,
      bucket,
      remaining: Math.max(0, limits[bucket] - used[bucket]),
      access: required,
      download: requiresDownload ? `/api/produse/account/download/${item.slug}` : null,
    });
  } catch (error) {
    if (isMissingTable(error)) return c.json({ error: { code: "catalog_unavailable", message: "Catalogul de produse nu e încă migrat." } }, 503);
    throw error;
  }
});

produseShopRouter.get("/api/produse/account/download/:slug", async (c) => {
  const slug = c.req.param("slug");
  const userId = c.get("userId");
  const timestamp = Date.now();

  try {
    const item = await c.env.DB.prepare("SELECT slug, type, access, price_ron_cents, status, pro_at, free_at FROM product_items WHERE slug = ?")
      .bind(slug)
      .first<CatalogRow>();
    if (!item || item.status === "archived") return c.json({ error: { code: "item_not_found" } }, 404);

    const [{ plan }, purchases] = await Promise.all([planFor(c.env.DB, userId, timestamp), purchasesFor(c.env.DB, userId, timestamp)]);
    const required = effectiveAccess(item, timestamp);
    if (!purchases.includes(slug) && PLAN_RANK[plan] < PLAN_RANK[required]) {
      return c.json({ error: { code: "upgrade_required", requiredPlan: required, plan } }, 402);
    }

    const version = await c.env.DB.prepare(
      "SELECT r2_key, version, sha256, bytes FROM product_versions WHERE slug = ? ORDER BY created_at DESC LIMIT 1",
    )
      .bind(slug)
      .first<{ r2_key: string; version: string; sha256: string; bytes: number }>();
    if (!version) return c.json({ error: { code: "version_unavailable", message: "Pachetul nu e încă încărcat pentru acest produs." } }, 404);

    const object = await c.env.FILES.get(version.r2_key);
    if (!object) return c.json({ error: { code: "version_unavailable" } }, 404);

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("cache-control", "private, no-store");
    headers.set("x-content-type-options", "nosniff");
    headers.set("content-disposition", `attachment; filename="${slug}-${version.version}.zip"`);
    headers.set("etag", version.sha256);
    return new Response(object.body, { headers });
  } catch (error) {
    if (isMissingTable(error)) return c.json({ error: { code: "catalog_unavailable" } }, 503);
    throw error;
  }
});

produseShopRouter.get("/api/produse/account/collection", async (c) => {
  try {
    return c.json({ data: await collectionSlugs(c.env.DB, c.get("userId")) });
  } catch (error) {
    if (isMissingTable(error)) return c.json({ error: { code: "catalog_unavailable" } }, 503);
    throw error;
  }
});

const collectionSchema = z
  .object({
    action: z.enum(["add", "remove", "sync"]),
    slug: z.string().min(1).max(80).optional(),
    slugs: z.array(z.string().min(1).max(80)).max(200).optional(),
  })
  .strict();

produseShopRouter.post("/api/produse/account/collection", async (c) => {
  const parsed = collectionSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: { code: "invalid_request" } }, 400);
  const { action, slug, slugs } = parsed.data;
  if ((action === "add" || action === "remove") && !slug) return c.json({ error: { code: "invalid_request" } }, 400);
  if (action === "sync" && !slugs) return c.json({ error: { code: "invalid_request" } }, 400);

  const userId = c.get("userId");
  const now = Date.now();

  try {
    if (action === "remove") {
      const id = await collectionId(c.env.DB, userId, false);
      if (id) await c.env.DB.prepare("DELETE FROM product_collection_items WHERE collection_id = ? AND slug = ?").bind(id, slug).run();
      return c.json({ data: await collectionSlugs(c.env.DB, userId) });
    }

    const id = (await collectionId(c.env.DB, userId, true))!;
    // Doar produsele existente intră în colecție: altfel un slug inventat ar
    // rămâne acolo și ar strica afișarea din cont.
    const wanted = action === "add" ? [slug!] : slugs!;
    if (wanted.length) {
      const marks = wanted.map(() => "?").join(",");
      const { results } = await c.env.DB.prepare(`SELECT slug FROM product_items WHERE slug IN (${marks}) AND status != 'archived'`)
        .bind(...wanted)
        .all<{ slug: string }>();
      const known = (results ?? []).map((row) => row.slug);
      if (known.length) {
        await c.env.DB.batch(
          known.map((entry) =>
            c.env.DB.prepare("INSERT OR IGNORE INTO product_collection_items (collection_id,slug,note,added_at) VALUES (?,?,NULL,?)").bind(
              id,
              entry,
              now,
            ),
          ),
        );
      }
    }
    await c.env.DB.prepare("UPDATE product_collections SET updated_at = ? WHERE id = ?").bind(now, id).run();
    return c.json({ data: await collectionSlugs(c.env.DB, userId) });
  } catch (error) {
    if (isMissingTable(error)) return c.json({ error: { code: "catalog_unavailable" } }, 503);
    throw error;
  }
});
