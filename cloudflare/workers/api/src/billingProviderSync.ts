import { z } from 'zod';
import type { Env } from './types';
import type { FinancialProviderKey } from './providerSyncPolicy';
import { verifyFinancialConnection } from './financialConnectionVerification';
import { readTextUpTo } from './metadata';

const phases = ['checkout', 'subscription', 'invoice'] as const;
const stateSchema = z.object({
  runId: z.string().uuid(), startedAt: z.number().int().nonnegative(), finishedAt: z.number().int().nullable(),
  status: z.enum(['running', 'complete', 'differences']), phase: z.enum(phases), cursor: z.string().max(240),
  checked: z.number().int().nonnegative(), matched: z.number().int().nonnegative(), issueCount: z.number().int().nonnegative(),
  issues: z.array(z.object({ id: z.string().max(240), code: z.string().max(100) })).max(10), lockedUntil: z.number().int().nonnegative(),
});
export type BillingSyncState = z.infer<typeof stateSchema>;
export function billingSyncState(raw: string | null): BillingSyncState | null {
  try { const result = stateSchema.safeParse(JSON.parse(raw || 'null')); return result.success ? result.data : null; } catch { return null; }
}
type Reference = { id: string; remote_id: string; order_id: string; user_id: string; customer_id: string | null; status: string; amount_minor: number; currency: string; mode: string; period: string | null; series: string | null; number: string | null };
const object = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
async function providerObject(url: string, headers: Record<string, string>, init?: RequestInit) {
  try {
    const r = await fetch(url, { ...init, headers, redirect: 'error', signal: AbortSignal.timeout(8000) });
    if (!r.ok) throw Error('provider_read_failed');
    return object(JSON.parse(await readTextUpTo(r, 262144)));
  } catch { throw Error('provider_read_failed'); }
}
function stages(provider: FinancialProviderKey): (typeof phases)[number][] { return provider === 'oblio' ? ['invoice'] : ['checkout', 'subscription']; }
async function references(env: Env, provider: FinancialProviderKey, state: BillingSyncState) {
  if (state.phase === 'invoice') return env.DB.prepare(`SELECT bi.id,bi.order_id,co.user_id,bi.status,bi.total_minor amount_minor,bi.currency,bi.series,bi.number,'' remote_id,NULL customer_id,'' mode,NULL period
    FROM billing_invoices bi JOIN commerce_orders co ON co.id=bi.order_id WHERE bi.provider='oblio' AND bi.status='issued' AND bi.id>? AND bi.created_at<=? ORDER BY bi.id LIMIT 6`).bind(state.cursor, state.startedAt).all<Reference>();
  const processor = provider === 'revolut_merchant' ? 'revolut' : 'stripe';
  if (state.phase === 'checkout') return env.DB.prepare(`SELECT cs.id,cs.order_id,cs.user_id,cs.provider_session_id remote_id,cs.status,cs.amount_minor,cs.currency,cs.mode,bc.provider_customer_id customer_id,NULL series,NULL number,NULL period
    FROM billing_checkout_sessions cs JOIN commerce_orders co ON co.id=cs.order_id AND co.user_id=cs.user_id
    LEFT JOIN billing_customers bc ON bc.user_id=cs.user_id AND bc.provider=cs.provider WHERE cs.provider=? AND cs.mode<>'setup' AND cs.id>? AND cs.created_at<=? ORDER BY cs.id LIMIT 6`).bind(processor, state.cursor, state.startedAt).all<Reference>();
  return env.DB.prepare(`SELECT bs.id,bs.order_id,bs.user_id,bs.provider_subscription_id remote_id,bs.status,bs.amount_minor,bs.currency,'subscription' mode,bs.period,bc.provider_customer_id customer_id,NULL series,NULL number
    FROM billing_subscriptions bs JOIN commerce_orders co ON co.id=bs.order_id AND co.user_id=bs.user_id
    LEFT JOIN billing_customers bc ON bc.user_id=bs.user_id AND bc.provider=bs.provider WHERE bs.provider=? AND bs.id>? AND bs.created_at<=? ORDER BY bs.id LIMIT 6`).bind(processor, state.cursor, state.startedAt).all<Reference>();
}
async function checkReference(env: Env, provider: FinancialProviderKey, phase: BillingSyncState['phase'], row: Reference, oblioToken?: string) {
  if (provider === 'oblio') {
    if (!row.series || row.series !== env.OBLIO_SERIES?.trim() || !row.number || !oblioToken) throw Error('invoice_series_scope_mismatch');
    const params = new URLSearchParams({ cif: env.OBLIO_CIF!.trim(), seriesName: row.series, number: row.number });
    const remote = await providerObject('https://www.oblio.eu/api/docs/invoice?' + params, { authorization: `Bearer ${oblioToken}` });
    const doc = object(remote.data);
    if (remote.status !== 200 || doc.documentType !== 'Factura' || doc.seriesName !== row.series || String(doc.number).replace(/^0+/, '') !== row.number.replace(/^0+/, '')) throw Error('invoice_reference_mismatch');
    // This API returns a document reference, not its fiscal/settlement certificate.
    return;
  }
  if (provider === 'stripe') {
    const remote = await providerObject(`https://api.stripe.com/v1/${phase === 'checkout' ? 'checkout/sessions' : 'subscriptions'}/${encodeURIComponent(row.remote_id)}`, { authorization: `Bearer ${env.STRIPE_SECRET_KEY!.trim()}`, ...(env.STRIPE_API_VERSION ? { 'Stripe-Version': env.STRIPE_API_VERSION } : {}) });
    if (remote.id !== row.remote_id || !row.customer_id || remote.customer !== row.customer_id || object(remote.metadata).order_id !== row.order_id) throw Error('provider_resource_mismatch');
    if (phase === 'checkout') {
      if (remote.client_reference_id !== row.order_id || object(remote.metadata).user_id !== row.user_id || Number(remote.amount_total) !== row.amount_minor || String(remote.currency).toUpperCase() !== row.currency.toUpperCase()) throw Error('checkout_contract_mismatch');
      const paid = remote.payment_status === 'paid' || row.amount_minor === 0 && row.mode === 'subscription' && remote.payment_status === 'no_payment_required';
      if ((row.status === 'paid') !== paid || remote.status === 'expired' && row.status !== 'expired') throw Error('checkout_requires_reconciliation');
    } else {
      const data = object(remote.items).data;
      const item = Array.isArray(data) && data.length === 1 ? object(data[0]) : {};
      const price = object(item.price), recurrence = object(price.recurring);
      const mapped = ({ canceled: 'cancelled', unpaid: 'past_due', incomplete_expired: 'expired' } as Record<string, string>)[String(remote.status)] || remote.status;
      if (mapped !== row.status || Number(item.quantity) !== 1 || Number(price.unit_amount) !== row.amount_minor || String(price.currency).toUpperCase() !== row.currency.toUpperCase() || (recurrence.interval !== (row.period === 'annual' ? 'year' : 'month') || Number(recurrence.interval_count) !== 1)) throw Error('subscription_requires_reconciliation');
    }
    return;
  }
  const root = (env.REVOLUT_MERCHANT_API_URL || 'https://merchant.revolut.com/api').replace(/\/+$/, '');
  if (root !== 'https://merchant.revolut.com/api' && !(env.APP_ENV !== 'production' && root === 'https://sandbox-merchant.revolut.com/api')) throw Error('merchant_origin_rejected');
  const remote = await providerObject(`${root}/${phase === 'checkout' ? 'orders' : 'subscriptions'}/${encodeURIComponent(row.remote_id)}`, { authorization: `Bearer ${env.REVOLUT_MERCHANT_SECRET_KEY!.trim()}`, 'Revolut-Api-Version': env.REVOLUT_MERCHANT_API_VERSION || '2026-08-17' });
  if (remote.id !== row.remote_id) throw Error('provider_resource_mismatch');
  if (phase === 'checkout') {
    const reference = remote.merchant_order_ext_ref || object(remote.merchant_order_data).reference;
    if (reference !== row.order_id || String(remote.currency).toUpperCase() !== row.currency.toUpperCase() || Number(remote.amount) !== row.amount_minor) throw Error('checkout_contract_mismatch');
    if ((row.status === 'paid') !== (remote.state === 'completed')) throw Error('checkout_requires_reconciliation');
  } else {
    const mapped = ({ overdue: 'past_due', finished: 'expired', pending: 'incomplete' } as Record<string, string>)[String(remote.state)] || remote.state;
    if (mapped !== row.status) throw Error('subscription_requires_reconciliation');
  }
}
/** Read-only at processors, paged over existing AVYRON references only. No charges,
 * refunds, invoices, bank imports or synthetic webhook events are generated. */
export async function syncBillingReferences(env: Env, provider: FinancialProviderKey, actorId: string) {
  const conn = await env.DB.prepare("SELECT id,sync_state_json FROM financial_provider_connections WHERE provider=? AND vendor_id IS NULL AND status='connected' ORDER BY updated_at DESC LIMIT 1").bind(provider).first<{id: string; sync_state_json: string | null}>();
  if (!conn) return { error: 'verified_connection_required' as const };
  const timestamp = Date.now(), old = billingSyncState(conn.sync_state_json);
  if (old && old.lockedUntil > timestamp) return { error: 'sync_in_progress' as const };
  const verification = await verifyFinancialConnection(env, provider);
  if (!verification.ok) {
    const failed=await env.DB.prepare("UPDATE financial_provider_connections SET status='error',last_error_code=?,updated_by=?,updated_at=? WHERE id=? AND sync_state_json IS ?").bind(verification.code,actorId,timestamp,conn.id,conn.sync_state_json).run();
    if(failed.meta.changes)await env.DB.prepare("INSERT INTO financial_audit_events(id,actor_user_id,action,resource_type,resource_id,after_json,source,created_at) VALUES (?,?,'billing.references.verification_failed','financial_provider_connection',?,?,'api',?)").bind(crypto.randomUUID(),actorId,provider,JSON.stringify({code:verification.code}),timestamp).run();
    return { error: verification.code };
  }
  const state: BillingSyncState = old?.status === 'running' && timestamp - old.startedAt < 3600000 ? { ...old } : {
    runId: crypto.randomUUID(), startedAt: timestamp, finishedAt: null, status: 'running', phase: stages(provider)[0], cursor: '', checked: 0, matched: 0, issueCount: 0, issues: [], lockedUntil: 0,
  };
  state.lockedUntil = timestamp + 120000;
  const locked = JSON.stringify(state);
  const claim = await env.DB.prepare('UPDATE financial_provider_connections SET sync_state_json=? WHERE id=? AND sync_state_json IS ?').bind(locked, conn.id, conn.sync_state_json).run();
  if (!claim.meta.changes) return { error: 'sync_in_progress' as const };
  let failure: string | null = null;
  try {
    let budget = 5;
    while (budget > 0 && state.status === 'running') {
      const page = await references(env, provider, state), rows = page.results.slice(0, budget);
      let oblioToken: string | undefined;
      if (provider === 'oblio' && rows.length) {
        const auth = await providerObject('https://www.oblio.eu/api/authorize/token', { 'content-type': 'application/x-www-form-urlencoded' }, { method: 'POST', body: new URLSearchParams({ client_id: env.OBLIO_CLIENT_ID!.trim(), client_secret: env.OBLIO_CLIENT_SECRET!.trim() }) });
        if (typeof auth.access_token !== 'string' || !auth.access_token) throw Error('provider_auth_failed');
        oblioToken = auth.access_token;
      }
      for (const row of rows) {
        try { await checkReference(env, provider, state.phase, row, oblioToken); state.matched++; }
        catch (e) { state.issueCount++; if (state.issues.length < 10) state.issues.push({ id: row.id, code: e instanceof Error ? e.message : 'provider_read_failed' }); }
        state.checked++; state.cursor = row.id; budget--;
      }
      if (page.results.length <= rows.length) {
        const sequence = stages(provider), next = sequence[sequence.indexOf(state.phase) + 1];
        if (next) { state.phase = next; state.cursor = ''; }
        else { state.status = state.issueCount ? 'differences' : 'complete'; state.finishedAt = Date.now(); }
      }
    }
  } catch { failure = 'sync_read_failed'; }
  state.lockedUntil = 0;
  if (failure) { state.status = 'differences'; state.issueCount++; state.finishedAt = Date.now(); if (state.issues.length < 10) state.issues.push({ id: 'batch', code: failure }); }
  const finished = state.status === 'complete';
  const serialized = JSON.stringify(state);
  const committed = await env.DB.batch([
    env.DB.prepare('UPDATE financial_provider_connections SET sync_state_json=?,last_sync_at=CASE WHEN ?=1 THEN ? ELSE last_sync_at END,last_error_code=?,updated_by=?,updated_at=? WHERE id=? AND sync_state_json=?').bind(serialized, finished ? 1 : 0, state.finishedAt, state.status === 'differences' ? 'billing_reference_differences' : null, actorId, Date.now(), conn.id, locked),
    env.DB.prepare("INSERT INTO financial_audit_events(id,actor_user_id,action,resource_type,resource_id,after_json,source,created_at) SELECT ?,?, 'billing.references.sync','financial_provider_connection',?,?,'api',? WHERE EXISTS(SELECT 1 FROM financial_provider_connections WHERE id=? AND sync_state_json=?)").bind(crypto.randomUUID(), actorId, provider, JSON.stringify({runId: state.runId, status: state.status, checked: state.checked, matched: state.matched, issueCount: state.issueCount, scope: 'native_avyron_references'}), Date.now(),conn.id,serialized),
  ]);
  if (!committed[0].meta.changes) return { error: 'sync_in_progress' as const };
  return { state, scope: 'native_avyron_references' as const, moneyActions: false as const };
}
