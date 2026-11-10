import type { Env } from "./types";
import type { WebsitePlan } from "../../../../src/shared/websiteSubscriptions";
import { readTextUpTo } from "./metadata";
export const isWebsiteSubscription = (items: string) => {
  try {
    return (JSON.parse(items) as { sku?: string }[]).some((i) =>
      /^AVY-WEB-SUB-(START|BUSINESS|PREMIUM)$/.test(i.sku || ""),
    );
  } catch {
    return false;
  }
};
type Row = {
  project_id: string;
  subscription_id: string;
  current_order_id: string;
  plan_snapshot_json: string;
  owner_user_id: string | null;
  billing_anchor_day: number | null;
};
async function stripeObject(env: Env, path: string) {
  const response = await fetch("https://api.stripe.com/v1/" + path, {
    headers: {
      Authorization: "Bearer " + env.STRIPE_SECRET_KEY!.trim(),
      ...(env.STRIPE_API_VERSION
        ? { "Stripe-Version": env.STRIPE_API_VERSION }
        : {}),
    },
    signal: AbortSignal.timeout(10000),
    redirect: "manual",
  });
  if (!response.ok) throw new Error("website_provider_verification_failed");
  return JSON.parse(await readTextUpTo(response, 262144)) as Record<
    string,
    unknown
  >;
}
export function expectedMonthlyEnd(start: number, anchor: number) {
  const d = new Date(start);
  return Date.UTC(
    d.getUTCFullYear(),
    d.getUTCMonth() + 1,
    Math.min(
      anchor,
      new Date(
        Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 2, 0),
      ).getUTCDate(),
    ),
    d.getUTCHours(),
    d.getUTCMinutes(),
    d.getUTCSeconds(),
    d.getUTCMilliseconds(),
  );
}
export async function recordWebsitePeriod(
  env: Env,
  input: {
    subscriptionId: string;
    invoiceId: string;
    startsAt: number;
    endsAt: number;
    amountMinor: number;
    currency: string;
  },
) {
  const row = await env.DB.prepare(
    `SELECT w.project_id,w.subscription_id,w.current_order_id,w.plan_snapshot_json,w.billing_anchor_day,p.owner_user_id FROM website_subscription_projects w JOIN projects p ON p.id=w.project_id WHERE w.provider_subscription_id=?`,
  )
    .bind(input.subscriptionId)
    .first<Row>();
  if (!row) throw new Error("website_subscription_not_linked");
  const plan = JSON.parse(row.plan_snapshot_json) as WebsitePlan,
    anchor = row.billing_anchor_day || new Date(input.startsAt).getUTCDate();
  if (
    !Number.isSafeInteger(input.startsAt) ||
    !Number.isSafeInteger(input.endsAt) ||
    input.endsAt - input.startsAt < 20 * 86400000 ||
    input.endsAt - input.startsAt > 35 * 86400000 ||
    Math.abs(input.endsAt - expectedMonthlyEnd(input.startsAt, anchor)) >
      1000 ||
    input.amountMinor !== plan.priceMinor ||
    input.currency.toUpperCase() !== plan.currency.toUpperCase() ||
    !/^in_[A-Za-z0-9]+$/.test(input.invoiceId)
  )
    throw new Error("website_billing_period_mismatch");
  const previous = await env.DB.prepare(
    "SELECT id,project_id,starts_at,ends_at,amount_minor FROM website_subscription_periods WHERE provider='stripe' AND provider_invoice_id=?",
  )
    .bind(input.invoiceId)
    .first<{
      id: string;
      project_id: string;
      starts_at: number;
      ends_at: number;
      amount_minor: number;
    }>();
  if (
    previous &&
    (previous.project_id !== row.project_id ||
      previous.starts_at !== input.startsAt ||
      previous.ends_at !== input.endsAt ||
      previous.amount_minor !== input.amountMinor)
  )
    throw new Error("website_invoice_replay_mismatch");
  if (!previous)
    await env.DB.batch([
      env.DB.prepare(
        "INSERT INTO website_subscription_periods(id,project_id,provider,provider_invoice_id,starts_at,ends_at,amount_minor,currency,change_limit,created_at) VALUES(?,?,'stripe',?,?,?,?,?,?,?)",
      ).bind(
        crypto.randomUUID(),
        row.project_id,
        input.invoiceId,
        input.startsAt,
        input.endsAt,
        input.amountMinor,
        input.currency.toUpperCase(),
        plan.changes,
        Date.now(),
      ),
      env.DB.prepare(
        "UPDATE website_subscription_projects SET billing_anchor_day=coalesce(billing_anchor_day,?) WHERE project_id=?",
      ).bind(anchor, row.project_id),
      env.DB.prepare(
        "UPDATE subscriptions SET next_billing_date=max(next_billing_date,?),updated_at=? WHERE id=?",
      ).bind(input.endsAt, Date.now(), row.subscription_id),
    ]);
  await env.DB.prepare(
    `INSERT OR IGNORE INTO project_updates(id,project_id,author_id,title,body,created_at) SELECT ?,?,NULL,'Poți solicita trecerea la mentenanță standard','Ai 12 perioade lunare achitate. Poți solicita o ofertă pentru mentenanță standard; nicio schimbare nu este efectuată automat.',? WHERE (SELECT count(*) FROM website_subscription_periods WHERE project_id=?)>=12`,
  )
    .bind(
      "website-transition-" + row.project_id,
      row.project_id,
      Date.now(),
      row.project_id,
    )
    .run();
}
/** Pin fulfillment to the invoice belonging to the paid checkout, never to a
 * subscription's latest invoice (which can change before a delayed retry). */
export async function confirmWebsiteCheckout(
  env: Env,
  order: {
    id: string;
    user_id: string;
    items_json: string;
    total_cents: number;
    currency: string;
  },
  subscriptionId: string | undefined,
  invoiceId: string | undefined,
) {
  if (!isWebsiteSubscription(order.items_json)) return;
  if (
    !subscriptionId ||
    !/^sub_[A-Za-z0-9]+$/.test(subscriptionId) ||
    !invoiceId ||
    !/^in_[A-Za-z0-9]+$/.test(invoiceId)
  )
    throw new Error("website_subscription_invoice_missing");
  const row = await env.DB.prepare(
    `SELECT w.project_id,w.subscription_id,w.current_order_id,w.plan_snapshot_json,p.owner_user_id FROM website_subscription_projects w JOIN projects p ON p.id=w.project_id JOIN website_subscription_acceptances a ON a.order_id=w.current_order_id AND a.project_id=w.project_id WHERE w.current_order_id=? AND a.user_id=? AND p.owner_user_id=?`,
  )
    .bind(order.id, order.user_id, order.user_id)
    .first<Row>();
  if (!row) throw new Error("website_acceptance_missing");
  const remote = await stripeObject(
    env,
    "subscriptions/" + encodeURIComponent(subscriptionId),
  );
  const metadata = remote.metadata as
    { order_id?: string; user_id?: string } | undefined;
  if (
    remote.id !== subscriptionId ||
    metadata?.order_id !== order.id ||
    metadata?.user_id !== order.user_id
  )
    throw new Error("website_subscription_identity_mismatch");
  const invoice = await stripeObject(
    env,
    "invoices/" + encodeURIComponent(invoiceId),
  );
  const parent = invoice.parent as
      { subscription_details?: { subscription?: string } } | undefined,
    lines = invoice.lines as
      { data?: { period?: { start: number; end: number } }[] } | undefined;
  const invoiceSub =
      invoice.subscription || parent?.subscription_details?.subscription,
    period = lines?.data?.length === 1 ? lines.data[0].period : undefined;
  if (
    invoice.id !== invoiceId ||
    invoice.status !== "paid" ||
    invoiceSub !== subscriptionId ||
    invoice.amount_paid !== order.total_cents ||
    String(invoice.currency).toUpperCase() !== order.currency.toUpperCase() ||
    !period
  )
    throw new Error("website_paid_invoice_mismatch");
  await env.DB.prepare(
    "UPDATE website_subscription_projects SET provider_subscription_id=? WHERE project_id=? AND (provider_subscription_id IS NULL OR provider_subscription_id=?)",
  )
    .bind(subscriptionId, row.project_id, subscriptionId)
    .run();
  await recordWebsitePeriod(env, {
    subscriptionId,
    invoiceId,
    startsAt: period.start * 1000,
    endsAt: period.end * 1000,
    amountMinor: order.total_cents,
    currency: order.currency,
  });
  await applyStatus(env, row, subscriptionId, remote);
}
async function applyStatus(
  env: Env,
  row: Pick<Row, "subscription_id">,
  id: string,
  remote: Record<string, unknown>,
) {
  const state = String(remote.status || "");
  const item = (
    remote.items as
      | {
          data?: Array<{
            current_period_start?: number;
            current_period_end?: number;
          }>;
        }
      | undefined
  )?.data?.[0];
  const start =
    Number(item?.current_period_start || remote.current_period_start || 0) *
    1000;
  const end =
    Number(item?.current_period_end || remote.current_period_end || 0) * 1000;
  const validPeriod =
    Number.isSafeInteger(start) &&
    Number.isSafeInteger(end) &&
    start > 0 &&
    end > start;
  const status = (
    {
      active: "active",
      trialing: "trialing",
      past_due: "past_due",
      paused: "paused",
      canceled: "cancelled",
      unpaid: "past_due",
      incomplete: "incomplete",
      incomplete_expired: "expired",
    } as Record<string, string>
  )[state];
  if (!status) throw new Error("website_provider_status_unknown");
  await env.DB.batch([
    env.DB.prepare(
      "UPDATE billing_subscriptions SET status=?,current_period_start=coalesce(?,current_period_start),current_period_end=coalesce(?,current_period_end),cancel_at_period_end=coalesce(?,cancel_at_period_end),updated_at=? WHERE provider='stripe' AND provider_subscription_id=?",
    ).bind(
      status,
      validPeriod ? start : null,
      validPeriod ? end : null,
      typeof remote.cancel_at_period_end === "boolean"
        ? remote.cancel_at_period_end
          ? 1
          : 0
        : null,
      Date.now(),
      id,
    ),
    env.DB.prepare(
      "UPDATE subscriptions SET status=?,updated_at=? WHERE id=?",
    ).bind(
      status === "active"
        ? "active"
        : status === "cancelled" || status === "expired"
          ? "cancelled"
          : "paused",
      Date.now(),
      row.subscription_id,
    ),
  ]);
}
/** Resolve the provider's current state so out-of-order signed events cannot
 * reactivate a cancelled subscription. This uses the existing Stripe account. */
export async function syncWebsiteSubscriptionStatus(env: Env, id: string) {
  const row = await env.DB.prepare(
    "SELECT subscription_id,current_order_id FROM website_subscription_projects WHERE provider_subscription_id=?",
  )
    .bind(id)
    .first<Pick<Row, "subscription_id" | "current_order_id">>();
  if (!row) throw new Error("website_subscription_not_linked");
  const remote = await stripeObject(
    env,
    "subscriptions/" + encodeURIComponent(id),
  );
  if (
    remote.id !== id ||
    (remote.metadata as { order_id?: string } | undefined)?.order_id !==
      row.current_order_id
  )
    throw new Error("website_subscription_identity_mismatch");
  await applyStatus(env, row, id, remote);
}
export async function websiteOrderContext(env: Env, orderId: string) {
  return env.DB.prepare(
    `SELECT w.project_id,p.client_id,a.buyer_snapshot_json,w.current_order_id FROM website_subscription_orders link JOIN website_subscription_projects w ON w.project_id=link.project_id JOIN projects p ON p.id=w.project_id JOIN website_subscription_acceptances a ON a.order_id=link.acceptance_order_id AND a.project_id=w.project_id WHERE link.order_id=?`,
  )
    .bind(orderId)
    .first<{
      project_id: string;
      client_id: string;
      buyer_snapshot_json: string;
      current_order_id: string;
    }>();
}
export async function websiteOrderAuthorized(
  env: Env,
  order: {
    id: string;
    user_id: string;
    items_json: string;
    total_cents: number;
    currency: string;
  },
) {
  if (!isWebsiteSubscription(order.items_json)) return true;
  const items = JSON.parse(order.items_json) as {
    sku: string;
    type: string;
    period: string;
    quantity: number;
  }[];
  if (
    items.length !== 1 ||
    items[0].type !== "subscription" ||
    items[0].period !== "monthly" ||
    items[0].quantity !== 1
  )
    return false;
  const row = await env.DB.prepare(
    `SELECT w.plan_snapshot_json FROM website_subscription_projects w JOIN projects p ON p.id=w.project_id JOIN website_subscription_acceptances a ON a.order_id=w.current_order_id AND a.project_id=w.project_id JOIN website_subscription_orders link ON link.order_id=a.order_id AND link.project_id=w.project_id WHERE w.current_order_id=? AND a.user_id=? AND p.owner_user_id=? AND EXISTS(SELECT 1 FROM client_account_access ca WHERE ca.client_id=p.client_id AND ca.user_id=?)`,
  )
    .bind(order.id, order.user_id, order.user_id, order.user_id)
    .first<{ plan_snapshot_json: string }>();
  if (!row) return false;
  const plan = JSON.parse(row.plan_snapshot_json) as WebsitePlan;
  return (
    plan.sku === items[0].sku &&
    plan.priceMinor === order.total_cents &&
    plan.currency === order.currency &&
    plan.available
  );
}
export async function linkWebsiteRenewalOrder(
  env: Env,
  orderId: string,
  subscriptionId: string,
) {
  const row = await env.DB.prepare(
    `SELECT w.project_id,w.current_order_id FROM website_subscription_projects w JOIN billing_subscriptions bs ON bs.provider_subscription_id=w.provider_subscription_id AND bs.provider='stripe' JOIN commerce_orders renewal ON renewal.id=? AND renewal.user_id=bs.user_id WHERE w.provider_subscription_id=?`,
  )
    .bind(orderId, subscriptionId)
    .first<{ project_id: string; current_order_id: string }>();
  if (!row) throw new Error("website_renewal_assignment_missing");
  await env.DB.prepare(
    "INSERT OR IGNORE INTO website_subscription_orders(order_id,project_id,acceptance_order_id) VALUES(?,?,?)",
  )
    .bind(orderId, row.project_id, row.current_order_id)
    .run();
}

/** Uses the existing billing job and Stripe account. Two projects and three
 * invoices per project bound provider work; a persisted cursor walks history.
 * Webhooks remain the immediate path, this repairs missed/delayed deliveries. */
export async function reconcileWebsiteBilling(
  env: Env,
  fulfill: (
    orderId: string,
    reference: string,
    subscriptionId: string,
  ) => Promise<unknown>,
) {
  const rows = await env.DB.prepare(
    `SELECT w.project_id,w.current_order_id,w.provider_subscription_id,w.reconcile_cursor,p.owner_user_id,o.total_cents,o.currency,o.items_json,
    (SELECT provider_session_id FROM billing_checkout_sessions cs WHERE cs.order_id=w.current_order_id AND cs.provider='stripe' ORDER BY cs.created_at DESC LIMIT 1) session_id
    FROM website_subscription_projects w JOIN projects p ON p.id=w.project_id JOIN commerce_orders o ON o.id=w.current_order_id
    WHERE w.current_order_id IS NOT NULL AND (w.provider_subscription_id IS NOT NULL OR EXISTS(SELECT 1 FROM billing_checkout_sessions cs WHERE cs.order_id=w.current_order_id AND cs.provider='stripe'))
    ORDER BY w.reconciled_at,w.project_id LIMIT 2`,
  ).all<{
    project_id: string;
    current_order_id: string;
    provider_subscription_id: string | null;
    reconcile_cursor: string | null;
    owner_user_id: string;
    total_cents: number;
    currency: string;
    items_json: string;
    session_id: string | null;
  }>();
  for (const row of rows.results) {
    try {
      let subId = row.provider_subscription_id;
      if (!subId && row.session_id) {
        const session = await stripeObject(
          env,
          "checkout/sessions/" + encodeURIComponent(row.session_id),
        );
        if (session.payment_status !== "paid") continue;
        const metadata = session.metadata as
          { order_id?: string; user_id?: string } | undefined;
        if (
          session.id !== row.session_id ||
          session.client_reference_id !== row.current_order_id ||
          metadata?.user_id !== row.owner_user_id ||
          metadata?.order_id !== row.current_order_id ||
          session.amount_total !== row.total_cents ||
          String(session.currency).toUpperCase() !==
            row.currency.toUpperCase() ||
          typeof session.subscription !== "string" ||
          typeof session.invoice !== "string"
        )
          throw Error("website_checkout_reconciliation_mismatch");
        subId = session.subscription;
        await fulfill(
          row.current_order_id,
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : row.session_id,
          subId,
        );
        await confirmWebsiteCheckout(
          env,
          {
            id: row.current_order_id,
            user_id: row.owner_user_id,
            items_json: row.items_json,
            total_cents: row.total_cents,
            currency: row.currency,
          },
          subId,
          session.invoice,
        );
      }
      if (!subId || !/^sub_[A-Za-z0-9]+$/.test(subId)) continue;
      await syncWebsiteSubscriptionStatus(env, subId);
      const query = new URLSearchParams({
        subscription: subId,
        status: "paid",
        limit: "3",
      });
      if (row.reconcile_cursor)
        query.set("starting_after", row.reconcile_cursor);
      const invoices = await stripeObject(env, "invoices?" + query);
      if (!Array.isArray(invoices.data))
        throw Error("website_invoice_list_invalid");
      for (const invoice of invoices.data as Array<Record<string, unknown>>) {
        const parent = invoice.parent as
          { subscription_details?: { subscription?: string } } | undefined;
        const lines = invoice.lines as
          { data?: { period?: { start: number; end: number } }[] } | undefined;
        const period =
          lines?.data?.length === 1 ? lines.data[0].period : undefined;
        if (
          typeof invoice.id !== "string" ||
          !/^in_[A-Za-z0-9]+$/.test(invoice.id) ||
          invoice.status !== "paid" ||
          (invoice.subscription ||
            parent?.subscription_details?.subscription) !== subId ||
          invoice.amount_paid !== row.total_cents ||
          String(invoice.currency).toUpperCase() !==
            row.currency.toUpperCase() ||
          !period
        )
          throw Error("website_reconciled_invoice_mismatch");
        await recordWebsitePeriod(env, {
          subscriptionId: subId,
          invoiceId: invoice.id,
          startsAt: period.start * 1000,
          endsAt: period.end * 1000,
          amountMinor: row.total_cents,
          currency: row.currency,
        });
        if (invoice.billing_reason === "subscription_create") continue;
        const orderId = "stripe-invoice-" + invoice.id,
          t = Date.now();
        await env.DB.prepare(
          "INSERT OR IGNORE INTO commerce_orders(id,user_id,items_json,subtotal_cents,promotion_id,promotion_code,discount_percent,discount_base_cents,discount_cents,total_cents,currency,requires_manual_quote,status,created_at,updated_at) VALUES(?,?,?,?,NULL,NULL,0,0,0,?,?,0,'requested',?,?)",
        )
          .bind(
            orderId,
            row.owner_user_id,
            row.items_json,
            row.total_cents,
            row.total_cents,
            row.currency,
            t,
            t,
          )
          .run();
        await linkWebsiteRenewalOrder(env, orderId, subId);
        await fulfill(
          orderId,
          typeof invoice.payment_intent === "string"
            ? invoice.payment_intent
            : invoice.id,
          subId,
        );
      }
      const last = (invoices.data as Array<{ id: string }>).at(-1)?.id;
      await env.DB.prepare(
        "UPDATE website_subscription_projects SET reconcile_cursor=? WHERE project_id=?",
      )
        .bind(invoices.has_more === true && last ? last : null, row.project_id)
        .run();
    } catch {
      // Do not log provider payloads, customer identity, addresses or tokens.
      console.error(
        JSON.stringify({
          event: "website_billing_reconciliation_failed",
          projectId: row.project_id,
          code: "provider_or_ledger_verification_failed",
        }),
      );
    } finally {
      await env.DB.prepare(
        "UPDATE website_subscription_projects SET reconciled_at=? WHERE project_id=?",
      )
        .bind(Date.now(), row.project_id)
        .run();
    }
  }
}
