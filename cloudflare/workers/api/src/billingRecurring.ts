import type { Context } from "hono";
import type { AppBindings, Env } from "./types";
import type { ClientRecurringItem } from "../../../../src/shared/clientRecurring";
import { maintenanceProjectScope } from "./maintenancePolicy";
import { checkRateLimit } from "./antispam";
import { readTextUpTo } from "./metadata";

const quoteHash = async (snapshot: Snapshot, due: number) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify({snapshot,due}))))).map(b=>b.toString(16).padStart(2,"0")).join("");
const CONSENT_VERSION = "recurring-card-2026-11-10";
type Native = {
  id: string; revision: number; client_id: string; project_id: string; project_name: string; slug: string | null;
  site_url: string | null; name: string; price: number; billing_cycle: string; status: string; created_at: number;
  code_json: string | null; agreement_json: string | null; website_json: string | null;
  next_billing_date: number; plan_sku: string | null; maintenance_service_key: string | null;
  billing_client_id: string | null; entity_type: string | null; legal_name: string | null;
  tax_id: string | null; billing_address: string | null; invoice_email: string | null; start_date: number | null;
};
type Snapshot = { revision: number; name: string; sku: string; amountMinor: number; currency: string; period: "monthly" | "annual"; buyer: {name: string; email: string; taxId: string | null; address: string}; accountingCode: string; invoiceProvider: "manual" | "oblio"; vatBasisPoints: number; unitLabel: string };
export type RecurringAgreement = { id: string; subscription_id: string; order_id: string; user_id: string; client_id: string; project_id: string; snapshot_json: string; first_charge_at: number | null; closed_at: number | null; consented_at: number; invoice_cursor?: string | null };
const safeUrl = (raw: string | null) => { try { const u = new URL(raw || ""); return ["https:", "http:"].includes(u.protocol) && !u.username && !u.password ? u.href : null; } catch { return null; } };

async function nativeRows(env: Env, userId: string, id?: string) {
  const scope = maintenanceProjectScope(userId, false);
  const rows = await env.DB.prepare(`SELECT s.id,s.revision,s.client_id,s.status,s.created_at,s.next_billing_date,s.plan_sku,s.maintenance_service_key,
    v.service_name name,v.price,v.billing_cycle,p.id project_id,p.name project_name,p.slug,p.url site_url,
    b.client_id billing_client_id,b.entity_type,b.legal_name,b.tax_id,b.billing_address,b.invoice_email,b.start_date,
    (SELECT json_object('sku',cc.sku,'accounting_code',cc.accounting_code,'invoice_provider',cc.invoice_provider,'vat_basis_points',cc.vat_basis_points,'unit_label',cc.unit_label) FROM commercial_catalog_codes cc WHERE cc.active=1 AND cc.tax_status='verified' AND cc.payment_status='active' AND cc.currency='RON' AND cc.invoice_provider IN('manual','oblio') AND cc.accounting_code IS NOT NULL AND cc.sku IS NOT NULL AND ((s.plan_sku IS NOT NULL AND cc.sku=s.plan_sku) OR (s.plan_sku IS NULL AND s.maintenance_service_key IS NOT NULL AND cc.entity_type='service' AND cc.entity_key=s.maintenance_service_key)) ORDER BY cc.sku LIMIT 1) code_json,
    (SELECT json_object('id',a.id,'user_id',a.user_id,'snapshot_json',a.snapshot_json,'billing_id',bs.id,'payment_status',bs.status,'current_period_end',bs.current_period_end,'cancel_at_period_end',bs.cancel_at_period_end) FROM billing_recurring_agreements a LEFT JOIN billing_subscriptions bs ON bs.order_id=a.order_id AND bs.provider='stripe' WHERE a.subscription_id=s.id AND a.closed_at IS NULL) agreement_json,
    (SELECT json_object('id',bs.id,'status',bs.status,'current_period_end',bs.current_period_end,'cancel_at_period_end',bs.cancel_at_period_end,'user_id',bs.user_id) FROM website_subscription_projects w LEFT JOIN billing_subscriptions bs ON bs.provider='stripe' AND bs.provider_subscription_id=w.provider_subscription_id WHERE w.subscription_id=s.id) website_json
    FROM subscriptions s JOIN services v ON v.id=s.service_id JOIN projects p ON p.id=v.project_id
    LEFT JOIN subscription_billing_settings b ON b.subscription_id=s.id
    WHERE s.client_id=p.client_id AND ${scope.sql} AND EXISTS(SELECT 1 FROM client_account_access ca WHERE ca.client_id=s.client_id AND ca.user_id=?)
    ${id ? "AND s.id=?" : ""} ORDER BY s.next_billing_date,s.id LIMIT 200`).bind(...scope.values, userId, ...(id ? [id] : [])).all<Native>();
  return rows.results;
}
async function commercialSnapshot(row: Native): Promise<Snapshot | null> {
  if (row.status !== "active" || row.plan_sku?.startsWith("AVY-WEB-SUB-") || !["monthly", "yearly"].includes(row.billing_cycle)
    || row.client_id !== row.billing_client_id || !row.legal_name?.trim() || !row.billing_address?.trim() || !row.invoice_email?.trim()
    || (row.entity_type !== "individual" && !row.tax_id?.trim())) return null;
  const code = row.code_json ? JSON.parse(row.code_json) as {sku: string; accounting_code: string; invoice_provider: "manual" | "oblio"; vat_basis_points: number; unit_label: string | null} : null;
  const amountMinor = Math.round(row.price * 100);
  if (!code || !Number.isSafeInteger(amountMinor) || amountMinor <= 0) return null;
  return {revision: row.revision, name: row.name, sku: code.sku, amountMinor, currency: "RON", period: row.billing_cycle === "yearly" ? "annual" : "monthly",
    buyer: {name: row.legal_name, email: row.invoice_email, taxId: row.tax_id, address: row.billing_address}, accountingCode: code.accounting_code,
    invoiceProvider: code.invoice_provider, vatBasisPoints: code.vat_basis_points, unitLabel: code.unit_label || "buc"};
}
export async function recurringOrderContext(env: Env, orderId: string) {
  return env.DB.prepare(`SELECT a.* FROM billing_recurring_orders o JOIN billing_recurring_agreements a ON a.id=o.agreement_id WHERE o.order_id=?`).bind(orderId).first<RecurringAgreement>();
}
export async function recurringProviderContext(env: Env, providerId: string) {
  return env.DB.prepare(`SELECT a.* FROM billing_subscriptions bs JOIN billing_recurring_agreements a ON a.order_id=bs.order_id WHERE bs.provider='stripe' AND bs.provider_subscription_id=?`).bind(providerId).first<RecurringAgreement>();
}
export async function recurringOrderAuthorized(env: Env, orderId: string, userId: string) {
  const agreement = await recurringOrderContext(env, orderId);
  if (!agreement) return true;
  if (agreement.user_id !== userId || agreement.closed_at) return false;
  const row = (await nativeRows(env, userId, agreement.subscription_id))[0];
  if (!row) return false;
  const snapshot = await commercialSnapshot(row);
  return !!snapshot && row.client_id === agreement.client_id && row.project_id === agreement.project_id && JSON.stringify(snapshot) === agreement.snapshot_json;
}

export async function listClientRecurring(env: Env, userId: string, stripeEnabled: boolean) {
  const [native, providers, licenses] = await Promise.all([
    nativeRows(env, userId),
    env.DB.prepare(`SELECT bs.*,co.items_json FROM billing_subscriptions bs LEFT JOIN commerce_orders co ON co.id=bs.order_id
      WHERE bs.user_id=? AND NOT EXISTS(SELECT 1 FROM billing_recurring_agreements a WHERE a.order_id=bs.order_id)
      ORDER BY bs.created_at DESC LIMIT 200`).bind(userId).all<{id: string; order_id: string; sku: string; status: string; provider: string; amount_minor: number; currency: string; period: "monthly" | "annual"; current_period_start: number | null; current_period_end: number | null; cancel_at_period_end: number; created_at: number; items_json: string | null}>(),
    env.DB.prepare(`SELECT e.id,e.granted_at,e.expires_at,e.revoked_at,p.name,o.total_cents,o.currency,o.items_json FROM product_entitlements e
      JOIN commerce_orders o ON o.id=e.order_id AND o.user_id=e.user_id AND o.status='paid'
      JOIN partnership_plans p ON p.id=e.plan
      WHERE e.user_id=? AND e.source='purchase' AND e.plan IS NOT NULL AND json_array_length(o.items_json)=1 AND json_extract(o.items_json,'$[0].kind')='plan'
      AND json_extract(o.items_json,'$[0].id')=e.plan AND NOT EXISTS(SELECT 1 FROM billing_subscriptions bs WHERE bs.order_id=e.order_id)
      ORDER BY e.granted_at DESC LIMIT 200`).bind(userId).all<{id:string;granted_at:number;expires_at:number|null;revoked_at:number|null;name:string;total_cents:number;currency:string;items_json:string}>(),
  ]);
  const data: ClientRecurringItem[] = [];
  for (const row of native) {
    const agreement = row.agreement_json ? JSON.parse(row.agreement_json) as RecurringAgreement & {billing_id: string | null; payment_status: string | null; current_period_end: number | null; cancel_at_period_end: number | null} : null;
    const website = row.plan_sku?.startsWith("AVY-WEB-SUB-");
    const websiteBilling = row.website_json ? JSON.parse(row.website_json) as {id: string | null; status: string | null; current_period_end: number | null; cancel_at_period_end: number | null; user_id: string | null} : null;
    const snapshot = !website ? await commercialSnapshot(row) : null;
    const unchanged = !agreement || !!snapshot && JSON.stringify(snapshot)===agreement.snapshot_json;
    const startReady = row.next_billing_date<=Date.now()+365*86400000;
    const mine = agreement ? agreement.user_id === userId : websiteBilling ? websiteBilling.user_id === userId : true;
    const paymentStatus = agreement?.payment_status || websiteBilling?.status || null;
    data.push({id: row.id, source: "native", name: row.name, status: row.status, amountMinor: Math.round(row.price * 100), currency: "RON", period: row.billing_cycle === "yearly" ? "annual" : "monthly",
      startsAt: row.start_date || row.created_at || null, nextBillingAt: agreement?.current_period_end || websiteBilling?.current_period_end || row.next_billing_date || null,
      project: {id: row.project_id, name: row.project_name, slug: row.slug, url: safeUrl(row.site_url)},
      billingId: mine ? agreement?.billing_id || websiteBilling?.id || null : null, paymentStatus, cancelAtPeriodEnd: !!(agreement?.cancel_at_period_end || websiteBilling?.cancel_at_period_end), canManage: mine && !!(agreement?.billing_id || websiteBilling?.id),
      checkoutReady: stripeEnabled && !website && mine && !paymentStatus && !!snapshot && unchanged && startReady,
      unavailableReason: !mine ? "Debitarea este gestionată de reprezentantul care a autorizat-o." : website ? "Condițiile și plata se gestionează din abonamentul website." : paymentStatus ? null : !stripeEnabled ? "Stripe este momentan indisponibil." : !unchanged ? "Condițiile acceptate necesită revizuire de către echipă." : !startReady ? "Data primei debitări necesită revizuire." : !snapshot ? "Echipa trebuie să confirme datele de facturare și configurația fiscală a planului." : null,
      revision: row.revision, quoteHash: snapshot ? await quoteHash(snapshot,row.next_billing_date) : agreement ? await quoteHash(JSON.parse(agreement.snapshot_json) as Snapshot,row.next_billing_date) : null, beneficiary: row.legal_name});
  }
  for (const row of providers.results) {
    // A website already represented by its operational subscription is listed once.
    if (native.some(n => n.plan_sku === row.sku && n.plan_sku?.startsWith("AVY-WEB-SUB-"))) continue;
    let name = row.sku; try { const lines = JSON.parse(row.items_json || "[]") as {name?: string}[]; name = lines[0]?.name || name; } catch { /* historical name */ }
    data.push({id: row.id, source: "provider", name, status: row.status, amountMinor: row.amount_minor, currency: row.currency, period: row.period,
      startsAt: row.created_at || row.current_period_start, nextBillingAt: row.current_period_end, project: null, billingId: row.id, paymentStatus: row.status,
      cancelAtPeriodEnd: !!row.cancel_at_period_end, canManage: row.provider === "stripe", checkoutReady: false, unavailableReason: null, revision: 0, quoteHash: null, beneficiary: null});
  }
  for(const row of licenses.results){
    const name=(JSON.parse(row.items_json) as {name?:string}[])[0]?.name||row.name;
    data.push({id:row.id,source:"license",name,status:row.revoked_at?"cancelled":row.expires_at&&row.expires_at<=Date.now()?"expired":"active",amountMinor:row.total_cents,currency:row.currency,period:"annual",startsAt:row.granted_at,nextBillingAt:null,accessEndsAt:row.expires_at,project:null,billingId:null,paymentStatus:null,cancelAtPeriodEnd:false,canManage:false,checkoutReady:false,unavailableReason:"Acces anual achitat. Această achiziție nu are debitare automată; condițiile ei nu sunt schimbate implicit.",revision:0,quoteHash:null,beneficiary:null});
  }
  return {data};
}

export async function prepareNativeRecurring(c: Context<AppBindings>, subscriptionId: string, revision: number, expectedHash: string) {
  const userId = c.get("userId");
  const rate = await checkRateLimit(c.env.DB, [{key: `recurring-checkout:${userId}`, limit: 12, windowSec: 3600}]);
  if (!rate.ok) return {error: "rate_limited", status: 429 as const};
  const row = (await nativeRows(c.env, userId, subscriptionId))[0];
  if (!row) return {error: "not_found", status: 404 as const};
  if (row.revision !== revision) return {error: "recurring_revision_conflict", status: 409 as const};
  const snapshot = await commercialSnapshot(row);
  if (!snapshot) return {error: "recurring_billing_not_ready", status: 409 as const};
  if (expectedHash !== await quoteHash(snapshot,row.next_billing_date)) return {error: "recurring_revision_conflict", status: 409 as const};
  const previous = await c.env.DB.prepare("SELECT * FROM billing_recurring_agreements WHERE subscription_id=? AND closed_at IS NULL").bind(row.id).first<RecurringAgreement>();
  if (previous) {
    if (previous.user_id !== userId || previous.snapshot_json !== JSON.stringify(snapshot)) return {error: "recurring_agreement_requires_review", status: 409 as const};
    const provider = await c.env.DB.prepare("SELECT 1 FROM billing_subscriptions WHERE order_id=? AND status NOT IN('cancelled','expired')").bind(previous.order_id).first();
    if (provider) return {error: "recurring_already_authorized", status: 409 as const};
    return {orderId: previous.order_id};
  }
  const invoiced = await c.env.DB.prepare("SELECT 1 FROM subscription_invoice_periods period JOIN financial_revenues r ON r.id=period.revenue_id WHERE period.subscription_id=? AND period.billing_date/86400000>=?/86400000 AND r.status NOT IN('cancelled','archived') LIMIT 1").bind(row.id,row.next_billing_date).first();
  if(invoiced)return {error:"recurring_existing_invoice_requires_review",status:409 as const};
  const timestamp = Date.now(), orderId = crypto.randomUUID(), id = crypto.randomUUID();
  const firstChargeAt = row.next_billing_date > timestamp + 60000 ? Math.floor(row.next_billing_date/1000)*1000 : null;
  if (firstChargeAt && firstChargeAt > timestamp + 365 * 86400000) return {error: "recurring_start_requires_review", status: 409 as const};
  const item = {sku: snapshot.sku, type: "subscription", name: snapshot.name, period: snapshot.period, quantity: 1, lineTotalCents: snapshot.amountMinor,
    accountingCode: snapshot.accountingCode, invoiceProvider: snapshot.invoiceProvider, vatBasisPoints: snapshot.vatBasisPoints, unitLabel: snapshot.unitLabel};
  try {
    await c.env.DB.batch([
      c.env.DB.prepare("INSERT INTO commerce_orders(id,user_id,items_json,subtotal_cents,total_cents,currency,requires_manual_quote,status,created_at,updated_at) VALUES(?,?,?,?,?,'RON',0,'requested',?,?)").bind(orderId, userId, JSON.stringify([item]), snapshot.amountMinor, snapshot.amountMinor, timestamp, timestamp),
      c.env.DB.prepare(`INSERT INTO billing_recurring_agreements(id,subscription_id,order_id,user_id,client_id,project_id,snapshot_json,first_charge_at,consent_version,consented_at) VALUES(?,?,?,?,?,?,?,?,?,?)`).bind(id, row.id, orderId, userId, row.client_id, row.project_id, JSON.stringify(snapshot), firstChargeAt, CONSENT_VERSION, timestamp),
      c.env.DB.prepare("INSERT INTO billing_recurring_orders(order_id,agreement_id) VALUES(?,?)").bind(orderId, id),
      c.env.DB.prepare("INSERT INTO security_events(id,actor_user_id,actor_type,action,target_type,target_id,outcome,severity,metadata_json,created_at) VALUES(?,?,'user','billing.recurring.consented','subscription',?,'allowed','info','{}',?)").bind(crypto.randomUUID(), userId, row.id, timestamp),
    ]);
  } catch (error) {
    const concurrent = await c.env.DB.prepare("SELECT order_id,user_id,snapshot_json FROM billing_recurring_agreements WHERE subscription_id=? AND closed_at IS NULL").bind(row.id).first<{order_id: string; user_id: string; snapshot_json: string}>();
    if (concurrent?.user_id === userId && concurrent.snapshot_json === JSON.stringify(snapshot)) return {orderId: concurrent.order_id};
    if (concurrent) return {error: "recurring_agreement_requires_review", status: 409 as const};
    throw error;
  }
  return {orderId};
}

async function stripeRead(env: Env, path: string) {
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {headers: {authorization: `Bearer ${env.STRIPE_SECRET_KEY!.trim()}`, ...(env.STRIPE_API_VERSION ? {"Stripe-Version": env.STRIPE_API_VERSION} : {})}, signal: AbortSignal.timeout(10000), redirect: "error"});
  if (!response.ok) throw Error("recurring_provider_verification_failed");
  return JSON.parse(await readTextUpTo(response, 262144)) as Record<string, unknown>;
}
export function stripePeriod(subscription: Record<string, unknown>) {
  const items = subscription.items as {data?: Array<{current_period_start?: number; current_period_end?: number}>} | undefined;
  const start = Number(subscription.current_period_start || items?.data?.[0]?.current_period_start || 0);
  const end = Number(subscription.current_period_end || items?.data?.[0]?.current_period_end || 0);
  return {start: start > 0 ? start * 1000 : null, end: end > 0 ? end * 1000 : null};
}
export async function verifyNativeProvider(env: Env, agreement: RecurringAgreement, providerId: string) {
  const subscription = await stripeRead(env, `subscriptions/${encodeURIComponent(providerId)}`);
  const customer = await env.DB.prepare("SELECT provider_customer_id FROM billing_customers WHERE user_id=? AND provider='stripe'").bind(agreement.user_id).first<{provider_customer_id: string}>();
  const snapshot = JSON.parse(agreement.snapshot_json) as Snapshot;
  const items = subscription.items as {data?: Array<{quantity?: number; price?: {unit_amount?: number; currency?: string; recurring?: {interval?: string; interval_count?: number}}}>};
  const item = items?.data?.[0], price = item?.price;
  if (!customer || subscription.customer !== customer.provider_customer_id || items?.data?.length !== 1 || item?.quantity !== 1 || price?.unit_amount !== snapshot.amountMinor
    || price?.currency?.toUpperCase() !== snapshot.currency || price.recurring?.interval !== (snapshot.period === "annual" ? "year" : "month") || price.recurring.interval_count !== 1
    || (subscription.metadata as {order_id?: string})?.order_id !== agreement.order_id || subscription.collection_method !== "charge_automatically") throw Error("recurring_provider_contract_mismatch");
  return {subscription, snapshot, ...stripePeriod(subscription)};
}
export async function syncNativeProvider(env: Env, providerId: string) {
  const agreement = await recurringProviderContext(env, providerId);
  if (!agreement) return;
  const verified = await verifyNativeProvider(env, agreement, providerId);
  const status = String(verified.subscription.status), mapped = ({canceled: "cancelled", unpaid: "past_due", incomplete_expired: "expired"} as Record<string,string>)[status] || (["active", "trialing", "past_due", "paused", "incomplete"].includes(status) ? status : "incomplete");
  await env.DB.batch([
    env.DB.prepare("UPDATE billing_subscriptions SET status=?,current_period_start=?,current_period_end=?,cancel_at_period_end=?,updated_at=? WHERE provider='stripe' AND provider_subscription_id=?").bind(mapped, verified.start, verified.end, verified.subscription.cancel_at_period_end ? 1 : 0, Date.now(), providerId),
    env.DB.prepare("UPDATE billing_recurring_agreements SET last_checked_at=?,closed_at=CASE WHEN ? IN('cancelled','expired') THEN coalesce(closed_at,?) ELSE closed_at END WHERE id=?").bind(Date.now(), mapped, Date.now(), agreement.id),
  ]);
}
export async function confirmNativeCheckout(env: Env, orderId: string, session: {subscription?: string; amount_total?: number; payment_status?: string; id?: string}) {
  const agreement = await recurringOrderContext(env, orderId);
  if (!agreement) return false;
  if (!session.subscription) throw Error("recurring_provider_subscription_missing");
  const verified = await verifyNativeProvider(env, agreement, session.subscription);
  const zeroStart = !!agreement.first_charge_at && session.amount_total === 0 && ["paid","no_payment_required"].includes(session.payment_status || "");
  if (zeroStart && (verified.subscription.status !== "trialing" && verified.subscription.status !== "active" || verified.end !== agreement.first_charge_at)) throw Error("recurring_first_charge_mismatch");
  if (!zeroStart && (session.amount_total !== verified.snapshot.amountMinor || session.payment_status !== "paid")) throw Error("recurring_amount_mismatch");
  await env.DB.prepare(`INSERT INTO billing_subscriptions(id,user_id,order_id,provider,provider_subscription_id,sku,status,period,amount_minor,currency,current_period_start,current_period_end,cancel_at_period_end,created_at,updated_at)
    VALUES(?,?,?,'stripe',?,?,'incomplete',?,?,?,?,?,?,?,?) ON CONFLICT(provider,provider_subscription_id) DO NOTHING`).bind(crypto.randomUUID(), agreement.user_id, agreement.order_id, session.subscription, verified.snapshot.sku, verified.snapshot.period, verified.snapshot.amountMinor, verified.snapshot.currency, verified.start, verified.end, 0, Date.now(), Date.now()).run();
  await syncNativeProvider(env, session.subscription);
  if (zeroStart) await env.DB.prepare("UPDATE billing_checkout_sessions SET status='paid',amount_minor=0,updated_at=? WHERE provider='stripe' AND provider_session_id=? AND order_id=?").bind(Date.now(), session.id, orderId).run();
  return zeroStart;
}
export async function linkNativeRenewal(env: Env, orderId: string, providerId: string, amountMinor: number, currency: string) {
  const agreement = await recurringProviderContext(env, providerId);
  if (!agreement) return;
  const snapshot = JSON.parse(agreement.snapshot_json) as Snapshot;
  if (amountMinor !== snapshot.amountMinor || currency.toUpperCase() !== snapshot.currency) throw Error("recurring_invoice_amount_mismatch");
  await env.DB.prepare("INSERT OR IGNORE INTO billing_recurring_orders(order_id,agreement_id) VALUES(?,?)").bind(orderId, agreement.id).run();
}
export async function advanceNativePaidPeriod(env: Env, providerId: string, end: number | null) {
  const agreement = await recurringProviderContext(env, providerId);
  if (!agreement || !end) return;
  await env.DB.prepare("UPDATE subscriptions SET next_billing_date=max(next_billing_date,?),updated_at=? WHERE id=? AND client_id=? AND EXISTS(SELECT 1 FROM services v WHERE v.id=subscriptions.service_id AND v.project_id=?)").bind(end, Date.now(), agreement.subscription_id, agreement.client_id, agreement.project_id).run();
}

/** Bounded repair through the existing billing_reconcile job; no additional scheduler. */
export async function reconcileNativeBilling(env: Env, paid: (orderId: string, reference: string, subscriptionId: string) => Promise<void>) {
  const rows = await env.DB.prepare("SELECT * FROM billing_recurring_agreements WHERE closed_at IS NULL ORDER BY last_checked_at,id LIMIT 2").all<RecurringAgreement>();
  for (const agreement of rows.results) {
    try {
      const local = await env.DB.prepare("SELECT provider_subscription_id FROM billing_subscriptions WHERE provider='stripe' AND order_id=?").bind(agreement.order_id).first<{provider_subscription_id: string}>();
      let providerId = local?.provider_subscription_id;
      if (!providerId) {
        const checkout = await env.DB.prepare("SELECT provider_session_id FROM billing_checkout_sessions WHERE order_id=? AND provider='stripe' AND status IN('created','pending') ORDER BY created_at DESC LIMIT 1").bind(agreement.order_id).first<{provider_session_id: string}>();
        if (!checkout) {if(Date.now()-agreement.consented_at>3600000)await releaseUnstartedRecurring(env,agreement.order_id);continue;}
        const session = await stripeRead(env, `checkout/sessions/${encodeURIComponent(checkout.provider_session_id)}`) as {id?: string; status?: string; subscription?: string; amount_total?: number; payment_status?: string; payment_intent?: string};
        if (session.status !== "complete" || !session.subscription) continue;
        const zero = await confirmNativeCheckout(env, agreement.order_id, session);
        if (!zero) await paid(agreement.order_id, session.payment_intent || session.id!, session.subscription);
        providerId = session.subscription;
      }
      await syncNativeProvider(env, providerId);
      const response = await stripeRead(env, `invoices?subscription=${encodeURIComponent(providerId)}&status=paid&limit=3${agreement.invoice_cursor?`&starting_after=${encodeURIComponent(agreement.invoice_cursor)}`:""}`);
      const invoices = response.data as Array<{id: string; amount_paid: number; currency: string; billing_reason: string; payment_intent?: string; lines?: {data?: Array<{period?: {start: number; end: number}}>}}>;
      const pageEnd=invoices?.at(-1)?.id||null;
      for (const invoice of (invoices || []).reverse()) {
        if (invoice.billing_reason === "subscription_create" || invoice.amount_paid <= 0) continue;
        const orderId = `stripe-invoice-${invoice.id}`, snapshot = JSON.parse(agreement.snapshot_json) as Snapshot;
        validateNativeInvoice(snapshot, invoice.amount_paid, invoice.currency, invoice.lines?.data?.[0]?.period);
        const original = await env.DB.prepare("SELECT items_json FROM commerce_orders WHERE id=?").bind(agreement.order_id).first<{items_json: string}>();
        if (!original) throw Error("recurring_order_missing");
        await env.DB.prepare("INSERT OR IGNORE INTO commerce_orders(id,user_id,items_json,subtotal_cents,total_cents,currency,requires_manual_quote,status,created_at,updated_at) VALUES(?,?,?,?,?,?,0,'requested',?,?)").bind(orderId, agreement.user_id, original.items_json, invoice.amount_paid, invoice.amount_paid, invoice.currency.toUpperCase(), Date.now(), Date.now()).run();
        await linkNativeRenewal(env, orderId, providerId, invoice.amount_paid, invoice.currency);
        await paid(orderId, invoice.payment_intent || invoice.id, providerId);
        await advanceNativePaidPeriod(env, providerId, (invoice.lines?.data?.[0]?.period?.end || 0)*1000 || null);
      }
      await env.DB.prepare("UPDATE billing_recurring_agreements SET invoice_cursor=? WHERE id=?").bind(response.has_more===true?pageEnd:null,agreement.id).run();
    } catch { console.error(JSON.stringify({event: "billing_reconciliation_failed", provider: "stripe", code: "native_recurring_verification_failed"})); }
    finally { await env.DB.prepare("UPDATE billing_recurring_agreements SET last_checked_at=? WHERE id=?").bind(Date.now(), agreement.id).run(); }
  }
}
function validateNativeInvoice(snapshot: Snapshot, amountMinor: number, currency: string, period?: {start: number; end: number}) {
  const days = period ? (period.end-period.start)/86400 : 0;
  if (amountMinor !== snapshot.amountMinor || currency.toUpperCase() !== snapshot.currency || days < (snapshot.period === "annual" ? 364 : 26) || days > (snapshot.period === "annual" ? 367 : 33)) throw Error("recurring_invoice_amount_or_period_mismatch");
}
export async function validateNativeRenewal(env: Env, providerId: string, amountMinor: number, currency: string, period?: {start: number; end: number}) {
  const agreement = await recurringProviderContext(env, providerId);
  if (agreement) validateNativeInvoice(JSON.parse(agreement.snapshot_json) as Snapshot, amountMinor, currency, period);
}

export async function releaseUnstartedRecurring(env:Env,orderId:string){
 await env.DB.batch([
  env.DB.prepare("UPDATE billing_recurring_agreements SET closed_at=? WHERE order_id=? AND closed_at IS NULL AND NOT EXISTS(SELECT 1 FROM billing_checkout_sessions s WHERE s.order_id=billing_recurring_agreements.order_id) AND NOT EXISTS(SELECT 1 FROM billing_subscriptions s WHERE s.order_id=billing_recurring_agreements.order_id)").bind(Date.now(),orderId),
  env.DB.prepare("UPDATE commerce_orders SET status='cancelled',updated_at=? WHERE id=? AND status='requested' AND EXISTS(SELECT 1 FROM billing_recurring_agreements a WHERE a.order_id=commerce_orders.id AND a.closed_at IS NOT NULL)").bind(Date.now(),orderId),
 ]);
}

/** No new cron: the existing quarter-hour tick enqueues work only for overdue checks. */
export async function nativeBillingDue(env:Env){
 return !!await env.DB.prepare("SELECT 1 FROM billing_recurring_agreements WHERE closed_at IS NULL AND last_checked_at<? LIMIT 1").bind(Date.now()-3600000).first();
}
