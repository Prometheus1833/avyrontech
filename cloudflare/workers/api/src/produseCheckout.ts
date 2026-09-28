// Plata pentru Produse Avyron: parteneriate AVY și produse cumpărate separat.
//
//   POST /api/produse/account/checkout   (cere cont)  → comandă + sesiune Stripe
//   POST /api/produse/stripe/webhook     (public)     → confirmarea plății
//
// Ce ține de bani se decide aici, pe server: prețul vine din D1
// (`partnership_plans`, `product_items`), nu din browser. Comanda se scrie în
// `commerce_orders`, ca orice altă comandă din site, deci apare în AVYRON OS
// fără instalații noi.
//
// Cât timp lipsește `STRIPE_SECRET_KEY`, ruta de checkout creează comanda și
// răspunde cu `payments_unconfigured`: pagina afișează atunci calea pe WhatsApp,
// iar comanda rămâne în OS. Aprinderea plății e o cheie, nu o rescriere.

import { Hono } from "hono";
import { z } from "zod";
import type { AppBindings, Env } from "./types";
import { issueFgoInvoice } from "./invoicingFgo";

export const produseCheckoutRouter = new Hono<AppBindings>();

type Kind = "plan" | "item";

const checkoutSchema = z
  .object({
    kind: z.enum(["plan", "item"]),
    id: z.string().min(1).max(80),
    /** CUI-ul firmei, dacă factura merge pe firmă. Verificat doar ca format. */
    taxId: z.string().trim().max(20).optional(),
  })
  .strict();

/** Prețul și numele produsului vândut, citite din baza de date. */
async function priceFor(db: D1Database, kind: Kind, id: string): Promise<{ name: string; amountMinor: number } | null> {
  if (kind === "plan") {
    const row = await db.prepare("SELECT name, price_ron_cents FROM partnership_plans WHERE id = ?").bind(id).first<{ name: string; price_ron_cents: number }>();
    if (!row || row.price_ron_cents <= 0) return null;
    return { name: `${row.name} — 12 luni`, amountMinor: row.price_ron_cents };
  }
  const row = await db
    .prepare("SELECT name_ro, price_ron_cents, status FROM product_items WHERE slug = ?")
    .bind(id)
    .first<{ name_ro: string; price_ron_cents: number | null; status: string }>();
  if (!row || !row.price_ron_cents || row.status === "archived") return null;
  return { name: row.name_ro, amountMinor: row.price_ron_cents };
}

const stripeForm = (fields: Record<string, string | number>) => {
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(fields)) body.set(key, String(value));
  return body;
};

produseCheckoutRouter.post("/api/produse/account/checkout", async (c) => {
  const parsed = checkoutSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: { code: "invalid_request" } }, 400);
  const { kind, id, taxId } = parsed.data;
  const userId = c.get("userId");

  let priced: { name: string; amountMinor: number } | null;
  try {
    priced = await priceFor(c.env.DB, kind, id);
  } catch (error) {
    if (/no such table: (product_items|partnership_plans)/.test(String(error))) return c.json({ error: { code: "catalog_unavailable" } }, 503);
    throw error;
  }
  if (!priced) return c.json({ error: { code: "not_purchasable" } }, 404);

  const orderId = crypto.randomUUID();
  const now = Date.now();
  const items = [{ kind, id, name: priced.name, quantity: 1, unitPriceCents: priced.amountMinor, source: "produse-avyron", taxId: taxId || null }];

  await c.env.DB.prepare(
    `INSERT INTO commerce_orders (id,user_id,items_json,subtotal_cents,promotion_id,promotion_code,discount_percent,discount_cents,discount_base_cents,total_cents,currency,requires_manual_quote,status,created_at,updated_at)
     VALUES (?,?,?,?,NULL,NULL,0,0,0,?, 'RON',0,'requested',?,?)`,
  )
    .bind(orderId, userId, JSON.stringify(items), priced.amountMinor, priced.amountMinor, now, now)
    .run();

  const secret = c.env.STRIPE_SECRET_KEY?.trim();
  if (!secret) {
    return c.json(
      { error: { code: "payments_unconfigured", message: "Plata cu cardul se activează la lansare." }, orderId, amountMinor: priced.amountMinor },
      503,
    );
  }

  const user = await c.env.DB.prepare("SELECT email FROM users WHERE id = ?").bind(userId).first<{ email: string }>();
  const appUrl = (c.env.APP_URL || "https://avyron.ro").replace(/\/+$/, "");
  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: { authorization: `Bearer ${secret}`, "content-type": "application/x-www-form-urlencoded", "stripe-version": "2024-06-20" },
    body: stripeForm({
      mode: "payment",
      "payment_method_types[0]": "card",
      client_reference_id: orderId,
      customer_email: user?.email ?? "",
      success_url: `${appUrl}/profil?tab=collection&plata=reusita`,
      cancel_url: `${appUrl}/produse-avyron#parteneriate`,
      "line_items[0][quantity]": 1,
      "line_items[0][price_data][currency]": "ron",
      "line_items[0][price_data][unit_amount]": priced.amountMinor,
      "line_items[0][price_data][product_data][name]": priced.name,
      "metadata[order_id]": orderId,
      "metadata[user_id]": userId,
      "metadata[kind]": kind,
      "metadata[target]": id,
    }),
  });

  if (!response.ok) {
    await c.env.DB.prepare("UPDATE commerce_orders SET status='cancelled', updated_at=? WHERE id=?").bind(Date.now(), orderId).run();
    return c.json({ error: { code: "checkout_failed", status: response.status }, orderId }, 502);
  }

  const session = (await response.json()) as { id: string; url?: string };
  return c.json({ orderId, sessionId: session.id, url: session.url ?? null, amountMinor: priced.amountMinor }, 201);
});

/** Verifică semnătura Stripe: `t=<secunde>,v1=<hmac>` peste `t.corp`. */
export async function stripeSignatureValid(secret: string, header: string, payload: string, now = Date.now()): Promise<boolean> {
  const parts = Object.fromEntries(
    header
      .split(",")
      .map((entry) => entry.split("=", 2))
      .filter((entry): entry is [string, string] => entry.length === 2),
  );
  const timestamp = Number(parts.t);
  if (!Number.isFinite(timestamp) || Math.abs(now / 1000 - timestamp) > 300) return false;

  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${parts.t}.${payload}`));
  const expected = [...new Uint8Array(mac)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  const given = parts.v1 ?? "";
  if (given.length !== expected.length) return false;
  let diff = 0;
  for (let index = 0; index < expected.length; index++) diff |= expected.charCodeAt(index) ^ given.charCodeAt(index);
  return diff === 0;
}

/** Un an de parteneriat. Produsele cumpărate separat rămân pe viață. */
const YEAR_MS = 365 * 86400000;

async function grantAndRecord(env: Env, input: { orderId: string; userId: string; kind: Kind; target: string; amountMinor: number; reference: string }) {
  const now = Date.now();
  const entitlementId = crypto.randomUUID();

  const statements = [
    env.DB.prepare("UPDATE commerce_orders SET status='paid', updated_at=? WHERE id=? AND status!='paid'").bind(now, input.orderId),
    input.kind === "plan"
      ? env.DB.prepare(
          "INSERT INTO product_entitlements (id,user_id,slug,plan,source,order_id,granted_at,expires_at) VALUES (?,?,NULL,?, 'purchase',?,?,?)",
        ).bind(entitlementId, input.userId, input.target, input.orderId, now, now + YEAR_MS)
      : env.DB.prepare(
          "INSERT INTO product_entitlements (id,user_id,slug,plan,source,order_id,granted_at,expires_at) VALUES (?,?,?,NULL,'purchase',?,?,NULL)",
        ).bind(entitlementId, input.userId, input.target, input.orderId, now),
    env.DB.prepare(
      `INSERT INTO financial_revenues (id,revenue_type,service_name,status,currency,gross_amount_minor,amount_ron_minor,payment_date,payment_processor,payment_method,stripe_reference,notes,source,created_at,updated_at)
       VALUES (?,'digital_products',?,'paid','RON',?,?,?, 'stripe','card',?,'Produse Avyron','system_generated',?,?)`,
    ).bind(
      crypto.randomUUID(),
      input.kind === "plan" ? `Parteneriat AVY ${input.target}` : `Produs Avyron ${input.target}`,
      input.amountMinor,
      input.amountMinor,
      now,
      input.reference,
      now,
      now,
    ),
  ];

  await env.DB.batch(statements);
}

produseCheckoutRouter.post("/api/produse/stripe/webhook", async (c) => {
  const secret = c.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) return c.json({ error: { code: "payments_unconfigured" } }, 503);

  const payload = await c.req.text();
  const signature = c.req.header("stripe-signature") ?? "";
  if (!(await stripeSignatureValid(secret, signature, payload))) return c.json({ error: { code: "invalid_signature" } }, 400);

  const event = JSON.parse(payload) as {
    id: string;
    type: string;
    data: { object: { id: string; client_reference_id?: string; payment_intent?: string; amount_total?: number; metadata?: Record<string, string>; customer_details?: { email?: string; name?: string } } };
  };

  // Stripe repetă evenimentele până primește 2xx; cheia de idempotență face ca
  // a doua livrare să nu mai acorde încă un drept de acces.
  const scope = "produse.stripe";
  const seen = await c.env.DB.prepare("SELECT idempotency_key FROM idempotency_keys WHERE scope=? AND idempotency_key=?").bind(scope, event.id).first();
  if (seen) return c.json({ ok: true, replay: true });

  if (event.type !== "checkout.session.completed") return c.json({ ok: true, ignored: event.type });

  const session = event.data.object;
  const orderId = session.client_reference_id ?? session.metadata?.order_id ?? "";
  const userId = session.metadata?.user_id ?? "";
  const kind = (session.metadata?.kind as Kind) ?? "item";
  const target = session.metadata?.target ?? "";
  const amountMinor = session.amount_total ?? 0;
  if (!orderId || !userId || !target || amountMinor <= 0) return c.json({ error: { code: "incomplete_session" } }, 400);

  const now = Date.now();
  await c.env.DB.prepare(
    "INSERT INTO idempotency_keys (scope,idempotency_key,request_hash,response_status,response_json,resource_type,resource_id,created_at,expires_at) VALUES (?,?,?,?,?,?,?,?,?)",
  )
    .bind(scope, event.id, event.id, 200, JSON.stringify({ ok: true }), "commerce_order", orderId, now, now + 30 * 86400000)
    .run();

  await grantAndRecord(c.env, { orderId, userId, kind, target, amountMinor, reference: session.payment_intent ?? session.id });

  // Factura pleacă doar dacă FGO e configurat, inclusiv cota de TVA. Dacă nu,
  // plata rămâne înregistrată și factura se emite manual din OS.
  const invoice = await issueFgoInvoice(c.env, {
    buyer: {
      name: session.customer_details?.name || session.customer_details?.email || "Client Avyron",
      email: session.customer_details?.email,
      isCompany: false,
    },
    lines: [{ name: kind === "plan" ? `Parteneriat AVY ${target}` : `Produs Avyron ${target}`, quantity: 1, unitPriceMinor: amountMinor }],
    currency: "RON",
    issuedAt: now,
  });

  if (invoice.issued) {
    await c.env.DB.prepare(
      "UPDATE financial_revenues SET invoice_number=?, invoice_date=?, fgo_reference=?, status='paid', updated_at=? WHERE stripe_reference=?",
    )
      .bind(`${invoice.series}${invoice.number}`, now, invoice.number, now, session.payment_intent ?? session.id)
      .run();
  }

  return c.json({ ok: true, invoiced: invoice.issued });
});
